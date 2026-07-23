export interface RigState {
  jaw: number;

  blinkLeft: number;
  blinkRight: number;

  smile: number;

  anger: number;
  sadness: number;
  surprise: number;

  eyeX: number;
  eyeY: number;

  headX: number;
  headY: number;
  headRotation: number;
}

export const DEFAULT_RIG_STATE: RigState = {
  jaw: 0,

  blinkLeft: 0,
  blinkRight: 0,

  smile: 0,

  anger: 0,
  sadness: 0,
  surprise: 0,

  eyeX: 0,
  eyeY: 0,

  headX: 0,
  headY: 0,
  headRotation: 0,
};

export type RigStateUpdate =
  Partial<RigState>;

export function clampRigValue(
  value: number,
  minimum = 0,
  maximum = 1,
): number {
  if (!Number.isFinite(value)) {
    return minimum;
  }

  return Math.min(
    maximum,
    Math.max(minimum, value),
  );
}

export function createRigState(
  initialState: RigStateUpdate = {},
): RigState {
  return {
    ...DEFAULT_RIG_STATE,
    ...initialState,

    jaw: clampRigValue(
      initialState.jaw ??
        DEFAULT_RIG_STATE.jaw,
    ),

    blinkLeft: clampRigValue(
      initialState.blinkLeft ??
        DEFAULT_RIG_STATE.blinkLeft,
    ),

    blinkRight: clampRigValue(
      initialState.blinkRight ??
        DEFAULT_RIG_STATE.blinkRight,
    ),

    smile: clampRigValue(
      initialState.smile ??
        DEFAULT_RIG_STATE.smile,
    ),

    anger: clampRigValue(
      initialState.anger ??
        DEFAULT_RIG_STATE.anger,
    ),

    sadness: clampRigValue(
      initialState.sadness ??
        DEFAULT_RIG_STATE.sadness,
    ),

    surprise: clampRigValue(
      initialState.surprise ??
        DEFAULT_RIG_STATE.surprise,
    ),

    eyeX: clampRigValue(
      initialState.eyeX ??
        DEFAULT_RIG_STATE.eyeX,
      -1,
      1,
    ),

    eyeY: clampRigValue(
      initialState.eyeY ??
        DEFAULT_RIG_STATE.eyeY,
      -1,
      1,
    ),

    headX: clampRigValue(
      initialState.headX ??
        DEFAULT_RIG_STATE.headX,
      -1,
      1,
    ),

    headY: clampRigValue(
      initialState.headY ??
        DEFAULT_RIG_STATE.headY,
      -1,
      1,
    ),

    headRotation: clampRigValue(
      initialState.headRotation ??
        DEFAULT_RIG_STATE.headRotation,
      -1,
      1,
    ),
  };
}

export function updateRigState(
  currentState: RigState,
  update: RigStateUpdate,
): RigState {
  return createRigState({
    ...currentState,
    ...update,
  });
}