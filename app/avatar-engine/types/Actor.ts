import type {
  ActorDefinition,
  ActorDiagnostic,
} from "../domain/ActorDefinition";

export type {
  ActorAnimationDefinition,
  ActorBlinkDefinition,
  ActorDefinition,
  ActorDiagnostic,
  ActorDiagnosticSeverity,
  ActorDisplayDefinition,
  ActorLayerDefinition,
  ActorLayerMetadata,
  ActorNormalizationResult,
  ActorRigDefinition,
  ActorTransform,
} from "../domain/ActorDefinition";

export interface LoadedActor {
  definition: ActorDefinition;
  layerImages: ReadonlyMap<string, HTMLImageElement>;
  diagnostics: readonly ActorDiagnostic[];
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
