export type PresenceMode = "presence" | "live";

export type PresenceState =
  | "sleeping"
  | "waking"
  | "thinking"
  | "speaking";

type Listener = () => void;

class PresenceController {
  private mode: PresenceMode = "presence";
  private state: PresenceState = "sleeping";

  private listeners: Listener[] = [];

  subscribe(listener: Listener) {
    this.listeners.push(listener);

    return () => {
      this.listeners = this.listeners.filter(
        (item) => item !== listener
      );
    };
  }

  private notify() {
    this.listeners.forEach((listener) => listener());
  }

  getMode() {
    return this.mode;
  }

  getState() {
    return this.state;
  }

  setPresence() {
    this.mode = "presence";
    this.state = "sleeping";
    this.notify();
  }

  setLive() {
    this.mode = "live";
    this.state = "waking";
    this.notify();
  }

  think() {
    this.state = "thinking";
    this.notify();
  }

  speak() {
    this.state = "speaking";
    this.notify();
  }

  sleep() {
    this.state = "sleeping";
    this.mode = "presence";
    this.notify();
  }
}

export const presenceController = new PresenceController();