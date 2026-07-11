import type { AvatarState } from "./avatar-states";

export const AVATAR_EVENT_TYPES = [
  "avatar.state.change",
  "avatar.emotion.change",
  "avatar.viseme.change",
  "avatar.blink",
  "avatar.look",
  "avatar.head",
  "avatar.audio.level",
  "avatar.reset",
] as const;

export type AvatarEventType =
  (typeof AVATAR_EVENT_TYPES)[number];

export type AvatarEmotion =
  | "neutral"
  | "happy"
  | "serious"
  | "concerned"
  | "surprised"
  | "thinking"
  | "amused"
  | "sad"
  | "inspired";

export type AvatarViseme =
  | "REST"
  | "A"
  | "E"
  | "I"
  | "O"
  | "U"
  | "M"
  | "F"
  | "L"
  | "S";

export type AvatarLookDirection =
  | "center"
  | "left"
  | "right"
  | "up"
  | "down";

export type AvatarHeadMotion =
  | "neutral"
  | "nod"
  | "shake"
  | "tilt_left"
  | "tilt_right";

export type AvatarEngineEvent =
  | {
      type: "avatar.state.change";
      character: string;
      state: AvatarState;
      timestamp: number;
    }
  | {
      type: "avatar.emotion.change";
      character: string;
      emotion: AvatarEmotion;
      timestamp: number;
    }
  | {
      type: "avatar.viseme.change";
      character: string;
      viseme: AvatarViseme;
      intensity: number;
      timestamp: number;
    }
  | {
      type: "avatar.blink";
      character: string;
      timestamp: number;
    }
  | {
      type: "avatar.look";
      character: string;
      direction: AvatarLookDirection;
      timestamp: number;
    }
  | {
      type: "avatar.head";
      character: string;
      motion: AvatarHeadMotion;
      timestamp: number;
    }
  | {
      type: "avatar.audio.level";
      character: string;
      level: number;
      timestamp: number;
    }
  | {
      type: "avatar.reset";
      character: string;
      timestamp: number;
    };

export type AvatarEventListener = (
  event: AvatarEngineEvent
) => void;
