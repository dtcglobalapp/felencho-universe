import type {
  ReactNode,
} from "react";

import type {
  ActorLayerDefinition,
  ActorTransform,
} from "../../types/Actor";

import PanelTitle from "./PanelTitle";

type TransformKey =
  keyof ActorTransform;

interface InspectorProps {
  actorLoaded: boolean;
  layer: ActorLayerDefinition | null;
  assetLoaded: boolean;
  onTransformChange: (
    key: TransformKey,
    value: number,
  ) => void;
  onOpacityChange: (
    value: number,
  ) => void;
  onZIndexChange: (
    value: number,
  ) => void;
  onNudge: (
    deltaX: number,
    deltaY: number,
  ) => void;
  onResetPosition: () => void;
}

function clamp(
  value: number,
  minimum: number,
  maximum: number,
): number {
  return Math.min(
    maximum,
    Math.max(minimum, value),
  );
}

export default function Inspector({
  actorLoaded,
  layer,
  assetLoaded,
  onTransformChange,
  onOpacityChange,
  onZIndexChange,
  onNudge,
  onResetPosition,
}: InspectorProps) {
  const locked =
    layer?.locked ?? false;

  return (
    <aside
      style={{
        minHeight: 0,
        overflow: "auto",
        borderLeft:
          "1px solid rgba(70,210,255,0.14)",
        background: "#070b0e",
      }}
    >
      <PanelTitle
        title="INSPECTOR"
        subtitle={
          layer
            ? layer.name
            : actorLoaded
              ? "NO SELECTION"
              : "NO ACTOR"
        }
      />

      {layer ? (
        <div
          style={{
            padding: "14px 16px 28px",
          }}
        >
          <SectionLabel>
            LAYER
          </SectionLabel>

          <InfoRow
            label="Layer Name"
            value={layer.name}
          />

          <InfoRow
            label="Layer ID"
            value={layer.id}
          />

          <InfoRow
            label="Asset Path"
            value={
              layer.asset ||
              "NO ASSET DECLARED"
            }
          />

          <InfoRow
            label="Asset Status"
            value={
              assetLoaded
                ? "LOADED"
                : "MISSING OR UNAVAILABLE"
            }
            tone={
              assetLoaded
                ? "success"
                : "warning"
            }
          />

          <InfoRow
            label="Type"
            value={layer.type}
          />

          <InfoRow
            label="Visible"
            value={
              layer.visible
                ? "YES"
                : "NO"
            }
          />

          <InfoRow
            label="Locked"
            value={
              locked
                ? "YES"
                : "NO"
            }
          />

          {layer.metadata?.semanticRole && (
            <InfoRow
              label="Semantic Role"
              value={
                layer.metadata
                  .semanticRole
              }
            />
          )}

          {layer.metadata?.category && (
            <InfoRow
              label="Category"
              value={
                layer.metadata.category
              }
            />
          )}

          <SectionLabel>
            TRANSFORM
          </SectionLabel>

          <NumberField
            label="Position X"
            value={layer.transform.x}
            disabled={locked}
            onChange={(value) =>
              onTransformChange(
                "x",
                value,
              )
            }
          />

          <NumberField
            label="Position Y"
            value={layer.transform.y}
            disabled={locked}
            onChange={(value) =>
              onTransformChange(
                "y",
                value,
              )
            }
          />

          <NumberField
            label="Rotation"
            value={
              layer.transform.rotation
            }
            step={0.5}
            disabled={locked}
            onChange={(value) =>
              onTransformChange(
                "rotation",
                value,
              )
            }
          />

          <NumberField
            label="Scale X"
            value={
              layer.transform.scaleX
            }
            step={0.01}
            disabled={locked}
            onChange={(value) =>
              onTransformChange(
                "scaleX",
                value,
              )
            }
          />

          <NumberField
            label="Scale Y"
            value={
              layer.transform.scaleY
            }
            step={0.01}
            disabled={locked}
            onChange={(value) =>
              onTransformChange(
                "scaleY",
                value,
              )
            }
          />

          <NumberField
            label="Rotation Pivot X"
            value={
              layer.transform.pivotX
            }
            step={0.5}
            disabled={locked}
            onChange={(value) =>
              onTransformChange(
                "pivotX",
                value,
              )
            }
          />

          <NumberField
            label="Rotation Pivot Y"
            value={
              layer.transform.pivotY
            }
            step={0.5}
            disabled={locked}
            onChange={(value) =>
              onTransformChange(
                "pivotY",
                value,
              )
            }
          />

          <NumberField
            label="Opacity"
            value={layer.opacity}
            min={0}
            max={1}
            step={0.05}
            disabled={locked}
            onChange={(value) =>
              onOpacityChange(
                clamp(value, 0, 1),
              )
            }
          />

          <NumberField
            label="Z Index"
            value={layer.zIndex}
            step={1}
            disabled={locked}
            onChange={(value) =>
              onZIndexChange(
                Math.round(value),
              )
            }
          />

          <div
            style={{
              marginTop: 12,
              padding: "10px 12px",
              borderRadius: 6,
              border:
                "1px solid rgba(255,255,255,0.07)",
              color:
                "rgba(255,255,255,0.4)",
              background:
                "rgba(255,255,255,0.025)",
              fontSize: 11,
              lineHeight: 1.5,
            }}
          >
            {locked
              ? "Esta capa está bloqueada. Puede inspeccionarse, pero sus transformaciones no se editan."
              : "La visibilidad se controla desde el panel de capas. Los cambios se conservan como borrador local hasta exportar actor.json."}
          </div>

          <SectionLabel>
            PRECISION
          </SectionLabel>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(3, 1fr)",
              gap: 7,
            }}
          >
            <span />

            <NudgeButton
              label="↑"
              disabled={locked}
              onClick={() =>
                onNudge(0, -1)
              }
            />

            <span />

            <NudgeButton
              label="←"
              disabled={locked}
              onClick={() =>
                onNudge(-1, 0)
              }
            />

            <NudgeButton
              label="•"
              disabled={locked}
              onClick={
                onResetPosition
              }
            />

            <NudgeButton
              label="→"
              disabled={locked}
              onClick={() =>
                onNudge(1, 0)
              }
            />

            <span />

            <NudgeButton
              label="↓"
              disabled={locked}
              onClick={() =>
                onNudge(0, 1)
              }
            />

            <span />
          </div>
        </div>
      ) : (
        <div
          style={{
            padding: 18,
            color:
              "rgba(255,255,255,0.4)",
            fontSize: 12,
            lineHeight: 1.6,
          }}
        >
          {actorLoaded
            ? "Selecciona una capa para inspeccionar sus propiedades."
            : "No hay un actor cargado."}
        </div>
      )}
    </aside>
  );
}

function SectionLabel({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div
      style={{
        margin: "18px 0 10px",
        paddingBottom: 6,
        borderBottom:
          "1px solid rgba(70,210,255,0.12)",
        color: "#67d9ff",
        fontSize: 10,
        letterSpacing: "0.16em",
      }}
    >
      {children}
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  step = 1,
  min,
  max,
  disabled = false,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  step?: number;
  min?: number;
  max?: number;
  disabled?: boolean;
}) {
  return (
    <label
      style={{
        display: "grid",
        gridTemplateColumns:
          "1fr 110px",
        alignItems: "center",
        gap: 10,
        marginBottom: 9,
        color:
          "rgba(255,255,255,0.62)",
        fontSize: 12,
        opacity: disabled ? 0.56 : 1,
      }}
    >
      <span>{label}</span>

      <input
        type="number"
        value={
          Number.isInteger(value)
            ? value
            : Number(value.toFixed(4))
        }
        step={step}
        min={min}
        max={max}
        disabled={disabled}
        onChange={(event) => {
          const nextValue = Number(
            event.target.value,
          );

          if (
            Number.isFinite(
              nextValue,
            )
          ) {
            onChange(nextValue);
          }
        }}
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: "7px 8px",
          borderRadius: 4,
          border:
            "1px solid rgba(255,255,255,0.13)",
          color: "#ffffff",
          background: "#10171b",
          outline: "none",
          cursor: disabled
            ? "not-allowed"
            : "text",
        }}
      />
    </label>
  );
}

function NudgeButton({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        height: 34,
        borderRadius: 4,
        border:
          "1px solid rgba(81,214,255,0.2)",
        color: "#ffffff",
        background:
          "rgba(255,255,255,0.04)",
        cursor: disabled
          ? "not-allowed"
          : "pointer",
        opacity: disabled ? 0.4 : 1,
      }}
    >
      {label}
    </button>
  );
}

function InfoRow({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?:
    | "default"
    | "success"
    | "warning";
}) {
  const color =
    tone === "success"
      ? "#67e6b5"
      : tone === "warning"
        ? "#ffd36a"
        : "rgba(255,255,255,0.68)";

  return (
    <div
      style={{
        marginBottom: 9,
      }}
    >
      <div
        style={{
          color:
            "rgba(255,255,255,0.35)",
          fontSize: 9,
          letterSpacing: "0.12em",
        }}
      >
        {label}
      </div>

      <div
        style={{
          marginTop: 4,
          overflowWrap: "anywhere",
          color,
          fontFamily:
            "ui-monospace, monospace",
          fontSize: 10,
        }}
      >
        {value}
      </div>
    </div>
  );
}
