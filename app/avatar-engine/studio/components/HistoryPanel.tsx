import PanelTitle from "./PanelTitle";

interface HistoryPanelProps {
  past: readonly string[];
  future: readonly string[];
  onUndo: () => void;
  onRedo: () => void;
}

export default function HistoryPanel({
  past,
  future,
  onUndo,
  onRedo,
}: HistoryPanelProps) {
  return (
    <section style={panelStyle}>
      <PanelTitle
        title="HISTORY"
        subtitle={`${past.length} PAST · ${future.length} FUTURE`}
      />

      <div style={contentStyle}>
        <div style={buttonsStyle}>
          <button
            type="button"
            disabled={past.length === 0}
            onClick={onUndo}
            style={buttonStyle}
          >
            UNDO
          </button>
          <button
            type="button"
            disabled={future.length === 0}
            onClick={onRedo}
            style={buttonStyle}
          >
            REDO
          </button>
        </div>

        <div style={currentStyle}>
          CURRENT DOCUMENT
        </div>

        {[...past]
          .reverse()
          .map((label, index) => (
            <div
              key={`past-${past.length - index}-${label}`}
              style={entryStyle}
            >
              <span style={pastDotStyle}>
                ●
              </span>
              {label}
            </div>
          ))}

        {future.length > 0 && (
          <>
            <div style={futureLabelStyle}>
              REDO QUEUE
            </div>
            {future.map(
              (label, index) => (
                <div
                  key={`future-${index}-${label}`}
                  style={entryStyle}
                >
                  <span
                    style={futureDotStyle}
                  >
                    ○
                  </span>
                  {label}
                </div>
              ),
            )}
          </>
        )}
      </div>
    </section>
  );
}

const panelStyle:
  React.CSSProperties = {
    minHeight: 0,
    overflowY: "auto",
    background: "#070b0e",
  };

const contentStyle:
  React.CSSProperties = {
    padding: "12px 14px 28px",
  };

const buttonsStyle:
  React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 7,
    marginBottom: 12,
  };

const buttonStyle:
  React.CSSProperties = {
    padding: "7px",
    border:
      "1px solid rgba(92,216,255,0.18)",
    borderRadius: 4,
    color: "rgba(255,255,255,0.7)",
    background:
      "rgba(255,255,255,0.035)",
    fontSize: 8,
    cursor: "pointer",
  };

const currentStyle:
  React.CSSProperties = {
    padding: "8px",
    border:
      "1px solid rgba(110,230,255,0.35)",
    borderRadius: 4,
    color: "#6ee6ff",
    background:
      "rgba(41,175,218,0.12)",
    fontSize: 9,
    letterSpacing: "0.08em",
  };

const futureLabelStyle:
  React.CSSProperties = {
    margin: "14px 0 6px",
    color: "rgba(255,255,255,0.3)",
    fontSize: 8,
    letterSpacing: "0.12em",
  };

const entryStyle:
  React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "14px 1fr",
    gap: 4,
    padding: "6px 4px",
    borderBottom:
      "1px solid rgba(255,255,255,0.045)",
    color: "rgba(255,255,255,0.52)",
    fontSize: 9,
  };

const pastDotStyle:
  React.CSSProperties = {
    color: "#67d9ff",
  };

const futureDotStyle:
  React.CSSProperties = {
    color: "rgba(255,255,255,0.28)",
  };
