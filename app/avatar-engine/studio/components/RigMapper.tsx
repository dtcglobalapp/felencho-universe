import {
  useMemo,
} from "react";

import type {
  ActorDefinition,
} from "../../types/Actor";

import PanelTitle from "./PanelTitle";

const ARRAY_ROLES = new Set([
  "beardLeft",
  "beardCenter",
  "beardRight",
  "hairFront",
  "hairBack",
  "jaw",
]);

const STANDARD_ROLES = [
  "root",
  "face",
  "leftEye",
  "rightEye",
  "leftPupil",
  "rightPupil",
  "leftUpperEyelid",
  "rightUpperEyelid",
  "leftLowerEyelid",
  "rightLowerEyelid",
  "leftEyebrow",
  "rightEyebrow",
  "upperLip",
  "lowerLip",
  "upperTeeth",
  "lowerTeeth",
  "upperGum",
  "lowerGum",
  "tongue",
  "mustacheLeft",
  "mustacheCenter",
  "mustacheRight",
  "beardLeft",
  "beardCenter",
  "beardRight",
  "hairFront",
  "hairBack",
  "jaw",
  "neck",
  "body",
] as const;

interface RigMapperProps {
  actor: ActorDefinition | null;
  onSetRole: (
    role: string,
    value:
      | string
      | string[]
      | undefined,
  ) => void;
}

export default function RigMapper({
  actor,
  onSetRole,
}: RigMapperProps) {
  const roles = useMemo(
    () => [
      ...new Set([
        ...STANDARD_ROLES,
        ...(
          actor?.construction
            .requiredRoles ?? []
        ),
        ...(
          actor?.construction
            .optionalRoles ?? []
        ),
        ...Object.keys(
          actor?.rig ?? {},
        ),
      ]),
    ],
    [actor],
  );

  return (
    <section style={panelStyle}>
      <PanelTitle
        title="RIG MAPPER"
        subtitle={
          actor
            ? `${Object.keys(actor.rig).length} ROLES`
            : "NO ACTOR"
        }
      />

      {!actor ? (
        <div style={emptyStyle}>
          No actor loaded.
        </div>
      ) : (
        <div style={contentStyle}>
          <p style={helpStyle}>
            Map runtime roles explicitly.
            Names never determine actor
            behavior.
          </p>

          {roles.map((role) => {
            const target =
              actor.rig[role];
            const isArray =
              ARRAY_ROLES.has(role) ||
              Array.isArray(target);

            return (
              <label
                key={role}
                style={fieldStyle}
              >
                <span>
                  {role}
                  {actor.construction.requiredRoles.includes(
                    role,
                  )
                    ? " *"
                    : ""}
                </span>

                {isArray ? (
                  <select
                    multiple
                    size={3}
                    value={
                      Array.isArray(
                        target,
                      )
                        ? target
                        : target
                          ? [target]
                          : []
                    }
                    onChange={(event) => {
                      const values = [
                        ...event.currentTarget
                          .selectedOptions,
                      ].map(
                        (option) =>
                          option.value,
                      );

                      onSetRole(
                        role,
                        values.length > 0
                          ? values
                          : undefined,
                      );
                    }}
                    style={controlStyle}
                  >
                    {actor.layers.map(
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
                ) : (
                  <select
                    value={
                      typeof target ===
                      "string"
                        ? target
                        : ""
                    }
                    onChange={(event) =>
                      onSetRole(
                        role,
                        event.target
                          .value ||
                          undefined,
                      )
                    }
                    style={controlStyle}
                  >
                    <option value="">
                      Unassigned
                    </option>
                    {actor.layers.map(
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
                )}
              </label>
            );
          })}
        </div>
      )}
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

const emptyStyle:
  React.CSSProperties = {
    padding: 18,
    color: "rgba(255,255,255,0.4)",
    fontSize: 10,
  };

const helpStyle:
  React.CSSProperties = {
    margin: "0 0 14px",
    color: "rgba(255,255,255,0.4)",
    fontSize: 9,
    lineHeight: 1.5,
  };

const fieldStyle:
  React.CSSProperties = {
    display: "grid",
    gridTemplateColumns:
      "minmax(105px,0.8fr) minmax(0,1.2fr)",
    alignItems: "center",
    gap: 8,
    marginBottom: 7,
    color: "rgba(255,255,255,0.52)",
    fontSize: 9,
  };

const controlStyle:
  React.CSSProperties = {
    minWidth: 0,
    width: "100%",
    padding: "6px",
    border:
      "1px solid rgba(255,255,255,0.1)",
    borderRadius: 4,
    color: "#fff",
    background: "#10171b",
    fontSize: 9,
  };
