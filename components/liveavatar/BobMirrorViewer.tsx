"use client";

import { useEffect, useRef, useState } from "react";
import { createClient, RealtimeChannel } from "@supabase/supabase-js";

type SignalPayload = {
  sender: string;
  target?: string;
  type: "viewer-ready" | "offer" | "answer" | "ice";
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function getRoomId() {
  if (typeof window === "undefined") return "bob-studio";

  const params = new URLSearchParams(window.location.search);
  return params.get("room") || "bob-studio";
}

export default function BobMirrorViewer() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const clientIdRef = useRef(
    `viewer-${Math.random().toString(36).slice(2)}`
  );

  const [status, setStatus] = useState("Esperando a La Bestia...");
  const [error, setError] = useState("");

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

    async function sendSignal(payload: SignalPayload) {
      await channel.send({
        type: "broadcast",
        event: "signal",
        payload,
      });
    }

    async function createPeer(controllerId: string) {
      if (peerRef.current) {
        peerRef.current.close();
      }

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

      peerRef.current = peer;

      peer.ontrack = async (event) => {
        const stream = event.streams[0];

        if (!stream || !videoRef.current) return;

        videoRef.current.srcObject = stream;

        try {
          await videoRef.current.play();
        } catch {
          setStatus("Pulsa la pantalla para activar el video");
        }
      };

      peer.onicecandidate = (event) => {
        if (!event.candidate) return;

        void sendSignal({
          sender: clientIdRef.current,
          target: controllerId,
          type: "ice",
          candidate: event.candidate.toJSON(),
        });
      };

      peer.onconnectionstatechange = () => {
        setStatus(`Conexión: ${peer.connectionState}`);

        if (peer.connectionState === "connected") {
          setStatus("Bob conectado desde La Bestia");
        }

        if (peer.connectionState === "failed") {
          setError(
            "La conexión WebRTC falló. Confirma que ambas computadoras estén en la misma red."
          );
        }
      };

      return peer;
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
            if (signal.type === "offer" && signal.sdp) {
              const peer = await createPeer(signal.sender);

              await peer.setRemoteDescription(
                new RTCSessionDescription(signal.sdp)
              );

              const answer = await peer.createAnswer();
              await peer.setLocalDescription(answer);

              await sendSignal({
                sender: clientIdRef.current,
                target: signal.sender,
                type: "answer",
                sdp: answer,
              });

              setStatus("Recibiendo video desde La Bestia...");
              return;
            }

            if (
              signal.type === "ice" &&
              signal.candidate &&
              peerRef.current
            ) {
              await peerRef.current.addIceCandidate(
                new RTCIceCandidate(signal.candidate)
              );
            }
          } catch (signalError) {
            const message =
              signalError instanceof Error
                ? signalError.message
                : "Error procesando señal WebRTC.";

            setError(message);
          }
        }
      )
      .subscribe(async (subscriptionStatus) => {
        setStatus(`Canal: ${subscriptionStatus}`);

        if (subscriptionStatus === "SUBSCRIBED") {
          await sendSignal({
            sender: clientIdRef.current,
            type: "viewer-ready",
          });

          setStatus("Esperando video de Bob...");
        }
      });

    return () => {
      if (peerRef.current) {
        peerRef.current.close();
        peerRef.current = null;
      }

      void channel.unsubscribe();
      channelRef.current = null;
    };
  }, []);

  async function activatePlayback() {
    try {
      await videoRef.current?.play();
      setStatus("Bob conectado desde La Bestia");
    } catch {
      setError("El navegador bloqueó la reproducción automática.");
    }
  }

  return (
    <main
      onClick={activatePlayback}
      style={{
        position: "relative",
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        background: "#000",
        cursor: "none",
      }}
    >
      <video
        ref={videoRef}
        autoPlay
        muted
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

      <div
        style={{
          position: "absolute",
          left: 18,
          bottom: 18,
          zIndex: 40,
          maxWidth: "calc(100vw - 36px)",
          border: "1px solid rgba(34,211,238,.3)",
          borderRadius: 12,
          background: "rgba(0,0,0,.78)",
          padding: "10px 14px",
          color: error ? "#fca5a5" : "#67e8f9",
          fontFamily: "Arial, sans-serif",
          fontSize: 14,
        }}
      >
        <strong>BOB TV VIEWER</strong>

        <span style={{ marginLeft: 10 }}>
          {error || status}
        </span>

        <span style={{ marginLeft: 10 }}>
          Audio TV: apagado
        </span>
      </div>
    </main>
  );
}
