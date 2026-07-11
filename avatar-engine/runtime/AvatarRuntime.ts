import type {
  AvatarEmotion,
  AvatarViseme,
} from "../contracts/avatar-events";
import type { AvatarState } from "../contracts/avatar-states";
import type { AvatarCharacterConfig } from "../characters/bob.config";
import {
  avatarEventBus,
  AvatarEventBus,
} from "./AvatarEventBus";
import { AvatarStateMachine } from "./AvatarStateMachine";

export class AvatarRuntime {
  readonly stateMachine: AvatarStateMachine;

  private emotion: AvatarEmotion;
  private viseme: AvatarViseme;
  private audioLevel = 0;

  constructor(
    readonly config: AvatarCharacterConfig,
    private readonly bus: AvatarEventBus = avatarEventBus
  ) {
    this.stateMachine = new AvatarStateMachine(
      config.id,
      config.initialState,
      bus
    );

    this.emotion = config.initialEmotion;
    this.viseme = config.initialViseme;
  }

  getState(): AvatarState {
    return this.stateMachine.getState();
  }

  getEmotion(): AvatarEmotion {
    return this.emotion;
  }

  getViseme(): AvatarViseme {
    return this.viseme;
  }

  getAudioLevel(): number {
    return this.audioLevel;
  }

  setState(
    state: AvatarState,
    force = false
  ): void {
    this.stateMachine.transition(state, force);
  }

  setEmotion(emotion: AvatarEmotion): void {
    this.emotion = emotion;

    this.bus.emit({
      type: "avatar.emotion.change",
      character: this.config.id,
      emotion,
      timestamp: Date.now(),
    });
  }

  setViseme(
    viseme: AvatarViseme,
    intensity = 1
  ): void {
    this.viseme = viseme;

    this.bus.emit({
      type: "avatar.viseme.change",
      character: this.config.id,
      viseme,
      intensity: Math.max(
        0,
        Math.min(1, intensity)
      ),
      timestamp: Date.now(),
    });
  }

  setAudioLevel(level: number): void {
    this.audioLevel = Math.max(
      0,
      Math.min(1, level)
    );

    this.bus.emit({
      type: "avatar.audio.level",
      character: this.config.id,
      level: this.audioLevel,
      timestamp: Date.now(),
    });
  }

  blink(): void {
    this.bus.emit({
      type: "avatar.blink",
      character: this.config.id,
      timestamp: Date.now(),
    });
  }

  reset(): void {
    this.emotion =
      this.config.initialEmotion;
    this.viseme =
      this.config.initialViseme;
    this.audioLevel = 0;

    this.stateMachine.reset();
  }
}
