export type PresenceMode = "presence" | "live";

export type PresenceState =
  | "sleeping"
  | "waking"
  | "thinking"
  | "speaking";

export type PresenceCharacterStatus = {
  character: string;
  mode: PresenceMode;
  state: PresenceState;
  updatedAt: number;
};

type Listener = () => void;

class PresenceController {
  private characters: Record<string, PresenceCharacterStatus> = {};
  private listeners: Listener[] = [];

  subscribe(listener: Listener) {
    this.listeners.push(listener);

    return () => {
      this.listeners = this.listeners.filter((item) => item !== listener);
    };
  }

  private notify() {
    this.listeners.forEach((listener) => listener());
  }

  private normalizeCharacter(character: string): string {
    return character.trim().toLowerCase();
  }

  private ensureCharacter(character: string): PresenceCharacterStatus {
    const key = this.normalizeCharacter(character);

    if (!this.characters[key]) {
      this.characters[key] = {
        character: key,
        mode: "presence",
        state: "sleeping",
        updatedAt: Date.now(),
      };
    }

    return this.characters[key];
  }

  getStatus(character: string): PresenceCharacterStatus {
    return { ...this.ensureCharacter(character) };
  }

  getMode(character: string): PresenceMode {
    return this.ensureCharacter(character).mode;
  }

  getState(character: string): PresenceState {
    return this.ensureCharacter(character).state;
  }

  getAllStatuses(): PresenceCharacterStatus[] {
    return Object.values(this.characters).map((status) => ({ ...status }));
  }

  setPresence(character: string) {
    const status = this.ensureCharacter(character);
    status.mode = "presence";
    status.state = "sleeping";
    status.updatedAt = Date.now();
    this.notify();
  }

  setLive(character: string) {
    const status = this.ensureCharacter(character);
    status.mode = "live";
    status.state = "waking";
    status.updatedAt = Date.now();
    this.notify();
  }

  think(character: string) {
    const status = this.ensureCharacter(character);
    status.state = "thinking";
    status.updatedAt = Date.now();
    this.notify();
  }

  speak(character: string) {
    const status = this.ensureCharacter(character);
    status.state = "speaking";
    status.updatedAt = Date.now();
    this.notify();
  }

  sleep(character: string) {
    const status = this.ensureCharacter(character);
    status.mode = "presence";
    status.state = "sleeping";
    status.updatedAt = Date.now();
    this.notify();
  }

  resetAll() {
    this.characters = {};
    this.notify();
  }
}

export const presenceController = new PresenceController();