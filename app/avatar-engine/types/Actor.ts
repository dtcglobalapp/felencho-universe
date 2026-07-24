export interface ActorTransform {
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  opacity: number;
  pivotX: number;
  pivotY: number;
}

export interface ActorLayerDefinition {
  id: string;
  name: string;
  image: string;
  zIndex: number;
  visible: boolean;
  transform: ActorTransform;
}

export interface ActorDisplayDefinition {
  scale: number;
  offsetX: number;
  offsetY: number;
  maxStageWidth: number;
  maxStageHeight: number;
}

export interface ActorRigDefinition {
  root: string;

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

export interface LoadedActor {
  definition: ActorDefinition;
  layerImages: ReadonlyMap<
    string,
    HTMLImageElement
  >;
}

export interface ActorRuntimeState {
  eyeX: number;
  eyeY: number;

  blinkLeft: number;
  blinkRight: number;

  eyebrowLeft: number;
  eyebrowRight: number;

  jawOpen: number;

  smile: number;
  sadness: number;
  anger: number;
  surprise: number;

  headX: number;
  headY: number;
  headRotation: number;

  bodyOffsetY: number;
  bodyScale: number;
}
