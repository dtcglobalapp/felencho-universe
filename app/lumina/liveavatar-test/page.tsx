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
  const autoVoiceEnabledRef = useRef(true);
  const isBobSpeakingRef = useRef(false);
  const lastAutoTranscriptRef = useRef("");

  const [status, setStatus] = useState("Bob está dormido.");
  const [sessionData, setSessionData] = useState<any>(null);
  const [textMessage, setTextMessage] = useState(
    "Hola Bob, ¿quién es Miriam Garcia?"
  );
  const [lastUserTranscript, setLastUserTranscript] = useState("");
  const [autoVoiceEnabled, setAutoVoiceEnabled] = useState(true);
  const [logs, setLogs] = useState<LogItem[]>([]);

  function addLog(type: string, data: any) {
    setLogs((prev) => [
      {
        time: new Date().toLocaleTimeString(),
        type,
        data,
      },
      ...prev.slice(0, 79),
    ]);
  }

  function setAutoMode(value: boolean) {
    autoVoiceEnabledRef.current = value;
    setAutoVoiceEnabled(value);
    addLog("AUTO_VOICE_MODE", value ? "Activado" : "Desactivado");
  }

  async function askLumina(message: string) {
    const response = await fetch("/api/liveavatar/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "lumina-bob-v1",
        messages: [
          {
            role: "user",
            content: message,
          },
        ],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error?.message || "Lumina no respondió.");
    }

    const reply =
      data?.choices?.[0]?.message?.content ||
      "No pude generar una respuesta en este momento.";

    return {
      reply,
      raw: data,
    };
  }

  async function makeBobSpeak(text: string) {
    if (!sessionRef.current) {
      throw new Error("Primero despierta a Bob.");
    }

    isBobSpeakingRef.current = true;

    const result = sessionRef.current.repeat(text);

    addLog("BOB_REPEAT_COMMAND", {
      text,
      sdk_result: result,
    });

    return result;
  }

  async function askLuminaAndSpeak(message: string) {
    try {
      if (!message.trim()) {
        setStatus("Escribe o dicta un mensaje primero.");
        return;
      }

      setStatus("Lumina está pensando...");
      addLog("ASK_LUMINA", { message });

      const lumina = await askLumina(message);

      addLog("LUMINA_REPLY", lumina.raw);

      setStatus("Bob está hablando con la respuesta de Lumina...");

      const speakResult = await makeBobSpeak(lumina.reply);

      setSessionData({
        user_message: message,
        bob_reply: lumina.reply,
        sdk_result: speakResult,
      });

      setStatus("Bob respondió usando Lumina.");
    } catch (error: any) {
      setStatus("Error conectando Lumina con la voz de Bob.");
      setSessionData(error?.message || error);
      addLog("ASK_LUMINA_AND_SPEAK_ERROR", error?.message || error);
    }
  }

  async function handleAutomaticVoice(text: string) {
    const cleanText = text.trim();

    if (!cleanText) {
      return;
    }

    if (!autoVoiceEnabledRef.current) {
      addLog("AUTO_VOICE_SKIPPED", "Modo automático desactivado.");
      return;
    }

    if (isBobSpeakingRef.current) {
      addLog("AUTO_VOICE_SKIPPED", "Bob está hablando; se ignora eco.");
      return;
    }

    if (lastAutoTranscriptRef.current === cleanText) {
      addLog("AUTO_VOICE_SKIPPED", "Transcripción repetida ignorada.");
      return;
    }

    lastAutoTranscriptRef.current = cleanText;

    setStatus("Voz detectada. Enviando automáticamente a Lumina...");
    addLog("AUTO_VOICE_TO_LUMINA", { text: cleanText });

    await askLuminaAndSpeak(cleanText);
  }

  async function wakeBob() {
    try {
      setStatus("Creando sesión de Bob...");
      setSessionData(null);
      setLogs([]);
      lastAutoTranscriptRef.current = "";
      isBobSpeakingRef.current = false;

      const tokenResponse = await fetch("/api/liveavatar/session-token", {
        method: "POST",
      });

      const tokenData = await tokenResponse.json();

      if (!tokenResponse.ok) {
        setSessionData(tokenData);
        setStatus("Error creando sesión.");
        addLog("SESSION_TOKEN_ERROR", tokenData);
        return;
      }

      const sessionToken = tokenData?.data?.session_token;

      if (!sessionToken) {
        setSessionData(tokenData);
        setStatus("No llegó session_token.");
        addLog("MISSING_SESSION_TOKEN", tokenData);
        return;
      }

      setStatus("Cargando LiveAvatar SDK...");

      const sdk = await import("@heygen/liveavatar-web-sdk");

      const { LiveAvatarSession, SessionEvent, AgentEventsEnum } = sdk as any;

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

      session.on(
        SessionEvent.SESSION_CONNECTION_QUALITY_CHANGED,
        (quality: any) => {
          addLog("CONNECTION_QUALITY", quality);
        }
      );

      session.on(SessionEvent.SESSION_DISCONNECTED, (reason: any) => {
        addLog("SESSION_DISCONNECTED", reason);
        setStatus("Bob se desconectó.");
      });

      session.on(AgentEventsEnum.USER_TRANSCRIPTION, async (event: any) => {
        const text = event?.text || "";

        setLastUserTranscript(text);
        setTextMessage(text || textMessage);
        addLog("USER_TRANSCRIPTION", event);

        await handleAutomaticVoice(text);
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
        isBobSpeakingRef.current = true;
        addLog("AVATAR_SPEAK_STARTED", event);
      });

      session.on(AgentEventsEnum.AVATAR_SPEAK_ENDED, (event: any) => {
        isBobSpeakingRef.current = false;
        addLog("AVATAR_SPEAK_ENDED", event);
      });

      session.on(AgentEventsEnum.ELEVENLABS_AGENT_EVENT, (event: any) => {
        addLog("ELEVENLABS_AGENT_EVENT", event);
      });

      session.on(AgentEventsEnum.SESSION_STOPPED, (event: any) => {
        isBobSpeakingRef.current = false;
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

      setStatus("Bob está despierto. Pulsa 🎤 Bob escucha y háblale.");
      addLog("SESSION_STARTED", {
        session_id: tokenData?.data?.session_id,
      });
    } catch (error: any) {
      setStatus("Error despertando a Bob.");
      setSessionData(error?.message || error);
      addLog("WAKE_BOB_ERROR", error?.message || error);
    }
  }

  function sendTextToSdkOnly() {
    try {
      if (!sessionRef.current) {
        setStatus("Primero despierta a Bob.");
        return;
      }

      const result = sessionRef.current.message(textMessage);

      setStatus("Mensaje enviado al SDK.");
      setSessionData({
        sent_message: textMessage,
        sdk_result: result,
      });

      addLog("MESSAGE_SENT_TO_SDK_ONLY", {
        text: textMessage,
        sdk_result: result,
      });
    } catch (error: any) {
      setStatus("Error enviando mensaje al SDK.");
      setSessionData(error?.message || error);
      addLog("SEND_TEXT_SDK_ERROR", error?.message || error);
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
        auto_voice_enabled: autoVoiceEnabledRef.current,
      });

      addLog("START_LISTENING", result);
    } catch (error: any) {
      setStatus("Error activando micrófono.");
      setSessionData(error?.message || error);
      addLog("START_LISTENING_ERROR", error?.message || error);
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
      addLog("STOP_LISTENING_ERROR", error?.message || error);
    }
  }

  async function stopBob() {
    try {
      if (sessionRef.current) {
        await sessionRef.current.stop();
        sessionRef.current = null;
      }

      isBobSpeakingRef.current = false;
      setStatus("Bob volvió a dormir.");
      addLog("STOP_BOB", "Sesión detenida.");
    } catch (error: any) {
      setStatus("Error deteniendo a Bob.");
      setSessionData(error?.message || error);
      addLog("STOP_BOB_ERROR", error?.message || error);
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

          <button
            onClick={() => setAutoMode(!autoVoiceEnabled)}
            className={`rounded-xl px-6 py-3 font-bold text-white ${
              autoVoiceEnabled
                ? "bg-emerald-600 hover:bg-emerald-500"
                : "bg-zinc-700 hover:bg-zinc-600"
            }`}
          >
            {autoVoiceEnabled ? "Auto voz: ON" : "Auto voz: OFF"}
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

          <div className="mt-4 flex flex-wrap gap-4">
            <button
              onClick={() => askLuminaAndSpeak(textMessage)}
              className="rounded-xl bg-purple-600 px-6 py-3 font-bold text-white hover:bg-purple-500"
            >
              Enviar a Lumina y Bob habla
            </button>

            <button
              onClick={sendTextToSdkOnly}
              className="rounded-xl bg-zinc-700 px-6 py-3 font-bold text-white hover:bg-zinc-600"
            >
              Enviar solo al SDK
            </button>

            <button
              onClick={() => askLuminaAndSpeak(lastUserTranscript)}
              className="rounded-xl bg-cyan-600 px-6 py-3 font-bold text-white hover:bg-cyan-500"
            >
              Responder última voz
            </button>
          </div>
        </div>

        {lastUserTranscript && (
          <section className="mt-6 rounded-xl bg-zinc-900 p-4">
            <h2 className="font-bold text-cyan-300">Última voz detectada</h2>
            <p className="mt-2 text-zinc-200">{lastUserTranscript}</p>
          </section>
        )}

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