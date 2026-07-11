import type {
  AvatarEmotion,
  AvatarViseme,
} from "../contracts/avatar-events";
import type { AvatarState } from "../contracts/avatar-states";

export type AvatarCharacterConfig = {
  id: string;
  name: string;
  role: string;
  language: string;
  presenceVideo: string;
  initialState: AvatarState;
  initialEmotion: AvatarEmotion;
  initialViseme: AvatarViseme;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    text: string;
  };
  motion: {
    breathingDurationMs: number;
    blinkMinMs: number;
    blinkMaxMs: number;
    headMotionEnabled: boolean;
  };
  audio: {
    outputOwner: "bestia";
    tvMuted: true;
  };
};

export const bobConfig: AvatarCharacterConfig = {
  id: "bob",
  name: "Bob",
  role: "Hermano digital sabio y místico",
  language: "es",
  presenceVideo: "/videos/bob.mp4",
  initialState: "sleeping",
  initialEmotion: "neutral",
  initialViseme: "REST",
  colors: {
    primary: "#67e8f9",
    secondary: "#a78bfa",
    background: "#000000",
    text: "#ffffff",
  },
  motion: {
    breathingDurationMs: 5200,
    blinkMinMs: 2800,
    blinkMaxMs: 7200,
    headMotionEnabled: true,
  },
  audio: {
    outputOwner: "bestia",
    tvMuted: true,
  },
};
