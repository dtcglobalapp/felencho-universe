"use client";

import { useState } from "react";

export default function LiveAvatarTestPage() {
  const [status, setStatus] = useState("Bob está dormido.");
  const [sessionData, setSessionData] = useState<any>(null);

  async function wakeBob() {
    try {
      setStatus("Creando sesión de Bob...");

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

      setStatus("Despertando a Bob...");
      await session.start();

      setSessionData({
        session_id: tokenData?.data?.session_id,
        session_started: true,
      });

      setStatus("Bob está despierto. Háblale.");
    } catch (error: any) {
      setStatus("Error despertando a Bob.");
      setSessionData(error?.message || error);
    }
  }

  return (
    <main className="min-h-screen bg-black p-8 text-white">
      <section className="mx-auto max-w-4xl rounded-2xl border border-white/10 bg-zinc-950 p-8 shadow-2xl">
        <h1 className="text-4xl font-bold">Lumina LiveAvatar Test</h1>

        <p className="mt-3 text-zinc-400">
          Prueba interna para despertar a Bob usando LiveAvatar + Lumina Brain.
        </p>

        <button
          onClick={wakeBob}
          className="mt-8 rounded-xl bg-blue-600 px-6 py-3 font-bold text-white hover:bg-blue-500"
        >
          Despertar a Bob
        </button>

        <p className="mt-6 text-lg text-zinc-300">
          Estado: {status}
        </p>

        {sessionData && (
          <pre className="mt-6 max-h-96 overflow-auto rounded-xl bg-zinc-900 p-4 text-sm text-zinc-300">
            {JSON.stringify(sessionData, null, 2)}
          </pre>
        )}
      </section>
    </main>
  );
}