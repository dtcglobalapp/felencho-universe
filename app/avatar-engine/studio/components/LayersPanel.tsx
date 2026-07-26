import {
  useMemo,
  useState,
} from "react";

import type {
  ActorDiagnostic,
  ActorFolderDefinition,
  ActorGroupDefinition,
  ActorLayerDefinition,
} from "../../types/Actor";

import LayerTree from "./LayerTree";
import PanelTitle from "./PanelTitle";

import type {
  LayerRowSelectModifiers,
} from "./LayerRow";

type LayerFilter =
  | "all"
  | "visible"
  | "hidden"
  | "locked"
  | "missing";

const LAYER_FILTERS:
  readonly LayerFilter[] = [
    "all",
    "visible",
    "hidden",
    "locked",
    "missing",
  ];

interface LayersPanelProps {
  actorLoaded: boolean;
  folders: readonly ActorFolderDefinition[];
  groups: readonly ActorGroupDefinition[];
  layers: readonly ActorLayerDefinition[];
  selectedLayerIds: readonly string[];
  selectedGroupId: string | null;
  loadedLayerIds: ReadonlySet<string>;
  diagnostics: readonly ActorDiagnostic[];
  onSelectLayer: (
    layerId: string,
    modifiers: LayerRowSelectModifiers,
  ) => void;
  onSelectGroup: (
    groupId: string,
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
  onDuplicateLayers: (
    layerIds: readonly string[],
  ) => void;
  onDeleteLayers: (
    layerIds: readonly string[],
  ) => void;
  onCreateFolder: () => void;
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
  onCreateGroup: (
    layerIds: readonly string[],
  ) => void;
  onToggleGroupVisibility: (
    groupId: string,
  ) => void;
  onToggleGroupLock: (
    groupId: string,
  ) => void;
  onDeleteGroup: (
    groupId: string,
  ) => void;
}

export default function LayersPanel({
  actorLoaded,
  folders,
  groups,
  layers,
  selectedLayerIds,
  selectedGroupId,
  loadedLayerIds,
  diagnostics,
  onSelectLayer,
  onSelectGroup,
  onToggleLayerVisibility,
  onToggleLayerLock,
  onRenameLayer,
  onDuplicateLayers,
  onDeleteLayers,
  onCreateFolder,
  onToggleFolderVisibility,
  onToggleFolderLock,
  onRenameFolder,
  onDeleteFolder,
  onAssignLayersToFolder,
  onReorderLayers,
  onReorderFolders,
  onCreateGroup,
  onToggleGroupVisibility,
  onToggleGroupLock,
  onDeleteGroup,
}: LayersPanelProps) {
  const [search, setSearch] =
    useState("");
  const [filter, setFilter] =
    useState<LayerFilter>("all");
  const [
    collapsedFolderIds,
    setCollapsedFolderIds,
  ] = useState<Set<string>>(
    new Set(),
  );
  const warningLayerIds = useMemo(
    () =>
      new Set(
        diagnostics.flatMap(
          (item) =>
            item.layerId
              ? [item.layerId]
              : [],
        ),
      ),
    [diagnostics],
  );
  const visibleLayers = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    return layers.filter((layer) => {
      if (
        query &&
        ![
          layer.name,
          layer.id,
          layer.metadata?.category,
          layer.metadata
            ?.semanticRole,
          layer.asset,
        ].some((value) =>
          value
            ?.toLowerCase()
            .includes(query),
        )
      ) {
        return false;
      }

      if (
        filter === "visible" &&
        !layer.visible
      ) {
        return false;
      }

      if (
        filter === "hidden" &&
        layer.visible
      ) {
        return false;
      }

      if (
        filter === "locked" &&
        !layer.locked
      ) {
        return false;
      }

      if (
        filter === "missing" &&
        loadedLayerIds.has(layer.id) &&
        !warningLayerIds.has(layer.id)
      ) {
        return false;
      }

      return true;
    });
  }, [
    filter,
    layers,
    loadedLayerIds,
    search,
    warningLayerIds,
  ]);

  return (
    <aside
      style={{
        minHeight: 0,
        display: "grid",
        gridTemplateRows:
          "48px auto minmax(0,1fr)",
        borderRight:
          "1px solid rgba(70,210,255,0.14)",
        background: "#070b0e",
      }}
    >
      <PanelTitle
        title="LAYERS"
        subtitle={
          actorLoaded
            ? `${selectedLayerIds.length} / ${layers.length}`
            : "NO ACTOR"
        }
      />

      <div
        style={{
          display: "grid",
          gap: 7,
          padding: "9px 10px",
          borderBottom:
            "1px solid rgba(70,210,255,0.08)",
        }}
      >
        <input
          type="search"
          value={search}
          placeholder="Search layers"
          onChange={(event) =>
            setSearch(
              event.target.value,
            )
          }
          style={inputStyle}
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "minmax(0,1fr) repeat(3,auto)",
            gap: 5,
          }}
        >
          <select
            value={filter}
            onChange={(event) => {
              const next =
                LAYER_FILTERS.find(
                  (item) =>
                    item ===
                    event.target.value,
                );

              if (next) {
                setFilter(next);
              }
            }}
            style={inputStyle}
          >
            <option value="all">
              All layers
            </option>
            <option value="visible">
              Visible
            </option>
            <option value="hidden">
              Hidden
            </option>
            <option value="locked">
              Locked
            </option>
            <option value="missing">
              Missing / warning
            </option>
          </select>

          <ActionButton
            label="+ FOLDER"
            title="Create folder"
            disabled={!actorLoaded}
            onClick={onCreateFolder}
          />
          <ActionButton
            label="GROUP"
            title="Group selected layers"
            disabled={
              selectedLayerIds.length ===
              0
            }
            onClick={() =>
              onCreateGroup(
                selectedLayerIds,
              )
            }
          />
          <ActionButton
            label="⧉"
            title="Duplicate selection"
            disabled={
              selectedLayerIds.length ===
              0
            }
            onClick={() =>
              onDuplicateLayers(
                selectedLayerIds,
              )
            }
          />
        </div>
      </div>

      <div
        style={{
          minHeight: 0,
          overflowY: "auto",
          overscrollBehavior:
            "contain",
          scrollBehavior: "smooth",
          padding: "4px 8px 20px",
        }}
      >
        {!actorLoaded && (
          <EmptyState>
            No hay un actor cargado.
          </EmptyState>
        )}

        {actorLoaded &&
          layers.length === 0 && (
            <EmptyState>
              Importa un PNG para crear
              la primera capa.
            </EmptyState>
          )}

        {actorLoaded &&
          layers.length > 0 &&
          visibleLayers.length ===
            0 && (
            <EmptyState>
              No hay capas que coincidan
              con la búsqueda.
            </EmptyState>
          )}

        <LayerTree
          folders={folders}
          layers={visibleLayers}
          selectedLayerIds={
            selectedLayerIds
          }
          loadedLayerIds={
            loadedLayerIds
          }
          diagnostics={diagnostics}
          collapsedFolderIds={
            collapsedFolderIds
          }
          onToggleFolderCollapsed={(
            folderId,
          ) => {
            setCollapsedFolderIds(
              (current) => {
                const next = new Set(
                  current,
                );

                if (
                  next.has(folderId)
                ) {
                  next.delete(folderId);
                } else {
                  next.add(folderId);
                }

                return next;
              },
            );
          }}
          onSelectLayer={
            onSelectLayer
          }
          onToggleLayerVisibility={
            onToggleLayerVisibility
          }
          onToggleLayerLock={
            onToggleLayerLock
          }
          onRenameLayer={
            onRenameLayer
          }
          onDuplicateLayer={(
            layerId,
          ) =>
            onDuplicateLayers([
              layerId,
            ])
          }
          onDeleteLayer={(layerId) =>
            onDeleteLayers([layerId])
          }
          onToggleFolderVisibility={
            onToggleFolderVisibility
          }
          onToggleFolderLock={
            onToggleFolderLock
          }
          onRenameFolder={
            onRenameFolder
          }
          onDeleteFolder={
            onDeleteFolder
          }
          onAssignLayersToFolder={
            onAssignLayersToFolder
          }
          onReorderLayers={
            onReorderLayers
          }
          onReorderFolders={
            onReorderFolders
          }
        />

        {groups.length > 0 && (
          <div
            style={{
              marginTop: 12,
              paddingTop: 8,
              borderTop:
                "1px solid rgba(70,210,255,0.1)",
            }}
          >
            <div
              style={{
                marginBottom: 5,
                color: "#73ddff",
                fontSize: 9,
                letterSpacing:
                  "0.12em",
              }}
            >
              TRANSFORM GROUPS
            </div>

            {groups.map((group) => (
              <div
                key={group.id}
                role="button"
                tabIndex={0}
                onClick={() =>
                  onSelectGroup(
                    group.id,
                  )
                }
                onKeyDown={(event) => {
                  if (
                    event.key ===
                      "Enter" ||
                    event.key === " "
                  ) {
                    event.preventDefault();
                    onSelectGroup(
                      group.id,
                    );
                  }
                }}
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "minmax(0,1fr) repeat(3,22px)",
                  alignItems: "center",
                  gap: 4,
                  minHeight: 32,
                  padding: "3px 5px",
                  marginBottom: 3,
                  border:
                    selectedGroupId ===
                    group.id
                      ? "1px solid rgba(78,213,255,0.72)"
                      : "1px solid rgba(255,255,255,0.05)",
                  borderRadius: 4,
                  color:
                    "rgba(255,255,255,0.68)",
                  background:
                    selectedGroupId ===
                    group.id
                      ? "rgba(41,175,218,0.16)"
                      : "rgba(255,255,255,0.02)",
                  fontSize: 9,
                  cursor: "pointer",
                }}
              >
                <span
                  style={{
                    overflow: "hidden",
                    textOverflow:
                      "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  ◇ {group.name}
                </span>
                <GroupButton
                  label={
                    group.visible
                      ? "◉"
                      : "○"
                  }
                  title="Toggle group visibility"
                  onClick={() =>
                    onToggleGroupVisibility(
                      group.id,
                    )
                  }
                />
                <GroupButton
                  label={
                    group.locked
                      ? "▣"
                      : "▢"
                  }
                  title="Toggle group lock"
                  onClick={() =>
                    onToggleGroupLock(
                      group.id,
                    )
                  }
                />
                <GroupButton
                  label="×"
                  title="Delete group"
                  onClick={() =>
                    onDeleteGroup(
                      group.id,
                    )
                  }
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}

function GroupButton({
  label,
  title,
  onClick,
}: {
  label: string;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      style={{
        width: 22,
        height: 22,
        padding: 0,
        border:
          "1px solid rgba(255,255,255,0.06)",
        borderRadius: 3,
        color:
          "rgba(255,255,255,0.55)",
        background:
          "rgba(255,255,255,0.02)",
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

const inputStyle:
  React.CSSProperties = {
    minWidth: 0,
    width: "100%",
    boxSizing: "border-box",
    padding: "7px 8px",
    border:
      "1px solid rgba(255,255,255,0.12)",
    borderRadius: 4,
    color: "#ffffff",
    background: "#10171b",
    fontSize: 10,
    outline: "none",
  };

function ActionButton({
  label,
  title,
  onClick,
  disabled = false,
}: {
  label: string;
  title: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      style={{
        minWidth: 34,
        padding: "0 7px",
        border:
          "1px solid rgba(92,216,255,0.18)",
        borderRadius: 4,
        color:
          "rgba(255,255,255,0.68)",
        background:
          "rgba(255,255,255,0.035)",
        fontSize: 8,
        cursor: disabled
          ? "not-allowed"
          : "pointer",
        opacity: disabled ? 0.35 : 1,
      }}
    >
      {label}
    </button>
  );
}

function EmptyState({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        padding: "18px 10px",
        color:
          "rgba(255,255,255,0.4)",
        fontSize: 11,
        lineHeight: 1.6,
      }}
    >
      {children}
    </div>
  );
}
