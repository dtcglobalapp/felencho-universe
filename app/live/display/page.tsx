"use client";

import { useEffect, useRef, useState } from "react";
import { Room, RoomEvent, Track } from "livekit-client";

export default function StudioDisplay() {
  const videoRef = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState(false);
  const [status, setStatus] = useState("");
  const [character, setCharacter] = useState<"bob" | "lina">("bob");

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const server = params.get("server");
    const token = params.get("token");
    const selected = params.get("character");
    if (selected !== "bob" && selected !== "lina") {
      setStatus("Selecciona una pantalla de Bob o Lina.");
      return;
    }
    setCharacter(selected);
    if (!server || !token) return; // Presence mode requires no LiveKit session.
    const room = new Room({ adaptiveStream: true });
    let disposed = false;
    const reset = () => {
      if (disposed) return;
      videoRef.current?.replaceChildren();
      setLive(false);
      setStatus("");
    };
    room.on(RoomEvent.TrackSubscribed, (track, _publication, participant) => {
      if (track.kind !== Track.Kind.Video || participant.identity !== "felencho-avatar-" + selected || !videoRef.current) return;
      const element = track.attach() as HTMLVideoElement;
      element.autoplay = true;
      element.playsInline = true;
      element.muted = true;
      element.style.width = "100%";
      element.style.height = "100%";
      element.style.objectFit = "contain";
      videoRef.current.replaceChildren(element);
      setLive(true);
      setStatus("");
    });
    room.on(RoomEvent.TrackUnsubscribed, (track, _publication, participant) => {
      if (track.kind === Track.Kind.Video && participant.identity === "felencho-avatar-" + selected) reset();
    });
    room.on(RoomEvent.Disconnected, reset);
    void room.connect(server, token).catch(() => {
      if (!disposed) reset();
    });
    return () => {
      disposed = true;
      void room.disconnect();
    };
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-black text-white">
      <div className="relative h-screen w-full overflow-hidden bg-black">
        <video src={"/videos/" + character + ".mp4"} autoPlay muted loop playsInline controls={false}
          className="absolute inset-0 h-full w-full object-cover" style={{ display: live ? "none" : "block" }} />
        <div ref={videoRef} className="absolute inset-0 h-full w-full" style={{ display: live ? "block" : "none" }} />
        {status && <div className="absolute inset-0 flex items-center justify-center p-8 text-center text-xl">{status}</div>}
      </div>
    </main>
  );
}
