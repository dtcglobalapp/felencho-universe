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
  id: string;
  name: string;
  version: string;
  width: number;
  height: number;
  fps: number;
  display: ActorDisplayDefinition;
  layers: ActorLayerDefinition[];
  rig: ActorRigDefinition;
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

