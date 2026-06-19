"use client";

import { useRef, useState } from "react";

export default function LiveAvatarTestPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const sessionRef = useRef<any>(null);

  const [status, setStatus] = useState("Bob está dormido.");
  const [sessionData, setSessionData] = useState<any>(null);
  const [textMessage, setTextMessage] = useState("Hola Bob, ¿quién es Miriam Garcia?");

  async function wakeBob() {
    try {
      setStatus("Creando sesión de Bob...");
      setSessionData(null);

      const tokenResponse = await fetch("/api/liveavatar/session-token", {
        method: "POST",
      });

      const tokenData = await tokenResponse.json();

      if (!tokenResponse.ok) {
        setSessionData(tokenData);
        setStatus("Error creando sesión.");
        return;
      }

      const sessionToken = tokenData?.data?.session_token;

      if (!sessionToken) {
        setSessionData(tokenData);
        setStatus("No llegó session_token.");
        return;
      }

      setStatus("Cargando LiveAvatar SDK...");

      const sdk = await import("@heygen/liveavatar-web-sdk");
      const LiveAvatarSession = (sdk as any).LiveAvatarSession;

      const session = new LiveAvatarSession(sessionToken, {
        voiceChat: true,
      });

      sessionRef.current = session;

      setStatus("Despertando a Bob...");
      await session.start();

      if (videoRef.current) {
        session.attach(videoRef.current);
      }

      setSessionData({
        session_id: tokenData?.data?.session_id,
        session_started: true,
      });

      setStatus("Bob está despierto. Prueba el botón Hablar por texto.");
    } catch (error: any) {
      setStatus("Error despertando a Bob.");
      setSessionData(error?.message || error);
    }
  }

  function sendTextToBob() {
    try {
      if (!sessionRef.current) {
        setStatus("Primero despierta a Bob.");
        return;
      }

      const result = sessionRef.current.message(textMessage);
      setStatus("Mensaje enviado a Bob.");
      setSessionData({
        sent_message: textMessage,
        sdk_result: result,
      });
    } catch (error: any) {
      setStatus("Error enviando mensaje.");
      setSessionData(error?.message || error);
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
    } catch (error: any) {
      setStatus("Error activando micrófono.");
      setSessionData(error?.message || error);
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
    } catch (error: any) {
      setStatus("Error deteniendo micrófono.");
      setSessionData(error?.message || error);
    }
  }

  async function stopBob() {
    try {
      if (sessionRef.current) {
        await sessionRef.current.stop();
        sessionRef.current = null;
      }

      setStatus("Bob volvió a dormir.");
    } catch (error: any) {
      setStatus("Error deteniendo a Bob.");
      setSessionData(error?.message || error);
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
          <pre className="mt-6 max-h-96 overflow-auto rounded-xl bg-zinc-900 p-4 text-sm text-zinc-300">
            {JSON.stringify(sessionData, null, 2)}
          </pre>
        )}
      </section>
    </main>
  );
}