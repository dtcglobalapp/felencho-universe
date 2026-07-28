import assert from "node:assert/strict";
import test from "node:test";

import {
  ActorDocumentCommands,
} from "./ActorDocumentCommands";
import {
  createEmptyActorDefinition,
} from "./ActorProjectRepository";
import {
  diagnoseStudioActor,
} from "./StudioDiagnostics";
import {
  validateActorDefinition,
} from "../../domain/ActorValidator";

test(
  "creates a complete empty actor project contract",
  () => {
    const definition =
      createEmptyActorDefinition({
        id: "My New Actor",
        name: "My New Actor",
        width: 1080,
        height: 1920,
        fps: 60,
      });

    assert.equal(
      definition.id,
      "my-new-actor",
    );
    assert.equal(
      definition.width,
      1080,
    );
    assert.equal(
      definition.height,
      1920,
    );
    assert.equal(
      definition.animations?.blink
        ?.enabled,
      true,
    );
    assert.equal(
      definition.layers.length,
      0,
    );
  },
);

test(
  "maps rig roles and semantic runtime metadata without JSON editing",
  () => {
    const base =
      createEmptyActorDefinition({
        id: "actor",
        name: "Actor",
        width: 100,
        height: 100,
      });
    const created =
      ActorDocumentCommands.createLayer(
        base,
        {
          id: "face",
          name: "Face",
          asset:
            "/actors/actor/face.png",
          width: 100,
          height: 100,
        },
      );
    const withRole =
      ActorDocumentCommands.setRigRole(
        created.definition,
        "face",
        "face",
      );
    const withMetadata =
      ActorDocumentCommands.setLayerMetadata(
        withRole.definition,
        ["face"],
        {
          category: "face",
          semanticRole: "face",
        },
      );
    const withRuntime =
      ActorDocumentCommands.setLayerRuntimeMetadata(
        withMetadata.definition,
        ["face"],
        "animation",
        "facial-primary",
      );

    assert.equal(
      withRuntime.definition.rig.face,
      "face",
    );
    assert.equal(
      withRuntime.definition.layers[0]
        .metadata?.semanticRole,
      "face",
    );
    assert.equal(
      withRuntime.definition.layers[0]
        .animation?.profile,
      "facial-primary",
    );
  },
);

test(
  "rejects circular nested folders",
  () => {
    const base =
      createEmptyActorDefinition({
        id: "actor",
        name: "Actor",
        width: 100,
        height: 100,
      });
    const first =
      base.folders[0];
    const second =
      base.folders[1];
    const nested =
      ActorDocumentCommands.updateFolder(
        base,
        second.id,
        {
          parentId: first.id,
        },
        [],
      );
    const circular =
      ActorDocumentCommands.updateFolder(
        nested.definition,
        first.id,
        {
          parentId: second.id,
        },
        [],
      );

    assert.equal(
      nested.changed,
      true,
    );
    assert.equal(
      circular.changed,
      false,
    );
  },
);

test(
  "diagnoses imported folder hierarchy cycles",
  () => {
    const base =
      createEmptyActorDefinition({
        id: "actor",
        name: "Actor",
        width: 100,
        height: 100,
      });
    const first =
      base.folders[0];
    const second =
      base.folders[1];
    const validation =
      validateActorDefinition({
        ...base,
        folders:
          base.folders.map(
            (folder) =>
              folder.id === first.id
                ? {
                    ...folder,
                    parentId:
                      second.id,
                  }
                : folder.id ===
                    second.id
                  ? {
                      ...folder,
                      parentId:
                        first.id,
                    }
                  : folder,
          ),
      });

    assert.ok(
      validation.errors.some(
        (item) =>
          item.code ===
          "FOLDER_HIERARCHY_CYCLE",
      ),
    );
  },
);

test(
  "blocks package readiness for missing assets and semantic roles",
  () => {
    const base =
      createEmptyActorDefinition({
        id: "actor",
        name: "Actor",
        width: 100,
        height: 100,
      });
    const definition =
      ActorDocumentCommands.createLayer(
        {
          ...base,
          assets: [
            {
              path:
                "/actors/actor/face.png",
              name: "face.png",
              mediaType:
                "image/png",
              source: "local",
              width: 100,
              height: 100,
              byteLength: 1000,
            },
          ],
        },
        {
          id: "face",
          name: "Face",
          asset:
            "/actors/actor/face.png",
          width: 100,
          height: 100,
        },
      ).definition;
    const diagnosed =
      diagnoseStudioActor(
        definition,
        new Set(),
      );

    assert.equal(
      diagnosed.packageReady,
      false,
    );
    assert.ok(
      diagnosed.diagnostics.some(
        (item) =>
          item.code ===
          "ASSET_UNAVAILABLE",
      ),
    );
    assert.ok(
      diagnosed.diagnostics.some(
        (item) =>
          item.code ===
          "MISSING_SEMANTIC_ROLE",
      ),
    );
  },
);
