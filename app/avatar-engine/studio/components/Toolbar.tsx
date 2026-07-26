import type {
  CSSProperties,
} from "react";
import {
  useRef,
} from "react";

import {
  GENESIS,
} from "../../config/GenesisConfig";

interface ToolbarProps {
  actorLoaded: boolean;
  canUndo: boolean;
  canRedo: boolean;
  dimOthers: boolean;
  soloMode: boolean;
  showGrid: boolean;
  showSafeArea: boolean;
  showRulers: boolean;
  snapToGrid: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onToggleHighlight: () => void;
  onToggleSolo: () => void;
  onToggleGrid: () => void;
  onToggleSafeArea: () => void;
  onToggleRulers: () => void;
  onToggleSnap: () => void;
  onCenterActor: () => void;
  onResetView: () => void;
  onResetActor: () => void;
  onExportActor: () => void;
  onExportPackage: () => void;
  onImportPngs: (
    files: readonly File[],
  ) => void;
  onImportPackage: (file: File) => void;
}

export default function Toolbar({
  actorLoaded,
  canUndo,
  canRedo,
  dimOthers,
  soloMode,
  showGrid,
  showSafeArea,
  showRulers,
  snapToGrid,
  onUndo,
  onRedo,
  onToggleHighlight,
  onToggleSolo,
  onToggleGrid,
  onToggleSafeArea,
  onToggleRulers,
  onToggleSnap,
  onCenterActor,
  onResetView,
  onResetActor,
  onExportActor,
  onExportPackage,
  onImportPngs,
  onImportPackage,
}: ToolbarProps) {
  const pngInputRef =
    useRef<HTMLInputElement | null>(
      null,
    );
  const packageInputRef =
    useRef<HTMLInputElement | null>(
      null,
    );

  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 18,
        padding: "8px 14px",
        borderBottom:
          "1px solid rgba(70,210,255,0.2)",
        background:
          "linear-gradient(90deg,#071117,#020405)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}
      >
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 8,
            display: "grid",
            placeItems: "center",
            border:
              "1px solid rgba(69,218,255,0.5)",
            color: "#62dcff",
            fontWeight: 900,
          }}
        >
          F
        </div>

        <div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 800,
              letterSpacing: "0.08em",
            }}
          >
            FELENCHO AVATAR STUDIO
          </div>

          <div
            style={{
              color:
                "rgba(255,255,255,0.42)",
              fontSize: 10,
              letterSpacing: "0.18em",
            }}
          >
            {`${GENESIS.name.toUpperCase()} v${GENESIS.version} · ${GENESIS.codename.toUpperCase()}`}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "flex-end",
          gap: 8,
        }}
      >
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          style={{
            ...toolbarButton,

            opacity: canUndo ? 1 : 0.35,
            cursor:
              canUndo
                ? "pointer"
                : "not-allowed",
          }}
        >
          UNDO
        </button>

        <button
          type="button"
          onClick={onRedo}
          disabled={!canRedo}
          style={{
            ...toolbarButton,

            opacity: canRedo ? 1 : 0.35,
            cursor:
              canRedo
                ? "pointer"
                : "not-allowed",
          }}
        >
          REDO
        </button>

        <button
          type="button"
          onClick={onToggleHighlight}
          disabled={!actorLoaded}
          style={{
            ...toolbarButton,
            color: dimOthers
              ? "#6ee6ff"
              : "rgba(255,255,255,0.65)",
            ...disabledStyle(
              !actorLoaded,
            ),
          }}
        >
          {dimOthers
            ? "HIGHLIGHT ON"
            : "HIGHLIGHT OFF"}
        </button>

        <button
          type="button"
          onClick={onToggleSolo}
          disabled={!actorLoaded}
          style={{
            ...toolbarButton,
            color: soloMode
              ? "#6effb5"
              : "rgba(255,255,255,0.65)",
            ...disabledStyle(
              !actorLoaded,
            ),
          }}
        >
          {soloMode
            ? "SOLO ON"
            : "SOLO OFF"}
        </button>

        <ToggleButton
          label="GRID"
          active={showGrid}
          onClick={onToggleGrid}
        />
        <ToggleButton
          label="SAFE"
          active={showSafeArea}
          disabled={!actorLoaded}
          onClick={onToggleSafeArea}
        />
        <ToggleButton
          label="RULERS"
          active={showRulers}
          onClick={onToggleRulers}
        />
        <ToggleButton
          label="SNAP"
          active={snapToGrid}
          disabled={!actorLoaded}
          onClick={onToggleSnap}
        />

        <button
          type="button"
          onClick={onCenterActor}
          disabled={!actorLoaded}
          style={{
            ...toolbarButton,
            ...disabledStyle(
              !actorLoaded,
            ),
          }}
        >
          CENTER
        </button>

        <button
          type="button"
          onClick={onResetView}
          style={toolbarButton}
        >
          RESET VIEW
        </button>

        <button
          type="button"
          onClick={() =>
            pngInputRef.current?.click()
          }
          disabled={!actorLoaded}
          style={{
            ...toolbarButton,
            ...disabledStyle(
              !actorLoaded,
            ),
          }}
        >
          IMPORT PNG
        </button>

        <button
          type="button"
          onClick={() =>
            packageInputRef.current?.click()
          }
          disabled={!actorLoaded}
          style={{
            ...toolbarButton,
            ...disabledStyle(
              !actorLoaded,
            ),
          }}
        >
          IMPORT PACKAGE
        </button>

        <button
          type="button"
          onClick={onResetActor}
          disabled={!actorLoaded}
          style={{
            ...toolbarButton,
            ...disabledStyle(
              !actorLoaded,
            ),
          }}
        >
          RESET ACTOR
        </button>

        <button
          type="button"
          onClick={onExportActor}
          disabled={!actorLoaded}
          style={{
            ...toolbarButton,
            color: "#03202a",
            background: "#65dcff",
            borderColor: "#65dcff",
            fontWeight: 800,
            ...disabledStyle(
              !actorLoaded,
            ),
          }}
        >
          EXPORT ACTOR.JSON
        </button>

        <button
          type="button"
          onClick={onExportPackage}
          disabled={!actorLoaded}
          style={{
            ...toolbarButton,
            color: "#061a10",
            background: "#6effb5",
            borderColor: "#6effb5",
            fontWeight: 800,
            ...disabledStyle(
              !actorLoaded,
            ),
          }}
        >
          EXPORT PACKAGE
        </button>

        <input
          ref={pngInputRef}
          type="file"
          accept="image/png"
          multiple
          hidden
          onChange={(event) => {
            const files = [
              ...(
                event.target.files ??
                []
              ),
            ];
            event.target.value = "";

            if (files.length > 0) {
              onImportPngs(files);
            }
          }}
        />

        <input
          ref={packageInputRef}
          type="file"
          accept=".zip,.genesis,application/zip"
          hidden
          onChange={(event) => {
            const file =
              event.target.files?.[0];
            event.target.value = "";

            if (file) {
              onImportPackage(file);
            }
          }}
        />
      </div>
    </header>
  );
}

const toolbarButton: CSSProperties = {
  padding: "8px 11px",
  borderRadius: 5,

  border:
    "1px solid rgba(92,216,255,0.26)",

  color:
    "rgba(255,255,255,0.76)",

  background:
    "rgba(255,255,255,0.04)",

  fontSize: 10,
  letterSpacing: "0.08em",
  cursor: "pointer",
};

function disabledStyle(
  disabled: boolean,
): CSSProperties {
  return disabled
    ? {
        opacity: 0.35,
        cursor: "not-allowed",
      }
    : {};
}

function ToggleButton({
  label,
  active,
  disabled = false,
  onClick,
}: {
  label: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      style={{
        ...toolbarButton,
        color: active
          ? "#6ee6ff"
          : "rgba(255,255,255,0.52)",
        background: active
          ? "rgba(41,175,218,0.16)"
          : toolbarButton.background,
        ...disabledStyle(disabled),
      }}
    >
      {label}
    </button>
  );
}
