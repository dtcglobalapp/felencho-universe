"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Room,
  RoomEvent,
  Track,
  type RemoteParticipant,
  type RemoteTrack,
  type RemoteTrackPublication,
} from "livekit-client";

type PresenceLiveProps = {
  character: string;
};

type SessionResponse = {
  success?: boolean;
  sessionId?: string;
  livekitUrl?: string;
  livekitClientToken?: string;
  error?: string;
  details?: unknown;
};

export default function PresenceLive({
  character,
}: PresenceLiveProps) {
  const roomRef = useRef<Room | null>(null);
  const mediaRef = useRef<HTMLDivElement | null>(null);

  const [status, setStatus] = useState("Preparando conexión...");
  const [error, setError] = useState("");
  const [needsActivation, setNeedsActivation] = useState(false);
  const [connected, setConnected] = useState(false);

  const attachTrack = useCallback(
    (
      track: RemoteTrack,
      _publication?: RemoteTrackPublication,
      participant?: RemoteParticipant
    ) => {
      const container = mediaRef.current;

      if (!container) return;

      if (
        track.kind !== Track.Kind.Video &&
        track.kind !== Track.Kind.Audio
      ) {
        return;
      }

      const alreadyAttached = container.querySelector(
        `[data-track-sid="${track.sid || ""}"]`
      );

      if (alreadyAttached) return;

      const element = track.attach();

      element.dataset.trackSid = track.sid || "";
      element.dataset.participant = participant?.identity || "remote";

      if (element instanceof HTMLVideoElement) {
        element.autoplay = true;
        element.playsInline = true;
        element.muted = false;
        element.style.position = "absolute";
        element.style.inset = "0";
        element.style.width = "100%";
        element.style.height = "100%";
        element.style.objectFit = "cover";
        element.style.background = "#000";
      }

      if (element instanceof HTMLAudioElement) {
        element.autoplay = true;
        element.style.display = "none";
      }

      container.appendChild(element);

      setStatus(
        track.kind === Track.Kind.Video
          ? "Video de Bob conectado"
          : "Audio de Bob conectado"
      );
    },
    []
  );

  const attachExistingTracks = useCallback(() => {
    const room = roomRef.current;

    if (!room) return;

    room.remoteParticipants.forEach((participant) => {
      participant.trackPublications.forEach((publication) => {
        if (publication.track) {
          attachTrack(
            publication.track,
            publication,
            participant
          );
        }
      });
    });
  }, [attachTrack]);

  const activateAudioAndMicrophone = useCallback(async () => {
    const room = roomRef.current;

    if (!room) return;

    try {
      setError("");
      setStatus("Activando audio y micrófono...");

      await room.startAudio();
      await room.localParticipant.setMicrophoneEnabled(true);

      attachExistingTracks();

      setNeedsActivation(false);
      setStatus("Bob está escuchando");
    } catch (activationError) {
      const message =
        activationError instanceof Error
          ? activationError.message
          : "No se pudo activar el micrófono.";

      setError(message);
      setNeedsActivation(true);
    }
  }, [attachExistingTracks]);

  useEffect(() => {
    if (character !== "bob") {
      setStatus(`${character} todavía no está conectado a LiveAvatar.`);
      return;
    }

    let cancelled = false;

    async function connect() {
      try {
        setStatus("Creando sesión de Bob...");

        const response = await fetch(
          "/api/liveavatar/session-token",
          {
            method: "POST",
            cache: "no-store",
          }
        );

        const data = (await response.json()) as SessionResponse;

        if (!response.ok) {
          throw new Error(
            data.error ||
              JSON.stringify(data.details) ||
              "LiveAvatar rechazó la sesión."
          );
        }

        if (!data.livekitUrl || !data.livekitClientToken) {
          throw new Error(
            "Faltan las credenciales de LiveKit."
          );
        }

        if (cancelled) return;

        const room = new Room({
          adaptiveStream: true,
          dynacast: true,
        });

        roomRef.current = room;

        room.on(
          RoomEvent.TrackSubscribed,
          (
            track,
            publication,
            participant
          ) => {
            attachTrack(track, publication, participant);
          }
        );

        room.on(RoomEvent.ParticipantConnected, (participant) => {
          setStatus(`Conectado: ${participant.identity}`);
        });

        room.on(RoomEvent.AudioPlaybackStatusChanged, () => {
          if (!room.canPlaybackAudio) {
            setNeedsActivation(true);
            setStatus("Pulsa para activar el audio");
          }
        });

        room.on(RoomEvent.Disconnected, () => {
          setConnected(false);
          setStatus("Sesión desconectada");
        });

        setStatus("Entrando a la sala LiveKit...");

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

        setConnected(true);
        setStatus("Esperando a Bob...");

        attachExistingTracks();

        try {
          await room.localParticipant.setMicrophoneEnabled(true);
          setStatus("Micrófono activo. Esperando a Bob...");
        } catch {
          setNeedsActivation(true);
          setStatus("Pulsa para activar audio y micrófono");
        }

        window.setTimeout(() => {
          attachExistingTracks();
        }, 1500);

        window.setTimeout(() => {
          attachExistingTracks();
        }, 4000);
      } catch (connectionError) {
        const message =
          connectionError instanceof Error
            ? connectionError.message
            : "Error desconocido.";

        setError(message);
        setStatus("No se pudo conectar");
      }
    }

    void connect();

    return () => {
      cancelled = true;

      const room = roomRef.current;

      if (room) {
        room.removeAllListeners();
        void room.disconnect();
        roomRef.current = null;
      }

      mediaRef.current
        ?.querySelectorAll("video, audio")
        .forEach((element) => element.remove());
    };
  }, [attachExistingTracks, attachTrack, character]);

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
      <div
        ref={mediaRef}
        style={{
          position: "absolute",
          inset: 0,
          background: "#000",
        }}
      />

      {needsActivation && (
        <button
          type="button"
          onClick={activateAudioAndMicrophone}
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 30,
            margin: "auto",
            width: 280,
            height: 64,
            border: "1px solid rgba(34,211,238,.5)",
            borderRadius: 16,
            background: "rgba(8,15,20,.92)",
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
          border: "1px solid rgba(34,211,238,.25)",
          borderRadius: 12,
          background: "rgba(0,0,0,.78)",
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

        {connected && !error && (
          <span style={{ marginLeft: 10, color: "#86efac" }}>
            ● conectado
          </span>
        )}
      </div>
    </main>
  );
}
