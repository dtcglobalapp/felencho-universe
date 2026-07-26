import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeActorDefinition,
} from "../domain/ActorNormalizer";
import {
  createPortableActorPackage,
  readPortableActorPackage,
} from "./ActorExporter";

function pngBlob(): Blob {
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
    0,
    0,
    0,
    1,
    0,
    0,
    0,
    1,
    8,
    6,
    0,
    0,
    0,
  ]);

  return new Blob([
    bytes.buffer,
  ], {
    type: "image/png",
  });
}

test(
  "exports and reads a portable actor package without asset loss",
  async () => {
    const actor =
      normalizeActorDefinition(
        {
          id: "portable",
          name: "Portable",
          version: "1",
          width: 100,
          height: 100,
          fps: 60,
          layers: [
            {
              id: "face",
              name: "Face",
              asset:
                "imports/face.png",
            },
          ],
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
          rig: {},
          construction: {
            profile: "custom",
          },
        },
        {
          sourceActorId:
            "portable",
        },
      ).definition;
    const sourceBlob = pngBlob();
    const archive =
      await createPortableActorPackage(
        actor,
        async () => sourceBlob,
      );
    const imported =
      await readPortableActorPackage(
        archive,
      );

    assert.ok(
      imported.definition &&
        typeof imported.definition ===
          "object",
    );
    assert.equal(
      imported.assets.size,
      1,
    );
    assert.equal(
      imported.assets.get(
        "imports/face.png",
      )?.size,
      sourceBlob.size,
    );
  },
);
test(
  "refuses to label a package portable when an asset is missing",
  async () => {
    const actor =
      normalizeActorDefinition(
        {
          id: "missing",
          name: "Missing",
          version: "1",
          width: 100,
          height: 100,
          fps: 60,
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
          sourceActorId: "missing",
        },
      ).definition;

    await assert.rejects(
      createPortableActorPackage(
        actor,
        async () => null,
      ),
      /Portable export stopped/,
    );
  },
);
