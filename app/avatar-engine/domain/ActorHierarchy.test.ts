import assert from "node:assert/strict";
import test from "node:test";

import {
  canAssignActorParent,
  inspectActorHierarchy,
} from "./ActorHierarchy";
import {
  applyActorMatrix,
  resolveActorNodeMatrix,
} from "./ActorTransformResolver";
import {
  normalizeActorDefinition,
} from "./ActorNormalizer";

function definition() {
  return normalizeActorDefinition(
    {
      id: "hierarchy",
      name: "Hierarchy",
      version: "1",
      width: 100,
      height: 100,
      fps: 60,
      layers: [
        {
          id: "parent",
          name: "Parent",
          asset: "layers/parent.png",
          transform: {
            x: 10,
            y: 20,
          },
        },
        {
          id: "child",
          name: "Child",
          asset: "layers/child.png",
          parentId: "parent",
          transform: {
            x: 5,
            y: 7,
          },
        },
      ],
      rig: {},
    },
    {
      sourceActorId: "hierarchy",
    },
  ).definition;
}

test(
  "resolves inherited layer transforms in actor space",
  () => {
    const actor = definition();
    const matrix =
      resolveActorNodeMatrix(
        actor,
        "child",
      );
    const point = applyActorMatrix(
      matrix,
      {
        x: 0,
        y: 0,
      },
    );

    assert.deepEqual(point, {
      x: 15,
      y: 27,
    });
  },
);

test(
  "prevents self-parenting and hierarchy cycles",
  () => {
    const actor = definition();

    assert.equal(
      canAssignActorParent(
        actor,
        "parent",
        "parent",
      ),
      false,
    );
    assert.equal(
      canAssignActorParent(
        actor,
        "parent",
        "child",
      ),
      false,
    );

    const invalid = {
      ...actor,
      layers: actor.layers.map(
        (layer) =>
          layer.id === "parent"
            ? {
                ...layer,
                parentId: "child",
              }
            : layer,
      ),
    };

    assert.ok(
      inspectActorHierarchy(
        invalid,
      ).some(
        (issue) =>
          issue.code ===
          "HIERARCHY_CYCLE",
      ),
    );
  },
);

test(
  "keeps organizational folders independent from transform inheritance",
  () => {
    const actor = definition();
    const organized = {
      ...actor,
      folders: [
        {
          id: "face-parts",
          name: "Face Parts",
          order: 0,
          visible: true,
          locked: false,
        },
      ],
      layers: actor.layers.map(
        (layer) =>
          layer.id === "child"
            ? {
                ...layer,
                folderId:
                  "face-parts",
              }
            : layer,
      ),
    };

    assert.deepEqual(
      resolveActorNodeMatrix(
        organized,
        "child",
      ),
      resolveActorNodeMatrix(
        actor,
        "child",
      ),
    );
  },
);
