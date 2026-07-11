export const AVATAR_STATES = [
  "sleeping",
  "waking",
  "idle",
  "listening",
  "thinking",
  "speaking",
  "reacting",
  "interrupting",
  "returning_to_presence",
  "error",
] as const;

export type AvatarState = (typeof AVATAR_STATES)[number];

export const DEFAULT_AVATAR_STATE: AvatarState = "sleeping";

export const AVATAR_STATE_LABELS: Record<AvatarState, string> = {
  sleeping: "Durmiendo",
  waking: "Despertando",
  idle: "En espera",
  listening: "Escuchando",
  thinking: "Pensando",
  speaking: "Hablando",
  reacting: "Reaccionando",
  interrupting: "Interrumpiendo",
  returning_to_presence: "Regresando a Presence",
  error: "Error",
};
