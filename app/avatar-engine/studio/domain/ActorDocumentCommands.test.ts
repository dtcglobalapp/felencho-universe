import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeActorDefinition,
  sortActorLayers,
} from "../../domain/ActorNormalizer";
import {
  ActorDocumentCommands,
} from "./ActorDocumentCommands";
import {
  StudioHistory,
} from "./StudioHistory";

function definition() {
  return normalizeActorDefinition(
    {
      id: "commands",
      name: "Commands",
      version: "1",
      width: 100,
      height: 100,
      fps: 60,
      layers: [
        {
          id: "back",
          name: "Back",
          asset: "layers/back.png",
          zIndex: 0,
        },
        {
          id: "front",
          name: "Front",
          asset: "layers/front.png",
          zIndex: 1,
        },
      ],
      rig: {
        face: "front",
      },
      construction: {
        profile: "custom",
        requiredMouthPoses: [
          "REST",
        ],
      },
    },
    {
      sourceActorId: "commands",
    },
  ).definition;
}

test(
  "reorders, moves, duplicates, and deletes layers through commands",
  () => {
    const actor = definition();
    const reordered =
      ActorDocumentCommands.reorderLayers(
        actor,
        ["back", "front"],
        ["front"],
      );

    assert.equal(
      sortActorLayers(
        reordered.definition.layers,
        "descending",
      )[0]?.id,
      "back",
    );

    const moved =
      ActorDocumentCommands.moveLayers(
        reordered.definition,
        ["front"],
        5,
        -3,
      );

    assert.deepEqual(
      moved.definition.layers.find(
        (layer) =>
          layer.id === "front",
      )?.transform.x,
      5,
    );

    const duplicated =
      ActorDocumentCommands
        .duplicateLayers(
          moved.definition,
          ["front"],
        );

    assert.equal(
      duplicated.definition.layers
        .length,
      3,
    );

    const removed =
      ActorDocumentCommands.deleteLayers(
        duplicated.definition,
        ["front"],
      );

    assert.equal(
      removed.definition.rig.face,
      undefined,
    );
  },
);

test(
  "updates mouth mappings and references when a layer ID changes",
  () => {
    const actor = definition();
    const mapped =
      ActorDocumentCommands.setMouthPose(
        actor,
        "REST",
        "front",
        ["front"],
      );
    const renamed =
      ActorDocumentCommands.changeLayerId(
        mapped.definition,
        "front",
        "neutral-mouth",
        mapped.selectionIds,
      );

    assert.equal(
      renamed.definition.construction
        .mouthPoses.REST,
      "neutral-mouth",
    );
    assert.equal(
      renamed.definition.rig.face,
      "neutral-mouth",
    );
    assert.deepEqual(
      renamed.selectionIds,
      ["neutral-mouth"],
    );
  },
);

test(
  "records one transaction for continuous multi-layer movement",
  () => {
    const actor = definition();
    const history =
      new StudioHistory(10);
    const selection = {
      ids: ["back", "front"],
      anchorId: "front",
    };

    history.beginTransaction(
      "Move layers",
      actor,
      selection,
    );

    const first =
      ActorDocumentCommands.moveLayers(
        actor,
        selection.ids,
        1,
        0,
      );
    const second =
      ActorDocumentCommands.moveLayers(
        first.definition,
        selection.ids,
        2,
        0,
      );

    history.commitTransaction(
      second.changed,
    );

    assert.equal(
      history.pastCount,
      1,
    );

    const restored = history.undo(
      second.definition,
      selection,
    );

    assert.equal(
      restored?.snapshot.definition
        .layers.find(
          (layer) =>
            layer.id === "front",
        )?.transform.x,
      0,
    );

    const redone = history.redo(
      restored?.snapshot.definition ??
        actor,
      restored?.snapshot.selection ??
        selection,
    );

    assert.equal(
      redone?.snapshot.definition.layers.find(
        (layer) =>
          layer.id === "front",
      )?.transform.x,
      3,
    );
  },
);

test(
  "folder assignment and asset replacement remain document mutations",
  () => {
    const actor = definition();
    const created =
      ActorDocumentCommands.createFolder(
        actor,
        "Reference",
        ["front"],
      );

    assert.deepEqual(
      created.selectionIds,
      ["front"],
    );

    const folder =
      ActorDocumentCommands.assignFolder(
        created.definition,
        ["front"],
        "face",
      );

    assert.equal(
      folder.definition.layers.find(
        (layer) =>
          layer.id === "front",
      )?.folderId,
      "face",
    );

    const replaced =
      ActorDocumentCommands.replaceAsset(
        folder.definition,
        "/actors/commands/layers/front.png",
        {
          path:
            "/actors/commands/imports/new.png",
          name: "new.png",
          mediaType: "image/png",
          source: "local",
          width: 64,
          height: 64,
          hasAlpha: true,
        },
        ["front"],
      );

    assert.equal(
      replaced.definition.layers.find(
        (layer) =>
          layer.id === "front",
      )?.asset,
      "/actors/commands/imports/new.png",
    );
  },
);

test(
  "creates and removes a transform group without orphaning its layers",
  () => {
    const actor = definition();
    const grouped =
      ActorDocumentCommands.createGroup(
        actor,
        "Face Group",
        ["back", "front"],
      );
    const group =
      grouped.definition.groups[0];

    assert.ok(group);
    assert.deepEqual(
      grouped.definition.layers.map(
        (layer) => layer.parentId,
      ),
      [group.id, group.id],
    );

    const removed =
      ActorDocumentCommands.deleteGroups(
        grouped.definition,
        [group.id],
        [group.id],
      );

    assert.deepEqual(
      removed.definition.groups,
      [],
    );
    assert.ok(
      removed.definition.layers.every(
        (layer) =>
          layer.parentId === undefined,
      ),
    );
  },
);
