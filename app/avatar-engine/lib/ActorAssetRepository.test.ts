import assert from "node:assert/strict";
import test from "node:test";

import {
  ActorAssetRepository,
  ActorAssetStorageError,
  createImportedAssetPath,
  inspectPngMetadata,
} from "./ActorAssetRepository";
import {
  resolveActorAssets,
} from "./ActorAssetResolver";
import {
  normalizeActorDefinition,
} from "../domain/ActorNormalizer";

function pngHeader(
  width: number,
  height: number,
  colorType: number,
): Blob {
  const bytes = new Uint8Array([
    137,
    80,
    78,
    71,
    13,
    10,
    26,
    10,
    0,
    0,
    0,
    13,
    73,
    72,
    68,
    82,
    (width >>> 24) & 255,
    (width >>> 16) & 255,
    (width >>> 8) & 255,
    width & 255,
    (height >>> 24) & 255,
    (height >>> 16) & 255,
    (height >>> 8) & 255,
    height & 255,
    8,
    colorType,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
  ]);

  return new Blob([bytes], {
    type: "image/png",
  });
}

test(
  "reads PNG dimensions and alpha metadata",
  async () => {
    const blob = pngHeader(
      640,
      480,
      6,
    );
    const metadata =
      await inspectPngMetadata(blob);

    assert.deepEqual(metadata, {
      width: 640,
      height: 480,
      hasAlpha: true,
      byteLength: blob.size,
    });
  },
);

test(
  "rejects corrupted asset records without crashing the Studio",
  async () => {
    await assert.rejects(
      inspectPngMetadata(
        new Blob([
          new Uint8Array([
            1,
            2,
            3,
          ]),
        ]),
      ),
      (
        error: unknown,
      ): boolean => {
        assert.ok(
          error instanceof
            ActorAssetStorageError,
        );
        assert.equal(
          error.code,
          "CORRUPTED_RECORD",
        );
        return true;
      },
    );
  },
);

test(
  "creates stable logical import paths without exposing storage keys",
  () => {
    const first =
      "/actors/Bob/imports/face.png";
    const path = createImportedAssetPath(
      "Bob",
      "Face.png",
      new Set([first]),
    );

    assert.equal(
      path,
      "/actors/Bob/imports/face_2.png",
    );
    assert.equal(
      path.includes(":"),
      false,
    );
  },
);

test(
  "reports a missing local asset without rejecting actor hydration",
  async () => {
    class MissingAssetRepository
      extends ActorAssetRepository {
      public override async getAssetBlob(): Promise<null> {
        return null;
      }
    }

    const definition =
      normalizeActorDefinition(
        {
          id: "missing-local",
          name: "Missing Local",
          version: "1",
          width: 100,
          height: 100,
          fps: 60,
          assets: [
            {
              path:
                "imports/face.png",
              name: "face.png",
              mediaType:
                "image/png",
              source: "local",
            },
          ],
          layers: [
            {
              id: "face",
              name: "Face",
              asset:
                "imports/face.png",
            },
          ],
          rig: {},
          construction: {
            profile: "custom",
          },
        },
        {
          sourceActorId:
            "missing-local",
        },
      ).definition;
    const resolved =
      await resolveActorAssets(
        definition,
        new MissingAssetRepository(),
      );

    assert.equal(
      resolved.layerImages.size,
      0,
    );
    assert.equal(
      resolved.diagnostics[0]?.code,
      "LOCAL_ASSET_MISSING",
    );
    assert.equal(
      resolved.diagnostics[0]?.layerId,
      "face",
    );
  },
);
