import assert from "node:assert/strict";
import {
  readFile,
} from "node:fs/promises";
import test from "node:test";

import {
  normalizeActorDefinition,
  sortActorLayers,
} from "./ActorNormalizer";

import {
  ActorDefinitionValidationError,
} from "./ActorValidator";

import {
  ACTOR_SCHEMA_VERSION,
} from "./ActorDefinition";

function createRawActor(
  layers: unknown[],
): Record<string, unknown> {
  return {
    id: "test-actor",
    name: "Test Actor",
    version: "1.0.0",
    width: 1000,
    height: 1200,
    fps: 60,
    display: {
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      maxStageWidth: 1000,
      maxStageHeight: 1200,
    },
    layers,
    rig: {},
  };
}

function createLayer(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id: "face",
    name: "Face",
    asset: "layers/face.png",
    type: "image",
    visible: true,
    locked: false,
    opacity: 1,
    zIndex: 10,
    transform: {
      x: 0,
      y: 0,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      pivotX: 0.5,
      pivotY: 0.5,
    },
    ...overrides,
  };
}

test(
  "normalizes legacy layer fields without rewriting source JSON",
  () => {
    const raw = createRawActor([
      createLayer({
        asset: undefined,
        image:
          "/actors/Test/layers/face.png",
        opacity: undefined,
        transform: {
          x: 4,
          y: 8,
          rotation: 2,
          scaleX: 1,
          scaleY: 1,
          opacity: 0.65,
          pivotX: 500,
          pivotY: 600,
        },
      }),
    ]);

    const result =
      normalizeActorDefinition(
        raw,
        {
          sourceActorId: "Test",
        },
      );

    assert.equal(
      result.definition.layers[0]
        .asset,
      "/actors/Test/layers/face.png",
    );

    assert.equal(
      result.definition.layers[0]
        .opacity,
      0.65,
    );

    assert.equal(
      "image" in
        result.definition.layers[0],
      false,
    );

    assert.equal(
      "opacity" in
        result.definition.layers[0]
          .transform,
      false,
    );

    assert.equal(
      result.definition.schemaVersion,
      ACTOR_SCHEMA_VERSION,
    );

    assert.equal(
      result.definition.layers[0]
        .blendMode,
      "source-over",
    );

    assert.equal(
      result.definition.layers[0]
        .inheritTransform,
      true,
    );
  },
);

test(
  "accepts an actor with no layers and supplies missing display defaults",
  () => {
    const raw = createRawActor([]);

    delete raw.display;

    const result =
      normalizeActorDefinition(
        raw,
        {
          sourceActorId:
            "test-actor",
        },
      );

    assert.deepEqual(
      result.definition.layers,
      [],
    );

    assert.equal(
      result.definition.display
        .maxStageWidth,
      1000,
    );

    assert.ok(
      result.warnings.some(
        (item) =>
          item.code ===
          "EMPTY_LAYER_COLLECTION",
      ),
    );
  },
);

test(
  "assigns safe defaults for omitted optional layer properties",
  () => {
    const raw = createRawActor([
      {
        id: "body",
        name: "Body",
        asset: "layers/body.png",
      },
    ]);

    const result =
      normalizeActorDefinition(
        raw,
        {
          sourceActorId:
            "test-actor",
        },
      );

    const layer =
      result.definition.layers[0];

    assert.equal(
      layer.asset,
      "/actors/test-actor/layers/body.png",
    );
    assert.equal(layer.type, "image");
    assert.equal(layer.visible, true);
    assert.equal(layer.locked, false);
    assert.equal(layer.opacity, 1);
    assert.equal(layer.zIndex, 0);
    assert.equal(
      layer.blendMode,
      "source-over",
    );
    assert.equal(
      layer.inheritTransform,
      true,
    );
    assert.deepEqual(
      layer.transform,
      {
        x: 0,
        y: 0,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        pivotX: 0.5,
        pivotY: 0.5,
      },
    );
  },
);

test(
  "creates safe v0.6 folders, assets, and construction defaults for a legacy actor",
  () => {
    const result =
      normalizeActorDefinition(
        createRawActor([
          createLayer(),
        ]),
        {
          sourceActorId:
            "test-actor",
        },
      );

    assert.ok(
      result.definition.folders.some(
        (folder) =>
          folder.id === "face",
      ),
    );
    assert.equal(
      result.definition.assets[0]
        ?.path,
      "/actors/test-actor/layers/face.png",
    );
    assert.equal(
      result.definition.construction
        .profile,
      "digital-human",
    );
    assert.deepEqual(
      result.definition.groups,
      [],
    );
  },
);

test(
  "rejects duplicate stable layer IDs",
  () => {
    const raw = createRawActor([
      createLayer(),
      createLayer({
        name: "Duplicate Face",
        zIndex: 20,
      }),
    ]);

    assert.throws(
      () =>
        normalizeActorDefinition(
          raw,
          {
            sourceActorId:
              "test-actor",
          },
        ),
      (error: unknown) => {
        assert.ok(
          error instanceof
            ActorDefinitionValidationError,
        );

        assert.ok(
          error.diagnostics.some(
            (item) =>
              item.code ===
              "DUPLICATE_LAYER_ID",
          ),
        );

        return true;
      },
    );
  },
);

test(
  "clamps invalid opacity and reports the normalization",
  () => {
    const raw = createRawActor([
      createLayer({
        opacity: 1.75,
      }),
    ]);

    const result =
      normalizeActorDefinition(
        raw,
        {
          sourceActorId:
            "test-actor",
        },
      );

    assert.equal(
      result.definition.layers[0]
        .opacity,
      1,
    );

    assert.ok(
      result.warnings.some(
        (item) =>
          item.code ===
          "INVALID_OPACITY",
      ),
    );
  },
);

test(
  "sorts layers deterministically by z-index and stable ID",
  () => {
    const layers = [
      createLayer({
        id: "second",
        zIndex: 4,
      }),
      createLayer({
        id: "third",
        zIndex: 9,
      }),
      createLayer({
        id: "first",
        zIndex: 4,
      }),
    ].map(
      (layer) =>
        normalizeActorDefinition(
          createRawActor([layer]),
          {
            sourceActorId:
              "test-actor",
          },
        ).definition.layers[0],
    );

    assert.deepEqual(
      sortActorLayers(
        layers,
      ).map((layer) => layer.id),
      [
        "first",
        "second",
        "third",
      ],
    );
  },
);

test(
  "keeps a layer with a missing asset as a non-fatal warning",
  () => {
    const raw = createRawActor([
      createLayer({
        asset: "",
      }),
    ]);

    const result =
      normalizeActorDefinition(
        raw,
        {
          sourceActorId:
            "test-actor",
        },
      );

    assert.equal(
      result.definition.layers.length,
      1,
    );

    assert.ok(
      result.warnings.some(
        (item) =>
          item.code ===
          "MISSING_LAYER_ASSET",
      ),
    );
  },
);

test(
  "normalizes the unchanged Bob, Lina, and Felencho actor packages",
  async () => {
    const actorIds = [
      "Bob",
      "Lina",
      "Felencho",
    ] as const;

    for (const actorId of actorIds) {
      const source: unknown = JSON.parse(
        await readFile(
          new URL(
            `../../../public/actors/${actorId}/actor.json`,
            import.meta.url,
          ),
          "utf8",
        ),
      );

      assert.ok(
        source &&
          typeof source ===
            "object" &&
          "id" in source &&
          typeof source.id ===
            "string",
      );
      const normalized =
        normalizeActorDefinition(
          source,
          {
            sourceActorId: actorId,
          },
        );

      assert.equal(
        normalized.definition.id,
        source.id,
      );
      assert.equal(
        normalized.definition
          .schemaVersion,
        ACTOR_SCHEMA_VERSION,
      );
      assert.ok(
        Array.isArray(
          normalized.definition.layers,
        ),
      );
    }
  },
);
