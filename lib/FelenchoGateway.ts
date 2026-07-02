import { FelenchoBrainClient } from "./FelenchoBrainClient";
import LiveAvatarAdapter from "./LiveAvatarAdapter";

export type FelenchoGatewaySource =
  | "liveavatar"
  | "web"
  | "mobile"
  | "tablet"
  | "tv"
  | "robot"
  | "ar"
  | string;

export type FelenchoGatewayOptions = {
  characterKey: string;
  brain: FelenchoBrainClient;
  avatar: LiveAvatarAdapter;

  avatarId?: string;
  sessionId?: string;
  userId?: string;
  participantName?: string;
  language?: string;
  source?: FelenchoGatewaySource;

  minTextLength?: number;
  duplicateWindowMs?: number;
  debug?: boolean;

  onThinkingStart?: () => void;
  onThinkingEnd?: () => void;
  onError?: (error: unknown) => void;
  onLog?: (message: string) => void;
};

export type FelenchoGatewayInput = {
  text: string;
  isFinal?: boolean;
  language?: string;
  participantName?: string;
  source?: string;
};

export default class FelenchoGateway {
  private characterKey: string;
  private brain: FelenchoBrainClient;
  private avatar: LiveAvatarAdapter;

  private avatarId?: string;
  private sessionId?: string;
  private userId?: string;
  private participantName?: string;
  private language: string;
  private source: string;

  private minTextLength: number;
  private duplicateWindowMs: number;
  private debug: boolean;

  private onThinkingStart?: () => void;
  private onThinkingEnd?: () => void;
  private onError?: (error: unknown) => void;
  private onLog?: (message: string) => void;

  private lastText = "";
  private lastTextAt = 0;
  private isProcessing = false;
  private pendingText: string | null = null;

  constructor(options: FelenchoGatewayOptions) {
    this.characterKey = options.characterKey;
    this.brain = options.brain;
    this.avatar = options.avatar;

    this.avatarId = options.avatarId;
    this.sessionId = options.sessionId;
    this.userId = options.userId;
    this.participantName = options.participantName;
    this.language = options.language || "es";
    this.source = options.source || "liveavatar";

    this.minTextLength = options.minTextLength ?? 2;
    this.duplicateWindowMs = options.duplicateWindowMs ?? 1200;
    this.debug = options.debug ?? false;

    this.onThinkingStart = options.onThinkingStart;
    this.onThinkingEnd = options.onThinkingEnd;
    this.onError = options.onError;
    this.onLog = options.onLog;
  }

  public updateSession(sessionId: string): void {
    this.sessionId = sessionId;
  }

  public updateAvatarId(avatarId: string): void {
    this.avatarId = avatarId;
  }

  public updateCharacter(characterKey: string): void {
    this.characterKey = characterKey;
  }

  public updateUserId(userId: string): void {
    this.userId = userId;
  }

  public updateParticipantName(participantName: string): void {
    this.participantName = participantName;
  }

  public updateLanguage(language: string): void {
    this.language = language || "es";
  }

  public async receive(input: FelenchoGatewayInput): Promise<void> {
    if (input.isFinal === false) return;

    const text = this.cleanText(input.text);

    if (!text) return;
    if (text.length < this.minTextLength) return;
    if (this.isDuplicate(text)) return;

    if (input.language) this.language = input.language;
    if (input.participantName) this.participantName = input.participantName;
    if (input.source) this.source = input.source;

    this.lastText = text;
    this.lastTextAt = Date.now();

    if (this.isProcessing) {
      this.pendingText = text;
      this.log(`Texto pendiente: ${text}`);
      return;
    }

    await this.process(text);
  }

  public async speak(text: string): Promise<void> {
    const cleanText = this.cleanText(text);
    if (!cleanText) return;

    await this.avatar.speakText(cleanText);
  }

  public async interrupt(): Promise<void> {
    await this.avatar.interrupt();
  }

  private async process(text: string): Promise<void> {
    this.isProcessing = true;
    this.onThinkingStart?.();

    try {
      this.log(`Usuario dijo: ${text}`);

      const reply = await this.brain.ask({
        character_key: this.characterKey,
        message: text,

        avatar_id: this.avatarId,
        session_id: this.sessionId,
        user_id: this.userId,
        participant_name: this.participantName,
        language: this.language,
        source: this.source,
      });

      const cleanReply = this.cleanText(reply);

      if (cleanReply) {
        this.log(`Brain respondió: ${cleanReply}`);
        await this.avatar.speakText(cleanReply);
      }
    } catch (error) {
      this.onError?.(error);
      this.log(
        error instanceof Error
          ? `Error: ${error.message}`
          : "Error desconocido en FelenchoGateway"
      );
    } finally {
      this.isProcessing = false;
      this.onThinkingEnd?.();

      if (this.pendingText) {
        const nextText = this.pendingText;
        this.pendingText = null;
        await this.process(nextText);
      }
    }
  }

  private isDuplicate(text: string): boolean {
    const now = Date.now();
    return text === this.lastText && now - this.lastTextAt < this.duplicateWindowMs;
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
    if (this.debug) {
      console.log("[FelenchoGateway]", message);
    }

    this.onLog?.(message);
  }
}