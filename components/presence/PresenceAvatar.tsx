"use client";

import PresenceVideo from "./PresenceVideo";
import PresenceLive from "./PresenceLive";

export type PresenceAvatarMode = "presence" | "live";

export type PresenceAvatarCharacter =
  | "bob"
  | "lina"
  | "felencho"
  | string;

type PresenceAvatarProps = {
  character: PresenceAvatarCharacter;
  video: string;
  mode?: PresenceAvatarMode;
};

export default function PresenceAvatar({
  character,
  video,
  mode = "presence",
}: PresenceAvatarProps) {
  if (mode === "live") {
    return <PresenceLive character={character} />;
  }

  return <PresenceVideo src={video} />;
}