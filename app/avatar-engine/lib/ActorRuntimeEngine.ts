import type {
  ActorDefinition,
  ActorRuntimeState,
} from "../types/Actor";

interface BlinkCycle {
  active: boolean;
  elapsedMs: number;
  nextBlinkAtMs: number;
}

const DEFAULT_STATE: ActorRuntimeState = {
  eyeX: 0,
  eyeY: 0,

  blinkLeft: 0,
  blinkRight: 0,

  eyebrowLeft: 0,
  eyebrowRight: 0,

  jawOpen: 0,

  smile: 0,
  sadness: 0,
  anger: 0,
  surprise: 0,

  headX: 0,
  headY: 0,
  headRotation: 0,

  bodyOffsetY: 0,
  bodyScale: 1,
};

function clamp(
  value: number,
  minimum: number,
  maximum: number,
): number {
  return Math.min(
    maximum,
    Math.max(minimum, value),
  );
}

function randomBetween(
  minimum: number,
  maximum: number,
): number {
  return (
    minimum +
    Math.random() * (maximum - minimum)
  );
}

function smoothToward(
  current: number,
  target: number,
  smoothing: number,
  deltaSeconds: number,
): number {
  const factor =
    1 - Math.exp(-smoothing * deltaSeconds);

  return current + (target - current) * factor;
}

export class ActorRuntimeEngine {
  private readonly definition: ActorDefinition;

  private readonly state: ActorRuntimeState = {
    ...DEFAULT_STATE,
  };

  private targetEyeX = 0;
  private targetEyeY = 0;

  private totalElapsedMs = 0;

  private readonly blink: BlinkCycle = {
    active: false,
    elapsedMs: 0,
    nextBlinkAtMs: 2400,
  };

  public constructor(
    definition: ActorDefinition,
  ) {
    this.definition = definition;
    this.scheduleNextBlink();
  }

  public setEyeTarget(
    eyeX: number,
    eyeY: number,
  ): void {
    this.targetEyeX = clamp(eyeX, -1, 1);
    this.targetEyeY = clamp(eyeY, -1, 1);
  }

  public update(
    deltaMs: number,
  ): ActorRuntimeState {
    const safeDeltaMs = clamp(
      Number.isFinite(deltaMs) ? deltaMs : 0,
      0,
      100,
    );

    const deltaSeconds =
      safeDeltaMs / 1000;

    this.totalElapsedMs += safeDeltaMs;

    this.updateEyes(deltaSeconds);
    this.updateIdleMotion();
    this.updateBlink(safeDeltaMs);

    return this.state;
  }

  public getState(): ActorRuntimeState {
    return this.state;
  }

  private updateEyes(
    deltaSeconds: number,
  ): void {
    this.state.eyeX = smoothToward(
      this.state.eyeX,
      this.targetEyeX,
      8.5,
      deltaSeconds,
    );

    this.state.eyeY = smoothToward(
      this.state.eyeY,
      this.targetEyeY,
      8.5,
      deltaSeconds,
    );
  }

  private updateIdleMotion(): void {
    const time =
      this.totalElapsedMs / 1000;

    const breathing =
      Math.sin(time * 1.65);

    const slowDrift =
      Math.sin(time * 0.55);

    const secondaryDrift =
      Math.cos(time * 0.83);

    this.state.bodyOffsetY =
      breathing * 3.2;

    this.state.bodyScale =
      1 + breathing * 0.0025;

    this.state.headX =
      this.state.eyeX * 5 +
      slowDrift * 1.5;

    this.state.headY =
      this.state.eyeY * 3 +
      secondaryDrift * 1.2;

    this.state.headRotation =
      this.state.eyeX * 1.2 +
      slowDrift * 0.35;
  }

  private updateBlink(
    deltaMs: number,
  ): void {
    const definition =
      this.definition.animations?.blink;

    if (!definition?.enabled) {
      this.state.blinkLeft = 0;
      this.state.blinkRight = 0;
      return;
    }

    if (!this.blink.active) {
      if (
        this.totalElapsedMs >=
        this.blink.nextBlinkAtMs
      ) {
        this.blink.active = true;
        this.blink.elapsedMs = 0;
      } else {
        return;
      }
    }

    this.blink.elapsedMs += deltaMs;

    const closeEnd =
      definition.closeDurationMs;

    const holdEnd =
      closeEnd +
      definition.holdDurationMs;

    const openEnd =
      holdEnd +
      definition.openDurationMs;

    let amount = 0;

    if (
      this.blink.elapsedMs <= closeEnd
    ) {
      amount =
        this.blink.elapsedMs /
        Math.max(closeEnd, 1);
    } else if (
      this.blink.elapsedMs <= holdEnd
    ) {
      amount = 1;
    } else if (
      this.blink.elapsedMs <= openEnd
    ) {
      amount =
        1 -
        (this.blink.elapsedMs - holdEnd) /
          Math.max(
            definition.openDurationMs,
            1,
          );
    } else {
      amount = 0;
      this.blink.active = false;
      this.blink.elapsedMs = 0;
      this.scheduleNextBlink();
    }

    const normalizedAmount =
      clamp(amount, 0, 1);

    this.state.blinkLeft =
      normalizedAmount;

    this.state.blinkRight =
      normalizedAmount;
  }

  private scheduleNextBlink(): void {
    const definition =
      this.definition.animations?.blink;

    const minimumDelay =
      definition?.minimumDelayMs ?? 2200;

    const maximumDelay =
      definition?.maximumDelayMs ?? 5200;

    this.blink.nextBlinkAtMs =
      this.totalElapsedMs +
      randomBetween(
        minimumDelay,
        maximumDelay,
      );
  }
}