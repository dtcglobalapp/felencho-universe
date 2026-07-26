import type {
  ActorDefinition,
  ActorDiagnostic,
} from "../domain/ActorDefinition";

export type {
  ActorAnimationDefinition,
  ActorAssetDefinition,
  ActorAssetSource,
  ActorBlinkDefinition,
  ActorBlendMode,
  ActorConstructionDefinition,
  ActorDefinition,
  ActorDiagnostic,
  ActorDiagnosticSeverity,
  ActorDisplayDefinition,
  ActorFolderDefinition,
  ActorGroupDefinition,
  ActorLayerDefinition,
  ActorLayerMetadata,
  ActorMouthPose,
  ActorNormalizationResult,
  ActorRigDefinition,
  ActorTransform,
} from "../domain/ActorDefinition";

export interface LoadedActor {
  definition: ActorDefinition;
  layerImages: ReadonlyMap<string, HTMLImageElement>;
  assetImages: ReadonlyMap<string, HTMLImageElement>;
  assetUrls: ReadonlyMap<string, string>;
  diagnostics: readonly ActorDiagnostic[];
  objectUrls: readonly string[];
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
