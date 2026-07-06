export type StudioCharacter = "bob" | "lina" | "felencho";

export type DirectedTurn = {
  from: StudioCharacter;
  to: StudioCharacter;
  message: string;
};

const characterAliases: Record<StudioCharacter, string[]> = {
  bob: ["bob", "bo", "bot", "bop", "vos", "voz", "box"],
  lina: ["lina", "linda"],
  felencho: [
    "felencho",
    "felencho virtual",
    "felencio",
    "felincho",
    "fencho",
    "selenio",
    "selencho",
    "selencio",
    "femencho",
    "fe lencho",
  ],
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

export function detectDirectedTurn(
  speaker: StudioCharacter,
  message: string
): DirectedTurn | null {
  const clean = normalize(message);

  const triggerWords = [
    "preguntale a",
    "pregunta a",
    "dile a",
    "contesta a",
    "respondale a",
    "respondele a",
    "habla con",
  ];

  const hasTrigger = triggerWords.some((trigger) => clean.includes(trigger));

  if (!hasTrigger) return null;

  const target = findCharacter(clean);

  if (!target) return null;

  if (target === speaker) return null;

  let cleanedMessage = clean;

  triggerWords.forEach((trigger) => {
    cleanedMessage = cleanedMessage.replace(trigger, "");
  });

  characterAliases[target].forEach((alias) => {
    cleanedMessage = cleanedMessage.replace(normalize(alias), "");
  });

  cleanedMessage = cleanedMessage.trim();

  if (!cleanedMessage) {
    cleanedMessage = "Salúdalo y pregúntale qué opina del tema.";
  }

  return {
    from: speaker,
    to: target,
    message: cleanedMessage,
  };
}