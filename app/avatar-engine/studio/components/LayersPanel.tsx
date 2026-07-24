import type {
  ActorLayerDefinition,
} from "../../types/Actor";

import PanelTitle from "./PanelTitle";

interface LayersPanelProps {
  layers: readonly ActorLayerDefinition[];
  selectedLayerId: string | null;
  onSelectLayer: (layerId: string) => void;
  onToggleLayerVisibility: (
    layerId: string,
  ) => void;
}

export default function LayersPanel({
  layers,
  selectedLayerId,
  onSelectLayer,
  onToggleLayerVisibility,
}: LayersPanelProps) {
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
        subtitle={`${layers.length}`}
      />

      <div
        style={{
          padding: "8px 10px 20px",
        }}
      >
        {layers.map((layer) => {
          const selected =
            layer.id === selectedLayerId;

          return (
            <div
              key={layer.id}
              role="button"
              tabIndex={0}
              onClick={() =>
                onSelectLayer(layer.id)
              }
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" ||
                  event.key === " "
                ) {
                  event.preventDefault();

                  onSelectLayer(layer.id);
                }
              }}
              style={{
                width: "100%",
                display: "grid",
                gridTemplateColumns:
                  "34px 1fr 42px",
                alignItems: "center",
                gap: 8,
                boxSizing: "border-box",
                padding: "5px 8px",
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
                    ? "Ocultar capa"
                    : "Mostrar capa"
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

                  background: layer.visible
                    ? "rgba(64,220,164,0.09)"
                    : "rgba(255,255,255,0.025)",

                  cursor: "pointer",
                  fontSize: 14,
                }}
              >
                {layer.visible ? "◉" : "○"}
              </button>

              <span
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  fontSize: 12,

                  opacity: layer.visible
                    ? 1
                    : 0.42,
                }}
              >
                {layer.name}
              </span>

              <span
                style={{
                  color:
                    "rgba(255,255,255,0.34)",
                  fontSize: 10,
                  textAlign: "right",
                }}
              >
                Z {layer.zIndex}
              </span>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
