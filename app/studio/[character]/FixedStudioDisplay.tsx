"use client";

import { useEffect, useRef, useState } from "react";
import { Room, RoomEvent, Track } from "livekit-client";

export default function FixedStudioDisplay({ character }: { character: "bob" | "lina" }) {
  const [message, setMessage] = useState("Esperando al estudio...");
  const videoRef = useRef<HTMLDivElement>(null);
  const roomRef = useRef<Room | null>(null);

  useEffect(() => {

    let stopped = false;
    let busy = false;
    const check = async () => {
      if (busy || stopped) return;
      busy = true;
      try {
        const response = await fetch("/api/studio/display", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ character }), cache: "no-store",
        });
        const data = await response.json();
        if (!response.ok) {
          setMessage(data.error || "Error de conexión.");

          return;
        }
        if (data.waiting) {
          if (roomRef.current) { await roomRef.current.disconnect(); roomRef.current = null; }
          videoRef.current?.replaceChildren();
          setMessage(`Esperando a ${character === "bob" ? "Bob" : "Lina"} desde La Bestia...`);
          return;
        }
        const currentRoom = roomRef.current;
        if (currentRoom && currentRoom.name === data.room && currentRoom.state === "connected") return;
        if (roomRef.current) await roomRef.current.disconnect();
        const room = new Room({ adaptiveStream: true });
        roomRef.current = room;
        room.on(RoomEvent.TrackSubscribed, (track) => {
          if (track.kind !== Track.Kind.Video || !videoRef.current) return;
          const element = track.attach() as HTMLVideoElement;
          element.autoplay = true;
          element.muted = true;
          element.playsInline = true;
          element.style.width = "100%";
          element.style.height = "100%";
          element.style.objectFit = "contain";
          videoRef.current.replaceChildren(element);
          setMessage("");
        });
        room.on(RoomEvent.Disconnected, () => {
          videoRef.current?.replaceChildren();
          if (!stopped) setMessage("Esperando una nueva sesión desde La Bestia...");
        });
        setMessage("Conectando con la imagen...");
        await room.connect(data.serverUrl, data.token);
        for (const participant of room.remoteParticipants.values()) {
          for (const publication of participant.videoTrackPublications.values()) {
            if (publication.track && videoRef.current) {
              const element = publication.track.attach() as HTMLVideoElement;
              element.autoplay = true;
              element.muted = true;
              element.playsInline = true;
              element.style.width = "100%";
              element.style.height = "100%";
              element.style.objectFit = "contain";
              videoRef.current.replaceChildren(element);
              setMessage("");
            }
          }
        }
      } catch {
        if (!stopped) setMessage("Reconectando con el estudio...");
      } finally { busy = false; }
    };
    void check();
    const timer = setInterval(() => void check(), 5000);
    return () => { stopped = true; clearInterval(timer); void roomRef.current?.disconnect(); roomRef.current = null; };
  }, [character]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-black text-white">
      <div className="relative h-screen w-full bg-black">
        <div ref={videoRef} className="h-full w-full" />
        {message && <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black p-6 text-center">
          <p className="text-xl">{message}</p>

        </div>}
      </div>
    </main>
  );
}
