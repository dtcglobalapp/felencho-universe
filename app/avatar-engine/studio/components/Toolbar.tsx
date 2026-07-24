import type {
  CSSProperties,
} from "react";

interface ToolbarProps {
  canUndo: boolean;
  canRedo: boolean;
  dimOthers: boolean;
  soloMode: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onToggleHighlight: () => void;
  onToggleSolo: () => void;
  onResetView: () => void;
  onResetActor: () => void;
  onExportActor: () => void;
}

export default function Toolbar({
  canUndo,
  canRedo,
  dimOthers,
  soloMode,
  onUndo,
  onRedo,
  onToggleHighlight,
  onToggleSolo,
  onResetView,
  onResetActor,
  onExportActor,
}: ToolbarProps) {
  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 18,
        padding: "0 18px",
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
            GENESIS v0.4 · HISTORY & VIEWPORT
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
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
          style={{
            ...toolbarButton,

            color: dimOthers
              ? "#6ee6ff"
              : "rgba(255,255,255,0.65)",
          }}
        >
          {dimOthers
            ? "HIGHLIGHT ON"
            : "HIGHLIGHT OFF"}
        </button>

        <button
          type="button"
          onClick={onToggleSolo}
          style={{
            ...toolbarButton,

            color: soloMode
              ? "#6effb5"
              : "rgba(255,255,255,0.65)",
          }}
        >
          {soloMode
            ? "SOLO ON"
            : "SOLO OFF"}
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
          onClick={onResetActor}
          style={toolbarButton}
        >
          RESET ACTOR
        </button>

        <button
          type="button"
          onClick={onExportActor}
          style={{
            ...toolbarButton,
            color: "#03202a",
            background: "#65dcff",
            borderColor: "#65dcff",
            fontWeight: 800,
          }}
        >
          EXPORT ACTOR.JSON
        </button>
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
