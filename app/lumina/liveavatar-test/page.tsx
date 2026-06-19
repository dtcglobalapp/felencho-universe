"use client";

import { useRef, useState } from "react";

type LogItem = {
  time: string;
  type: string;
  data: any;
};

export default function LiveAvatarTestPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const sessionRef = useRef<any>(null);

  const [status, setStatus] = useState("Bob está dormido.");
  const [sessionData, setSessionData] = useState<any>(null);
  const [textMessage, setTextMessage] = useState("Hola Bob, ¿quién es Miriam Garcia?");
  const [logs, setLogs] = useState<LogItem[]>([]);

  function addLog(type: string, data: any) {
    setLogs((prev) => [
      {
        time: new Date().toLocaleTimeString(),
        type,
        data,
      },
      ...prev.slice(0, 49),
    ]);
  }

  async function wakeBob() {
    try {
      setStatus("Creando sesión de Bob...");
      setSessionData(null);
      setLogs([]);

      const tokenResponse = await fetch("/api/liveavatar/session-token", {
        method: "POST",
      });

      const tokenData = await tokenResponse.json();

      if (!tokenResponse.ok) {
        setSessionData(tokenData);
        setStatus("Error creando sesión.");
        addLog("session-token-error", tokenData);
        return;
      }

      const sessionToken = tokenData?.data?.session_token;

      if (!sessionToken) {
        setSessionData(tokenData);
        setStatus("No llegó session_token.");
        addLog("missing-session-token", tokenData);
        return;
      }

      setStatus("Cargando LiveAvatar SDK...");

      const sdk = await import("@heygen/liveavatar-web-sdk");

      const {
        LiveAvatarSession,
        SessionEvent,
        AgentEventsEnum,
      } = sdk as any;

      const session = new LiveAvatarSession(sessionToken, {
        voiceChat: true,
      });

      sessionRef.current = session;

      session.on(SessionEvent.SESSION_STATE_CHANGED, (state: any) => {
        addLog("SESSION_STATE_CHANGED", state);
      });

      session.on(SessionEvent.SESSION_STREAM_READY, () => {
        addLog("SESSION_STREAM_READY", "Stream listo.");
        if (videoRef.current) {
          session.attach(videoRef.current);
          videoRef.current.play().catch(() => {});
        }
      });

      session.on(SessionEvent.SESSION_CONNECTION_QUALITY_CHANGED, (quality: any) => {
        addLog("CONNECTION_QUALITY", quality);
      });

      session.on(SessionEvent.SESSION_DISCONNECTED, (reason: any) => {
        addLog("SESSION_DISCONNECTED", reason);
        setStatus("Bob se desconectó.");
      });

      session.on(AgentEventsEnum.USER_TRANSCRIPTION, (event: any) => {
        addLog("USER_TRANSCRIPTION", event);
      });

      session.on(AgentEventsEnum.USER_TRANSCRIPTION_CHUNK, (event: any) => {
        addLog("USER_TRANSCRIPTION_CHUNK", event);
      });

      session.on(AgentEventsEnum.AVATAR_TRANSCRIPTION, (event: any) => {
        addLog("AVATAR_TRANSCRIPTION", event);
      });

      session.on(AgentEventsEnum.AVATAR_TRANSCRIPTION_CHUNK, (event: any) => {
        addLog("AVATAR_TRANSCRIPTION_CHUNK", event);
      });

      session.on(AgentEventsEnum.USER_SPEAK_STARTED, (event: any) => {
        addLog("USER_SPEAK_STARTED", event);
      });

      session.on(AgentEventsEnum.USER_SPEAK_ENDED, (event: any) => {
        addLog("USER_SPEAK_ENDED", event);
      });

      session.on(AgentEventsEnum.AVATAR_SPEAK_STARTED, (event: any) => {
        addLog("AVATAR_SPEAK_STARTED", event);
      });

      session.on(AgentEventsEnum.AVATAR_SPEAK_ENDED, (event: any) => {
        addLog("AVATAR_SPEAK_ENDED", event);
      });

      session.on(AgentEventsEnum.SESSION_STOPPED, (event: any) => {
        addLog("SESSION_STOPPED", event);
      });

      setStatus("Despertando a Bob...");
      await session.start();

      if (videoRef.current) {
        session.attach(videoRef.current);
        videoRef.current.play().catch(() => {});
      }

      setSessionData({
        session_id: tokenData?.data?.session_id,
        session_started: true,
      });

      setStatus("Bob está despierto. Prueba Enviar texto a Bob.");
      addLog("SESSION_STARTED", {
        session_id: tokenData?.data?.session_id,
      });
    } catch (error: any) {
      setStatus("Error despertando a Bob.");
      setSessionData(error?.message || error);
      addLog("wakeBob-error", error?.message || error);
    }
  }

  function sendTextToBob() {
    try {
      if (!sessionRef.current) {
        setStatus("Primero despierta a Bob.");
        return;
      }

      const result = sessionRef.current.message(textMessage);

      setStatus("Mensaje enviado a Bob. Esperando respuesta...");
      setSessionData({
        sent_message: textMessage,
        sdk_result: result,
      });

      addLog("MESSAGE_SENT_TO_BOB", {
        text: textMessage,
        sdk_result: result,
      });
    } catch (error: any) {
      setStatus("Error enviando mensaje.");
      setSessionData(error?.message || error);
      addLog("sendText-error", error?.message || error);
    }
  }

  function startBobListening() {
    try {
      if (!sessionRef.current) {
        setStatus("Primero despierta a Bob.");
        return;
      }

      const result = sessionRef.current.startListening();

      setStatus("Bob está escuchando. Habla ahora.");
      setSessionData({
        listening: true,
        sdk_result: result,
      });

      addLog("START_LISTENING", result);
    } catch (error: any) {
      setStatus("Error activando micrófono.");
      setSessionData(error?.message || error);
      addLog("startListening-error", error?.message || error);
    }
  }

  function stopBobListening() {
    try {
      if (!sessionRef.current) {
        setStatus("Primero despierta a Bob.");
        return;
      }

      const result = sessionRef.current.stopListening();

      setStatus("Bob dejó de escuchar.");
      setSessionData({
        listening: false,
        sdk_result: result,
      });

      addLog("STOP_LISTENING", result);
    } catch (error: any) {
      setStatus("Error deteniendo micrófono.");
      setSessionData(error?.message || error);
      addLog("stopListening-error", error?.message || error);
    }
  }

  async function stopBob() {
    try {
      if (sessionRef.current) {
        await sessionRef.current.stop();
        sessionRef.current = null;
      }

      setStatus("Bob volvió a dormir.");
      addLog("STOP_BOB", "Sesión detenida.");
    } catch (error: any) {
      setStatus("Error deteniendo a Bob.");
      setSessionData(error?.message || error);
      addLog("stopBob-error", error?.message || error);
    }
  }

  return (
    <main className="min-h-screen bg-black p-8 text-white">
      <section className="mx-auto max-w-5xl rounded-2xl border border-white/10 bg-zinc-950 p-8 shadow-2xl">
        <h1 className="text-4xl font-bold">Lumina LiveAvatar Test</h1>

        <p className="mt-3 text-zinc-400">
          Prueba interna para despertar a Bob usando LiveAvatar + Lumina Brain.
        </p>

        <div className="mt-8 overflow-hidden rounded-2xl border border-white/10 bg-black">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            controls
            className="aspect-video w-full bg-black"
          />
        </div>

        <div className="mt-8 flex flex-wrap gap-4">
          <button
            onClick={wakeBob}
            className="rounded-xl bg-blue-600 px-6 py-3 font-bold text-white hover:bg-blue-500"
          >
            Despertar a Bob
          </button>

          <button
            onClick={startBobListening}
            className="rounded-xl bg-green-600 px-6 py-3 font-bold text-white hover:bg-green-500"
          >
            🎤 Bob escucha
          </button>

          <button
            onClick={stopBobListening}
            className="rounded-xl bg-yellow-600 px-6 py-3 font-bold text-white hover:bg-yellow-500"
          >
            Detener escucha
          </button>

          <button
            onClick={stopBob}
            className="rounded-xl bg-red-600 px-6 py-3 font-bold text-white hover:bg-red-500"
          >
            Dormir a Bob
          </button>
        </div>

        <div className="mt-8">
          <label className="mb-2 block text-sm text-zinc-400">
            Mensaje de prueba por texto
          </label>

          <textarea
            className="w-full rounded-xl bg-zinc-900 p-4 text-white outline-none"
            rows={4}
            value={textMessage}
            onChange={(event) => setTextMessage(event.target.value)}
          />

          <button
            onClick={sendTextToBob}
            className="mt-4 rounded-xl bg-purple-600 px-6 py-3 font-bold text-white hover:bg-purple-500"
          >
            Enviar texto a Bob
          </button>
        </div>

        <p className="mt-6 text-lg text-zinc-300">Estado: {status}</p>

        {sessionData && (
          <pre className="mt-6 max-h-72 overflow-auto rounded-xl bg-zinc-900 p-4 text-sm text-zinc-300">
            {JSON.stringify(sessionData, null, 2)}
          </pre>
        )}

        <section className="mt-8 rounded-xl bg-zinc-900 p-5">
          <h2 className="text-2xl font-bold">Eventos LiveAvatar</h2>

          {logs.length === 0 && (
            <p className="mt-3 text-zinc-500">Todavía no hay eventos.</p>
          )}

          <div className="mt-4 max-h-96 space-y-3 overflow-auto">
            {logs.map((log, index) => (
              <article
                key={`${log.time}-${index}`}
                className="rounded-xl border border-white/10 bg-black p-4"
              >
                <div className="flex items-center justify-between gap-4">
                  <p className="font-bold text-blue-300">{log.type}</p>
                  <p className="text-xs text-zinc-500">{log.time}</p>
                </div>

                <pre className="mt-3 overflow-auto text-xs text-zinc-300">
                  {JSON.stringify(log.data, null, 2)}
                </pre>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}