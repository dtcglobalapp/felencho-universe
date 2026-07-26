import type {
  ActorCompletenessResult,
} from "../../domain/ActorCompleteness";
import type {
  ActorDiagnostic,
} from "../../types/Actor";

import PanelTitle from "./PanelTitle";

interface ActorValidationPanelProps {
  actorLoaded: boolean;
  diagnostics: readonly ActorDiagnostic[];
  completeness:
    ActorCompletenessResult | null;
  onSelectLayer: (
    layerId: string,
  ) => void;
}

export default function ActorValidationPanel({
  actorLoaded,
  diagnostics,
  completeness,
  onSelectLayer,
}: ActorValidationPanelProps) {
  const errors = diagnostics.filter(
    (item) =>
      item.severity === "error",
  ).length;
  const warnings =
    diagnostics.length - errors;

  return (
    <section
      style={{
        minHeight: 0,
        overflowY: "auto",
        background: "#070b0e",
      }}
    >
      <PanelTitle
        title="ACTOR VALIDATION"
        subtitle={
          actorLoaded
            ? `${errors} ERR · ${warnings} WARN`
            : "NO ACTOR"
        }
      />

      {!actorLoaded ||
      !completeness ? (
        <div style={emptyStyle}>
          No hay un actor cargado.
        </div>
      ) : (
        <div
          style={{
            padding: "14px 14px 28px",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "1fr auto",
              alignItems: "end",
              gap: 10,
            }}
          >
            <span
              style={{
                color:
                  "rgba(255,255,255,0.5)",
                fontSize: 10,
                letterSpacing:
                  "0.08em",
              }}
            >
              ACTOR COMPLETENESS
            </span>
            <strong
              style={{
                color: "#6ee6ff",
                fontSize: 22,
              }}
            >
              {completeness.percentage}%
            </strong>
          </div>

          <div
            aria-label={`${completeness.percentage}% complete`}
            style={{
              height: 5,
              margin: "8px 0 5px",
              overflow: "hidden",
              borderRadius: 4,
              background:
                "rgba(255,255,255,0.08)",
            }}
          >
            <div
              style={{
                width: `${completeness.percentage}%`,
                height: "100%",
                background:
                  "linear-gradient(90deg,#4a9eff,#6effb5)",
              }}
            />
          </div>

          <div
            style={{
              color:
                "rgba(255,255,255,0.32)",
              fontSize: 8,
            }}
          >
            PROFILE{" "}
            {completeness.profile.toUpperCase()}
            {" · "}
            {completeness.completed}/
            {completeness.required} REQUIRED
          </div>

          <SectionLabel>
            CONSTRUCTION
          </SectionLabel>

          {completeness.items.map(
            (item) => (
              <button
                key={item.id}
                type="button"
                disabled={
                  item.layerIds.length ===
                  0
                }
                onClick={() => {
                  const layerId =
                    item.layerIds[0];

                  if (layerId) {
                    onSelectLayer(
                      layerId,
                    );
                  }
                }}
                style={{
                  width: "100%",
                  display: "grid",
                  gridTemplateColumns:
                    "18px minmax(0,1fr)",
                  gap: 6,
                  padding: "5px 0",
                  border: 0,
                  color:
                    "rgba(255,255,255,0.68)",
                  background:
                    "transparent",
                  textAlign: "left",
                  fontSize: 10,
                  cursor:
                    item.layerIds.length >
                    0
                      ? "pointer"
                      : "default",
                }}
              >
                <span
                  style={{
                    color: item.complete
                      ? "#67e6b5"
                      : "#ffd36a",
                  }}
                >
                  {item.complete
                    ? "✔"
                    : "⚠"}
                </span>
                <span>{item.label}</span>
              </button>
            ),
          )}

          <SectionLabel>
            STRUCTURAL DIAGNOSTICS
          </SectionLabel>

          {diagnostics.length === 0 ? (
            <div
              style={{
                color: "#67e6b5",
                fontSize: 10,
              }}
            >
              ✔ No structural diagnostics
            </div>
          ) : (
            diagnostics.map(
              (item, index) => (
                <button
                  key={`${item.code}-${item.path ?? index}-${index}`}
                  type="button"
                  disabled={!item.layerId}
                  onClick={() => {
                    if (item.layerId) {
                      onSelectLayer(
                        item.layerId,
                      );
                    }
                  }}
                  style={{
                    width: "100%",
                    marginBottom: 6,
                    padding: "7px 8px",
                    border:
                      "1px solid rgba(255,255,255,0.06)",
                    borderRadius: 4,
                    color:
                      item.severity ===
                      "error"
                        ? "#ffaaaa"
                        : "#ffd36a",
                    background:
                      "rgba(255,255,255,0.025)",
                    fontSize: 9,
                    lineHeight: 1.45,
                    textAlign: "left",
                    cursor: item.layerId
                      ? "pointer"
                      : "default",
                  }}
                >
                  <strong>
                    {item.severity ===
                    "error"
                      ? "ERROR"
                      : "WARNING"}
                    {" · "}
                    {item.code}
                  </strong>
                  <span
                    style={{
                      display: "block",
                      marginTop: 3,
                      color:
                        "rgba(255,255,255,0.52)",
                    }}
                  >
                    {item.message}
                  </span>
                </button>
              ),
            )
          )}
        </div>
      )}
    </section>
  );
}

function SectionLabel({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        margin: "18px 0 9px",
        paddingBottom: 6,
        borderBottom:
          "1px solid rgba(70,210,255,0.12)",
        color: "#67d9ff",
        fontSize: 9,
        letterSpacing: "0.14em",
      }}
    >
      {children}
    </div>
  );
}

const emptyStyle:
  React.CSSProperties = {
    padding: 18,
    color:
      "rgba(255,255,255,0.4)",
    fontSize: 11,
};
