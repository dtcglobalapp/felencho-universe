"use client";

import { useEffect, useRef, useState } from "react";
import {
  AgentEventsEnum,
  LiveAvatarSession,
  SessionEvent,
  SessionState,
  VoiceChatEvent,
  VoiceChatState,
} from "@heygen/liveavatar-web-sdk";

type PresenceLiveProps = {
  character: string;
};

type TokenResponse = {
  success?: boolean;
  sessionToken?: string;
  error?: string;
  details?: unknown;
};

export default function PresenceLive({
  character,
}: PresenceLiveProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const sessionRef = useRef<LiveAvatarSession | null>(null);

  const [status, setStatus] = useState("Preparando LiveAvatar...");
  const [error, setError] = useState("");
  const [needsActivation, setNeedsActivation] = useState(false);
  const [userTalking, setUserTalking] = useState(false);
  const [avatarTalking, setAvatarTalking] = useState(false);

  async function activateVoice() {
    const session = sessionRef.current;

    if (!session) return;

    try {
      setError("");
      setStatus("Activando conversación...");

      if (session.voiceChat.state === VoiceChatState.INACTIVE) {
        await session.voiceChat.start();
      }

      await session.voiceChat.unmute();

      setNeedsActivation(false);
      setStatus("Bob está escuchando");
    } catch (voiceError) {
      const message =
        voiceError instanceof Error
          ? voiceError.message
          : "No se pudo activar la conversación.";

      setError(message);
      setNeedsActivation(true);
    }
  }

  useEffect(() => {
    if (character !== "bob") {
      setStatus(`${character} todavía no está conectado.`);
      return;
    }

    let cancelled = false;

    async function startBob() {
      try {
        setStatus("Solicitando token de Bob...");

        const response = await fetch(
          "/api/liveavatar/session-token",
          {
            method: "POST",
            cache: "no-store",
          }
        );

        const data = (await response.json()) as TokenResponse;

        if (!response.ok || !data.sessionToken) {
          throw new Error(
            data.error ||
              JSON.stringify(data.details) ||
              "No se recibió el token de LiveAvatar."
          );
        }

        if (cancelled) return;

        const session = new LiveAvatarSession(
          data.sessionToken,
          {
            voiceChat: true,
          }
        );

        sessionRef.current = session;

        session.on(
          SessionEvent.SESSION_STATE_CHANGED,
          (state) => {
            setStatus(`Estado: ${String(state)}`);
          }
        );

        session.on(
          SessionEvent.SESSION_STREAM_READY,
          () => {
            if (videoRef.current) {
              session.attach(videoRef.current);
            }

            setStatus("Video conectado. Activando voz...");
          }
        );

        session.voiceChat.on(
          VoiceChatEvent.STATE_CHANGED,
          (state) => {
            if (state === VoiceChatState.ACTIVE) {
              setStatus("Bob está escuchando");
            }
          }
        );

        session.voiceChat.on(VoiceChatEvent.MUTED, () => {
          setNeedsActivation(true);
          setStatus("Micrófono silenciado");
        });

        session.voiceChat.on(VoiceChatEvent.UNMUTED, () => {
          setNeedsActivation(false);
          setStatus("Bob está escuchando");
        });

        session.on(
          AgentEventsEnum.USER_SPEAK_STARTED,
          () => {
            setUserTalking(true);
            setStatus("Bob te está escuchando...");
          }
        );

        session.on(
          AgentEventsEnum.USER_SPEAK_ENDED,
          () => {
            setUserTalking(false);
            setStatus("Bob está pensando...");
          }
        );

        session.on(
          AgentEventsEnum.AVATAR_SPEAK_STARTED,
          () => {
            setAvatarTalking(true);
            setStatus("Bob está hablando");
          }
        );

        session.on(
          AgentEventsEnum.AVATAR_SPEAK_ENDED,
          () => {
            setAvatarTalking(false);
            setStatus("Bob está escuchando");
          }
        );

        setStatus("Iniciando sesión oficial...");

        await session.start();

        if (cancelled) {
          await session.stop();
          return;
        }

        if (session.state !== SessionState.CONNECTED) {
          setStatus(`Sesión: ${String(session.state)}`);
        }

        if (videoRef.current) {
          session.attach(videoRef.current);
        }

        try {
          await session.voiceChat.start();
          await session.voiceChat.unmute();

          setNeedsActivation(false);
          setStatus("Bob está escuchando");
        } catch {
          setNeedsActivation(true);
          setStatus("Pulsa para activar audio y micrófono");
        }
      } catch (startError) {
        const message =
          startError instanceof Error
            ? startError.message
            : "Error desconocido iniciando a Bob.";

        setError(message);
        setStatus("No se pudo iniciar a Bob");
      }
    }

    void startBob();

    return () => {
      cancelled = true;

      const session = sessionRef.current;

      if (session) {
        session.removeAllListeners();
        session.voiceChat.removeAllListeners();
        void session.stop();
        sessionRef.current = null;
      }
    };
  }, [character]);

  return (
    <main
      style={{
        position: "relative",
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        background: "#000",
      }}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        controls={false}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          background: "#000",
        }}
      />

      {needsActivation && (
        <button
          type="button"
          onClick={activateVoice}
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 30,
            width: 300,
            height: 68,
            margin: "auto",
            border: "1px solid rgba(34,211,238,.55)",
            borderRadius: 16,
            background: "rgba(5,12,18,.94)",
            color: "#67e8f9",
            fontSize: 16,
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          Activar audio y micrófono
        </button>
      )}

      <div
        style={{
          position: "absolute",
          left: 18,
          bottom: 18,
          zIndex: 40,
          maxWidth: "calc(100vw - 36px)",
          border: "1px solid rgba(34,211,238,.3)",
          borderRadius: 12,
          background: "rgba(0,0,0,.8)",
          padding: "10px 14px",
          color: error ? "#fca5a5" : "#67e8f9",
          fontFamily: "Arial, sans-serif",
          fontSize: 14,
        }}
      >
        <strong>BOB</strong>

        <span style={{ marginLeft: 10 }}>
          {error || status}
        </span>

        {userTalking && (
          <span style={{ marginLeft: 10, color: "#93c5fd" }}>
            ● Tú hablando
          </span>
        )}

        {avatarTalking && (
          <span style={{ marginLeft: 10, color: "#c4b5fd" }}>
            ● Bob hablando
          </span>
        )}
      </div>
    </main>
  );
}