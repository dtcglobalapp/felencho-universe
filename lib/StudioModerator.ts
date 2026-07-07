export type StudioCharacter = "bob" | "lina" | "felencho";

export type StudioSource =
  | "voice"
  | "youtube"
  | "whatsapp"
  | "instagram"
  | "facebook"
  | "tiktok"
  | "web"
  | "phone"
  | "system";

export type StudioActionType =
  | "talk"
  | "shared_panel"
  | "directed_turn"
  | "music_break"
  | "commercial_break"
  | "bumper"
  | "return_from_break"
  | "teleprompter_cue"
  | "shutdown"
  | "ignore";

export type StudioAction = {
  type: StudioActionType;
  character?: StudioCharacter;
  from?: StudioCharacter;
  to?: StudioCharacter;
  topic?: string;
  message?: string;
  participants?: StudioCharacter[];
  cue?: string;
  durationSeconds?: number;
  assetKey?: string;
  note?: string;
};

export type StudioModerationInput = {
  source: StudioSource;
  speaker?: StudioCharacter | "human" | "guest" | "audience";
  message: string;
  includeFelenchoVirtual?: boolean;
};

export type StudioModerationPlan = {
  mode:
    | "single"
    | "shared"
    | "directed"
    | "production"
    | "shutdown"
    | "ignore";
  topic?: string;
  actions: StudioAction[];
};

const aliases: Record<StudioCharacter, string[]> = {
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

const labels: Record<StudioCharacter, string> = {
  bob: "Bob",
  lina: "Lina",
  felencho: "Felencho Virtual",
};

export function normalizeStudioText(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.,!?¿¡]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function studioCharacterLabel(character: StudioCharacter) {
  return labels[character] || character;
}

export function findMentionedCharacter(text: string): StudioCharacter | null {
  const clean = normalizeStudioText(text);

  for (const character of Object.keys(aliases) as StudioCharacter[]) {
    if (aliases[character].some((alias) => clean.includes(normalizeStudioText(alias)))) {
      return character;
    }
  }

  return null;
}

function removeAliases(text: string) {
  let clean = normalizeStudioText(text);

  for (const aliasList of Object.values(aliases)) {
    aliasList.forEach((alias) => {
      clean = clean.replace(normalizeStudioText(alias), "");
    });
  }

  return clean.replace(/\s+/g, " ").trim();
}

function cleanTopic(text: string) {
  let clean = removeAliases(text);

  const removable = [
    "para ustedes",
    "para los tres",
    "ustedes",
    "que opinan",
    "que piensan",
    "quiero escuchar a todos",
    "quiero la opinion de todos",
    "me gustaria escuchar a todos",
    "opinen",
    "debatan",
    "conversen",
    "hablen de",
    "hablemos de",
    "sobre",
  ];

  removable.forEach((phrase) => {
    clean = clean.replace(normalizeStudioText(phrase), "");
  });

  clean = clean.replace(/\s+/g, " ").trim();

  return clean || "el tema propuesto";
}

function isShutdown(text: string) {
  const clean = normalizeStudioText(text);

  return [
    "apaga el estudio",
    "apagar estudio",
    "deten el estudio",
    "detener estudio",
    "pausa estudio",
    "silencio estudio",
    "studio off",
    "stop studio",
  ].some((cmd) => clean.includes(cmd));
}

function isShared(text: string) {
  const clean = normalizeStudioText(text);

  return [
    "para ustedes",
    "para los tres",
    "ustedes",
    "que opinan",
    "que piensan",
    "quiero escuchar a todos",
    "quiero la opinion de todos",
    "me gustaria escuchar a todos",
    "opinen",
    "debatan",
    "conversen",
    "hablen entre ustedes",
  ].some((signal) => clean.includes(signal));
}

function isDirected(text: string) {
  const clean = normalizeStudioText(text);

  return [
    "preguntale a",
    "pregunta a",
    "dile a",
    "contesta a",
    "respondale a",
    "respondele a",
    "habla con",
  ].some((signal) => clean.includes(signal));
}

function isCommercialBreak(text: string) {
  const clean = normalizeStudioText(text);

  return [
    "vamos a comerciales",
    "manda comerciales",
    "pausa comercial",
    "vamos a una pausa",
    "vamos a pausa",
    "corte comercial",
  ].some((signal) => clean.includes(signal));
}

function isReturnFromBreak(text: string) {
  const clean = normalizeStudioText(text);

  return [
    "regresamos",
    "volvemos de la pausa",
    "regreso de pausa",
    "volver de comerciales",
    "estamos de vuelta",
  ].some((signal) => clean.includes(signal));
}

function isMusicBreak(text: string) {
  const clean = normalizeStudioText(text);

  return [
    "pon musica",
    "pon música",
    "musica de felencho",
    "música de felencho",
    "vamos con musica",
    "vamos con música",
    "corte musical",
    "denon",
  ].some((signal) => clean.includes(signal));
}

function panelParticipants(
  first: StudioCharacter | null,
  includeFelenchoVirtual = true
): StudioCharacter[] {
  const base: StudioCharacter[] = includeFelenchoVirtual
    ? ["bob", "lina", "felencho"]
    : ["bob", "lina"];

  if (!first) return base;

  return [first, ...base.filter((character) => character !== first)];
}

function buildSharedPanel(
  first: StudioCharacter | null,
  topic: string,
  includeFelenchoVirtual = true
): StudioAction[] {
  const participants = panelParticipants(first, includeFelenchoVirtual);

  return participants.map((character, index) => {
    if (character === "bob") {
      return {
        type: "talk",
        character,
        topic,
        durationSeconds: 45,
        message:
          index === 0
            ? `Abre el panel sobre "${topic}" con una mirada técnica, histórica y estratégica. Sé claro, natural y breve. No cierres el tema.`
            : `Aporta una mirada técnica, histórica y estratégica sobre "${topic}". No repitas lo dicho antes. Añade algo nuevo y breve.`,
      };
    }

    if (character === "lina") {
      return {
        type: "talk",
        character,
        topic,
        durationSeconds: 45,
        message:
          index === 0
            ? `Abre el panel sobre "${topic}" con una mirada humana, social y sensible. Sé cálida, clara y breve.`
            : `Complementa sobre "${topic}" con una mirada humana, social y sensible. No repitas lo dicho antes. Añade algo nuevo.`,
      };
    }

    return {
      type: "talk",
      character,
      topic,
      durationSeconds: 60,
      message:
        index === 0
          ? `Abre el panel sobre "${topic}" como Felencho Virtual, en primera persona, con visión artística, humana y espiritual. Sé breve y poderoso.`
          : `Cierra el panel sobre "${topic}" con una reflexión artística, humana y de futuro. No repitas lo dicho antes. Devuelve la palabra a Felencho Humano.`,
    };
  });
}

function buildDirectedTurn(
  from: StudioCharacter,
  text: string
): StudioModerationPlan | null {
  const target = findMentionedCharacter(text);

  if (!target || target === from) return null;

  let topic = cleanTopic(text);

  [
    "preguntale a",
    "pregunta a",
    "dile a",
    "contesta a",
    "respondale a",
    "respondele a",
    "habla con",
  ].forEach((signal) => {
    topic = topic.replace(normalizeStudioText(signal), "");
  });

  topic = topic.trim() || "el tema propuesto";

  return {
    mode: "directed",
    topic,
    actions: [
      {
        type: "talk",
        character: from,
        to: target,
        topic,
        durationSeconds: 30,
        message: `Invita brevemente a ${studioCharacterLabel(target)} a responder sobre "${topic}". No respondas todo tú.`,
      },
      {
        type: "talk",
        character: target,
        from,
        topic,
        durationSeconds: 45,
        message: `Responde a la invitación de ${studioCharacterLabel(from)} sobre "${topic}". Sé natural, breve y aporta algo útil.`,
      },
    ],
  };
}

function buildProductionPlan(text: string): StudioModerationPlan | null {
  if (isCommercialBreak(text)) {
    return {
      mode: "production",
      topic: "pausa comercial",
      actions: [
        {
          type: "bumper",
          assetKey: "bumper_to_commercial",
          durationSeconds: 10,
          note: "Reproducir bumper de salida a comerciales.",
        },
        {
          type: "commercial_break",
          durationSeconds: 60,
          note: "Espacio reservado para comerciales, patrocinio o pausa corta.",
        },
        {
          type: "return_from_break",
          assetKey: "bumper_return_from_commercial",
          durationSeconds: 10,
          note: "Reproducir regreso de pausa.",
        },
      ],
    };
  }

  if (isReturnFromBreak(text)) {
    return {
      mode: "production",
      topic: "regreso de pausa",
      actions: [
        {
          type: "return_from_break",
          assetKey: "bumper_return_from_commercial",
          durationSeconds: 10,
          note: "Reproducir bumper regreso de pausa.",
        },
        {
          type: "talk",
          character: "lina",
          durationSeconds: 25,
          message:
            "Da la bienvenida de regreso a Felencho Mundial The Podcast con una frase cálida y elegante.",
        },
      ],
    };
  }

  if (isMusicBreak(text)) {
    return {
      mode: "production",
      topic: "música de Felencho",
      actions: [
        {
          type: "bumper",
          assetKey: "bumper_music_break",
          durationSeconds: 8,
          note: "Reproducir bumper de corte musical.",
        },
        {
          type: "music_break",
          assetKey: "felencho_music_only",
          durationSeconds: 90,
          note:
            "Usar únicamente música de Felencho por control de derechos de autor. Puede venir del Denon DJ o de pista preparada.",
        },
        {
          type: "talk",
          character: "bob",
          durationSeconds: 25,
          message:
            "Regresa del corte musical y conecta brevemente con el próximo tema.",
        },
      ],
    };
  }

  return null;
}

export function moderateStudioInput(
  input: StudioModerationInput
): StudioModerationPlan {
  const message = input.message || "";
  const clean = normalizeStudioText(message);

  if (!clean) {
    return {
      mode: "ignore",
      actions: [{ type: "ignore", note: "Mensaje vacío." }],
    };
  }

  if (isShutdown(clean)) {
    return {
      mode: "shutdown",
      actions: [
        {
          type: "shutdown",
          note: "Apagar el estudio, detener micrófono y dormir personajes.",
        },
      ],
    };
  }

  const production = buildProductionPlan(clean);
  if (production) return production;

  const mentioned = findMentionedCharacter(clean);
  const speakerCharacter =
    input.speaker === "bob" || input.speaker === "lina" || input.speaker === "felencho"
      ? input.speaker
      : mentioned;

  if (isShared(clean)) {
    const topic = cleanTopic(clean);

    return {
      mode: "shared",
      topic,
      actions: buildSharedPanel(
        speakerCharacter,
        topic,
        input.includeFelenchoVirtual ?? true
      ),
    };
  }

  if (speakerCharacter && isDirected(clean)) {
    const directed = buildDirectedTurn(speakerCharacter, clean);
    if (directed) return directed;
  }

  if (mentioned) {
    const topic = cleanTopic(clean);

    return {
      mode: "single",
      topic,
      actions: [
        {
          type: "talk",
          character: mentioned,
          topic,
          durationSeconds: 45,
          message: topic,
        },
      ],
    };
  }

  return {
    mode: "ignore",
    actions: [
      {
        type: "ignore",
        note: "No se detectó intención clara ni personaje mencionado.",
      },
    ],
  };
}