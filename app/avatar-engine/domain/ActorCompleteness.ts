import type {
  ActorDefinition,
  ActorMouthPose,
} from "./ActorDefinition";

export type ActorCompletenessItemKind =
  | "role"
  | "mouth-pose";

export interface ActorCompletenessItem {
  id: string;
  label: string;
  kind: ActorCompletenessItemKind;
  complete: boolean;
  required: true;
  layerIds: string[];
}
export interface ActorCompletenessResult {
  profile: string;
  completed: number;
  required: number;
  percentage: number;
  items: ActorCompletenessItem[];
}

function rigTargets(
  definition: ActorDefinition,
  role: string,
): string[] {
  const target =
    definition.rig[role];

  if (Array.isArray(target)) {
    return target;
  }

  if (typeof target === "string") {
    return [target];
  }

  return definition.layers
    .filter(
      (layer) =>
        layer.metadata
          ?.semanticRole === role,
    )
    .map((layer) => layer.id);
}

function roleLabel(role: string): string {
  return role
    .replace(
      /([a-z0-9])([A-Z])/g,
      "$1 $2",
    )
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (value) =>
      value.toUpperCase(),
    );
}

function mouthPoseItem(
  definition: ActorDefinition,
  pose: ActorMouthPose,
): ActorCompletenessItem {
  const layerId =
    definition.construction
      .mouthPoses[pose];
  const layerExists = Boolean(
    layerId &&
      definition.layers.some(
        (layer) =>
          layer.id === layerId,
      ),
  );

  return {
    id: `mouth:${pose}`,
    label: `Mouth ${pose}`,
    kind: "mouth-pose",
    complete: layerExists,
    required: true,
    layerIds:
      layerId && layerExists
        ? [layerId]
        : [],
  };
}

export function calculateActorCompleteness(
  definition: ActorDefinition,
): ActorCompletenessResult {
  const layerIds = new Set(
    definition.layers.map(
      (layer) => layer.id,
    ),
  );

  const roleItems =
    definition.construction.requiredRoles.map(
      (
        role,
      ): ActorCompletenessItem => {
        const targets = rigTargets(
          definition,
          role,
        );
        const resolvedTargets =
          targets.filter((target) =>
            layerIds.has(target),
          );

        return {
          id: `role:${role}`,
          label: roleLabel(role),
          kind: "role",
          complete:
            resolvedTargets.length > 0,
          required: true,
          layerIds:
            resolvedTargets,
        };
      },
    );

  const mouthItems =
    definition.construction
      .requiredMouthPoses.map((pose) =>
        mouthPoseItem(
          definition,
          pose,
        ),
      );

  const items = [
    ...roleItems,
    ...mouthItems,
  ];
  const completed = items.filter(
    (item) => item.complete,
  ).length;
  const required = items.length;

  return {
    profile:
      definition.construction.profile,
    completed,
    required,
    percentage:
      required === 0
        ? 100
        : Math.round(
            (completed / required) *
              100,
          ),
    items,
  };
}
