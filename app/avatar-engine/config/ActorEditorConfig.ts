import {
  ACTOR_MOUTH_POSES,
} from "../domain/ActorDefinition";

import type {
  ActorBlendMode,
  ActorConstructionDefinition,
  ActorFolderDefinition,
} from "../domain/ActorDefinition";

export const GENESIS_BLEND_MODES =
  [
    "source-over",
    "multiply",
    "screen",
    "overlay",
    "darken",
    "lighten",
  ] as const satisfies readonly ActorBlendMode[];

export const DEFAULT_ACTOR_FOLDERS =
  [
    "HEAD",
    "FACE",
    "HAIR",
    "EYES",
    "EYEBROWS",
    "MOUTH",
    "BEARD",
    "NECK",
    "BODY",
    "CLOTHES",
    "ACCESSORIES",
    "BACKGROUND",
  ].map(
    (
      name,
      order,
    ): ActorFolderDefinition => ({
      id: name.toLowerCase(),
      name,
      order,
      visible: true,
      locked: false,
    }),
  );

export const DEFAULT_CONSTRUCTION_PROFILE:
  ActorConstructionDefinition = {
    profile: "digital-human",
    requiredRoles: [
      "root",
      "face",
      "leftEye",
      "rightEye",
      "leftPupil",
      "rightPupil",
      "leftEyebrow",
      "rightEyebrow",
    ],
    optionalRoles: [
      "leftUpperEyelid",
      "rightUpperEyelid",
      "leftLowerEyelid",
      "rightLowerEyelid",
      "upperTeeth",
      "lowerTeeth",
      "tongue",
      "mustacheLeft",
      "mustacheCenter",
      "mustacheRight",
      "beardLeft",
      "beardCenter",
      "beardRight",
      "hairFront",
      "hairBack",
      "neck",
      "body",
    ],
    requiredMouthPoses: [
      ...ACTOR_MOUTH_POSES,
    ],
    mouthPoses: {},
  };

export const CUSTOM_CONSTRUCTION_PROFILE:
  ActorConstructionDefinition = {
    profile: "custom",
    requiredRoles: [],
    optionalRoles: [],
    requiredMouthPoses: [],
    mouthPoses: {},
  };

export const STUDIO_ZOOM_MINIMUM = 0.01;
export const STUDIO_ZOOM_MAXIMUM = 64;
export const STUDIO_GRID_SIZE = 40;
