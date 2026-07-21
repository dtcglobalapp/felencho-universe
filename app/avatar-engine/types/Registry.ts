export type ActorRegistryStatus =
  | "ready"
  | "development"
  | "offline";

export interface ActorRegistryEntry {
  id: string;
  name: string;
  role: string;
  description: string;
  version: string;
  status: ActorRegistryStatus;
  definition: string;
  portrait?: string;
}

export interface ActorRegistryDefinition {
  engine: string;
  registryVersion: string;
  updatedAt: string;
  actors: ActorRegistryEntry[];
}
