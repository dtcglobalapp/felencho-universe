export type ConversationContext = {
  topic: string | null;
  lastQuestion: string | null;
  lastAnswer: string | null;

  speaker: string | null;

  language: string;

  depth: number;

  updatedAt: number;
};

export default class ConversationContextManager {
  private context: ConversationContext;

  constructor() {
    this.context = {
      topic: null,
      lastQuestion: null,
      lastAnswer: null,
      speaker: null,
      language: "es",
      depth: 1,
      updatedAt: Date.now(),
    };
  }

  public get(): ConversationContext {
    return { ...this.context };
  }

  public setTopic(topic: string | null) {
    this.context.topic = topic;
    this.touch();
  }

  public setQuestion(question: string) {
    this.context.lastQuestion = question;
    this.touch();
  }

  public setAnswer(answer: string) {
    this.context.lastAnswer = answer;
    this.touch();
  }

  public setSpeaker(name: string) {
    this.context.speaker = name;
    this.touch();
  }

  public setLanguage(language: string) {
    this.context.language = language;
    this.touch();
  }

  public setDepth(depth: number) {
    this.context.depth = depth;
    this.touch();
  }

  public clear() {
    this.context = {
      topic: null,
      lastQuestion: null,
      lastAnswer: null,
      speaker: null,
      language: "es",
      depth: 1,
      updatedAt: Date.now(),
    };
  }

  private touch() {
    this.context.updatedAt = Date.now();
  }
}