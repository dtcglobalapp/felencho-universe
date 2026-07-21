export interface LoadedActor {
  id: string;
  name: string;
  version: string;
  width: number;
  height: number;
  fps: number;
  layers: unknown[];
  rig: unknown;
}

export async function loadActor(id: string): Promise<LoadedActor> {
  const response = await fetch(`/actors/${id}/actor.json`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Unable to load actor: ${id}`);
  }

  return response.json();
}
