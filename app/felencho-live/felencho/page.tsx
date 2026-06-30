"use client";

import { useRef, useState } from "react";
import {
  Room,
  RoomEvent,
  RemoteTrack,
  RemoteTrackPublication,
  RemoteParticipant,
  Track,
} from "livekit-client";

type StartSessionResponse = {
  success: boolean;
  session_id: string;
  start_data: {
    data?: {
      livekit_url?: string;
      livekit_client_token?: string;
    };
  };
};

function makeEvent(eventType: string, sessionId: string, extra: any = {}) {
  return {
    event_id: `${eventType}-${Date.now()}-${Math.random()
      .toString(16)
      .slice(2)}`,
    event_type: eventType,
    session_id: sessionId,
    source_event_id: null,
    ...extra,
  };
}

export default function FelenchoLivePage() {
  const roomRef = useRef<Room | null>(null);
  const videoRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLDivElement | null>(null);
  const remoteAudioElementsRef = useRef<HTMLAudioElement[]>([]);

  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [message, setMessage] = useState(
    "¿Quién eres? ¿Quién te creó? ¿Quién es Raffy?"
  );
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState("");

  function addLog(text: string) {
    setLogs((prev) =>
      [`${new Date().toLocaleTimeString()} — ${text}`, ...prev].slice(0, 80)
    );
  }

  async function unlockAudio() {
    try {
      remoteAudioElementsRef.current.forEach((audio) => {
        audio.muted = false;
        audio.volume = 1;
        audio.autoplay = true;
        audio.playsInline = true;
        audio.play().catch(() => {});
      });

      setAudioUnlocked(true);
      addLog("Audio activado por el usuario.");
    } catch (err: any) {
      addLog(`No pude activar audio: ${err?.message || "error desconocido"}`);
    }
  }

  async function testBrowserAudio() {
    try {
      const AudioContextClass =
        window.AudioContext || (window as any).webkitAudioContext;

      const context = new AudioContextClass();
      const oscillator = context.createOscillator();
      const gain = context.createGain();

      oscillator.frequency.value = 440;
      gain.gain.value = 0.08;

      oscillator.connect(gain);
      gain.connect(context.destination);

      oscillator.start();
      oscillator.stop(context.currentTime + 0.25);

      addLog("Prueba de audio del navegador enviada.");
    } catch (err: any) {
      addLog(`Error probando audio del navegador: ${err?.message || "error"}`);
    }
  }

  async function sendAgentEvent(eventType: string, extra: any = {}) {
    const room = roomRef.current;

    if (!room || !sessionId) {
      addLog("No hay sala conectada todavía.");
      return;
    }

    const payload = makeEvent(eventType, sessionId, extra);
    const data = new TextEncoder().encode(JSON.stringify(payload));

    await room.localParticipant.publishData(data, {
      reliable: true,
      topic: "agent-control",
    });

    addLog(`Enviado: ${eventType}`);
  }

  function attachTrack(
    track: RemoteTrack,
    _publication: RemoteTrackPublication,
    participant: RemoteParticipant
  ) {
    if (track.kind === Track.Kind.Video && videoRef.current) {
      const el = track.attach() as HTMLVideoElement;
      el.autoplay = true;
      el.playsInline = true;
      el.muted = false;
      el.style.width = "100%";
      el.style.height = "100%";
      el.style.objectFit = "cover";
      el.style.background = "black";

      videoRef.current.innerHTML = "";
      videoRef.current.appendChild(el);

      addLog(`Video recibido de ${participant.identity}`);
    }

    if (track.kind === Track.Kind.Audio && audioRef.current) {
      const el = track.attach() as HTMLAudioElement;
      el.autoplay = true;
      el.playsInline = true;
      el.controls = true;
      el.muted = false;
      el.volume = 1;

      remoteAudioElementsRef.current.push(el);
      audioRef.current.innerHTML = "";
      audioRef.current.appendChild(el);

      el.play()
        .then(() => {
          setAudioUnlocked(true);
          addLog(`Audio remoto reproduciendo de ${participant.identity}`);
        })
        .catch((err) => {
          addLog(
            `Audio remoto conectado, pero Chrome bloqueó autoplay. Pulsa "Activar audio". ${err?.message || ""}`
          );
        });
    }
  }

  async function start() {
    setLoading(true);
    setError("");
    setLogs([]);
    setConnected(false);
    setMicOn(false);
    setAudioUnlocked(false);
    remoteAudioElementsRef.current = [];

    try {
      const res = await fetch("/api/liveavatar/felencho-virtual/start-session", {
        method: "POST",
      });

      const json: StartSessionResponse = await res.json();

      if (!res.ok || !json.success) {
        throw new Error((json as any).error || "No pude iniciar LiveAvatar.");
      }

      const livekitUrl = json.start_data?.data?.livekit_url;
      const livekitToken = json.start_data?.data?.livekit_client_token;

      if (!livekitUrl || !livekitToken) {
        throw new Error("LiveAvatar no devolvió LiveKit URL o token.");
      }

      setSessionId(json.session_id);

      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
      });

      roomRef.current = room;

      room.on(RoomEvent.TrackSubscribed, attachTrack);

      room.on(RoomEvent.TrackUnsubscribed, (track) => {
        track.detach().forEach((el) => el.remove());
        addLog("Track remoto desconectado.");
      });

      room.on(RoomEvent.DataReceived, (payload, participant, _kind, topic) => {
        if (topic !== "agent-response") return;

        try {
          const text = new TextDecoder().decode(payload);
          const event = JSON.parse(text);
          const speaker = participant?.identity || "agent";

          addLog(
            `Respuesta: ${event.event_type}${
              event.text ? ` — ${event.text}` : ""
            }`
          );

          if (event.event_type === "user.transcription" && event.text) {
            addLog(`Tú dijiste: ${event.text}`);
          }

          if (event.event_type === "avatar.transcription" && event.text) {
            addLog(`Felencho Virtual: ${event.text}`);
          }

          if (event.event_type === "avatar.speak_started") {
            addLog(`Avatar comenzó a hablar (${speaker}).`);
          }

          if (event.event_type === "avatar.speak_ended") {
            addLog(`Avatar terminó de hablar (${speaker}).`);
          }
        } catch {
          addLog("Respuesta agent-response recibida, pero no pude leer el JSON.");
        }
      });

      room.on(RoomEvent.Connected, () => {
        setConnected(true);
        addLog("Conectado a LiveKit.");
      });

      room.on(RoomEvent.Disconnected, () => {
        setConnected(false);
        setMicOn(false);
        addLog("Desconectado.");
      });

      await room.connect(livekitUrl, livekitToken);

      addLog("Esperando avatar, video y audio remoto...");
    } catch (err: any) {
      setError(err?.message || "Error iniciando Felencho LiveAvatar.");
    } finally {
      setLoading(false);
    }
  }

  async function speakResponse() {
    if (!message.trim()) return;

    await unlockAudio();

    await sendAgentEvent("avatar.speak_response", {
      text: message.trim(),
    });
  }

  async function speakTextDirect() {
    if (!message.trim()) return;

    await unlockAudio();

    await sendAgentEvent("avatar.speak_text", {
      text: message.trim(),
    });
  }

  async function startListening() {
    const room = roomRef.current;
    if (!room) return;

    await room.localParticipant.setMicrophoneEnabled(true);
    setMicOn(true);

    await sendAgentEvent("avatar.start_listening");
  }

  async function stopListening() {
    await sendAgentEvent("avatar.stop_listening");

    const room = roomRef.current;
    if (room) {
      await room.localParticipant.setMicrophoneEnabled(false);
    }

    setMicOn(false);
  }

  async function startPushToTalk() {
    const room = roomRef.current;
    if (!room) return;

    await room.localParticipant.setMicrophoneEnabled(true);
    setMicOn(true);

    await sendAgentEvent("user.start_push_to_talk");
  }

  async function stopPushToTalk() {
    await sendAgentEvent("user.stop_push_to_talk");

    const room = roomRef.current;
    if (room) {
      await room.localParticipant.setMicrophoneEnabled(false);
    }

    setMicOn(false);
  }

  async function interrupt() {
    await sendAgentEvent("avatar.interrupt");
  }

  async function leave() {
    const room = roomRef.current;

    if (room) {
      await room.disconnect();
      roomRef.current = null;
    }

    remoteAudioElementsRef.current = [];
    setConnected(false);
    setMicOn(false);
    setAudioUnlocked(false);
    setSessionId("");
    addLog("Sesión cerrada.");
  }

  return (
    <main className="min-h-screen bg-black p-6 text-white">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-3xl border border-cyan-500/30 bg-gradient-to-r from-slate-950 via-black to-slate-950 p-8">
          <h1 className="text-4xl font-bold text-cyan-300">
            Felencho LiveAvatar Controller
          </h1>
          <p className="mt-3 text-gray-300">
            Control propio para probar texto, micrófono, audio y eventos FULL Mode.
          </p>
        </header>

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-950/40 p-4 text-red-200">
            {error}
          </div>
        )}

        <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="rounded-3xl border border-cyan-500/30 bg-zinc-950 p-4">
            <div
              ref={videoRef}
              className="aspect-video w-full overflow-hidden rounded-2xl bg-black"
            />

            <div className="mt-4 rounded-2xl border border-white/10 bg-black p-3">
              <p className="mb-2 text-sm font-bold text-cyan-300">
                Audio remoto del avatar
              </p>
              <div ref={audioRef} className="min-h-10" />
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                onClick={start}
                disabled={loading || connected}
                className="rounded-xl bg-cyan-500 px-5 py-3 font-bold text-black disabled:opacity-40"
              >
                {loading ? "Iniciando..." : "Iniciar"}
              </button>

              <button
                onClick={unlockAudio}
                disabled={!connected}
                className="rounded-xl bg-green-400 px-5 py-3 font-bold text-black disabled:opacity-40"
              >
                Activar audio
              </button>

              <button
                onClick={testBrowserAudio}
                className="rounded-xl bg-yellow-400 px-5 py-3 font-bold text-black"
              >
                Probar audio
              </button>

              <button
                onClick={interrupt}
                disabled={!connected}
                className="rounded-xl bg-orange-400 px-5 py-3 font-bold text-black disabled:opacity-40"
              >
                Interrumpir
              </button>

              <button
                onClick={leave}
                disabled={!connected}
                className="rounded-xl bg-red-500 px-5 py-3 font-bold text-white disabled:opacity-40"
              >
                Salir
              </button>
            </div>

            <div className="mt-4 text-sm text-gray-400">
              Estado: {connected ? "Conectado" : "Desconectado"} · Micrófono:{" "}
              {micOn ? "Activo" : "Apagado"} · Audio:{" "}
              {audioUnlocked ? "Activo" : "Bloqueado/pendiente"}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-zinc-950 p-5">
            <h2 className="text-2xl font-bold text-yellow-300">
              Prueba de conversación
            </h2>

            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="mt-4 h-32 w-full rounded-xl border border-white/10 bg-black p-4 text-white outline-none"
            />

            <div className="mt-4 grid gap-3">
              <button
                onClick={speakResponse}
                disabled={!connected}
                className="rounded-xl bg-purple-500 px-5 py-3 font-bold text-white disabled:opacity-40"
              >
                Enviar texto al Brain y hablar
              </button>

              <button
                onClick={speakTextDirect}
                disabled={!connected}
                className="rounded-xl bg-yellow-400 px-5 py-3 font-bold text-black disabled:opacity-40"
              >
                Hablar texto directo
              </button>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={startListening}
                  disabled={!connected || micOn}
                  className="rounded-xl bg-green-500 px-5 py-3 font-bold text-black disabled:opacity-40"
                >
                  Escuchar
                </button>

                <button
                  onClick={stopListening}
                  disabled={!connected || !micOn}
                  className="rounded-xl bg-zinc-700 px-5 py-3 font-bold text-white disabled:opacity-40"
                >
                  Parar
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onMouseDown={startPushToTalk}
                  onMouseUp={stopPushToTalk}
                  onTouchStart={startPushToTalk}
                  onTouchEnd={stopPushToTalk}
                  disabled={!connected}
                  className="rounded-xl bg-cyan-400 px-5 py-3 font-bold text-black disabled:opacity-40"
                >
                  Mantener para hablar
                </button>

                <button
                  onClick={stopPushToTalk}
                  disabled={!connected}
                  className="rounded-xl bg-zinc-700 px-5 py-3 font-bold text-white disabled:opacity-40"
                >
                  Soltar PTT
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-zinc-950 p-5">
          <h2 className="text-2xl font-bold text-purple-300">Eventos</h2>
          <div className="mt-4 max-h-96 overflow-auto rounded-2xl bg-black p-4 text-sm text-gray-300">
            {logs.length === 0 ? (
              <p className="text-gray-500">Todavía no hay eventos.</p>
            ) : (
              logs.map((log, index) => <p key={index}>{log}</p>)
            )}
          </div>
        </section>
      </div>
    </main>
  );
}