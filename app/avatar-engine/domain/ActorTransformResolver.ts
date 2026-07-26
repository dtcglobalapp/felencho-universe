import type {
  ActorDefinition,
  ActorTransform,
} from "./ActorDefinition";

export interface ActorMatrix {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}

export interface ActorPoint {
  x: number;
  y: number;
}

export const IDENTITY_ACTOR_MATRIX:
  ActorMatrix = {
    a: 1,
    b: 0,
    c: 0,
    d: 1,
    e: 0,
    f: 0,
  };

export function multiplyActorMatrices(
  first: ActorMatrix,
  second: ActorMatrix,
): ActorMatrix {
  return {
    a:
      first.a * second.a +
      first.c * second.b,
    b:
      first.b * second.a +
      first.d * second.b,
    c:
      first.a * second.c +
      first.c * second.d,
    d:
      first.b * second.c +
      first.d * second.d,
    e:
      first.a * second.e +
      first.c * second.f +
      first.e,
    f:
      first.b * second.e +
      first.d * second.f +
      first.f,
  };
}

export function actorTransformToMatrix(
  transform: ActorTransform,
): ActorMatrix {
  const radians =
    (transform.rotation * Math.PI) /
    180;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);

  const translateToPivot: ActorMatrix = {
    ...IDENTITY_ACTOR_MATRIX,
    e: transform.x + transform.pivotX,
    f: transform.y + transform.pivotY,
  };

  const rotateAndScale: ActorMatrix = {
    a: cosine * transform.scaleX,
    b: sine * transform.scaleX,
    c: -sine * transform.scaleY,
    d: cosine * transform.scaleY,
    e: 0,
    f: 0,
  };

  const translateFromPivot: ActorMatrix = {
    ...IDENTITY_ACTOR_MATRIX,
    e: -transform.pivotX,
    f: -transform.pivotY,
  };

  return multiplyActorMatrices(
    multiplyActorMatrices(
      translateToPivot,
      rotateAndScale,
    ),
    translateFromPivot,
  );
}

export function createActorTransformResolver(
  definition: ActorDefinition,
  transformOverrides: ReadonlyMap<
    string,
    ActorTransform
  > = new Map(),
): (nodeId: string) => ActorMatrix {
  const groups = new Map(
    definition.groups.map(
      (group) => [
        group.id,
        group,
      ],
    ),
  );
  const layers = new Map(
    definition.layers.map(
      (layer) => [
        layer.id,
        layer,
      ],
    ),
  );
  const resolved = new Map<
    string,
    ActorMatrix
  >();
  const resolving =
    new Set<string>();

  const resolve = (
    currentId: string,
  ): ActorMatrix => {
    const cached =
      resolved.get(currentId);

    if (cached) {
      return cached;
    }

    if (resolving.has(currentId)) {
      return IDENTITY_ACTOR_MATRIX;
    }

    resolving.add(currentId);

    const layer =
      layers.get(currentId);
    const group =
      groups.get(currentId);
    const node = layer ?? group;

    if (!node) {
      resolving.delete(currentId);
      return IDENTITY_ACTOR_MATRIX;
    }

    const local =
      actorTransformToMatrix(
        transformOverrides.get(
          currentId,
        ) ?? node.transform,
      );

    const parentId =
      layer &&
      !layer.inheritTransform
        ? undefined
        : node.parentId;

    const matrix = parentId
      ? multiplyActorMatrices(
          resolve(parentId),
          local,
        )
      : local;

    resolving.delete(currentId);
    resolved.set(currentId, matrix);
    return matrix;
  };

  return resolve;
}

export function resolveActorNodeMatrix(
  definition: ActorDefinition,
  nodeId: string,
  transformOverrides: ReadonlyMap<
    string,
    ActorTransform
  > = new Map(),
): ActorMatrix {
  return createActorTransformResolver(
    definition,
    transformOverrides,
  )(nodeId);
}

export function applyActorMatrix(
  matrix: ActorMatrix,
  point: ActorPoint,
): ActorPoint {
  return {
    x:
      matrix.a * point.x +
      matrix.c * point.y +
      matrix.e,
    y:
      matrix.b * point.x +
      matrix.d * point.y +
      matrix.f,
  };
}

export function invertActorMatrix(
  matrix: ActorMatrix,
): ActorMatrix | null {
  const determinant =
    matrix.a * matrix.d -
    matrix.b * matrix.c;

  if (
    !Number.isFinite(determinant) ||
    Math.abs(determinant) <
      0.0000001
  ) {
    return null;
  }

  return {
    a: matrix.d / determinant,
    b: -matrix.b / determinant,
    c: -matrix.c / determinant,
    d: matrix.a / determinant,
    e:
      (
        matrix.c * matrix.f -
        matrix.d * matrix.e
      ) / determinant,
    f:
      (
        matrix.b * matrix.e -
        matrix.a * matrix.f
      ) / determinant,
  };
}
