export type PresenceState =
  | "sleeping"
  | "waking"
  | "thinking"
  | "speaking";

class PresenceController {

  private state: PresenceState = "sleeping";

  getState() {
    return this.state;
  }

  sleep() {
    this.state = "sleeping";
  }

  wake() {
    this.state = "waking";
  }

  think() {
    this.state = "thinking";
  }

  speak() {
    this.state = "speaking";
  }

}

export const presenceController = new PresenceController();