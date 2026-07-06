"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import PresenceVideo from "./PresenceVideo";
import PresenceLive from "./PresenceLive";

import StudioSync from "@/lib/StudioSync";
import {
  presenceController,
  PresenceMode,
} from "@/lib/PresenceController";

type PresenceAvatarProps = {
  character: string;
  video: string;
  studioId?: string;
};

export default function PresenceAvatar({
  character,
  video,
  studioId = "new_york_physical",
}: PresenceAvatarProps) {
  const syncRef = useRef<StudioSync | null>(null);

  const [mode, setMode] = useState<PresenceMode>(
    presenceController.getMode(character)
  );

  const [state, setState] = useState(
    presenceController.getStatus(character).state
  );

  const [events, setEvents] = useState<string[]>([]);

  const debug = useMemo(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).has("debug");
  }, []);

  function log(message: string) {
    console.log(`[${character}] ${message}`);

    setEvents((prev) => [
      `${new Date().toLocaleTimeString()}  ${message}`,
      ...prev,
    ].slice(0, 12));
  }

  useEffect(() => {
    log("Montando PresenceAvatar");

    const sync = new StudioSync({
      studioId,
      onLog: log,
    });

    syncRef.current = sync;

    sync.loadInitialState();
    sync.subscribe();

    const unsubscribe = presenceController.subscribe(() => {
      const status = presenceController.getStatus(character);

      setMode(status.mode);
      setState(status.state);

      log(`PresenceController → ${status.mode}/${status.state}`);
    });

    return () => {
      unsubscribe();
      sync.unsubscribe();
      syncRef.current = null;
    };
  }, [character, studioId]);

  if (debug) {
    return (
      <main
        style={{
          width: "100vw",
          height: "100vh",
          background: "#000",
          color: "#00ffff",
          padding: 30,
          fontFamily: "monospace",
        }}
      >
        <h1>{character.toUpperCase()}</h1>

        <p>Studio: {studioId}</p>
        <p>Mode: {mode}</p>
        <p>State: {state}</p>

        <hr style={{ margin: "20px 0" }} />

        <h2>Eventos</h2>

        {events.map((e, i) => (
          <div key={i}>{e}</div>
        ))}
      </main>
    );
  }

  if (mode === "live") {
    return <PresenceLive character={character} />;
  }

  return <PresenceVideo src={video} />;
}