import {
  canAssignActorParent,
  getEffectiveLayerState,
} from "../../domain/ActorHierarchy";
import {
  ACTOR_MOUTH_POSES,
} from "../../domain/ActorDefinition";

import type {
  ActorAssetDefinition,
  ActorBlendMode,
  ActorDefinition,
  ActorFolderDefinition,
  ActorGroupDefinition,
  ActorLayerDefinition,
  ActorMouthPose,
  ActorTransform,
} from "../../domain/ActorDefinition";

export interface ActorDocumentCommandResult {
  definition: ActorDefinition;
  selectionIds: string[];
  changed: boolean;
}

export interface CreateLayerInput {
  id: string;
  name: string;
  asset: string;
  folderId?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

type TransformPatch =
  Partial<ActorTransform>;

const ACTOR_TRANSFORM_KEYS = [
  "x",
  "y",
  "rotation",
  "scaleX",
  "scaleY",
  "pivotX",
  "pivotY",
] as const satisfies readonly (
  keyof ActorTransform
)[];

const EDITABLE_LAYER_PROPERTY_KEYS = [
  "visible",
  "locked",
  "opacity",
  "folderId",
  "blendMode",
  "asset",
  "inheritTransform",
] as const satisfies readonly (
  keyof ActorLayerDefinition
)[];

function result(
  definition: ActorDefinition,
  selectionIds: readonly string[],
  changed: boolean,
): ActorDocumentCommandResult {
  return {
    definition,
    selectionIds: [...selectionIds],
    changed,
  };
}

function normalizeSelection(
  definition: ActorDefinition,
  selectionIds: readonly string[],
): string[] {
  const nodeIds = new Set([
    ...definition.layers.map(
      (layer) => layer.id,
    ),
    ...definition.groups.map(
      (group) => group.id,
    ),
  ]);

  return [
    ...new Set(selectionIds),
  ].filter((id) => nodeIds.has(id));
}

export function createUniqueActorNodeId(
  definition: ActorDefinition,
  preferred: string,
): string {
  const base =
    preferred
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "_")
      .replace(/^_+|_+$/g, "") ||
    "layer";
  const identifiers = new Set([
    ...definition.layers.map(
      (layer) => layer.id,
    ),
    ...definition.groups.map(
      (group) => group.id,
    ),
  ]);

  if (!identifiers.has(base)) {
    return base;
  }

  let suffix = 2;

  while (
    identifiers.has(`${base}_${suffix}`)
  ) {
    suffix += 1;
  }

  return `${base}_${suffix}`;
}

function updateRigReferences(
  definition: ActorDefinition,
  oldId: string,
  newId: string | undefined,
): ActorDefinition["rig"] {
  return Object.fromEntries(
    Object.entries(definition.rig)
      .map(([role, target]) => {
        if (Array.isArray(target)) {
          const nextTargets = target
            .map((item) =>
              item === oldId
                ? newId
                : item,
            )
            .filter(
              (
                item,
              ): item is string =>
                Boolean(item),
            );

          return [
            role,
            nextTargets,
          ];
        }

        return [
          role,
          target === oldId
            ? newId
            : target,
        ];
      })
      .filter(
        ([, target]) =>
          target !== undefined,
      ),
  );
}

function withSequentialZIndexes(
  layersTopToBottom:
    readonly ActorLayerDefinition[],
): ActorLayerDefinition[] {
  const count =
    layersTopToBottom.length;

  return layersTopToBottom.map(
    (layer, index) => ({
      ...layer,
      zIndex: count - index - 1,
    }),
  );
}

export const ActorDocumentCommands = {
  createLayer(
    definition: ActorDefinition,
    input: CreateLayerInput,
  ): ActorDocumentCommandResult {
    const id = createUniqueActorNodeId(
      definition,
      input.id || input.name,
    );
    const highestZIndex = Math.max(
      -1,
      ...definition.layers.map(
        (layer) => layer.zIndex,
      ),
    );
    const layer: ActorLayerDefinition = {
      id,
      name: input.name.trim() || id,
      asset: input.asset,
      type: "image",
      visible: true,
      locked: false,
      opacity: 1,
      zIndex: highestZIndex + 1,
      folderId: input.folderId,
      inheritTransform: true,
      blendMode: "source-over",
      transform: {
        x: input.x ?? 0,
        y: input.y ?? 0,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        pivotX:
          (input.width ?? 0) / 2,
        pivotY:
          (input.height ?? 0) / 2,
      },
    };
    const nextDefinition = {
      ...definition,
      layers: [
        ...definition.layers,
        layer,
      ],
    };

    return result(
      nextDefinition,
      [id],
      true,
    );
  },

  renameLayer(
    definition: ActorDefinition,
    layerId: string,
    name: string,
    selectionIds: readonly string[],
  ): ActorDocumentCommandResult {
    const normalizedName = name.trim();

    if (!normalizedName) {
      return result(
        definition,
        selectionIds,
        false,
      );
    }

    let changed = false;
    const layers =
      definition.layers.map((layer) => {
        if (
          layer.id !== layerId ||
          layer.name === normalizedName
        ) {
          return layer;
        }

        changed = true;
        return {
          ...layer,
          name: normalizedName,
        };
      });

    return result(
      changed
        ? {
            ...definition,
            layers,
          }
        : definition,
      selectionIds,
      changed,
    );
  },

  changeLayerId(
    definition: ActorDefinition,
    layerId: string,
    requestedId: string,
    selectionIds: readonly string[],
  ): ActorDocumentCommandResult {
    const layer =
      definition.layers.find(
        (item) => item.id === layerId,
      );
    const normalized =
      requestedId.trim();

    if (
      !layer ||
      !normalized ||
      normalized === layerId
    ) {
      return result(
        definition,
        selectionIds,
        false,
      );
    }

    const identifiers = new Set([
      ...definition.layers.map(
        (item) => item.id,
      ),
      ...definition.groups.map(
        (group) => group.id,
      ),
    ]);

    if (identifiers.has(normalized)) {
      return result(
        definition,
        selectionIds,
        false,
      );
    }

    const mouthPoses = {
      ...definition.construction
        .mouthPoses,
    };

    for (
      const pose of
      ACTOR_MOUTH_POSES
    ) {
      const target =
        mouthPoses[pose];

      if (target === layerId) {
        mouthPoses[pose] =
          normalized;
      }
    }

    const nextDefinition: ActorDefinition = {
      ...definition,
      layers: definition.layers.map(
        (item) => ({
          ...item,
          id:
            item.id === layerId
              ? normalized
              : item.id,
          parentId:
            item.parentId === layerId
              ? normalized
              : item.parentId,
        }),
      ),
      groups: definition.groups.map(
        (group) => ({
          ...group,
          parentId:
            group.parentId === layerId
              ? normalized
              : group.parentId,
        }),
      ),
      rig: updateRigReferences(
        definition,
        layerId,
        normalized,
      ),
      construction: {
        ...definition.construction,
        mouthPoses,
      },
    };

    return result(
      nextDefinition,
      selectionIds.map((id) =>
        id === layerId
          ? normalized
          : id,
      ),
      true,
    );
  },

  duplicateLayers(
    definition: ActorDefinition,
    layerIds: readonly string[],
  ): ActorDocumentCommandResult {
    const selected = new Set(layerIds);
    const sourceLayers =
      definition.layers.filter((layer) =>
        selected.has(layer.id),
      );

    if (sourceLayers.length === 0) {
      return result(
        definition,
        layerIds,
        false,
      );
    }

    let workingDefinition = definition;
    const duplicates: ActorLayerDefinition[] =
      [];

    for (const source of sourceLayers) {
      const id = createUniqueActorNodeId(
        workingDefinition,
        `${source.id}_copy`,
      );

      duplicates.push({
        ...source,
        id,
        name: `${source.name} Copy`,
        zIndex:
          source.zIndex + 0.5,
        transform: {
          ...source.transform,
          x: source.transform.x + 12,
          y: source.transform.y + 12,
        },
        metadata: source.metadata
          ? {
              ...source.metadata,
            }
          : undefined,
      });
      workingDefinition = {
        ...workingDefinition,
        layers: [
          ...workingDefinition.layers,
          duplicates[
            duplicates.length - 1
          ],
        ],
      };
    }

    const ordered = [
      ...definition.layers,
      ...duplicates,
    ].sort(
      (first, second) =>
        second.zIndex -
          first.zIndex ||
        second.id.localeCompare(
          first.id,
        ),
    );
    const layers =
      withSequentialZIndexes(ordered);

    return result(
      {
        ...definition,
        layers,
      },
      duplicates.map(
        (layer) => layer.id,
      ),
      true,
    );
  },

  deleteLayers(
    definition: ActorDefinition,
    layerIds: readonly string[],
  ): ActorDocumentCommandResult {
    const deleted = new Set(layerIds);
    const layers =
      definition.layers.filter(
        (layer) =>
          !deleted.has(layer.id),
      );

    if (
      layers.length ===
      definition.layers.length
    ) {
      return result(
        definition,
        layerIds,
        false,
      );
    }

    const mouthPoses = {
      ...definition.construction
        .mouthPoses,
    };

    for (
      const pose of
      ACTOR_MOUTH_POSES
    ) {
      const target =
        mouthPoses[pose];

      if (
        target &&
        deleted.has(target)
      ) {
        delete mouthPoses[pose];
      }
    }

    let rig = definition.rig;

    for (const deletedId of deleted) {
      rig = updateRigReferences(
        {
          ...definition,
          rig,
        },
        deletedId,
        undefined,
      );
    }

    return result(
      {
        ...definition,
        layers: layers.map(
          (layer) => ({
            ...layer,
            parentId:
              layer.parentId &&
              deleted.has(
                layer.parentId,
              )
                ? undefined
                : layer.parentId,
          }),
        ),
        groups:
          definition.groups.map(
            (group) => ({
              ...group,
              parentId:
                group.parentId &&
                deleted.has(
                  group.parentId,
                )
                  ? undefined
                  : group.parentId,
            }),
          ),
        rig,
        construction: {
          ...definition.construction,
          mouthPoses,
        },
      },
      [],
      true,
    );
  },

  moveLayers(
    definition: ActorDefinition,
    layerIds: readonly string[],
    deltaX: number,
    deltaY: number,
  ): ActorDocumentCommandResult {
    const selected = new Set(layerIds);
    let changed = false;
    const layers =
      definition.layers.map((layer) => {
        if (
          !selected.has(layer.id) ||
          getEffectiveLayerState(
            definition,
            layer,
          ).locked
        ) {
          return layer;
        }

        changed = true;
        return {
          ...layer,
          transform: {
            ...layer.transform,
            x:
              layer.transform.x +
              deltaX,
            y:
              layer.transform.y +
              deltaY,
          },
        };
      });

    return result(
      changed
        ? {
            ...definition,
            layers,
          }
        : definition,
      layerIds,
      changed,
    );
  },

  setTransforms(
    definition: ActorDefinition,
    layerIds: readonly string[],
    patch: TransformPatch,
  ): ActorDocumentCommandResult {
    const selected = new Set(layerIds);
    let changed = false;
    const layers =
      definition.layers.map((layer) => {
        if (
          !selected.has(layer.id) ||
          getEffectiveLayerState(
            definition,
            layer,
          ).locked
        ) {
          return layer;
        }

        const transform = {
          ...layer.transform,
          ...patch,
        };

        if (
          ACTOR_TRANSFORM_KEYS.every(
            (key) =>
              !(key in patch) ||
              layer.transform[key] ===
                patch[key],
          )
        ) {
          return layer;
        }

        changed = true;
        return {
          ...layer,
          transform,
        };
      });

    return result(
      changed
        ? {
            ...definition,
            layers,
          }
        : definition,
      layerIds,
      changed,
    );
  },

  resetTransforms(
    definition: ActorDefinition,
    layerIds: readonly string[],
  ): ActorDocumentCommandResult {
    const selected = new Set(layerIds);
    let changed = false;

    const layers =
      definition.layers.map((layer) => {
        if (
          !selected.has(layer.id) ||
          getEffectiveLayerState(
            definition,
            layer,
          ).locked
        ) {
          return layer;
        }

        changed = true;
        return {
          ...layer,
          transform: {
            ...layer.transform,
            x: 0,
            y: 0,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
          },
        };
      });

    return result(
      changed
        ? {
            ...definition,
            layers,
          }
        : definition,
      layerIds,
      changed,
    );
  },

  setLayerVisibility(
    definition: ActorDefinition,
    layerIds: readonly string[],
    visible: boolean,
  ): ActorDocumentCommandResult {
    return ActorDocumentCommands
      .setLayerProperties(
        definition,
        layerIds,
        { visible },
      );
  },

  setLayerLock(
    definition: ActorDefinition,
    layerIds: readonly string[],
    locked: boolean,
  ): ActorDocumentCommandResult {
    return ActorDocumentCommands
      .setLayerProperties(
        definition,
        layerIds,
        { locked },
      );
  },

  setLayerProperties(
    definition: ActorDefinition,
    layerIds: readonly string[],
    patch: Partial<
      Pick<
        ActorLayerDefinition,
        | "visible"
        | "locked"
        | "opacity"
        | "folderId"
        | "blendMode"
        | "asset"
        | "inheritTransform"
      >
    >,
  ): ActorDocumentCommandResult {
    const selected = new Set(layerIds);
    let changed = false;
    const layers =
      definition.layers.map((layer) => {
        if (!selected.has(layer.id)) {
          return layer;
        }

        const isSame =
          EDITABLE_LAYER_PROPERTY_KEYS.every(
            (key) =>
              !(key in patch) ||
              layer[key] ===
                patch[key],
          );

        if (isSame) {
          return layer;
        }

        changed = true;
        return {
          ...layer,
          ...patch,
        };
      });

    return result(
      changed
        ? {
            ...definition,
            layers,
          }
        : definition,
      layerIds,
      changed,
    );
  },

  reorderLayers(
    definition: ActorDefinition,
    layerIdsTopToBottom:
      readonly string[],
    selectionIds: readonly string[],
  ): ActorDocumentCommandResult {
    const uniqueIds = [
      ...new Set(
        layerIdsTopToBottom,
      ),
    ];

    if (
      uniqueIds.length !==
        definition.layers.length ||
      uniqueIds.some(
        (id) =>
          !definition.layers.some(
            (layer) =>
              layer.id === id,
          ),
      )
    ) {
      return result(
        definition,
        selectionIds,
        false,
      );
    }

    const layersById = new Map(
      definition.layers.map(
        (layer) => [
          layer.id,
          layer,
        ],
      ),
    );
    const nextLayers =
      withSequentialZIndexes(
        uniqueIds.flatMap((id) => {
          const layer =
            layersById.get(id);
          return layer
            ? [layer]
            : [];
        }),
      );

    const changed =
      nextLayers.some(
        (layer, index) =>
          layer.id !==
            definition.layers[index]
              ?.id ||
          layer.zIndex !==
            definition.layers[index]
              ?.zIndex,
      );

    return result(
      changed
        ? {
            ...definition,
            layers: nextLayers,
          }
        : definition,
      selectionIds,
      changed,
    );
  },

  assignFolder(
    definition: ActorDefinition,
    layerIds: readonly string[],
    folderId: string | undefined,
  ): ActorDocumentCommandResult {
    if (
      folderId &&
      !definition.folders.some(
        (folder) =>
          folder.id === folderId,
      )
    ) {
      return result(
        definition,
        layerIds,
        false,
      );
    }

    return ActorDocumentCommands
      .setLayerProperties(
        definition,
        layerIds,
        { folderId },
      );
  },

  setParent(
    definition: ActorDefinition,
    nodeIds: readonly string[],
    parentId: string | undefined,
  ): ActorDocumentCommandResult {
    let nextDefinition = definition;
    let changed = false;

    for (const nodeId of nodeIds) {
      if (
        !canAssignActorParent(
          nextDefinition,
          nodeId,
          parentId,
        )
      ) {
        continue;
      }

      const nextLayers =
        nextDefinition.layers.map(
          (layer) =>
            layer.id === nodeId &&
            layer.parentId !== parentId
              ? {
                  ...layer,
                  parentId,
                  inheritTransform:
                    Boolean(parentId),
                }
              : layer,
        );
      const nextGroups =
        nextDefinition.groups.map(
          (group) =>
            group.id === nodeId &&
            group.parentId !== parentId
              ? {
                  ...group,
                  parentId,
                }
              : group,
        );
      const nodeChanged =
        nextLayers.some(
          (layer, index) =>
            layer !==
            nextDefinition.layers[index],
        ) ||
        nextGroups.some(
          (group, index) =>
            group !==
            nextDefinition.groups[index],
        );

      if (nodeChanged) {
        changed = true;
        nextDefinition = {
          ...nextDefinition,
          layers: nextLayers,
          groups: nextGroups,
        };
      }
    }

    return result(
      nextDefinition,
      nodeIds,
      changed,
    );
  },

  createFolder(
    definition: ActorDefinition,
    name: string,
    selectionIds:
      readonly string[] = [],
  ): ActorDocumentCommandResult {
    const normalizedName =
      name.trim() || "NEW FOLDER";
    const existingIds = new Set(
      definition.folders.map(
        (folder) => folder.id,
      ),
    );
    const base =
      normalizedName
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, "_")
        .replace(/^_+|_+$/g, "") ||
      "folder";
    let id = base;
    let suffix = 2;

    while (existingIds.has(id)) {
      id = `${base}_${suffix}`;
      suffix += 1;
    }

    const folder: ActorFolderDefinition = {
      id,
      name: normalizedName,
      order:
        Math.max(
          -1,
          ...definition.folders.map(
            (item) => item.order,
          ),
        ) + 1,
      visible: true,
      locked: false,
    };

    return result(
      {
        ...definition,
        folders: [
          ...definition.folders,
          folder,
        ],
      },
      selectionIds,
      true,
    );
  },

  updateFolder(
    definition: ActorDefinition,
    folderId: string,
    patch: Partial<
      Pick<
        ActorFolderDefinition,
        | "name"
        | "visible"
        | "locked"
        | "parentId"
      >
    >,
    selectionIds: readonly string[],
  ): ActorDocumentCommandResult {
    let changed = false;
    const folders =
      definition.folders.map(
        (folder) => {
          if (folder.id !== folderId) {
            return folder;
          }

          const next = {
            ...folder,
            ...patch,
            name:
              patch.name?.trim() ||
              folder.name,
          };

          if (
            JSON.stringify(next) ===
            JSON.stringify(folder)
          ) {
            return folder;
          }

          changed = true;
          return next;
        },
      );

    return result(
      changed
        ? {
            ...definition,
            folders,
          }
        : definition,
      selectionIds,
      changed,
    );
  },

  deleteFolder(
    definition: ActorDefinition,
    folderId: string,
    selectionIds: readonly string[],
  ): ActorDocumentCommandResult {
    const folders =
      definition.folders.filter(
        (folder) =>
          folder.id !== folderId,
      );

    if (
      folders.length ===
      definition.folders.length
    ) {
      return result(
        definition,
        selectionIds,
        false,
      );
    }

    return result(
      {
        ...definition,
        folders: folders.map(
          (folder) => ({
            ...folder,
            parentId:
              folder.parentId ===
              folderId
                ? undefined
                : folder.parentId,
          }),
        ),
        layers:
          definition.layers.map(
            (layer) => ({
              ...layer,
              folderId:
                layer.folderId ===
                folderId
                  ? undefined
                  : layer.folderId,
            }),
          ),
      },
      selectionIds,
      true,
    );
  },

  reorderFolders(
    definition: ActorDefinition,
    folderIds: readonly string[],
    selectionIds: readonly string[],
  ): ActorDocumentCommandResult {
    const byId = new Map(
      definition.folders.map(
        (folder) => [
          folder.id,
          folder,
        ],
      ),
    );
    const ordered = [
      ...new Set(folderIds),
    ].flatMap((id) => {
      const folder = byId.get(id);
      return folder
        ? [folder]
        : [];
    });

    for (
      const folder of
      definition.folders
    ) {
      if (
        !ordered.some(
          (item) =>
            item.id === folder.id,
        )
      ) {
        ordered.push(folder);
      }
    }

    const folders = ordered.map(
      (folder, order) => ({
        ...folder,
        order,
      }),
    );
    const changed = folders.some(
      (folder, index) =>
        folder.id !==
          definition.folders[index]
            ?.id ||
        folder.order !==
          definition.folders[index]
            ?.order,
    );

    return result(
      changed
        ? {
            ...definition,
            folders,
          }
        : definition,
      selectionIds,
      changed,
    );
  },

  createGroup(
    definition: ActorDefinition,
    name: string,
    layerIds: readonly string[],
  ): ActorDocumentCommandResult {
    const selectedLayers =
      definition.layers.filter(
        (layer) =>
          layerIds.includes(layer.id),
      );

    if (
      selectedLayers.length === 0
    ) {
      return result(
        definition,
        layerIds,
        false,
      );
    }

    const id = createUniqueActorNodeId(
      definition,
      name || "group",
    );
    const pivotX =
      selectedLayers.reduce(
        (sum, layer) =>
          sum +
          layer.transform.x +
          layer.transform.pivotX,
        0,
      ) / selectedLayers.length;
    const pivotY =
      selectedLayers.reduce(
        (sum, layer) =>
          sum +
          layer.transform.y +
          layer.transform.pivotY,
        0,
      ) / selectedLayers.length;
    const group: ActorGroupDefinition = {
      id,
      name: name.trim() || "Group",
      visible: true,
      locked: false,
      transform: {
        x: 0,
        y: 0,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        pivotX,
        pivotY,
      },
    };

    return result(
      {
        ...definition,
        groups: [
          ...definition.groups,
          group,
        ],
        layers:
          definition.layers.map(
            (layer) =>
              layerIds.includes(
                layer.id,
              )
                ? {
                    ...layer,
                    parentId: id,
                    inheritTransform:
                      true,
                  }
                : layer,
          ),
      },
      layerIds,
      true,
    );
  },

  updateGroup(
    definition: ActorDefinition,
    groupId: string,
    patch: Partial<
      Pick<
        ActorGroupDefinition,
        | "name"
        | "visible"
        | "locked"
        | "parentId"
      >
    > & {
      transform?: Partial<
        ActorTransform
      >;
    },
    selectionIds: readonly string[],
  ): ActorDocumentCommandResult {
    if (
      patch.parentId !== undefined &&
      !canAssignActorParent(
        definition,
        groupId,
        patch.parentId || undefined,
      )
    ) {
      return result(
        definition,
        selectionIds,
        false,
      );
    }

    let changed = false;
    const groups =
      definition.groups.map(
        (group) => {
          if (group.id !== groupId) {
            return group;
          }

          const next = {
            ...group,
            ...patch,
            name:
              patch.name?.trim() ||
              group.name,
            transform:
              patch.transform
                ? {
                    ...group.transform,
                    ...patch.transform,
                  }
                : group.transform,
          };

          if (
            JSON.stringify(next) ===
            JSON.stringify(group)
          ) {
            return group;
          }

          changed = true;
          return next;
        },
      );

    return result(
      changed
        ? {
            ...definition,
            groups,
          }
        : definition,
      selectionIds,
      changed,
    );
  },

  deleteGroups(
    definition: ActorDefinition,
    groupIds: readonly string[],
    selectionIds: readonly string[],
  ): ActorDocumentCommandResult {
    const deleted = new Set(groupIds);
    const groups =
      definition.groups.filter(
        (group) =>
          !deleted.has(group.id),
      );

    if (
      groups.length ===
      definition.groups.length
    ) {
      return result(
        definition,
        selectionIds,
        false,
      );
    }

    return result(
      {
        ...definition,
        groups: groups.map(
          (group) => ({
            ...group,
            parentId:
              group.parentId &&
              deleted.has(
                group.parentId,
              )
                ? undefined
                : group.parentId,
          }),
        ),
        layers:
          definition.layers.map(
            (layer) => ({
              ...layer,
              parentId:
                layer.parentId &&
                deleted.has(
                  layer.parentId,
                )
                  ? undefined
                  : layer.parentId,
            }),
          ),
      },
      selectionIds.filter(
        (id) => !deleted.has(id),
      ),
      true,
    );
  },

  setMouthPose(
    definition: ActorDefinition,
    pose: ActorMouthPose,
    layerId: string | undefined,
    selectionIds: readonly string[],
  ): ActorDocumentCommandResult {
    if (
      layerId &&
      !definition.layers.some(
        (layer) =>
          layer.id === layerId,
      )
    ) {
      return result(
        definition,
        selectionIds,
        false,
      );
    }

    const mouthPoses = {
      ...definition.construction
        .mouthPoses,
    };
    const current = mouthPoses[pose];

    if (current === layerId) {
      return result(
        definition,
        selectionIds,
        false,
      );
    }

    if (layerId) {
      mouthPoses[pose] = layerId;
    } else {
      delete mouthPoses[pose];
    }

    return result(
      {
        ...definition,
        construction: {
          ...definition.construction,
          mouthPoses,
        },
      },
      selectionIds,
      true,
    );
  },

  addAsset(
    definition: ActorDefinition,
    asset: ActorAssetDefinition,
    selectionIds: readonly string[],
  ): ActorDocumentCommandResult {
    const existing =
      definition.assets.find(
        (item) =>
          item.path === asset.path,
      );
    const assets = existing
      ? definition.assets.map(
          (item) =>
            item.path === asset.path
              ? {
                  ...asset,
                }
              : item,
        )
      : [
          ...definition.assets,
          {
            ...asset,
          },
        ];

    return result(
      {
        ...definition,
        assets,
      },
      selectionIds,
      !existing ||
        JSON.stringify(existing) !==
          JSON.stringify(asset),
    );
  },

  replaceAsset(
    definition: ActorDefinition,
    oldPath: string,
    asset: ActorAssetDefinition,
    selectionIds: readonly string[],
  ): ActorDocumentCommandResult {
    const assets =
      definition.assets
        .filter(
          (item) =>
            item.path !== oldPath &&
            item.path !== asset.path,
        )
        .concat(asset);
    const layers =
      definition.layers.map(
        (layer) =>
          layer.asset === oldPath
            ? {
                ...layer,
                asset: asset.path,
              }
            : layer,
      );

    return result(
      {
        ...definition,
        assets,
        layers,
      },
      selectionIds,
      true,
    );
  },

  deleteAsset(
    definition: ActorDefinition,
    path: string,
    selectionIds: readonly string[],
  ): ActorDocumentCommandResult {
    const assets =
      definition.assets.filter(
        (asset) =>
          asset.path !== path,
      );

    if (
      assets.length ===
      definition.assets.length
    ) {
      return result(
        definition,
        selectionIds,
        false,
      );
    }

    return result(
      {
        ...definition,
        assets,
        layers:
          definition.layers.map(
            (layer) =>
              layer.asset === path
                ? {
                    ...layer,
                    asset: "",
                  }
                : layer,
          ),
      },
      selectionIds,
      true,
    );
  },

  setBlendMode(
    definition: ActorDefinition,
    layerIds: readonly string[],
    blendMode: ActorBlendMode,
  ): ActorDocumentCommandResult {
    return ActorDocumentCommands
      .setLayerProperties(
        definition,
        layerIds,
        { blendMode },
      );
  },

  normalizeSelection,
};
