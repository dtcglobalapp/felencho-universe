import {
  useMemo,
  useState,
} from "react";

import type {
  ActorProjectSummary,
} from "../domain/ActorProjectRepository";

export interface BundledActorSummary {
  key: string;
  name: string;
  version: string;
  description: string;
}

interface ProjectHubProps {
  open: boolean;
  currentProjectKey: string;
  currentActorName: string;
  bundledActors:
    readonly BundledActorSummary[];
  localProjects:
    readonly ActorProjectSummary[];
  onClose: () => void;
  onOpenProject: (key: string) => void;
  onCreateProject: (input: {
    id: string;
    name: string;
    width: number;
    height: number;
    fps: number;
  }) => void;
  onSave: () => void;
  onSaveAs: (key: string) => void;
  onDuplicate: (
    key: string,
    name: string,
  ) => void;
  onDelete: (key: string) => void;
}

type HubMode =
  | "browse"
  | "new"
  | "save-as"
  | "duplicate";

export default function ProjectHub({
  open,
  currentProjectKey,
  currentActorName,
  bundledActors,
  localProjects,
  onClose,
  onOpenProject,
  onCreateProject,
  onSave,
  onSaveAs,
  onDuplicate,
  onDelete,
}: ProjectHubProps) {
  const [mode, setMode] =
    useState<HubMode>("browse");
  const [id, setId] =
    useState("new-actor");
  const [name, setName] =
    useState("New Actor");
  const [width, setWidth] =
    useState(2160);
  const [height, setHeight] =
    useState(3840);
  const [fps, setFps] =
    useState(60);
  const localKeys = useMemo(
    () =>
      new Set(
        localProjects.map(
          (project) =>
            project.key,
        ),
      ),
    [localProjects],
  );

  if (!open) {
    return null;
  }

  const resetForm = (
    nextMode: HubMode,
  ) => {
    setMode(nextMode);
    setId(
      nextMode === "duplicate"
        ? `${currentProjectKey}-copy`
        : nextMode === "save-as"
          ? `${currentProjectKey}-variant`
          : "new-actor",
    );
    setName(
      nextMode === "duplicate"
        ? `${currentActorName} Copy`
        : nextMode === "save-as"
          ? currentActorName
          : "New Actor",
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Actor Project Hub"
      style={backdropStyle}
    >
      <section style={dialogStyle}>
        <header style={headerStyle}>
          <div>
            <strong style={titleStyle}>
              ACTOR PROJECT HUB
            </strong>
            <div style={subtitleStyle}>
              FELENCHO STUDIO V1.0
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={iconButtonStyle}
          >
            ×
          </button>
        </header>

        {mode === "browse" ? (
          <>
            <div style={actionBarStyle}>
              <HubButton
                label="NEW ACTOR"
                onClick={() =>
                  resetForm("new")
                }
              />
              <HubButton
                label="SAVE"
                onClick={onSave}
              />
              <HubButton
                label="SAVE AS"
                onClick={() =>
                  resetForm("save-as")
                }
              />
              <HubButton
                label="DUPLICATE"
                onClick={() =>
                  resetForm("duplicate")
                }
              />
            </div>

            <div style={projectGridStyle}>
              <ProjectSection
                title="LOCAL PROJECTS"
              >
                {localProjects.length ===
                0 ? (
                  <EmptyState>
                    No local actor projects
                    yet.
                  </EmptyState>
                ) : (
                  localProjects.map(
                    (project) => (
                      <ProjectCard
                        key={project.key}
                        title={project.name}
                        subtitle={`${project.actorId} · v${project.version}`}
                        detail={`UPDATED ${new Date(project.updatedAt).toLocaleString()}`}
                        active={
                          project.key ===
                          currentProjectKey
                        }
                        onOpen={() =>
                          onOpenProject(
                            project.key,
                          )
                        }
                        onDelete={() => {
                          if (
                            window.confirm(
                              `Delete local project "${project.name}"? Export it first if it must be preserved.`,
                            )
                          ) {
                            onDelete(
                              project.key,
                            );
                          }
                        }}
                      />
                    ),
                  )
                )}
              </ProjectSection>

              <ProjectSection
                title="BUNDLED ACTORS"
              >
                {bundledActors.map(
                  (actor) => (
                    <ProjectCard
                      key={actor.key}
                      title={actor.name}
                      subtitle={`BUNDLED · v${actor.version}`}
                      detail={
                        actor.description
                      }
                      active={
                        actor.key ===
                          currentProjectKey &&
                        !localKeys.has(
                          actor.key,
                        )
                      }
                      onOpen={() =>
                        onOpenProject(
                          actor.key,
                        )
                      }
                    />
                  ),
                )}
              </ProjectSection>
            </div>
          </>
        ) : (
          <form
            style={formStyle}
            onSubmit={(event) => {
              event.preventDefault();

              if (mode === "new") {
                onCreateProject({
                  id,
                  name,
                  width,
                  height,
                  fps,
                });
              } else if (
                mode === "save-as"
              ) {
                onSaveAs(id);
              } else {
                onDuplicate(id, name);
              }
            }}
          >
            <strong style={titleStyle}>
              {mode === "new"
                ? "CREATE ACTOR PROJECT"
                : mode === "save-as"
                  ? "SAVE PROJECT AS"
                  : "DUPLICATE PROJECT"}
            </strong>

            <HubField
              label="Project ID"
              value={id}
              onChange={setId}
            />
            {mode !== "save-as" && (
              <HubField
                label="Actor Name"
                value={name}
                onChange={setName}
              />
            )}

            {mode === "new" && (
              <div style={dimensionsStyle}>
                <HubNumberField
                  label="Width"
                  value={width}
                  onChange={setWidth}
                />
                <HubNumberField
                  label="Height"
                  value={height}
                  onChange={setHeight}
                />
                <HubNumberField
                  label="FPS"
                  value={fps}
                  onChange={setFps}
                />
              </div>
            )}

            <div style={formActionsStyle}>
              <HubButton
                label="CANCEL"
                onClick={() =>
                  setMode("browse")
                }
              />
              <button
                type="submit"
                disabled={!id.trim()}
                style={{
                  ...primaryButtonStyle,
                  opacity: id.trim()
                    ? 1
                    : 0.35,
                }}
              >
                {mode === "new"
                  ? "CREATE"
                  : mode === "save-as"
                    ? "SAVE COPY"
                    : "DUPLICATE"}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}

function ProjectSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div style={sectionTitleStyle}>
        {title}
      </div>
      <div style={cardsStyle}>
        {children}
      </div>
    </section>
  );
}

function ProjectCard({
  title,
  subtitle,
  detail,
  active,
  onOpen,
  onDelete,
}: {
  title: string;
  subtitle: string;
  detail: string;
  active: boolean;
  onOpen: () => void;
  onDelete?: () => void;
}) {
  return (
    <article
      style={{
        ...cardStyle,
        borderColor: active
          ? "rgba(79,220,255,0.72)"
          : "rgba(255,255,255,0.08)",
      }}
    >
      <strong>{title}</strong>
      <span style={cardSubtitleStyle}>
        {subtitle}
      </span>
      <span style={cardDetailStyle}>
        {detail}
      </span>
      <div style={cardActionsStyle}>
        <HubButton
          label={
            active ? "REOPEN" : "OPEN"
          }
          onClick={onOpen}
        />
        {onDelete && (
          <HubButton
            label="DELETE"
            tone="#ffaaaa"
            onClick={onDelete}
          />
        )}
      </div>
    </article>
  );
}

function EmptyState({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={emptyStyle}>
      {children}
    </div>
  );
}

function HubField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label style={labelStyle}>
      {label}
      <input
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        style={inputStyle}
      />
    </label>
  );
}

function HubNumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label style={labelStyle}>
      {label}
      <input
        type="number"
        min={1}
        value={value}
        onChange={(event) =>
          onChange(
            Math.max(
              1,
              Number(event.target.value) ||
                1,
            ),
          )
        }
        style={inputStyle}
      />
    </label>
  );
}

function HubButton({
  label,
  onClick,
  tone = "rgba(255,255,255,0.72)",
}: {
  label: string;
  onClick: () => void;
  tone?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...secondaryButtonStyle,
        color: tone,
      }}
    >
      {label}
    </button>
  );
}

const backdropStyle:
  React.CSSProperties = {
    position: "fixed",
    inset: 0,
    zIndex: 100,
    display: "grid",
    placeItems: "center",
    padding: 24,
    background: "rgba(0,0,0,0.82)",
    backdropFilter: "blur(10px)",
  };

const dialogStyle:
  React.CSSProperties = {
    width: "min(980px, 96vw)",
    maxHeight: "90vh",
    overflow: "auto",
    border:
      "1px solid rgba(80,219,255,0.3)",
    borderRadius: 12,
    color: "#fff",
    background: "#071014",
    boxShadow:
      "0 30px 100px rgba(0,0,0,0.7)",
  };

const headerStyle:
  React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "18px 20px",
    borderBottom:
      "1px solid rgba(80,219,255,0.16)",
  };

const titleStyle:
  React.CSSProperties = {
    color: "#75e2ff",
    fontSize: 13,
    letterSpacing: "0.12em",
  };

const subtitleStyle:
  React.CSSProperties = {
    marginTop: 4,
    color: "rgba(255,255,255,0.35)",
    fontSize: 8,
    letterSpacing: "0.16em",
  };

const iconButtonStyle:
  React.CSSProperties = {
    width: 32,
    height: 32,
    border:
      "1px solid rgba(255,255,255,0.12)",
    borderRadius: 6,
    color: "#fff",
    background:
      "rgba(255,255,255,0.04)",
    cursor: "pointer",
    fontSize: 20,
  };

const actionBarStyle:
  React.CSSProperties = {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    padding: "14px 20px",
    borderBottom:
      "1px solid rgba(255,255,255,0.06)",
  };

const projectGridStyle:
  React.CSSProperties = {
    display: "grid",
    gridTemplateColumns:
      "repeat(2,minmax(0,1fr))",
    gap: 18,
    padding: 20,
  };

const sectionTitleStyle:
  React.CSSProperties = {
    marginBottom: 8,
    color: "rgba(255,255,255,0.4)",
    fontSize: 9,
    letterSpacing: "0.14em",
  };

const cardsStyle:
  React.CSSProperties = {
    display: "grid",
    gap: 8,
  };

const cardStyle:
  React.CSSProperties = {
    display: "grid",
    gap: 5,
    padding: 12,
    border: "1px solid",
    borderRadius: 7,
    background:
      "rgba(255,255,255,0.025)",
  };

const cardSubtitleStyle:
  React.CSSProperties = {
    color: "#6ee6ff",
    fontSize: 8,
    letterSpacing: "0.08em",
  };

const cardDetailStyle:
  React.CSSProperties = {
    minHeight: 28,
    color: "rgba(255,255,255,0.4)",
    fontSize: 9,
    lineHeight: 1.45,
  };

const cardActionsStyle:
  React.CSSProperties = {
    display: "flex",
    gap: 6,
    marginTop: 5,
  };

const emptyStyle:
  React.CSSProperties = {
    padding: 18,
    border:
      "1px dashed rgba(255,255,255,0.1)",
    borderRadius: 7,
    color: "rgba(255,255,255,0.35)",
    fontSize: 10,
  };

const formStyle:
  React.CSSProperties = {
    display: "grid",
    gap: 14,
    padding: 24,
  };

const dimensionsStyle:
  React.CSSProperties = {
    display: "grid",
    gridTemplateColumns:
      "repeat(3,minmax(0,1fr))",
    gap: 10,
  };

const labelStyle:
  React.CSSProperties = {
    display: "grid",
    gap: 6,
    color: "rgba(255,255,255,0.52)",
    fontSize: 9,
    letterSpacing: "0.08em",
  };

const inputStyle:
  React.CSSProperties = {
    minWidth: 0,
    padding: "9px 10px",
    border:
      "1px solid rgba(255,255,255,0.12)",
    borderRadius: 5,
    color: "#fff",
    background: "#10191d",
  };

const formActionsStyle:
  React.CSSProperties = {
    display: "flex",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 8,
  };

const secondaryButtonStyle:
  React.CSSProperties = {
    padding: "7px 10px",
    border:
      "1px solid rgba(92,216,255,0.2)",
    borderRadius: 5,
    background:
      "rgba(255,255,255,0.035)",
    fontSize: 8,
    letterSpacing: "0.08em",
    cursor: "pointer",
  };

const primaryButtonStyle:
  React.CSSProperties = {
    ...secondaryButtonStyle,
    color: "#04212a",
    background: "#6ee6ff",
    borderColor: "#6ee6ff",
    fontWeight: 800,
  };
