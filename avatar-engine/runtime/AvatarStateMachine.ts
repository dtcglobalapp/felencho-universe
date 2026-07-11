import type { AvatarState } from "../contracts/avatar-states";
import { DEFAULT_AVATAR_STATE } from "../contracts/avatar-states";
import {
  avatarEventBus,
  AvatarEventBus,
} from "./AvatarEventBus";

const ALLOWED_TRANSITIONS: Record<
  AvatarState,
  AvatarState[]
> = {
  sleeping: ["waking", "error"],
  waking: ["idle", "listening", "error"],
  idle: [
    "listening",
    "thinking",
    "speaking",
    "returning_to_presence",
    "error",
  ],
  listening: [
    "thinking",
    "speaking",
    "reacting",
    "returning_to_presence",
    "error",
  ],
  thinking: [
    "speaking",
    "listening",
    "error",
  ],
  speaking: [
    "listening",
    "reacting",
    "interrupting",
    "returning_to_presence",
    "error",
  ],
  reacting: [
    "listening",
    "thinking",
    "speaking",
    "returning_to_presence",
    "error",
  ],
  interrupting: [
    "speaking",
    "listening",
    "error",
  ],
  returning_to_presence: [
    "sleeping",
    "error",
  ],
  error: [
    "sleeping",
    "idle",
  ],
};

export class AvatarStateMachine {
  private state: AvatarState;

  constructor(
    private readonly character: string,
    initialState: AvatarState = DEFAULT_AVATAR_STATE,
    private readonly bus: AvatarEventBus = avatarEventBus
  ) {
    this.state = initialState;
  }

  getState(): AvatarState {
    return this.state;
  }

  canTransition(nextState: AvatarState): boolean {
    if (nextState === this.state) {
      return true;
    }

    return ALLOWED_TRANSITIONS[this.state].includes(
      nextState
    );
  }

  transition(
    nextState: AvatarState,
    force = false
  ): AvatarState {
    if (
      !force &&
      !this.canTransition(nextState)
    ) {
      throw new Error(
        `Transición inválida para ${this.character}: ${this.state} -> ${nextState}`
      );
    }

    this.state = nextState;

    this.bus.emit({
      type: "avatar.state.change",
      character: this.character,
      state: nextState,
      timestamp: Date.now(),
    });

    return this.state;
  }

  reset(): AvatarState {
    this.state = DEFAULT_AVATAR_STATE;

    this.bus.emit({
      type: "avatar.reset",
      character: this.character,
      timestamp: Date.now(),
    });

    this.bus.emit({
      type: "avatar.state.change",
      character: this.character,
      state: this.state,
      timestamp: Date.now(),
    });

    return this.state;
  }
}
