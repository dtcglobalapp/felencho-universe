export type StudioCharacter = "bob" | "lina" | "felencho";

export type DirectedTurn = {
  type: "directed";
  from: StudioCharacter;
  to: StudioCharacter;
  message: string;
};

export type SharedTurn = {
  character: StudioCharacter;
  message: string;
};

export type SharedConversation = {
  type: "shared";
  host: StudioCharacter;
  topic: string;
  turns: SharedTurn[];
};

export type StudioDirectorResult = DirectedTurn | SharedConversation | null;

const characterAliases: Record<StudioCharacter, string[]> = {
  bob: ["bob", "bo", "bot", "bop", "vos", "voz", "box"],
  lina: ["lina", "linda"],
  felencho: [
    "felencho",
    "felencho virtual",
    "felencio",
    "felincho",
    "fencho",
    "el fencho",
    "selenio",
    "selencho",
    "selencio",
    "femencho",
    "fe lencho",
  ],
};

const characterNames: Record<StudioCharacter, string> = {
  bob: "Bob",
  lina: "Lina",
  felencho: "Felencho Virtual",
};

function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.,!?¿¡]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findCharacter(text: string): StudioCharacter | null {
  const clean = normalize(text);

  for (const character of Object.keys(characterAliases) as StudioCharacter[]) {
    const aliases = characterAliases[character];

    if (aliases.some((alias) => clean.includes(normalize(alias)))) {
      return character;
    }
  }

  return null;
}

function removeCharacterAliases(text: string) {
  let clean = normalize(text);

  for (const aliases of Object.values(characterAliases)) {
    aliases.forEach((alias) => {
      clean = clean.replace(normalize(alias), "");
    });
  }

  return clean.replace(/\s+/g, " ").trim();
}

function cleanTopic(text: string) {
  let clean = removeCharacterAliases(text);

  const removable = [
    "para ustedes",
    "para los tres",
    "entre ustedes",
    "ustedes",
    "que opinan",
    "que piensan",
    "quiero escuchar a todos",
    "quiero la opinion de todos",
    "me gustaria escuchar a todos",
    "me gustaría escuchar a todos",
    "opinen",
    "hablen de",
    "conversen sobre",
    "debatan sobre",
    "hablemos de",
  ];

  removable.forEach((phrase) => {
    clean = clean.replace(normalize(phrase), "");
  });

  clean = clean.replace(/\s+/g, " ").trim();

  if (!clean) {
    return "el tema que Felencho Humano acaba de proponer";
  }

  return clean;
}

function isSharedQuestion(message: string) {
  const clean = normalize(message);

  const sharedSignals = [
    "para ustedes",
    "para los tres",
    "ustedes",
    "que opinan",
    "que piensan",
    "quiero escuchar a todos",
    "quiero la opinion de todos",
    "me gustaria escuchar a todos",
    "me gustaría escuchar a todos",
    "opinen",
    "debatan",
    "conversen",
    "hablen entre ustedes",
  ];

  return sharedSignals.some((signal) => clean.includes(normalize(signal)));
}

export function characterLabel(character: StudioCharacter) {
  return characterNames[character] || character;
}

export function detectDirectedTurn(
  speaker: StudioCharacter,
  message: string
): DirectedTurn | null {
  const clean = normalize(message);

  const triggerWords = [
    "preguntale a",
    "pregúntale a",
    "pregunta a",
    "dile a",
    "contesta a",
    "respondale a",
    "respóndale a",
    "respondele a",
    "respóndele a",
    "habla con",
  ];

  const hasTrigger = triggerWords.some((trigger) =>
    clean.includes(normalize(trigger))
  );

  if (!hasTrigger) return null;

  const target = findCharacter(clean);

  if (!target) return null;
  if (target === speaker) return null;

  let cleanedMessage = clean;

  triggerWords.forEach((trigger) => {
    cleanedMessage = cleanedMessage.replace(normalize(trigger), "");
  });

  characterAliases[target].forEach((alias) => {
    cleanedMessage = cleanedMessage.replace(normalize(alias), "");
  });

  cleanedMessage = cleanedMessage.trim();

  if (!cleanedMessage) {
    cleanedMessage = "salúdalo y pregúntale qué opina del tema";
  }

  return {
    type: "directed",
    from: speaker,
    to: target,
    message: cleanedMessage,
  };
}

export function detectSharedConversation(
  speaker: StudioCharacter,
  message: string,
  includeFelenchoVirtual = true
): SharedConversation | null {
  if (!isSharedQuestion(message)) return null;

  const topic = cleanTopic(message);

  const baseOrder: StudioCharacter[] = includeFelenchoVirtual
    ? ["bob", "lina", "felencho"]
    : ["bob", "lina"];

  const orderedCharacters = [
    speaker,
    ...baseOrder.filter((character) => character !== speaker),
  ];

  const turns: SharedTurn[] = orderedCharacters.map((character, index) => {
    if (character === "bob") {
      return {
        character,
        message:
          index === 0
            ? `Responde primero sobre "${topic}" desde tu perspectiva técnica, histórica y estratégica. Sé claro, natural y no te extiendas demasiado.`
            : `Aporta sobre "${topic}" desde tu perspectiva técnica, histórica y estratégica. No repitas lo que ya dijeron los demás. Añade algo nuevo y breve.`,
      };
    }

    if (character === "lina") {
      return {
        character,
        message:
          index === 0
            ? `Responde primero sobre "${topic}" desde una perspectiva humana, social y sensible. Sé cálida, clara y breve.`
            : `Bob ya aportó una mirada técnica sobre "${topic}". Ahora añade una perspectiva humana, social y sensible. No repitas la biografía ni lo ya dicho. Complementa con algo nuevo.`,
      };
    }

    return {
      character,
      message:
        index === 0
          ? `Responde primero sobre "${topic}" como Felencho Virtual, en primera persona, con visión artística, humana y espiritual. Sé breve y poderoso.`
          : `Bob y Lina ya aportaron sobre "${topic}". Cierra con una mirada artística, humana y de visión futura. No repitas lo anterior. Añade una reflexión final breve y poderosa.`,
    };
  });

  return {
    type: "shared",
    host: speaker,
    topic,
    turns,
  };
}

export function analyzeStudioIntent(
  speaker: StudioCharacter,
  message: string,
  includeFelenchoVirtual = true
): StudioDirectorResult {
  const shared = detectSharedConversation(
    speaker,
    message,
    includeFelenchoVirtual
  );

  if (shared) return shared;

  const directed = detectDirectedTurn(speaker, message);

  if (directed) return directed;

  return null;
}