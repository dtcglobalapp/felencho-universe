import type {
  ActorRegistryDefinition,
  ActorRegistryEntry,
} from "../types/Registry";

const REGISTRY_URL = "/actors/registry.json";

function isRegistryEntry(value: unknown): value is ActorRegistryEntry {
  if (!value || typeof value !== "object") {
    return false;
  }

  const entry = value as Record<string, unknown>;

  return (
    typeof entry.id === "string" &&
    typeof entry.name === "string" &&
    typeof entry.role === "string" &&
    typeof entry.description === "string" &&
    typeof entry.version === "string" &&
    typeof entry.status === "string" &&
    typeof entry.definition === "string"
  );
}

function isRegistryDefinition(
  value: unknown,
): value is ActorRegistryDefinition {
  if (!value || typeof value !== "object") {
    return false;
  }

  const registry = value as Record<string, unknown>;

  return (
    typeof registry.engine === "string" &&
    typeof registry.registryVersion === "string" &&
    typeof registry.updatedAt === "string" &&
    Array.isArray(registry.actors) &&
    registry.actors.every(isRegistryEntry)
  );
}

export async function loadActorRegistry(): Promise<ActorRegistryDefinition> {
  const response = await fetch(REGISTRY_URL, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Actor Registry could not be loaded: HTTP ${response.status}`,
    );
  }

  const registry: unknown = await response.json();

  if (!isRegistryDefinition(registry)) {
    throw new Error("Actor Registry contains an invalid structure.");
  }

  return registry;
}
