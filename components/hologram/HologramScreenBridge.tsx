"use client";

import { useEffect, useRef } from "react";
import { subscribeHologramVoice, type HologramCharacter, type HologramSignal } from "@/lib/HologramAudioBridge";

/** Studio television: only the remote, mute visual canvas. No file picker, controls or loop. */
export default function HologramScreenBridge({ character }: { character: HologramCharacter }) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const last = useRef<{ session: string; sequence: number } | null>(null);
  useEffect(() => {
    return subscribeHologramVoice((frame: HologramSignal) => {
      if (frame.character !== character) return;
      const previous = last.current;
      if (previous?.session === frame.session && frame.sequence <= previous.sequence) return;
      last.current = { session: frame.session, sequence: frame.sequence };
      iframeRef.current?.contentWindow?.postMessage({
        type: "felencho-hologram-frame",
        frame,
      }, window.location.origin);
    });
  }, [character]);
  return (
    <main style={{ background: "#020710", height: "100dvh", width: "100vw", margin: 0, overflow: "hidden" }}>
      <iframe
        ref={iframeRef}
        title={character === "bob" ? "Bob hologram" : "Lina hologram"}
        src={`/hologram-engine/engine.html?character=${character}&mode=display`}
        style={{ width: "100%", height: "100%", border: 0 }}
        allow="autoplay"
      />
    </main>
  );
}
