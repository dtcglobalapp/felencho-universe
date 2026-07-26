import {
  memo,
  useEffect,
  useRef,
  useState,
} from "react";

import type {
  ActorLayerDefinition,
} from "../../types/Actor";

export interface LayerRowSelectModifiers {
  additive: boolean;
  range: boolean;
}

interface LayerRowProps {
  layer: ActorLayerDefinition;
  selected: boolean;
  assetLoaded: boolean;
  warningCount: number;
  onSelect: (
    layerId: string,
    modifiers: LayerRowSelectModifiers,
  ) => void;
  onToggleVisibility: (
    layerId: string,
  ) => void;
  onToggleLock: (layerId: string) => void;
  onRename: (
    layerId: string,
    name: string,
  ) => void;
  onDuplicate: (layerId: string) => void;
  onDelete: (layerId: string) => void;
  onDragStart: (
    event: React.DragEvent,
    layerId: string,
  ) => void;
  onDrop: (
    event: React.DragEvent,
    layerId: string,
  ) => void;
}

function LayerRowComponent({
  layer,
  selected,
  assetLoaded,
  warningCount,
  onSelect,
  onToggleVisibility,
  onToggleLock,
  onRename,
  onDuplicate,
  onDelete,
  onDragStart,
  onDrop,
}: LayerRowProps) {
  const [editing, setEditing] =
    useState(false);
  const [draftName, setDraftName] =
    useState(layer.name);
  const inputRef =
    useRef<HTMLInputElement | null>(
      null,
    );

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const beginRename = () => {
    setDraftName(layer.name);
    setEditing(true);
  };

  const finishRename = () => {
    const name = draftName.trim();

    setEditing(false);

    if (name && name !== layer.name) {
      onRename(layer.id, name);
    } else {
      setDraftName(layer.name);
    }
  };

  return (
    <div
      role="option"
      aria-selected={selected}
      tabIndex={0}
      draggable={!editing}
      onDragStart={(event) =>
        onDragStart(event, layer.id)
      }
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect =
          "move";
      }}
      onDrop={(event) =>
        onDrop(event, layer.id)
      }
      onClick={(event) =>
        onSelect(layer.id, {
          additive:
            event.metaKey ||
            event.ctrlKey,
          range: event.shiftKey,
        })
      }
      onDoubleClick={() => {
        beginRename();
      }}
      onKeyDown={(event) => {
        if (
          event.key === "Enter" ||
          event.key === " "
        ) {
          event.preventDefault();
          onSelect(layer.id, {
            additive:
              event.metaKey ||
              event.ctrlKey,
            range: event.shiftKey,
          });
        }

        if (event.key === "F2") {
          event.preventDefault();
          beginRename();
        }
      }}
      style={{
        width: "100%",
        display: "grid",
        gridTemplateColumns:
          "24px 24px minmax(0,1fr) 48px",
        alignItems: "center",
        gap: 5,
        boxSizing: "border-box",
        minHeight: 38,
        marginBottom: 3,
        padding: "4px 5px",
        border: selected
          ? "1px solid rgba(78,213,255,0.72)"
          : "1px solid transparent",
        borderRadius: 5,
        color: selected
          ? "#ffffff"
          : "rgba(255,255,255,0.7)",
        background: selected
          ? "rgba(41,175,218,0.18)"
          : "rgba(255,255,255,0.012)",
        cursor: "default",
        userSelect: "none",
        opacity: layer.visible
          ? 1
          : 0.5,
      }}
    >
      <SmallButton
        label={
          layer.visible ? "◉" : "○"
        }
        title={
          layer.visible
            ? "Hide layer"
            : "Show layer"
        }
        tone={
          layer.visible
            ? "#67e6b5"
            : "rgba(255,255,255,0.35)"
        }
        onClick={(event) => {
          event.stopPropagation();
          onToggleVisibility(
            layer.id,
          );
        }}
      />

      <SmallButton
        label={
          layer.locked ? "▣" : "▢"
        }
        title={
          layer.locked
            ? "Unlock layer"
            : "Lock layer"
        }
        tone={
          layer.locked
            ? "#ffd36a"
            : "rgba(255,255,255,0.35)"
        }
        onClick={(event) => {
          event.stopPropagation();
          onToggleLock(layer.id);
        }}
      />

      <span
        style={{
          minWidth: 0,
        }}
      >
        {editing ? (
          <input
            ref={inputRef}
            value={draftName}
            onChange={(event) =>
              setDraftName(
                event.target.value,
              )
            }
            onBlur={finishRename}
            onKeyDown={(event) => {
              event.stopPropagation();

              if (
                event.key === "Enter"
              ) {
                finishRename();
              }

              if (
                event.key === "Escape"
              ) {
                setEditing(false);
                setDraftName(
                  layer.name,
                );
              }
            }}
            style={{
              width: "100%",
              boxSizing: "border-box",
              border:
                "1px solid rgba(92,216,255,0.55)",
              borderRadius: 3,
              color: "#ffffff",
              background: "#10171b",
              fontSize: 11,
            }}
          />
        ) : (
          <>
            <span
              style={{
                display: "block",
                overflow: "hidden",
                textOverflow:
                  "ellipsis",
                whiteSpace: "nowrap",
                fontSize: 11,
              }}
            >
              ◫ {layer.name}
            </span>

            <span
              style={{
                display: "block",
                marginTop: 2,
                overflow: "hidden",
                textOverflow:
                  "ellipsis",
                whiteSpace: "nowrap",
                color:
                  "rgba(255,255,255,0.3)",
                fontSize: 8,
                letterSpacing:
                  "0.06em",
              }}
            >
              {layer.parentId
                ? `PARENT ${layer.parentId} · `
                : ""}
              Z {layer.zIndex}
              {!assetLoaded ||
              warningCount > 0
                ? " · ⚠"
                : ""}
            </span>
          </>
        )}
      </span>

      <span
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 2,
        }}
      >
        <SmallButton
          label="⧉"
          title="Duplicate layer"
          onClick={(event) => {
            event.stopPropagation();
            onDuplicate(layer.id);
          }}
        />
        <SmallButton
          label="×"
          title="Delete layer"
          tone="#ff9f9f"
          onClick={(event) => {
            event.stopPropagation();
            onDelete(layer.id);
          }}
        />
      </span>
    </div>
  );
}

function SmallButton({
  label,
  title,
  tone = "rgba(255,255,255,0.55)",
  onClick,
}: {
  label: string;
  title: string;
  tone?: string;
  onClick: (
    event: React.MouseEvent,
  ) => void;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      style={{
        width: 22,
        height: 22,
        display: "grid",
        placeItems: "center",
        padding: 0,
        border:
          "1px solid rgba(255,255,255,0.07)",
        borderRadius: 3,
        color: tone,
        background:
          "rgba(255,255,255,0.025)",
        cursor: "pointer",
        fontSize: 11,
      }}
    >
      {label}
    </button>
  );
}

export default memo(
  LayerRowComponent,
);
