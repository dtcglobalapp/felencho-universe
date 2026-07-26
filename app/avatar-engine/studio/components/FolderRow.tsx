import {
  memo,
  useEffect,
  useRef,
  useState,
} from "react";

import type {
  ActorFolderDefinition,
} from "../../types/Actor";

interface FolderRowProps {
  folder: ActorFolderDefinition;
  collapsed: boolean;
  layerCount: number;
  onToggleCollapsed: (
    folderId: string,
  ) => void;
  onToggleVisibility: (
    folderId: string,
  ) => void;
  onToggleLock: (
    folderId: string,
  ) => void;
  onRename: (
    folderId: string,
    name: string,
  ) => void;
  onDelete: (
    folderId: string,
  ) => void;
  onDragStart: (
    event: React.DragEvent,
    folderId: string,
  ) => void;
  onDrop: (
    event: React.DragEvent,
    folderId: string,
  ) => void;
}

function FolderRowComponent({
  folder,
  collapsed,
  layerCount,
  onToggleCollapsed,
  onToggleVisibility,
  onToggleLock,
  onRename,
  onDelete,
  onDragStart,
  onDrop,
}: FolderRowProps) {
  const [editing, setEditing] =
    useState(false);
  const [name, setName] =
    useState(folder.name);
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
    setName(folder.name);
    setEditing(true);
  };

  const finishRename = () => {
    const nextName = name.trim();
    setEditing(false);

    if (
      nextName &&
      nextName !== folder.name
    ) {
      onRename(
        folder.id,
        nextName,
      );
    } else {
      setName(folder.name);
    }
  };

  return (
    <div
      draggable={!editing}
      onDragStart={(event) =>
        onDragStart(event, folder.id)
      }
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect =
          "move";
      }}
      onDrop={(event) =>
        onDrop(event, folder.id)
      }
      onDoubleClick={beginRename}
      style={{
        display: "grid",
        gridTemplateColumns:
          "22px minmax(0,1fr) 22px 22px 22px",
        alignItems: "center",
        gap: 4,
        minHeight: 34,
        padding: "3px 5px",
        margin: "7px 0 3px",
        borderRadius: 4,
        border:
          "1px solid rgba(70,210,255,0.08)",
        color:
          "rgba(255,255,255,0.72)",
        background:
          "rgba(70,210,255,0.035)",
      }}
    >
      <FolderButton
        label={
          collapsed ? "▸" : "▾"
        }
        title={
          collapsed
            ? "Expand folder"
            : "Collapse folder"
        }
        onClick={() =>
          onToggleCollapsed(
            folder.id,
          )
        }
      />

      {editing ? (
        <input
          ref={inputRef}
          value={name}
          onChange={(event) =>
            setName(event.target.value)
          }
          onBlur={finishRename}
          onKeyDown={(event) => {
            if (
              event.key === "Enter"
            ) {
              finishRename();
            }

            if (
              event.key === "Escape"
            ) {
              setEditing(false);
              setName(folder.name);
            }
          }}
          style={{
            minWidth: 0,
            border:
              "1px solid rgba(92,216,255,0.55)",
            borderRadius: 3,
            color: "#ffffff",
            background: "#10171b",
            fontSize: 10,
          }}
        />
      ) : (
        <span
          style={{
            minWidth: 0,
            overflow: "hidden",
            textOverflow:
              "ellipsis",
            whiteSpace: "nowrap",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.08em",
          }}
        >
          ▰ {folder.name}{" "}
          <span
            style={{
              color:
                "rgba(255,255,255,0.3)",
              fontWeight: 400,
            }}
          >
            {layerCount}
          </span>
        </span>
      )}

      <FolderButton
        label={
          folder.visible ? "◉" : "○"
        }
        title={
          folder.visible
            ? "Hide folder"
            : "Show folder"
        }
        tone={
          folder.visible
            ? "#67e6b5"
            : undefined
        }
        onClick={() =>
          onToggleVisibility(
            folder.id,
          )
        }
      />
      <FolderButton
        label={
          folder.locked ? "▣" : "▢"
        }
        title={
          folder.locked
            ? "Unlock folder"
            : "Lock folder"
        }
        tone={
          folder.locked
            ? "#ffd36a"
            : undefined
        }
        onClick={() =>
          onToggleLock(folder.id)
        }
      />
      <FolderButton
        label="×"
        title="Delete folder"
        tone="#ff9f9f"
        onClick={() =>
          onDelete(folder.id)
        }
      />
    </div>
  );
}

function FolderButton({
  label,
  title,
  tone = "rgba(255,255,255,0.45)",
  onClick,
}: {
  label: string;
  title: string;
  tone?: string;
  onClick: () => void;
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
        border: 0,
        color: tone,
        background: "transparent",
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

export default memo(
  FolderRowComponent,
);
