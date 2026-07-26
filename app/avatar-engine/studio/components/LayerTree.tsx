import type {
  ActorDiagnostic,
  ActorFolderDefinition,
  ActorLayerDefinition,
} from "../../types/Actor";

import FolderRow from "./FolderRow";
import LayerRow from "./LayerRow";

import type {
  LayerRowSelectModifiers,
} from "./LayerRow";

interface LayerTreeProps {
  folders: readonly ActorFolderDefinition[];
  layers: readonly ActorLayerDefinition[];
  selectedLayerIds: readonly string[];
  loadedLayerIds: ReadonlySet<string>;
  diagnostics: readonly ActorDiagnostic[];
  collapsedFolderIds: ReadonlySet<string>;
  onToggleFolderCollapsed: (
    folderId: string,
  ) => void;
  onSelectLayer: (
    layerId: string,
    modifiers: LayerRowSelectModifiers,
  ) => void;
  onToggleLayerVisibility: (
    layerId: string,
  ) => void;
  onToggleLayerLock: (
    layerId: string,
  ) => void;
  onRenameLayer: (
    layerId: string,
    name: string,
  ) => void;
  onDuplicateLayer: (
    layerId: string,
  ) => void;
  onDeleteLayer: (
    layerId: string,
  ) => void;
  onToggleFolderVisibility: (
    folderId: string,
  ) => void;
  onToggleFolderLock: (
    folderId: string,
  ) => void;
  onRenameFolder: (
    folderId: string,
    name: string,
  ) => void;
  onDeleteFolder: (
    folderId: string,
  ) => void;
  onAssignLayersToFolder: (
    layerIds: readonly string[],
    folderId: string | undefined,
  ) => void;
  onReorderLayers: (
    layerIds: readonly string[],
    targetLayerId: string,
  ) => void;
  onReorderFolders: (
    folderId: string,
    targetFolderId: string,
  ) => void;
}
interface DragPayload {
  kind: "layer" | "folder";
  ids: string[];
}

const DRAG_TYPE =
  "application/x-genesis-layer-tree";

function readDragPayload(
  event: React.DragEvent,
): DragPayload | null {
  const value =
    event.dataTransfer.getData(
      DRAG_TYPE,
    ) ||
    event.dataTransfer.getData(
      "text/plain",
    );

  if (!value) {
    return null;
  }

  try {
    const parsed: unknown =
      JSON.parse(value);

    if (
      !parsed ||
      typeof parsed !== "object" ||
      !("kind" in parsed) ||
      !("ids" in parsed) ||
      (
        parsed.kind !== "layer" &&
        parsed.kind !== "folder"
      ) ||
      !Array.isArray(parsed.ids) ||
      !parsed.ids.every(
        (id) =>
          typeof id === "string",
      )
    ) {
      return null;
    }

    return {
      kind: parsed.kind,
      ids: parsed.ids,
    };
  } catch {
    return null;
  }
}

export default function LayerTree({
  folders,
  layers,
  selectedLayerIds,
  loadedLayerIds,
  diagnostics,
  collapsedFolderIds,
  onToggleFolderCollapsed,
  onSelectLayer,
  onToggleLayerVisibility,
  onToggleLayerLock,
  onRenameLayer,
  onDuplicateLayer,
  onDeleteLayer,
  onToggleFolderVisibility,
  onToggleFolderLock,
  onRenameFolder,
  onDeleteFolder,
  onAssignLayersToFolder,
  onReorderLayers,
  onReorderFolders,
}: LayerTreeProps) {
  const selected =
    new Set(selectedLayerIds);
  const diagnosticsByLayer =
    new Map<string, number>();

  for (const item of diagnostics) {
    if (!item.layerId) {
      continue;
    }

    diagnosticsByLayer.set(
      item.layerId,
      (
        diagnosticsByLayer.get(
          item.layerId,
        ) ?? 0
      ) + 1,
    );
  }

  const startLayerDrag = (
    event: React.DragEvent,
    layerId: string,
  ) => {
    const ids = selected.has(layerId)
      ? selectedLayerIds
      : [layerId];
    const payload: DragPayload = {
      kind: "layer",
      ids: [...ids],
    };
    const serialized =
      JSON.stringify(payload);

    event.dataTransfer.effectAllowed =
      "move";
    event.dataTransfer.setData(
      DRAG_TYPE,
      serialized,
    );
    event.dataTransfer.setData(
      "text/plain",
      serialized,
    );
  };

  const startFolderDrag = (
    event: React.DragEvent,
    folderId: string,
  ) => {
    const serialized = JSON.stringify({
      kind: "folder",
      ids: [folderId],
    } satisfies DragPayload);

    event.dataTransfer.effectAllowed =
      "move";
    event.dataTransfer.setData(
      DRAG_TYPE,
      serialized,
    );
    event.dataTransfer.setData(
      "text/plain",
      serialized,
    );
  };

  const layerRow = (
    layer: ActorLayerDefinition,
  ) => (
    <LayerRow
      key={layer.id}
      layer={layer}
      selected={selected.has(
        layer.id,
      )}
      assetLoaded={loadedLayerIds.has(
        layer.id,
      )}
      warningCount={
        diagnosticsByLayer.get(
          layer.id,
        ) ?? 0
      }
      onSelect={onSelectLayer}
      onToggleVisibility={
        onToggleLayerVisibility
      }
      onToggleLock={
        onToggleLayerLock
      }
      onRename={onRenameLayer}
      onDuplicate={onDuplicateLayer}
      onDelete={onDeleteLayer}
      onDragStart={startLayerDrag}
      onDrop={(event, targetId) => {
        event.preventDefault();
        const payload =
          readDragPayload(event);

        if (
          payload?.kind === "layer"
        ) {
          onReorderLayers(
            payload.ids,
            targetId,
          );
        }
      }}
    />
  );

  return (
    <div
      role="listbox"
      aria-label="Actor layers"
      aria-multiselectable="true"
    >
      {folders.map((folder) => {
        const folderLayers =
          layers.filter(
            (layer) =>
              layer.folderId ===
              folder.id,
          );
        const collapsed =
          collapsedFolderIds.has(
            folder.id,
          );

        return (
          <div key={folder.id}>
            <FolderRow
              folder={folder}
              collapsed={collapsed}
              layerCount={
                folderLayers.length
              }
              onToggleCollapsed={
                onToggleFolderCollapsed
              }
              onToggleVisibility={
                onToggleFolderVisibility
              }
              onToggleLock={
                onToggleFolderLock
              }
              onRename={onRenameFolder}
              onDelete={onDeleteFolder}
              onDragStart={
                startFolderDrag
              }
              onDrop={(
                event,
                targetFolderId,
              ) => {
                event.preventDefault();
                const payload =
                  readDragPayload(
                    event,
                  );

                if (
                  payload?.kind ===
                  "layer"
                ) {
                  onAssignLayersToFolder(
                    payload.ids,
                    targetFolderId,
                  );
                }

                if (
                  payload?.kind ===
                    "folder" &&
                  payload.ids[0]
                ) {
                  onReorderFolders(
                    payload.ids[0],
                    targetFolderId,
                  );
                }
              }}
            />

            {!collapsed &&
              folderLayers.map(
                layerRow,
              )}
          </div>
        );
      })}

      {layers.some(
        (layer) =>
          !layer.folderId ||
          !folders.some(
            (folder) =>
              folder.id ===
              layer.folderId,
          ),
      ) && (
        <div
          onDragOver={(event) => {
            event.preventDefault();
          }}
          onDrop={(event) => {
            event.preventDefault();
            const payload =
              readDragPayload(event);

            if (
              payload?.kind === "layer"
            ) {
              onAssignLayersToFolder(
                payload.ids,
                undefined,
              );
            }
          }}
        >
          <div
            style={{
              margin: "8px 0 4px",
              color:
                "rgba(255,255,255,0.35)",
              fontSize: 9,
              letterSpacing:
                "0.12em",
            }}
          >
            UNASSIGNED
          </div>

          {layers
            .filter(
              (layer) =>
                !layer.folderId ||
                !folders.some(
                  (folder) =>
                    folder.id ===
                    layer.folderId,
                ),
            )
            .map(layerRow)}
        </div>
      )}
    </div>
  );
}
