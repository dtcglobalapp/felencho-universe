import type { AvatarViseme } from "./avatar-events";

export const AVATAR_VISEMES: AvatarViseme[] = [
  "REST",
  "A",
  "E",
  "I",
  "O",
  "U",
  "M",
  "F",
  "L",
  "S",
];

export type VisemeFrame = {
  viseme: AvatarViseme;
  intensity: number;
  startMs: number;
  durationMs: number;
};

export type VisemeTimeline = {
  character: string;
  durationMs: number;
  frames: VisemeFrame[];
};
