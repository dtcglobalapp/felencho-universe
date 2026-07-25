import type {
  ActorDiagnostic,
  ActorLayerDefinition,
} from "../../types/Actor";

import PanelTitle from "./PanelTitle";

interface LayersPanelProps {
  actorLoaded: boolean;
  layers: readonly ActorLayerDefinition[];
  selectedLayerId: string | null;
  loadedLayerIds: ReadonlySet<string>;
  diagnostics: readonly ActorDiagnostic[];
  onSelectLayer: (layerId: string) => void;
  onToggleLayerVisibility: (
    layerId: string,
  ) => void;
}

export default function LayersPanel({
  actorLoaded,
  layers,
  selectedLayerId,
  loadedLayerIds,
  diagnostics,
  onSelectLayer,
  onToggleLayerVisibility,
}: LayersPanelProps) {
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

  return (
    <aside
      style={{
        minHeight: 0,
        overflow: "auto",
        borderRight:
          "1px solid rgba(70,210,255,0.14)",
        background: "#070b0e",
      }}
    >
      <PanelTitle
        title="LAYERS"
        subtitle={
          actorLoaded
            ? `${layers.length}`
            : "NO ACTOR"
        }
      />

      <div
        style={{
          padding: "8px 10px 20px",
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
              Este actor no contiene capas.
            </EmptyState>
          )}

        {layers.map(
          (layer, index) => {
            const selected =
              layer.id ===
              selectedLayerId;

            const warningCount =
              diagnosticsByLayer.get(
                layer.id,
              ) ?? 0;

            const assetUnavailable =
              layer.type === "image" &&
              !loadedLayerIds.has(
                layer.id,
              );

            const category =
              layer.metadata?.category ??
              layer.metadata
                ?.semanticRole ??
              layer.type;

            return (
              <div
                key={layer.id}
                role="button"
                tabIndex={0}
                aria-pressed={selected}
                onClick={() =>
                  onSelectLayer(
                    layer.id,
                  )
                }
                onKeyDown={(event) => {
                  if (
                    event.key ===
                      "Enter" ||
                    event.key === " "
                  ) {
                    event.preventDefault();

                    onSelectLayer(
                      layer.id,
                    );
                  }
                }}
                style={{
                  width: "100%",
                  display: "grid",
                  gridTemplateColumns:
                    "34px minmax(0,1fr) 58px",
                  alignItems: "center",
                  gap: 8,
                  boxSizing: "border-box",
                  padding: "6px 8px",
                  marginBottom: 4,
                  color: selected
                    ? "#ffffff"
                    : "rgba(255,255,255,0.68)",
                  border: selected
                    ? "1px solid rgba(78,213,255,0.65)"
                    : "1px solid transparent",
                  borderRadius: 6,
                  background: selected
                    ? "rgba(41,175,218,0.18)"
                    : "transparent",
                  cursor: "pointer",
                  userSelect: "none",
                }}
              >
                <button
                  type="button"
                  title={
                    layer.visible
                      ? `Ocultar ${layer.name}`
                      : `Mostrar ${layer.name}`
                  }
                  aria-label={
                    layer.visible
                      ? `Ocultar ${layer.name}`
                      : `Mostrar ${layer.name}`
                  }
                  onClick={(event) => {
                    event.stopPropagation();

                    onToggleLayerVisibility(
                      layer.id,
                    );
                  }}
                  style={{
                    width: 28,
                    height: 28,
                    display: "grid",
                    placeItems: "center",
                    padding: 0,
                    borderRadius: 5,
                    border:
                      "1px solid rgba(255,255,255,0.08)",
                    color: layer.visible
                      ? "#67e6b5"
                      : "rgba(255,255,255,0.28)",
                    background:
                      layer.visible
                        ? "rgba(64,220,164,0.09)"
                        : "rgba(255,255,255,0.025)",
                    cursor: "pointer",
                    fontSize: 14,
                  }}
                >
                  {layer.visible
                    ? "◉"
                    : "○"}
                </button>

                <span
                  style={{
                    minWidth: 0,
                    opacity:
                      layer.visible
                        ? 1
                        : 0.42,
                  }}
                >
                  <span
                    style={{
                      display: "block",
                      overflow: "hidden",
                      textOverflow:
                        "ellipsis",
                      whiteSpace:
                        "nowrap",
                      fontSize: 12,
                    }}
                  >
                    {layer.name}
                  </span>

                  <span
                    style={{
                      display: "block",
                      marginTop: 2,
                      overflow: "hidden",
                      textOverflow:
                        "ellipsis",
                      whiteSpace:
                        "nowrap",
                      color:
                        "rgba(255,255,255,0.3)",
                      fontSize: 9,
                      textTransform:
                        "uppercase",
                      letterSpacing:
                        "0.08em",
                    }}
                  >
                    {category}
                  </span>
                </span>

                <span
                  style={{
                    color:
                      "rgba(255,255,255,0.34)",
                    fontSize: 9,
                    textAlign: "right",
                    lineHeight: 1.5,
                  }}
                >
                  <span
                    style={{
                      display: "block",
                    }}
                  >
                    Z {layer.zIndex}
                  </span>

                  <span
                    style={{
                      display: "block",
                    }}
                  >
                    {layer.locked
                      ? "LOCK "
                      : ""}
                    {assetUnavailable ||
                    warningCount > 0
                      ? "⚠ "
                      : ""}
                    #{index + 1}
                  </span>
                </span>
              </div>
            );
          },
        )}
      </div>
    </aside>
  );
}

function EmptyState({
  children,
}: {
  children: string;
}) {
  return (
    <div
      style={{
        padding: "18px 10px",
        color:
          "rgba(255,255,255,0.4)",
        fontSize: 12,
        lineHeight: 1.6,
      }}
    >
      {children}
    </div>
  );
}
