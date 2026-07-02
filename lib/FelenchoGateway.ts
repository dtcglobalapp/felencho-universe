export type FelenchoCharacterKey =
  | "felencho_virtual"
  | "bob"
  | "lina"
  | string;

export type FelenchoGatewaySource =
  | "liveavatar"
  | "web"
  | "tv"
  | "mobile"
  | "tablet"
  | "robot"
  | "ar_glasses"
  | string;

export type FelenchoGatewayConfig = {
  characterKey: FelenchoCharacterKey;
  avatarId?: string;
  sessionId?: string;
  userId?: string;
  participantName?: string;
  language?: string;
  source?: FelenchoGatewaySource;
  brainEndpoint?: string;
  minTextLength?: number;
  debug?: boolean;
  onSpeakText: (text: string) => Promise<void> | void;
  onThinkingStart?: () => void;
  onThinkingEnd?: () => void;
  onError?: (error: unknown) => void;
};

export type FelenchoBrainRequest = {
  character_key: string;
  avatar_id?: string;
  session_id?: string;
  user_id?: string;
  participant_name?: string;
  language?: string;
  source: string;
  message: string;
};

export type FelenchoBrainResponse = {
  reply?: string;
  text?: string;
  message?: string;
  answer?: string;
  response?: string;
  data?: {
    reply?: string;
    text?: string;
    message?: string;
    answer?: string;
    response?: string;
  };
};

export type LiveAvatarTranscriptionEvent = {
  text?: string;
  transcript?: string;
  message?: string;
  isFinal?: boolean;
  final?: boolean;
  type?: string;
  event?: string;
  [key: string]: unknown;
};

export class FelenchoGateway {
  private characterKey: string;
  private avatarId?: string;
  private sessionId?: string;
  private userId?: string;
  private participantName?: string;
  private language: string;
  private source: string;
  private brainEndpoint: string;
  private minTextLength: number;
  private debug: boolean;

  private onSpeakText: FelenchoGatewayConfig["onSpeakText"];
  private onThinkingStart?: FelenchoGatewayConfig["onThinkingStart"];
  private onThinkingEnd?: FelenchoGatewayConfig["onThinkingEnd"];
  private onError?: FelenchoGatewayConfig["onError"];

  private lastUserText = "";
  private lastUserTextAt = 0;
  private isProcessing = false;
  private pendingText: string | null = null;

  constructor(config: FelenchoGatewayConfig) {
    this.characterKey = config.characterKey;
    this.avatarId = config.avatarId;
    this.sessionId = config.sessionId;
    this.userId = config.userId;
    this.participantName = config.participantName;
    this.language = config.language || "es";
    this.source = config.source || "liveavatar";
    this.brainEndpoint = config.brainEndpoint || "/api/felencho-brain/chat";
    this.minTextLength = config.minTextLength ?? 2;
    this.debug = config.debug ?? false;

    this.onSpeakText = config.onSpeakText;
    this.onThinkingStart = config.onThinkingStart;
    this.onThinkingEnd = config.onThinkingEnd;
    this.onError = config.onError;
  }

  public updateSession(sessionId: string) {
    this.sessionId = sessionId;
  }

  public updateAvatar(avatarId: string) {
    this.avatarId = avatarId;
  }

  public updateCharacter(characterKey: string) {
    this.characterKey = characterKey;
  }

  public updateLanguage(language: string) {
    this.language = language;
  }

  public async handleUserTranscription(event: LiveAvatarTranscriptionEvent) {
    const text = this.extractText(event);
    const isFinal = this.isFinalTranscription(event);

    if (!text) return;
    if (!isFinal) return;

    await this.sendUserText(text);
  }

  public async sendUserText(rawText: string) {
    const text = this.cleanText(rawText);

    if (!text || text.length < this.minTextLength) return;
    if (this.isDuplicate(text)) return;

    this.lastUserText = text;
    this.lastUserTextAt = Date.now();

    if (this.isProcessing) {
      this.pendingText = text;
      return;
    }

    await this.processText(text);
  }

  private async processText(text: string) {
    this.isProcessing = true;
    this.onThinkingStart?.();

    try {
      const reply = await this.askBrain(text);

      if (reply) {
        await this.onSpeakText(reply);
      }
    } catch (error) {
      this.log("Gateway error:", error);
      this.onError?.(error);
    } finally {
      this.isProcessing = false;
      this.onThinkingEnd?.();

      if (this.pendingText) {
        const nextText = this.pendingText;
        this.pendingText = null;
        await this.processText(nextText);
      }
    }
  }

  private async askBrain(message: string): Promise<string> {
    const payload: FelenchoBrainRequest = {
      character_key: this.characterKey,
      avatar_id: this.avatarId,
      session_id: this.sessionId,
      user_id: this.userId,
      participant_name: this.participantName,
      language: this.language,
      source: this.source,
      message,
    };

    this.log("Sending to Felencho Brain:", payload);

    const response = await fetch(this.brainEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `FelenchoGateway Brain error ${response.status}: ${errorText}`
      );
    }

    const data = (await response.json()) as FelenchoBrainResponse;
    const reply = this.extractBrainReply(data);

    this.log("Brain reply:", reply);

    return reply;
  }

  private extractBrainReply(data: FelenchoBrainResponse): string {
    const reply =
      data.reply ||
      data.text ||
      data.message ||
      data.answer ||
      data.response ||
      data.data?.reply ||
      data.data?.text ||
      data.data?.message ||
      data.data?.answer ||
      data.data?.response ||
      "";

    return this.cleanText(reply);
  }

  private extractText(event: LiveAvatarTranscriptionEvent): string {
    const text =
      event.text ||
      event.transcript ||
      event.message ||
      "";

    return this.cleanText(text);
  }

  private isFinalTranscription(event: LiveAvatarTranscriptionEvent): boolean {
    if (event.isFinal === true) return true;
    if (event.final === true) return true;

    const type = String(event.type || event.event || "").toLowerCase();

    if (type.includes("final")) return true;
    if (type.includes("user.transcription")) return true;

    return false;
  }

  private isDuplicate(text: string): boolean {
    const now = Date.now();
    const sameText = text === this.lastUserText;
    const tooSoon = now - this.lastUserTextAt < 1200;

    return sameText && tooSoon;
  }

  private cleanText(value: unknown): string {
    if (typeof value !== "string") return "";

    return value
      .replace(/\s+/g, " ")
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .trim();
  }

  private log(...args: unknown[]) {
    if (this.debug) {
      console.log("[FelenchoGateway]", ...args);
    }
  }
}