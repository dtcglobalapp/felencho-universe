"use client";

import { useEffect, useRef, useState } from "react";
import {
  Room,
  RoomEvent,
  RemoteParticipant,
  RemoteTrack,
  RemoteTrackPublication,
  Track,
} from "livekit-client";

type Character = "lina" | "bob";

type SessionResponse = {
  serverUrl?: string;
  participantToken?: string;
  roomName?: string;
  character?: Character;
  error?: string;
};

type DispatchResponse = {
  ok?: boolean;
  error?: string;
  details?: string;
  dispatch?: {
    id?: string;
    state?: {
      jobs?: Array<{
        id?: string;
        state?: {
          status?: string;
          error?: string;
        };
      }>;
    };
  };
};

export default function LiveCharacterClient({ character }: { character: Character }) {
  const roomRef = useRef<Room | null>(null);
  const videoRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLDivElement | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startupTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const failedRef = useRef(false);
  const microphoneEnabledRef = useRef(false);
  const [status, setStatus] = useState<"idle" | "connecting" | "connected" | "error">("idle");
  const [message, setMessage] = useState("");
  const [debug, setDebug] = useState("");
  const [videoVisible, setVideoVisible] = useState(false);
  const [micReady, setMicReady] = useState(false);
  const [micBusy, setMicBusy] = useState(false);

  const displayName = character === "lina" ? "Lina" : "Bob";

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (startupTimeoutRef.current) clearTimeout(startupTimeoutRef.current);
      roomRef.current?.disconnect();
      roomRef.current = null;
    };
  }, []);

  async function enableMicrophone() {
    const room = roomRef.current;
    if (!room || microphoneEnabledRef.current || micBusy) return;

    setMicBusy(true);
    try {
      await room.localParticipant.setMicrophoneEnabled(true);
      microphoneEnabledRef.current = true;
      setMicReady(true);
      setMessage(`${displayName} está escuchando. Puedes hablarle.`);
      setDebug((current) => `${current}${current ? " · " : ""}micrófono publicado`);
    } catch (error) {
      const text = error instanceof Error ? error.message : "No se pudo activar el micrófono.";
      setMicReady(false);
      setMessage(`Pulsa “Activar micrófono” y permite el acceso para que ${displayName} pueda escucharte.`);
      setDebug((current) => `${current}${current ? " · " : ""}${text}`);
    } finally {
      setMicBusy(false);
    }
  }

  function attachTrack(
    track: RemoteTrack,
    _publication: RemoteTrackPublication,
    participant: RemoteParticipant,
  ) {
    setDebug(`Track ${track.kind} recibido de ${participant.identity}`);

    if (track.kind === Track.Kind.Video && videoRef.current) {
      const element = track.attach() as HTMLVideoElement;
      element.autoplay = true;
      element.playsInline = true;
      element.style.width = "100%";
      element.style.height = "100%";
      element.style.objectFit = "contain";
      element.style.background = "black";
      videoRef.current.innerHTML = "";
      videoRef.current.appendChild(element);
      setVideoVisible(true);
      setMicReady(false);
      setMessage(`${displayName} ya está visible. Activa el micrófono para hablarle.`);
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
      if (startupTimeoutRef.current) clearTimeout(startupTimeoutRef.current);
      startupTimeoutRef.current = null;
    }

    if (track.kind === Track.Kind.Audio && audioRef.current) {
      const element = track.attach() as HTMLAudioElement;
      element.autoplay = true;
      element.setAttribute("playsinline", "true");
      audioRef.current.innerHTML = "";
      audioRef.current.appendChild(element);
      element.play().catch(() => undefined);
    }
  }

  function failSession(text: string, details: string) {
    failedRef.current = true;
    microphoneEnabledRef.current = false;
    setMicReady(false);
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
    if (startupTimeoutRef.current) clearTimeout(startupTimeoutRef.current);
    startupTimeoutRef.current = null;
    roomRef.current?.disconnect();
    roomRef.current = null;
    if (videoRef.current) videoRef.current.innerHTML = "";
    if (audioRef.current) audioRef.current.innerHTML = "";
    setStatus("error");
    setVideoVisible(false);
    setMessage(text);
    setDebug(details);
  }

  function startDispatchPolling(roomName: string, dispatchId: string) {
    if (pollRef.current) clearInterval(pollRef.current);

    let attempts = 0;
    pollRef.current = setInterval(async () => {
      attempts += 1;
      try {
        const response = await fetch("/api/live/dispatch-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ room: roomName, dispatchId }),
        });
        const data = await response.json().catch(() => ({}));
        const dispatches = data?.agent_dispatches || data?.agentDispatches || [];
        const dispatch = dispatches[0];
        const jobs = dispatch?.state?.jobs || [];
        const job = jobs[0];
        const jobState = job?.state || {};
        const jobStatus = jobState?.status || "esperando worker";
        const jobError = jobState?.error || "";

        setDebug(`Dispatch ${dispatchId} · ${jobStatus}${jobError ? ` · ${jobError}` : ""}`);

        if (jobError || String(jobStatus).includes("FAILED")) {
          failSession(
            `El agente de ${displayName} falló: ${jobError || jobStatus}`,
            `Dispatch ${dispatchId} · ${jobStatus}${jobError ? ` · ${jobError}` : ""}`,
          );
        } else if (attempts >= 15) {
          failSession(
            `${displayName} fue despachado, pero no publicó video a tiempo. La sesión se cerró.`,
            `Dispatch ${dispatchId} · timeout esperando video`,
          );
        }
      } catch (error) {
        setDebug(error instanceof Error ? error.message : "No pude leer el estado del dispatch.");
      }
    }, 2000);
  }

  async function startSession() {
    if (status === "connecting" || status === "connected") return;

    setStatus("connecting");
    failedRef.current = false;
    microphoneEnabledRef.current = false;
    setMicReady(false);
    setVideoVisible(false);
    setMessage(`Conectando con ${displayName}...`);
    setDebug("Creando sala privada...");

    try {
      const response = await fetch("/api/live/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ character }),
      });

      const data = (await response.json()) as SessionResponse;
      if (!response.ok || !data.serverUrl || !data.participantToken || !data.roomName) {
        throw new Error(data.error || "No se pudo crear la sesión.");
      }

      const room = new Room({ adaptiveStream: true, dynacast: true });
      roomRef.current = room;

      room.on(RoomEvent.TrackSubscribed, attachTrack);
      room.on(RoomEvent.ParticipantConnected, (participant) => {
        setDebug(`Participante conectado: ${participant.identity}`);
      });
      room.on(RoomEvent.Disconnected, () => {
        if (failedRef.current) return;
        microphoneEnabledRef.current = false;
        setMicReady(false);
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = null;
        if (startupTimeoutRef.current) clearTimeout(startupTimeoutRef.current);
        startupTimeoutRef.current = null;
        setStatus("error");
        setVideoVisible(false);
        setMessage(`${displayName} terminó antes de publicar video. Revisa el worker o proveedor.`);
        setDebug((current) =>
          current
            ? `${current} · room cerrada antes del video`
            : "Room cerrada antes de recibir video remoto.",
        );
      });

      await room.connect(data.serverUrl, data.participantToken);
      const participantIdentity = room.localParticipant.identity;
      setDebug(`Sala conectada: ${data.roomName}. Despachando ${displayName}...`);

      const dispatchResponse = await fetch("/api/live/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          character,
          room: data.roomName,
          participantIdentity,
        }),
      });

      const dispatchData = (await dispatchResponse.json().catch(() => ({}))) as DispatchResponse;
      if (!dispatchResponse.ok) {
        throw new Error(dispatchData?.details || dispatchData?.error || "No se pudo iniciar el personaje en LiveKit.");
      }

      const dispatchId = dispatchData?.dispatch?.id || "";
      setStatus("connected");
      setMessage(`${displayName} está entrando al estudio...`);
      setDebug(dispatchId ? `Dispatch creado: ${dispatchId}` : "Dispatch creado. Esperando al worker...");

      if (dispatchId) startDispatchPolling(data.roomName, dispatchId);
      startupTimeoutRef.current = setTimeout(() => {
        failSession(
          `${displayName} no publicó video a tiempo. La sesión se cerró automáticamente.`,
          dispatchId ? `Dispatch ${dispatchId} · timeout de inicio` : "Timeout de inicio",
        );
      }, 35_000);
    } catch (error) {
      console.error(`[live/${character}]`, error);
      roomRef.current?.disconnect();
      roomRef.current = null;
      setStatus("error");
      setVideoVisible(false);
      setMicReady(false);
      const text = error instanceof Error ? error.message : "No se pudo iniciar la sesión.";
      setMessage(text);
      setDebug(text);
    }
  }

  async function endSession() {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
    if (startupTimeoutRef.current) clearTimeout(startupTimeoutRef.current);
    startupTimeoutRef.current = null;
    failedRef.current = false;
    microphoneEnabledRef.current = false;
    setMicReady(false);
    await roomRef.current?.disconnect();
    roomRef.current = null;
    if (videoRef.current) videoRef.current.innerHTML = "";
    if (audioRef.current) audioRef.current.innerHTML = "";
    setStatus("idle");
    setVideoVisible(false);
    setMessage("Sesión cerrada.");
    setDebug("");
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col items-center justify-center p-4 md:p-8">
        <div className="mb-4 text-center">
          <div className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-300/80">
            Felencho Universe · Live Studio
          </div>
          <h1 className="mt-2 text-4xl font-bold md:text-5xl">{displayName}</h1>
        </div>

        <section className="relative w-full max-w-[720px] overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-950 shadow-2xl">
          <div ref={videoRef} className="aspect-[2/3] w-full bg-black" />

          {!videoVisible && status === "connected" && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-8">
              <div className="max-w-md rounded-2xl border border-cyan-400/20 bg-black/80 px-6 py-5 text-center backdrop-blur-sm">
                <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-cyan-300/30 border-t-cyan-300" />
                <div className="text-base font-semibold text-cyan-200">{message}</div>
                {debug && <div className="mt-3 break-words text-xs text-zinc-400">{debug}</div>}
              </div>
            </div>
          )}

          {status !== "connected" && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm">
              <button
                onClick={startSession}
                disabled={status === "connecting"}
                className="rounded-full bg-white px-8 py-4 text-lg font-bold text-black transition hover:scale-[1.02] disabled:opacity-60"
              >
                {status === "connecting" ? `Conectando con ${displayName}...` : `Entrar con ${displayName}`}
              </button>
            </div>
          )}
        </section>

        <div ref={audioRef} className="hidden" />

        <div className="mt-5 flex min-h-12 items-center gap-4 text-center text-sm text-zinc-300">
          <span className={status === "connected" ? "text-emerald-300" : status === "error" ? "text-red-300" : "text-zinc-400"}>
            {message || `Pulsa para iniciar una sesión privada con ${displayName}.`}
          </span>
        </div>

        {status === "connected" && videoVisible && !micReady && (
          <button
            onClick={enableMicrophone}
            disabled={micBusy}
            className="mb-3 rounded-full bg-emerald-300 px-7 py-3 text-sm font-bold text-black transition hover:scale-[1.02] disabled:opacity-60"
          >
            {micBusy ? "Activando micrófono..." : "Activar micrófono"}
          </button>
        )}

        {micReady && (
          <div className="mb-3 text-sm font-semibold text-emerald-300">Micrófono activo · Lina debe escucharte</div>
        )}

        {debug && (
          <div className="mb-2 max-w-[720px] rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 text-center text-xs text-zinc-400">
            {debug}
          </div>
        )}

        {status === "connected" && (
          <button
            onClick={endSession}
            className="mt-2 rounded-full border border-white/15 px-6 py-3 text-sm font-semibold text-zinc-200 hover:bg-white/10"
          >
            Cerrar sesión
          </button>
        )}
      </div>
    </main>
  );
}
