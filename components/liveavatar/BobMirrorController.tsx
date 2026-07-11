"use client";

import { useEffect, useRef, useState } from "react";
import { createClient, RealtimeChannel } from "@supabase/supabase-js";
import {
  AgentEventsEnum,
  LiveAvatarSession,
  SessionEvent,
  VoiceChatEvent,
  VoiceChatState,
} from "@heygen/liveavatar-web-sdk";

type TokenResponse = {
  success?: boolean;
  sessionToken?: string;
  error?: string;
  details?: unknown;
};

type SignalPayload = {
  sender: string;
  target?: string;
  type: "viewer-ready" | "offer" | "answer" | "ice";
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
};

type CaptureStreamVideo = HTMLVideoElement & {
  captureStream?: () => MediaStream;
  webkitCaptureStream?: () => MediaStream;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function getRoomId() {
  if (typeof window === "undefined") return "bob-studio";

  const params = new URLSearchParams(window.location.search);
  return params.get("room") || "bob-studio";
}

function getCapturedStream(video: CaptureStreamVideo): MediaStream | null {
  if (typeof video.captureStream === "function") {
    return video.captureStream();
  }

  if (typeof video.webkitCaptureStream === "function") {
    return video.webkitCaptureStream();
  }

  return null;
}

export default function BobMirrorController() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const sessionRef = useRef<LiveAvatarSession | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const clientIdRef = useRef(
    `controller-${Math.random().toString(36).slice(2)}`
  );

  const [status, setStatus] = useState("Preparando controlador...");
  const [error, setError] = useState("");
  const [viewerCount, setViewerCount] = useState(0);
  const [needsActivation, setNeedsActivation] = useState(false);

  async function activateVoice() {
    const session = sessionRef.current;

    if (!session) return;

    try {
      setError("");
      setStatus("Activando micrófono...");

      if (session.voiceChat.state === VoiceChatState.INACTIVE) {
        await session.voiceChat.start();
      }

      await session.voiceChat.unmute();

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
  }

  useEffect(() => {
    if (!supabaseUrl || !supabaseAnonKey) {
      setError(
        "Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY."
      );
      return;
    }

    const roomId = getRoomId();
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const channel = supabase.channel(`bob-mirror:${roomId}`, {
      config: {
        broadcast: {
          self: false,
        },
      },
    });

    channelRef.current = channel;

    let cancelled = false;
    let capturedStream: MediaStream | null = null;

    async function sendSignal(payload: SignalPayload) {
      await channel.send({
        type: "broadcast",
        event: "signal",
        payload,
      });
    }

    function removePeer(viewerId: string) {
      const peer = peersRef.current.get(viewerId);

      if (peer) {
        peer.close();
        peersRef.current.delete(viewerId);
        setViewerCount(peersRef.current.size);
      }
    }

    async function createPeerForViewer(viewerId: string) {
      if (!capturedStream) {
        setStatus(
          "La TV está esperando, pero el video de Bob aún no está listo."
        );
        return;
      }

      removePeer(viewerId);

      const peer = new RTCPeerConnection({
        iceServers: [
          {
            urls: "stun:stun.l.google.com:19302",
          },
          {
            urls: "stun:stun1.l.google.com:19302",
          },
        ],
      });

      peersRef.current.set(viewerId, peer);
      setViewerCount(peersRef.current.size);

      for (const track of capturedStream.getTracks()) {
        peer.addTrack(track, capturedStream);
      }

      peer.onicecandidate = (event) => {
        if (!event.candidate) return;

        void sendSignal({
          sender: clientIdRef.current,
          target: viewerId,
          type: "ice",
          candidate: event.candidate.toJSON(),
        });
      };

      peer.onconnectionstatechange = () => {
        const state = peer.connectionState;

        setStatus(`TV ${viewerId.slice(-6)}: ${state}`);

        if (
          state === "failed" ||
          state === "closed" ||
          state === "disconnected"
        ) {
          removePeer(viewerId);
        }
      };

      const offer = await peer.createOffer({
        offerToReceiveAudio: false,
        offerToReceiveVideo: false,
      });

      await peer.setLocalDescription(offer);

      await sendSignal({
        sender: clientIdRef.current,
        target: viewerId,
        type: "offer",
        sdp: offer,
      });
    }

    channel
      .on(
        "broadcast",
        {
          event: "signal",
        },
        async ({ payload }) => {
          const signal = payload as SignalPayload;

          if (!signal || signal.sender === clientIdRef.current) {
            return;
          }

          if (
            signal.target &&
            signal.target !== clientIdRef.current
          ) {
            return;
          }

          try {
            if (signal.type === "viewer-ready") {
              await createPeerForViewer(signal.sender);
              return;
            }

            const peer = peersRef.current.get(signal.sender);

            if (!peer) return;

            if (signal.type === "answer" && signal.sdp) {
              await peer.setRemoteDescription(
                new RTCSessionDescription(signal.sdp)
              );
              return;
            }

            if (signal.type === "ice" && signal.candidate) {
              await peer.addIceCandidate(
                new RTCIceCandidate(signal.candidate)
              );
            }
          } catch (signalError) {
            console.error("Error procesando señal:", signalError);
          }
        }
      )
      .subscribe((subscriptionStatus) => {
        setStatus(`Canal de TV: ${subscriptionStatus}`);
      });

    async function startBob() {
      try {
        setStatus("Solicitando una única sesión LiveAvatar...");

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
              "No se recibió sessionToken."
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
            setStatus(`LiveAvatar: ${String(state)}`);
          }
        );

        session.on(
          SessionEvent.SESSION_STREAM_READY,
          async () => {
            const video = videoRef.current as CaptureStreamVideo | null;

            if (!video) return;

            session.attach(video);

            try {
              await video.play();
            } catch {
              // Chrome puede requerir una interacción del usuario.
            }

            capturedStream = getCapturedStream(video);

            if (!capturedStream) {
              setError(
                "Este navegador no permite capturar el video. Abre el controlador en Google Chrome."
              );
              return;
            }

            setStatus(
              "Bob conectado. Esperando la PC de la TV..."
            );
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
          AgentEventsEnum.USER_TRANSCRIPTION,
          (event) => {
            setStatus(`Felencho: ${event.text}`);
          }
        );

        session.on(
          AgentEventsEnum.AVATAR_TRANSCRIPTION,
          (event) => {
            setStatus(`Bob: ${event.text}`);
          }
        );

        session.on(
          AgentEventsEnum.AVATAR_SPEAK_STARTED,
          () => {
            setStatus("Bob está hablando");
          }
        );

        session.on(
          AgentEventsEnum.AVATAR_SPEAK_ENDED,
          () => {
            setStatus("Bob está escuchando");
          }
        );

        await session.start();

        if (cancelled) {
          await session.stop();
          return;
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
            : "Error desconocido iniciando Bob.";

        setError(message);
        setStatus("No se pudo iniciar Bob");
      }
    }

    void startBob();

    return () => {
      cancelled = true;

      for (const peer of peersRef.current.values()) {
        peer.close();
      }

      peersRef.current.clear();

      if (capturedStream) {
        for (const track of capturedStream.getTracks()) {
          track.stop();
        }
      }

      const session = sessionRef.current;

      if (session) {
        session.removeAllListeners();
        session.voiceChat.removeAllListeners();
        void session.stop();
        sessionRef.current = null;
      }

      void channel.unsubscribe();
      channelRef.current = null;
    };
  }, []);

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
            width: 320,
            height: 72,
            margin: "auto",
            border: "1px solid rgba(34,211,238,.65)",
            borderRadius: 16,
            background: "rgba(5,12,18,.96)",
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
          border: "1px solid rgba(34,211,238,.35)",
          borderRadius: 12,
          background: "rgba(0,0,0,.82)",
          padding: "12px 15px",
          color: error ? "#fca5a5" : "#67e8f9",
          fontFamily: "Arial, sans-serif",
          fontSize: 14,
        }}
      >
        <strong>BOB CONTROLLER</strong>

        <span style={{ marginLeft: 10 }}>
          {error || status}
        </span>

        <span style={{ marginLeft: 10 }}>
          TV conectadas: {viewerCount}
        </span>
      </div>
    </main>
  );
}
