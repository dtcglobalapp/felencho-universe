import { Room } from "livekit-client";

export type LiveAvatarAdapterOptions = {
  getRoom: () => Room | null;
  getSessionId: () => string;
  unlockAudio?: () => Promise<void>;
  onLog?: (message: string) => void;
};

export type LiveAvatarAgentEventExtra = Record<string, unknown>;

export default class LiveAvatarAdapter {
  private getRoom: () => Room | null;
  private getSessionId: () => string;
  private unlockAudio?: () => Promise<void>;
  private onLog?: (message: string) => void;

  constructor(options: LiveAvatarAdapterOptions) {
    this.getRoom = options.getRoom;
    this.getSessionId = options.getSessionId;
    this.unlockAudio = options.unlockAudio;
    this.onLog = options.onLog;
  }

  public async sendAgentEvent(
    eventType: string,
    extra: LiveAvatarAgentEventExtra = {}
  ): Promise<void> {
    const room = this.getRoom();
    const sessionId = this.getSessionId();

    if (!room || !sessionId) {
      this.log("No hay sala conectada todavía.");
      return;
    }

    const payload = this.makeEvent(eventType, sessionId, extra);
    const data = new TextEncoder().encode(JSON.stringify(payload));

    await room.localParticipant.publishData(data, {
      reliable: true,
      topic: "agent-control",
    });

    this.log(`Enviado: ${eventType}`);
  }

  public async speakText(text: string): Promise<void> {
    const cleanText = this.cleanText(text);
    if (!cleanText) return;

    await this.unlockAudio?.();

    await this.sendAgentEvent("avatar.speak_text", {
      text: cleanText,
    });
  }

  public async speakResponse(text: string): Promise<void> {
    const cleanText = this.cleanText(text);
    if (!cleanText) return;

    await this.unlockAudio?.();

    await this.sendAgentEvent("avatar.speak_response", {
      text: cleanText,
    });
  }

  public async startListening(): Promise<void> {
    const room = this.getRoom();
    if (!room) return;

    await room.localParticipant.setMicrophoneEnabled(true);
    await this.sendAgentEvent("avatar.start_listening");
  }

  public async stopListening(): Promise<void> {
    await this.sendAgentEvent("avatar.stop_listening");

    const room = this.getRoom();
    if (room) {
      await room.localParticipant.setMicrophoneEnabled(false);
    }
  }

  public async startPushToTalk(): Promise<void> {
    const room = this.getRoom();
    if (!room) return;

    await room.localParticipant.setMicrophoneEnabled(true);
    await this.sendAgentEvent("user.start_push_to_talk");
  }

  public async stopPushToTalk(): Promise<void> {
    await this.sendAgentEvent("user.stop_push_to_talk");

    const room = this.getRoom();
    if (room) {
      await room.localParticipant.setMicrophoneEnabled(false);
    }
  }

  public async interrupt(): Promise<void> {
    await this.sendAgentEvent("avatar.interrupt");
  }

  private makeEvent(
    eventType: string,
    sessionId: string,
    extra: LiveAvatarAgentEventExtra = {}
  ) {
    return {
      event_id: `${eventType}-${Date.now()}-${Math.random()
        .toString(16)
        .slice(2)}`,
      event_type: eventType,
      session_id: sessionId,
      source_event_id: null,
      ...extra,
    };
  }

  private cleanText(value: unknown): string {
    if (typeof value !== "string") return "";

    return value
      .replace(/\s+/g, " ")
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .trim();
  }

  private log(message: string): void {
    this.onLog?.(message);
  }
}