"use client";

import { useEffect, useRef, useState } from "react";

import PresenceVideo from "./PresenceVideo";
import PresenceLive from "./PresenceLive";

import StudioSync from "@/lib/StudioSync";
import {
  presenceController,
  PresenceMode,
} from "@/lib/PresenceController";

export type PresenceAvatarCharacter = "bob" | "lina" | "felencho" | string;

type PresenceAvatarProps = {
  character: PresenceAvatarCharacter;
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

  useEffect(() => {
    const sync = new StudioSync({
      studioId,
      onLog: (message) => console.log("[PresenceAvatar]", message),
    });

    syncRef.current = sync;

    sync.loadInitialState();
    sync.subscribe();

    const unsubscribePresence = presenceController.subscribe(() => {
      setMode(presenceController.getMode(character));
    });

    return () => {
      unsubscribePresence();
      sync.unsubscribe();
      syncRef.current = null;
    };
  }, [character, studioId]);

  if (mode === "live") {
    return <PresenceLive character={character} />;
  }

  return <PresenceVideo src={video} />;
}