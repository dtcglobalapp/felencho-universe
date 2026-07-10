"use client";

import { useEffect, useRef, useState } from "react";
import {
  Room,
  RoomEvent,
  Track,
  type RemoteTrack,
  type RemoteTrackPublication,
  type RemoteParticipant,
} from "livekit-client";

type PresenceLiveProps = {
  character: string;
};

type SessionResponse = {
  success?: boolean;
  livekitUrl?: string;
  livekitClientToken?: string;
  error?: string;
  details?: unknown;
};

export default function PresenceLive({
  character,
}: PresenceLiveProps) {
  const mediaContainerRef = useRef<HTMLDivElement | null>(null);
  const roomRef = useRef<Room | null>(null);

  const [status, setStatus] = useState("Iniciando LiveAvatar...");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function connectAvatar() {
      if (character !== "bob") {
        setStatus(
          `${character} todavía no tiene su endpoint LiveAvatar conectado.`
        );
        return;
      }

      try {
        setStatus("Solicitando sesión de Bob...");

        const response = await fetch("/api/liveavatar/session-token", {
          method: "POST",
          cache: "no-store",
        });

        const data = (await response.json()) as SessionResponse;

        if (!response.ok) {
          throw new Error(
            data.error || "No se pudo crear la sesión LiveAvatar."
          );
        }

        if (!data.livekitUrl || !data.livekitClientToken) {
          throw new Error(
            "La API no devolvió livekitUrl y livekitClientToken."
          );
        }

        if (cancelled) return;

        const room = new Room({
          adaptiveStream: true,
          dynacast: true,
        });

        roomRef.current = room;

        function attachTrack(
          track: RemoteTrack,
          _publication: RemoteTrackPublication,
          participant: RemoteParticipant
        ) {
          if (!mediaContainerRef.current) return;

          if (
            track.kind !== Track.Kind.Video &&
            track.kind !== Track.Kind.Audio
          ) {
            return;
          }

          const element = track.attach();

          element.setAttribute(
            "data-participant",
            participant.identity
          );

          if (element instanceof HTMLVideoElement) {
            element.autoplay = true;
            element.playsInline = true;
            element.style.width = "100%";
            element.style.height = "100%";
            element.style.objectFit = "cover";
            element.style.background = "#000";
          }

          if (element instanceof HTMLAudioElement) {
            element.autoplay = true;
            element.style.display = "none";
          }

          mediaContainerRef.current.appendChild(element);
          setStatus("Bob LiveAvatar conectado");
        }

        room.on(RoomEvent.TrackSubscribed, attachTrack);

        room.on(RoomEvent.TrackUnsubscribed, (track) => {
          track.detach().forEach((element) => element.remove());
        });

        room.on(RoomEvent.Disconnected, () => {
          setStatus("Bob LiveAvatar desconectado");
        });

        room.on(RoomEvent.MediaDevicesError, (deviceError) => {
          setError(`Error de micrófono: ${deviceError.message}`);
        });

        setStatus("Conectando con LiveKit...");

        await room.connect(
          data.livekitUrl,
          data.livekitClientToken,
          {
            autoSubscribe: true,
          }
        );

        if (cancelled) {
          await room.disconnect();
          return;
        }

        setStatus("Activando micrófono...");

        await room.localParticipant.setMicrophoneEnabled(true);

        setStatus("Esperando video y audio de Bob...");
      } catch (connectionError) {
        const message =
          connectionError instanceof Error
            ? connectionError.message
            : "Error desconocido conectando Bob.";

        setError(message);
        setStatus("No se pudo conectar LiveAvatar");
      }
    }

    void connectAvatar();

    return () => {
      cancelled = true;

      const room = roomRef.current;

      if (room) {
        room.removeAllListeners();
        void room.disconnect();
        roomRef.current = null;
      }

      if (mediaContainerRef.current) {
        mediaContainerRef.current
          .querySelectorAll("video, audio")
          .forEach((element) => element.remove());
      }
    };
  }, [character]);

  return (
    <main
      style={{
        width: "100vw",
        height: "100vh",
        background: "#000",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <div
        ref={mediaContainerRef}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          background: "#000",
        }}
      />

      <div
        style={{
          position: "absolute",
          left: 18,
          bottom: 18,
          zIndex: 20,
          maxWidth: "min(520px, calc(100vw - 36px))",
          borderRadius: 12,
          border: "1px solid rgba(103,232,249,.25)",
          background: "rgba(0,0,0,.72)",
          padding: "10px 14px",
          color: error ? "#fca5a5" : "#67e8f9",
          fontFamily: "Arial, sans-serif",
          fontSize: 14,
          backdropFilter: "blur(10px)",
        }}
      >
        <strong>{character.toUpperCase()}</strong>
        <span style={{ marginLeft: 10 }}>
          {error || status}
        </span>
      </div>
    </main>
  );
}
