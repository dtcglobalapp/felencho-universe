import type {
  ActorDiagnostic,
} from "../../types/Actor";
import type {
  StudioDiagnosticsResult,
} from "../domain/StudioDiagnostics";

import PanelTitle from "./PanelTitle";

interface DiagnosticsPanelProps {
  structural:
    readonly ActorDiagnostic[];
  studio:
    StudioDiagnosticsResult | null;
  onSelectLayer: (
    layerId: string,
  ) => void;
}

function formatBytes(bytes: number): string {
  return bytes === 0
    ? "UNKNOWN"
    : `${(bytes / 1024 / 1024).toFixed(1)} MiB`;
}

export default function DiagnosticsPanel({
  structural,
  studio,
  onSelectLayer,
}: DiagnosticsPanelProps) {
  const structuralErrors =
    structural.filter(
      (item) =>
        item.severity === "error",
    ).length;
  const studioErrors =
    studio?.diagnostics.filter(
      (item) =>
        item.severity === "error",
    ).length ?? 0;

  return (
    <section style={panelStyle}>
      <PanelTitle
        title="DIAGNOSTICS"
        subtitle={
          studio
            ? `${structuralErrors + studioErrors} ERR · ${structural.length + studio.diagnostics.length - structuralErrors - studioErrors} WARN`
            : "NO ACTOR"
        }
      />

      {!studio ? (
        <div style={emptyStyle}>
          No actor loaded.
        </div>
      ) : (
        <div style={contentStyle}>
          <div
            style={{
              ...readinessStyle,
              borderColor:
                studio.packageReady
                  ? "rgba(110,255,181,0.35)"
                  : "rgba(255,170,170,0.35)",
            }}
          >
            <strong>
              {studio.packageReady
                ? "PACKAGE PREFLIGHT READY"
                : "PACKAGE NOT READY"}
            </strong>
            <span>
              Structural, asset and
              performance checks
            </span>
          </div>

          <SectionLabel>
            PERFORMANCE
          </SectionLabel>
          <Metric
            label="Layers"
            value={String(
              studio.performance
                .layerCount,
            )}
          />
          <Metric
            label="Assets"
            value={String(
              studio.performance
                .assetCount,
            )}
          />
          <Metric
            label="Source Size"
            value={formatBytes(
              studio.performance
                .knownSourceBytes,
            )}
          />
          <Metric
            label="Decoded Memory"
            value={formatBytes(
              studio.performance
                .estimatedDecodedBytes,
            )}
          />
          <Metric
            label="Largest Texture"
            value={`${studio.performance.maximumTextureWidth}×${studio.performance.maximumTextureHeight}`}
          />

          <SectionLabel>
            STRUCTURAL
          </SectionLabel>
          {structural.length === 0 ? (
            <SuccessMessage>
              No structural issues.
            </SuccessMessage>
          ) : (
            structural.map(
              (item, index) => (
                <DiagnosticRow
                  key={`${item.code}-${index}`}
                  severity={
                    item.severity
                  }
                  code={item.code}
                  message={item.message}
                  onClick={
                    item.layerId
                      ? () =>
                          onSelectLayer(
                            item.layerId!,
                          )
                      : undefined
                  }
                />
              ),
            )
          )}

          {(
            [
              "asset",
              "performance",
              "package",
            ] as const
          ).map((area) => (
            <div key={area}>
              <SectionLabel>
                {area.toUpperCase()}
              </SectionLabel>
              {studio.diagnostics
                .filter(
                  (item) =>
                    item.area === area,
                )
                .map(
                  (item, index) => (
                    <DiagnosticRow
                      key={`${item.code}-${index}`}
                      severity={
                        item.severity
                      }
                      code={item.code}
                      message={
                        item.message
                      }
                      onClick={
                        item.layerId
                          ? () =>
                              onSelectLayer(
                                item.layerId!,
                              )
                          : undefined
                      }
                    />
                  ),
                )}
            </div>
          ))}
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
    <div style={sectionLabelStyle}>
      {children}
    </div>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div style={metricStyle}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function DiagnosticRow({
  severity,
  code,
  message,
  onClick,
}: {
  severity: "error" | "warning";
  code: string;
  message: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      disabled={!onClick}
      onClick={onClick}
      style={{
        ...diagnosticStyle,
        color:
          severity === "error"
            ? "#ffaaaa"
            : "#ffd36a",
        cursor: onClick
          ? "pointer"
          : "default",
      }}
    >
      <strong>
        {severity.toUpperCase()} ·{" "}
        {code}
      </strong>
      <span style={messageStyle}>
        {message}
      </span>
    </button>
  );
}

function SuccessMessage({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={successStyle}>
      ✔ {children}
    </div>
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

const readinessStyle:
  React.CSSProperties = {
    display: "grid",
    gap: 4,
    padding: 10,
    border: "1px solid",
    borderRadius: 5,
    color: "#fff",
    background:
      "rgba(255,255,255,0.025)",
    fontSize: 9,
  };

const sectionLabelStyle:
  React.CSSProperties = {
    margin: "17px 0 8px",
    paddingBottom: 5,
    borderBottom:
      "1px solid rgba(70,210,255,0.12)",
    color: "#67d9ff",
    fontSize: 9,
    letterSpacing: "0.14em",
  };

const metricStyle:
  React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    gap: 8,
    padding: "4px 0",
    color: "rgba(255,255,255,0.48)",
    fontSize: 9,
  };

const diagnosticStyle:
  React.CSSProperties = {
    width: "100%",
    display: "grid",
    gap: 3,
    marginBottom: 6,
    padding: "7px 8px",
    border:
      "1px solid rgba(255,255,255,0.06)",
    borderRadius: 4,
    background:
      "rgba(255,255,255,0.025)",
    textAlign: "left",
    fontSize: 8,
  };

const messageStyle:
  React.CSSProperties = {
    color: "rgba(255,255,255,0.5)",
    lineHeight: 1.45,
  };

const successStyle:
  React.CSSProperties = {
    color: "#67e6b5",
    fontSize: 9,
  };
