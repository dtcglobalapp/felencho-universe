import type {
  AvatarEngineEvent,
  AvatarEventListener,
} from "../contracts/avatar-events";

export class AvatarEventBus {
  private listeners = new Set<AvatarEventListener>();

  subscribe(listener: AvatarEventListener): () => void {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  emit(event: AvatarEngineEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  clear(): void {
    this.listeners.clear();
  }

  listenerCount(): number {
    return this.listeners.size;
  }
}

export const avatarEventBus = new AvatarEventBus();
