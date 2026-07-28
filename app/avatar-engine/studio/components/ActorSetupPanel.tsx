import type {
  ActorBlinkDefinition,
  ActorDefinition,
  ActorFolderDefinition,
} from "../../types/Actor";
import {
  ACTOR_MOUTH_POSES,
} from "../../domain/ActorDefinition";

import PanelTitle from "./PanelTitle";

interface ActorSetupPanelProps {
  actor: ActorDefinition | null;
  onUpdateActor: (
    patch: Partial<
      Pick<
        ActorDefinition,
        | "id"
        | "name"
        | "version"
        | "width"
        | "height"
        | "fps"
        | "display"
        | "construction"
        | "animations"
      >
    >,
  ) => void;
  onUpdateFolder: (
    folderId: string,
    patch: Partial<
      Pick<
        ActorFolderDefinition,
        "parentId"
      >
    >,
  ) => void;
}

const DEFAULT_BLINK:
  ActorBlinkDefinition = {
    enabled: true,
    minimumDelayMs: 2400,
    maximumDelayMs: 6200,
    closeDurationMs: 90,
    holdDurationMs: 35,
    openDurationMs: 120,
    upperTravel: 1,
    lowerTravel: 0.2,
    upperScaleY: 0.12,
    lowerScaleY: 0.65,
  };

export default function ActorSetupPanel({
  actor,
  onUpdateActor,
  onUpdateFolder,
}: ActorSetupPanelProps) {
  if (!actor) {
    return (
      <section style={panelStyle}>
        <PanelTitle
          title="ACTOR SETUP"
          subtitle="NO ACTOR"
        />
      </section>
    );
  }

  const blink =
    actor.animations?.blink ??
    DEFAULT_BLINK;
  const updateDisplay = (
    patch: Partial<
      ActorDefinition["display"]
    >,
  ) =>
    onUpdateActor({
      display: {
        ...actor.display,
        ...patch,
      },
    });
  const updateBlink = (
    patch: Partial<
      ActorBlinkDefinition
    >,
  ) =>
    onUpdateActor({
      animations: {
        ...actor.animations,
        blink: {
          ...blink,
          ...patch,
        },
      },
    });

  return (
    <section style={panelStyle}>
      <PanelTitle
        title="ACTOR SETUP"
        subtitle="IDENTITY · DISPLAY · RUNTIME"
      />

      <div style={contentStyle}>
        <SectionLabel>
          IDENTITY
        </SectionLabel>
        <TextField
          label="Actor ID"
          value={actor.id}
          onCommit={(id) =>
            onUpdateActor({ id })
          }
        />
        <TextField
          label="Actor Name"
          value={actor.name}
          onCommit={(name) =>
            onUpdateActor({ name })
          }
        />
        <TextField
          label="Actor Version"
          value={actor.version}
          onCommit={(version) =>
            onUpdateActor({ version })
          }
        />

        <SectionLabel>
          CANVAS
        </SectionLabel>
        <NumberField
          label="Width"
          value={actor.width}
          min={1}
          onCommit={(width) =>
            onUpdateActor({ width })
          }
        />
        <NumberField
          label="Height"
          value={actor.height}
          min={1}
          onCommit={(height) =>
            onUpdateActor({ height })
          }
        />
        <NumberField
          label="FPS"
          value={actor.fps}
          min={1}
          onCommit={(fps) =>
            onUpdateActor({ fps })
          }
        />

        <SectionLabel>
          DISPLAY
        </SectionLabel>
        <NumberField
          label="Scale"
          value={actor.display.scale}
          step={0.01}
          min={0.01}
          onCommit={(scale) =>
            updateDisplay({ scale })
          }
        />
        <NumberField
          label="Offset X"
          value={
            actor.display.offsetX
          }
          onCommit={(offsetX) =>
            updateDisplay({ offsetX })
          }
        />
        <NumberField
          label="Offset Y"
          value={
            actor.display.offsetY
          }
          onCommit={(offsetY) =>
            updateDisplay({ offsetY })
          }
        />
        <NumberField
          label="Maximum Stage Width"
          value={
            actor.display
              .maxStageWidth
          }
          min={1}
          onCommit={(maxStageWidth) =>
            updateDisplay({
              maxStageWidth,
            })
          }
        />
        <NumberField
          label="Maximum Stage Height"
          value={
            actor.display
              .maxStageHeight
          }
          min={1}
          onCommit={(maxStageHeight) =>
            updateDisplay({
              maxStageHeight,
            })
          }
        />

        <SectionLabel>
          CONSTRUCTION PROFILE
        </SectionLabel>
        <TextField
          label="Profile"
          value={
            actor.construction.profile
          }
          onCommit={(profile) =>
            onUpdateActor({
              construction: {
                ...actor.construction,
                profile:
                  profile || "custom",
              },
            })
          }
        />
        <TextField
          label="Required Roles"
          value={actor.construction.requiredRoles.join(
            ", ",
          )}
          onCommit={(value) =>
            onUpdateActor({
              construction: {
                ...actor.construction,
                requiredRoles: [
                  ...new Set(
                    value
                      .split(",")
                      .map((item) =>
                        item.trim(),
                      )
                      .filter(Boolean),
                  ),
                ],
              },
            })
          }
        />
        <TextField
          label="Optional Roles"
          value={actor.construction.optionalRoles.join(
            ", ",
          )}
          onCommit={(value) =>
            onUpdateActor({
              construction: {
                ...actor.construction,
                optionalRoles: [
                  ...new Set(
                    value
                      .split(",")
                      .map((item) =>
                        item.trim(),
                      )
                      .filter(Boolean),
                  ),
                ],
              },
            })
          }
        />
        <label style={fieldLabelStyle}>
          Required Mouth Poses
          <select
            multiple
            size={5}
            value={
              actor.construction
                .requiredMouthPoses
            }
            onChange={(event) =>
              onUpdateActor({
                construction: {
                  ...actor.construction,
                  requiredMouthPoses: [
                    ...event
                      .currentTarget
                      .selectedOptions,
                  ].flatMap(
                    (option) =>
                      ACTOR_MOUTH_POSES.includes(
                        option.value as (typeof ACTOR_MOUTH_POSES)[number],
                      )
                        ? [
                            option.value as (typeof ACTOR_MOUTH_POSES)[number],
                          ]
                        : [],
                  ),
                },
              })
            }
            style={controlStyle}
          >
            {ACTOR_MOUTH_POSES.map(
              (pose) => (
                <option
                  key={pose}
                  value={pose}
                >
                  {pose}
                </option>
              ),
            )}
          </select>
        </label>

        <SectionLabel>
          BLINK CONFIGURATION
        </SectionLabel>
        <SelectField
          label="Enabled"
          value={
            blink.enabled
              ? "true"
              : "false"
          }
          onChange={(value) =>
            updateBlink({
              enabled:
                value === "true",
            })
          }
        >
          <option value="true">
            Yes
          </option>
          <option value="false">
            No
          </option>
        </SelectField>

        {(
          [
            [
              "minimumDelayMs",
              "Minimum Delay (ms)",
              1,
            ],
            [
              "maximumDelayMs",
              "Maximum Delay (ms)",
              1,
            ],
            [
              "closeDurationMs",
              "Close Duration (ms)",
              1,
            ],
            [
              "holdDurationMs",
              "Hold Duration (ms)",
              1,
            ],
            [
              "openDurationMs",
              "Open Duration (ms)",
              1,
            ],
            [
              "upperTravel",
              "Upper Travel",
              0.05,
            ],
            [
              "lowerTravel",
              "Lower Travel",
              0.05,
            ],
            [
              "upperScaleY",
              "Upper Scale Y",
              0.01,
            ],
            [
              "lowerScaleY",
              "Lower Scale Y",
              0.01,
            ],
          ] as const
        ).map(([key, label, step]) => (
          <NumberField
            key={key}
            label={label}
            value={blink[key]}
            min={0}
            step={step}
            onCommit={(value) =>
              updateBlink({
                [key]: value,
              })
            }
          />
        ))}

        <SectionLabel>
          NESTED FOLDERS
        </SectionLabel>
        {actor.folders.map(
          (folder) => (
            <SelectField
              key={folder.id}
              label={folder.name}
              value={
                folder.parentId ?? ""
              }
              onChange={(parentId) =>
                onUpdateFolder(
                  folder.id,
                  {
                    parentId:
                      parentId ||
                      undefined,
                  },
                )
              }
            >
              <option value="">
                Top level
              </option>
              {actor.folders
                .filter(
                  (candidate) =>
                    candidate.id !==
                    folder.id,
                )
                .map((candidate) => (
                  <option
                    key={candidate.id}
                    value={candidate.id}
                  >
                    {candidate.name}
                  </option>
                ))}
            </SelectField>
          ),
        )}
      </div>
    </section>
  );
}

function SectionLabel({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={sectionLabelStyle}>
      {children}
    </div>
  );
}

function TextField({
  label,
  value,
  onCommit,
}: {
  label: string;
  value: string;
  onCommit: (value: string) => void;
}) {
  return (
    <label style={fieldLabelStyle}>
      {label}
      <input
        defaultValue={value}
        key={`${label}-${value}`}
        onBlur={(event) => {
          const next =
            event.target.value.trim();

          if (next !== value) {
            onCommit(next);
          }
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.currentTarget.blur();
          }
        }}
        style={controlStyle}
      />
    </label>
  );
}

function NumberField({
  label,
  value,
  onCommit,
  min,
  step = 1,
}: {
  label: string;
  value: number;
  onCommit: (value: number) => void;
  min?: number;
  step?: number;
}) {
  return (
    <label style={fieldLabelStyle}>
      {label}
      <input
        type="number"
        defaultValue={value}
        key={`${label}-${value}`}
        min={min}
        step={step}
        onBlur={(event) => {
          const parsed = Number(
            event.target.value,
          );

          if (
            Number.isFinite(parsed) &&
            parsed !== value
          ) {
            onCommit(
              min === undefined
                ? parsed
                : Math.max(min, parsed),
            );
          }
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.currentTarget.blur();
          }
        }}
        style={controlStyle}
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label style={fieldLabelStyle}>
      {label}
      <select
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        style={controlStyle}
      >
        {children}
      </select>
    </label>
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

const sectionLabelStyle:
  React.CSSProperties = {
    margin: "17px 0 9px",
    paddingBottom: 6,
    borderBottom:
      "1px solid rgba(70,210,255,0.12)",
    color: "#67d9ff",
    fontSize: 9,
    letterSpacing: "0.14em",
  };

const fieldLabelStyle:
  React.CSSProperties = {
    display: "grid",
    gridTemplateColumns:
      "minmax(100px,0.8fr) minmax(0,1.2fr)",
    alignItems: "center",
    gap: 8,
    marginBottom: 7,
    color: "rgba(255,255,255,0.48)",
    fontSize: 9,
  };

const controlStyle:
  React.CSSProperties = {
    minWidth: 0,
    width: "100%",
    boxSizing: "border-box",
    padding: "6px 7px",
    border:
      "1px solid rgba(255,255,255,0.1)",
    borderRadius: 4,
    color: "#fff",
    background: "#10171b",
    fontSize: 9,
  };
