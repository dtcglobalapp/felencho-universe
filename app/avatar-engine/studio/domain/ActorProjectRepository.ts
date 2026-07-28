import {
  ACTOR_SCHEMA_VERSION,
} from "../../domain/ActorDefinition";
import {
  CUSTOM_CONSTRUCTION_PROFILE,
  DEFAULT_ACTOR_FOLDERS,
} from "../../config/ActorEditorConfig";

import type {
  ActorDefinition,
} from "../../domain/ActorDefinition";

const PROJECT_INDEX_KEY =
  "felencho-studio:v1:projects";
const PROJECT_PREFIX =
  "felencho-studio:v1:project:";

export interface ActorProjectSummary {
  key: string;
  actorId: string;
  name: string;
  version: string;
  createdAt: string;
  updatedAt: string;
}

interface StoredActorProject
  extends ActorProjectSummary {
  definition: ActorDefinition;
}

function projectStorageKey(
  key: string,
): string {
  return `${PROJECT_PREFIX}${key}`;
}

function safeProjectKey(
  value: string,
): string {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "") ||
    "actor"
  );
}

function readIndex(): ActorProjectSummary[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(
      window.localStorage.getItem(
        PROJECT_INDEX_KEY,
      ) ?? "[]",
    );

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.flatMap((entry) => {
      if (
        !entry ||
        typeof entry !== "object"
      ) {
        return [];
      }

      const value = entry as Record<
        string,
        unknown
      >;

      if (
        typeof value.key !== "string" ||
        typeof value.actorId !==
          "string" ||
        typeof value.name !== "string" ||
        typeof value.version !==
          "string" ||
        typeof value.createdAt !==
          "string" ||
        typeof value.updatedAt !==
          "string"
      ) {
        return [];
      }

      return [
        {
          key: value.key,
          actorId: value.actorId,
          name: value.name,
          version: value.version,
          createdAt: value.createdAt,
          updatedAt: value.updatedAt,
        },
      ];
    });
  } catch {
    return [];
  }
}

function writeIndex(
  projects: readonly ActorProjectSummary[],
): void {
  window.localStorage.setItem(
    PROJECT_INDEX_KEY,
    JSON.stringify(projects),
  );
}

export function createEmptyActorDefinition(
  input: {
    id: string;
    name: string;
    width: number;
    height: number;
    fps?: number;
  },
): ActorDefinition {
  const id = safeProjectKey(input.id);

  return {
    schemaVersion:
      ACTOR_SCHEMA_VERSION,
    id,
    name: input.name.trim() || id,
    version: "1.0.0",
    width: Math.max(
      1,
      Math.round(input.width),
    ),
    height: Math.max(
      1,
      Math.round(input.height),
    ),
    fps: Math.max(
      1,
      Math.round(input.fps ?? 60),
    ),
    display: {
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      maxStageWidth: Math.max(
        1,
        Math.round(input.width),
      ),
      maxStageHeight: Math.max(
        1,
        Math.round(input.height),
      ),
    },
    assets: [],
    folders:
      DEFAULT_ACTOR_FOLDERS.map(
        (folder) => ({
          ...folder,
        }),
      ),
    groups: [],
    layers: [],
    rig: {},
    construction: {
      ...CUSTOM_CONSTRUCTION_PROFILE,
      requiredRoles: [],
      optionalRoles: [],
      requiredMouthPoses: [],
      mouthPoses: {},
    },
    animations: {
      blink: {
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
      },
    },
  };
}

export class ActorProjectRepository {
  public list(): ActorProjectSummary[] {
    return readIndex().sort((left, right) =>
      right.updatedAt.localeCompare(
        left.updatedAt,
      ),
    );
  }

  public load(
    key: string,
  ): ActorDefinition | null {
    if (typeof window === "undefined") {
      return null;
    }

    try {
      const raw =
        window.localStorage.getItem(
          projectStorageKey(key),
        );

      if (!raw) {
        return null;
      }

      const parsed: unknown =
        JSON.parse(raw);

      if (
        !parsed ||
        typeof parsed !== "object" ||
        !("definition" in parsed)
      ) {
        return null;
      }

      return (
        parsed as StoredActorProject
      ).definition;
    } catch {
      return null;
    }
  }

  public save(
    key: string,
    definition: ActorDefinition,
  ): ActorProjectSummary {
    const now =
      new Date().toISOString();
    const existing = readIndex().find(
      (project) =>
        project.key === key,
    );
    const summary:
      ActorProjectSummary = {
        key,
        actorId: definition.id,
        name: definition.name,
        version: definition.version,
        createdAt:
          existing?.createdAt ?? now,
        updatedAt: now,
      };
    const stored: StoredActorProject = {
      ...summary,
      definition,
    };

    window.localStorage.setItem(
      projectStorageKey(key),
      JSON.stringify(stored),
    );
    writeIndex([
      summary,
      ...readIndex().filter(
        (project) =>
          project.key !== key,
      ),
    ]);

    return summary;
  }

  public create(
    definition: ActorDefinition,
  ): ActorProjectSummary {
    const existingKeys = new Set(
      readIndex().map(
        (project) => project.key,
      ),
    );
    const base = safeProjectKey(
      definition.id,
    );
    let key = base;
    let suffix = 2;

    while (existingKeys.has(key)) {
      key = `${base}-${suffix}`;
      suffix += 1;
    }

    return this.save(key, definition);
  }

  public saveAs(
    definition: ActorDefinition,
    preferredKey: string,
  ): ActorProjectSummary {
    const existingKeys = new Set(
      readIndex().map(
        (project) => project.key,
      ),
    );
    const base = safeProjectKey(
      preferredKey ||
        definition.id,
    );
    let key = base;
    let suffix = 2;

    while (existingKeys.has(key)) {
      key = `${base}-${suffix}`;
      suffix += 1;
    }

    return this.save(key, definition);
  }

  public delete(key: string): void {
    window.localStorage.removeItem(
      projectStorageKey(key),
    );
    writeIndex(
      readIndex().filter(
        (project) =>
          project.key !== key,
      ),
    );
  }
}
