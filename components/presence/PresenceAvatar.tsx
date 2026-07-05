"use client";

import { useEffect, useState } from "react";

import PresenceVideo from "./PresenceVideo";
import PresenceLive from "./PresenceLive";

import {
  presenceController,
  PresenceMode,
} from "@/lib/PresenceController";

export type PresenceAvatarCharacter =
  | "bob"
  | "lina"
  | "felencho"
  | string;

type PresenceAvatarProps = {
  character: PresenceAvatarCharacter;
  video: string;
};

export default function PresenceAvatar({
  character,
  video,
}: PresenceAvatarProps) {
  const [mode, setMode] = useState<PresenceMode>(
    presenceController.getMode()
  );

  useEffect(() => {
    return presenceController.subscribe(() => {
      setMode(presenceController.getMode());
    });
  }, []);

  if (mode === "live") {
    return <PresenceLive character={character} />;
  }

  return <PresenceVideo src={video} />;
}