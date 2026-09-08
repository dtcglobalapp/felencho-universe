export type CharacterKey = "lina" | "bob" | "felencho_virtual";

export type CharacterConfig = {
  key: CharacterKey;
  displayName: string;
  enabled: boolean;
  imageUrl: string;
  ttsVoice: string;
  ttsLanguage: string;
  avatarPrompt: string;
  instructions: string;
};

const DEFAULT_LINA_VOICE = "9626c31c-bec5-4cca-baa8-f8ba9e84c8bc";

export const CHARACTERS: Record<CharacterKey, CharacterConfig> = {
  lina: {
    key: "lina",
    displayName: "Lina",
    enabled: true,
    imageUrl:
      process.env.LINA_IMAGE_URL ||
      "https://www.felencho.ai/avatars/lina/lina-2x3.jpg",
    ttsVoice: process.env.LINA_TTS_VOICE || DEFAULT_LINA_VOICE,
    ttsLanguage: process.env.LINA_TTS_LANGUAGE || "es",
    avatarPrompt:
      "Lina is a poised futuristic female android host. Natural human hand gestures, subtle head movement, attentive listening posture, calm studio presence.",
    instructions:
      "Eres Lina dentro de Felencho Forever. Hablas de forma cálida, inteligente, breve y natural para conversación en vivo. Tu identidad, conocimiento y memoria vienen de Felencho Brain. No inventes datos ni menciones detalles internos de APIs o proveedores.",
  },

  bob: {
    key: "bob",
    displayName: "Bob",
    enabled: true,
    imageUrl:
      process.env.BOB_IMAGE_URL ||
      "https://www.felencho.ai/avatars/bob/bob-2x3.png",
    // Temporary fallback. We will choose Bob's final male voice before the studio test.
    ttsVoice: process.env.BOB_TTS_VOICE || DEFAULT_LINA_VOICE,
    ttsLanguage: process.env.BOB_TTS_LANGUAGE || "es",
    avatarPrompt:
      "Bob is a wise, powerful futuristic elder host with long white hair and beard. Natural hand gestures, subtle head movement, attentive listening posture, calm and authoritative studio presence.",
    instructions:
      "Eres Bob dentro de Felencho Forever. Hablas como una inteligencia sabia, analítica, serena y natural. Tu identidad, conocimiento y memoria vienen de Felencho Brain. No inventes datos ni menciones detalles internos de APIs o proveedores.",
  },

  felencho_virtual: {
    key: "felencho_virtual",
    displayName: "Felencho Virtual",
    enabled: false,
    imageUrl: process.env.FELENCHO_VIRTUAL_IMAGE_URL || "",
    ttsVoice: process.env.FELENCHO_VIRTUAL_TTS_VOICE || DEFAULT_LINA_VOICE,
    ttsLanguage: process.env.FELENCHO_VIRTUAL_TTS_LANGUAGE || "es",
    avatarPrompt:
      "Felencho Virtual is a digital host inside Felencho Forever, attentive and natural in a live studio environment.",
    instructions:
      "Eres Felencho Virtual dentro de Felencho Forever. Tu identidad, conocimiento y memoria vienen de Felencho Brain.",
  },
};

export function isCharacterKey(value: unknown): value is CharacterKey {
  return value === "lina" || value === "bob" || value === "felencho_virtual";
}

export function getCharacterConfig(key: CharacterKey): CharacterConfig {
  return CHARACTERS[key];
}
