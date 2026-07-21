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
  jaw?: string;
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
}

export interface LoadedActorLayer {
  definition: ActorLayerDefinition;
  image: HTMLImageElement;
}

export interface LoadedActor {
  definition: ActorDefinition;
  layers: LoadedActorLayer[];
}

export interface ActorRuntimeState {
  eyeX: number;
  eyeY: number;
}
