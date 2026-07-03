export type ConversationDepth = 0 | 1 | 2 | 3 | 4;

export type ConversationIntentType =
  | "new_question"
  | "continue"
  | "expand"
  | "summarize"
  | "short_answer"
  | "explain_simple"
  | "explain_technical"
  | "change_language"
  | "unknown";

export type ConversationIntent = {
  type: ConversationIntentType;
  depth: ConversationDepth;
  continuePrevious: boolean;
  language?: string;
  rawText: string;
};

export function detectConversationIntent(text: string): ConversationIntent {
  const clean = normalize(text);

  let intent: ConversationIntent = {
    type: "new_question",
    depth: 1,
    continuePrevious: false,
    rawText: text,
  };

  if (matches(clean, ["continua", "sigue", "sigue hablando", "adelante"])) {
    intent = {
      ...intent,
      type: "continue",
      depth: 2,
      continuePrevious: true,
    };
  }

  if (
    matches(clean, [
      "profundiza",
      "explicalo mejor",
      "dame mas detalles",
      "cuentame mas",
      "amplia",
      "desarrolla",
    ])
  ) {
    intent = {
      ...intent,
      type: "expand",
      depth: 3,
      continuePrevious: true,
    };
  }

  if (
    matches(clean, [
      "resumelo",
      "resume",
      "hazlo corto",
      "respuesta corta",
      "mas corto",
      "breve",
    ])
  ) {
    intent = {
      ...intent,
      type: "summarize",
      depth: 0,
      continuePrevious: false,
    };
  }

  if (
    matches(clean, [
      "explicalo simple",
      "explicalo sencillo",
      "como para un niño",
      "facil de entender",
    ])
  ) {
    intent = {
      ...intent,
      type: "explain_simple",
      depth: 2,
      continuePrevious: true,
    };
  }

  if (
    matches(clean, [
      "hazlo tecnico",
      "explicacion tecnica",
      "mas tecnico",
      "nivel avanzado",
    ])
  ) {
    intent = {
      ...intent,
      type: "explain_technical",
      depth: 4,
      continuePrevious: true,
    };
  }

  const language = detectLanguageRequest(clean);

  if (language) {
    intent = {
      ...intent,
      type: "change_language",
      language,
    };
  }

  return intent;
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[¿?¡!.,;:]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function matches(text: string, phrases: string[]): boolean {
  return phrases.some((phrase) => text.includes(phrase));
}

function detectLanguageRequest(text: string): string | undefined {
  if (matches(text, ["en ingles", "habla ingles", "respondeme en ingles"])) {
    return "en";
  }

  if (matches(text, ["en espanol", "habla espanol", "respondeme en espanol"])) {
    return "es";
  }

  if (matches(text, ["en frances", "habla frances"])) {
    return "fr";
  }

  if (matches(text, ["en portugues", "habla portugues"])) {
    return "pt";
  }

  if (matches(text, ["en japones", "habla japones"])) {
    return "ja";
  }

  if (matches(text, ["en hindi", "habla hindi"])) {
    return "hi";
  }

  if (matches(text, ["en creole", "habla creole", "en haitiano"])) {
    return "ht";
  }

  return undefined;
}