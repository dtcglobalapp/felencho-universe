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

export interface ActorLayer {

  id: string;

  name: string;

  image: string;

  zIndex: number;

  visible: boolean;

  transform: ActorTransform;

}

export interface ActorRig {

  jaw: string;

  head: string;

  neck?: string;

  leftEye?: string;

  rightEye?: string;

  leftPupil?: string;

  rightPupil?: string;

  upperLip?: string;

  lowerLip?: string;

  tongue?: string;

  upperTeeth?: string;

  lowerTeeth?: string;

  mustacheCenter?: string;

  mustacheLeft?: string;

  mustacheRight?: string;

  beardLeft?: string;

  beardCenter?: string;

  beardRight?: string;

  beardTip1?: string;

  beardTip2?: string;

  beardTip3?: string;

}

export interface ActorDefinition {

  id: string;

  name: string;

  version: string;

  width: number;

  height: number;

  fps: number;

  layers: ActorLayer[];

  rig: ActorRig;

}