"use client";

import { useEffect, useRef, useState } from "react";
import { Room, RoomEvent, Track } from "livekit-client";

export default function StudioDisplay() {
  const videoRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState("Conectando pantalla...");

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const server = params.get("server");
    const token = params.get("token");
    const character = params.get("character");
    if (!server || !token || !["bob", "lina"].includes(character || "")) {
      setStatus("Enlace de pantalla inválido. Cópialo desde La Bestia.");
      return;
    }
    const room = new Room({ adaptiveStream: true });
    let disposed = false;
    let videoReceived = false;
    room.on(RoomEvent.TrackSubscribed, (track) => {
      if (track.kind !== Track.Kind.Video || !videoRef.current) return;
      const element = track.attach() as HTMLVideoElement;
      element.autoplay = true;
      element.playsInline = true;
      element.muted = true;
      element.style.width = "100%";
      element.style.height = "100%";
      element.style.objectFit = "contain";
      videoRef.current.replaceChildren(element);
      videoReceived = true;
      setStatus("");
    });
    room.on(RoomEvent.Disconnected, () => {
      if (!disposed) setStatus("La sesión terminó. Inicia otra desde La Bestia.");
    });
    void room.connect(server, token).then(() => {
      if (!disposed && !videoReceived) setStatus("Esperando video del personaje...");
    }).catch(() => {
      if (!disposed) setStatus("No se pudo conectar. Genera otro enlace desde La Bestia.");
    });
    return () => {
      disposed = true;
      void room.disconnect();
    };
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-black text-white">
      <div className="relative h-screen w-full overflow-hidden bg-black">
        <div ref={videoRef} className="h-full w-full" />
        {status && <div className="absolute inset-0 flex items-center justify-center p-8 text-center text-xl">{status}</div>}
      </div>
    </main>
  );
}
