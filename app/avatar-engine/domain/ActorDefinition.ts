export const ACTOR_SCHEMA_VERSION = "1.0.0";

export interface ActorTransform {
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  pivotX: number;
  pivotY: number;
}

export interface ActorLayerMetadata {
  category?: string;
  semanticRole?: string;
  [key: string]: unknown;
}

export type ActorBlendMode =
  | "source-over"
  | "multiply"
  | "screen"
  | "overlay"
  | "darken"
  | "lighten";

export type ActorAssetSource =
  | "bundled"
  | "local"
  | "packaged";

export interface ActorAssetDefinition {
  path: string;
  name: string;
  mediaType: "image/png";
  source: ActorAssetSource;
  width?: number;
  height?: number;
  hasAlpha?: boolean;
  byteLength?: number;
}

export interface ActorFolderDefinition {
  id: string;
  name: string;
  parentId?: string;
  order: number;
  visible: boolean;
  locked: boolean;
}

export interface ActorGroupDefinition {
  id: string;
  name: string;
  parentId?: string;
  visible: boolean;
  locked: boolean;
  transform: ActorTransform;
}

export const ACTOR_MOUTH_POSES = [
  "REST",
  "AA",
  "EE",
  "OO",
  "FV",
  "L",
  "MBP",
  "SMILE",
  "SAD",
  "OPEN",
] as const;

export type ActorMouthPose =
  (typeof ACTOR_MOUTH_POSES)[number];

export interface ActorConstructionDefinition {
  profile: string;
  requiredRoles: string[];
  optionalRoles: string[];
  requiredMouthPoses: ActorMouthPose[];
  mouthPoses: Partial<
    Record<ActorMouthPose, string>
  >;
}

export interface ActorLayerDefinition {
  id: string;
  name: string;
  asset: string;
  type: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  zIndex: number;
  transform: ActorTransform;
  folderId?: string;
  parentId?: string;
  inheritTransform: boolean;
  blendMode: ActorBlendMode;
  metadata?: ActorLayerMetadata;
  animation?: Record<string, unknown>;
  physics?: Record<string, unknown>;
}

export interface ActorDisplayDefinition {
  scale: number;
  offsetX: number;
  offsetY: number;
  maxStageWidth: number;
  maxStageHeight: number;
}

export interface ActorRigDefinition {
  root?: string;

  face?: string;

  leftEye?: string;
  rightEye?: string;

  leftPupil?: string;
  rightPupil?: string;

  leftUpperEyelid?: string;
  rightUpperEyelid?: string;

  leftLowerEyelid?: string;
  rightLowerEyelid?: string;

  leftEyebrow?: string;
  rightEyebrow?: string;

  upperLip?: string;
  lowerLip?: string;

  upperTeeth?: string;
  lowerTeeth?: string;

  upperGum?: string;
  lowerGum?: string;

  tongue?: string;

  mustacheLeft?: string;
  mustacheCenter?: string;
  mustacheRight?: string;

  beardLeft?: string[];
  beardCenter?: string[];
  beardRight?: string[];

  hairFront?: string[];
  hairBack?: string[];

  jaw?: string[];

  [role: string]:
    | string
    | string[]
    | undefined;
}

export interface ActorBlinkDefinition {
  enabled: boolean;
  minimumDelayMs: number;
  maximumDelayMs: number;
  closeDurationMs: number;
  holdDurationMs: number;
  openDurationMs: number;
  upperTravel: number;
  lowerTravel: number;
  upperScaleY: number;
  lowerScaleY: number;
}

export interface ActorAnimationDefinition {
  blink?: ActorBlinkDefinition;
  [key: string]: unknown;
}

export interface ActorDefinition {
  schemaVersion: string;
  id: string;
  name: string;
  version: string;
  width: number;
  height: number;
  fps: number;
  display: ActorDisplayDefinition;
  assets: ActorAssetDefinition[];
  folders: ActorFolderDefinition[];
  groups: ActorGroupDefinition[];
  layers: ActorLayerDefinition[];
  rig: ActorRigDefinition;
  construction: ActorConstructionDefinition;
  animations?: ActorAnimationDefinition;
}

export type ActorDiagnosticSeverity =
  | "warning"
  | "error";

export interface ActorDiagnostic {
  severity: ActorDiagnosticSeverity;
  code: string;
  message: string;
  path?: string;
  layerId?: string;
}

export interface ActorNormalizationResult {
  definition: ActorDefinition;
  warnings: ActorDiagnostic[];
}
