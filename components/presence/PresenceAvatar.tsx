"use client";

import PresenceVideo from "./PresenceVideo";

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
  return (
    <section
      data-character={character}
      style={{
        width: "100vw",
        height: "100vh",
        background: "#000",
        overflow: "hidden",
        cursor: "none",
      }}
    >
      <PresenceVideo src={video} />
    </section>
  );
}