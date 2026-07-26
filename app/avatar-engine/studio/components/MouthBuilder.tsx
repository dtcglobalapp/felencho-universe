import {
  ACTOR_MOUTH_POSES,
} from "../../domain/ActorDefinition";

import type {
  ActorConstructionDefinition,
  ActorLayerDefinition,
  ActorMouthPose,
} from "../../types/Actor";

import PanelTitle from "./PanelTitle";

interface MouthBuilderProps {
  actorLoaded: boolean;
  layers: readonly ActorLayerDefinition[];
  construction:
    ActorConstructionDefinition | null;
  onMapPose: (
    pose: ActorMouthPose,
    layerId: string | undefined,
  ) => void;
  onSelectLayer: (
    layerId: string,
  ) => void;
}
export default function MouthBuilder({
  actorLoaded,
  layers,
  construction,
  onMapPose,
  onSelectLayer,
}: MouthBuilderProps) {
  const mappedCount =
    construction
      ? ACTOR_MOUTH_POSES.filter(
          (pose) =>
            Boolean(
              construction
                .mouthPoses[pose],
            ),
        ).length
      : 0;

  return (
    <section
      style={{
        minHeight: 0,
        overflowY: "auto",
        background: "#070b0e",
      }}
    >
      <PanelTitle
        title="MOUTH BUILDER"
        subtitle={`${mappedCount}/${ACTOR_MOUTH_POSES.length}`}
      />

      {!actorLoaded ||
      !construction ? (
        <EmptyState>
          No hay un actor cargado.
        </EmptyState>
      ) : (
        <div
          style={{
            padding: "12px 14px 24px",
          }}
        >
          <p
            style={{
              margin: "0 0 12px",
              color:
                "rgba(255,255,255,0.42)",
              fontSize: 10,
              lineHeight: 1.55,
            }}
          >
            Map each construction pose
            explicitly. Layer names do not
            determine mouth behavior.
          </p>

          {ACTOR_MOUTH_POSES.map(
            (pose) => {
              const layerId =
                construction
                  .mouthPoses[pose];
              const required =
                construction
                  .requiredMouthPoses
                  .includes(pose);
              const missing =
                required &&
                (
                  !layerId ||
                  !layers.some(
                    (layer) =>
                      layer.id ===
                      layerId,
                  )
                );

              return (
                <div
                  key={pose}
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "58px minmax(0,1fr) 30px",
                    alignItems: "center",
                    gap: 7,
                    marginBottom: 8,
                  }}
                >
                  <label
                    htmlFor={`mouth-${pose}`}
                    style={{
                      color: missing
                        ? "#ffd36a"
                        : "#75dbff",
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing:
                        "0.08em",
                    }}
                  >
                    {pose}
                    {required ? " *" : ""}
                  </label>

                  <select
                    id={`mouth-${pose}`}
                    value={layerId ?? ""}
                    onChange={(event) =>
                      onMapPose(
                        pose,
                        event.target
                          .value ||
                          undefined,
                      )
                    }
                    style={{
                      minWidth: 0,
                      width: "100%",
                      padding: "7px",
                      border:
                        "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 4,
                      color: "#ffffff",
                      background:
                        "#10171b",
                      fontSize: 10,
                    }}
                  >
                    <option value="">
                      {missing
                        ? "Missing mapping"
                        : "Unassigned"}
                    </option>
                    {layers.map(
                      (layer) => (
                        <option
                          key={layer.id}
                          value={layer.id}
                        >
                          {layer.name}
                        </option>
                      ),
                    )}
                  </select>

                  <button
                    type="button"
                    title="Select mapped layer"
                    disabled={!layerId}
                    onClick={() => {
                      if (layerId) {
                        onSelectLayer(
                          layerId,
                        );
                      }
                    }}
                    style={{
                      width: 30,
                      height: 30,
                      border:
                        "1px solid rgba(92,216,255,0.18)",
                      borderRadius: 4,
                      color:
                        "rgba(255,255,255,0.62)",
                      background:
                        "rgba(255,255,255,0.035)",
                      opacity: layerId
                        ? 1
                        : 0.35,
                      cursor: layerId
                        ? "pointer"
                        : "not-allowed",
                    }}
                  >
                    ↗
                  </button>
                </div>
              );
            },
          )}
        </div>
      )}
    </section>
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
        padding: 18,
        color:
          "rgba(255,255,255,0.4)",
        fontSize: 11,
      }}
    >
      {children}
    </div>
  );
}
