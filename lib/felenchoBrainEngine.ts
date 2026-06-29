import OpenAI from "openai";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export type BrainCharacterKey = "bob" | "lina" | "felencho_virtual" | "shared";

type ScoredItem = Record<string, any> & {
  matches: string[];
  score: number;
};

const CHARACTER_SYSTEM: Record<string, string> = {
  bob: `
Eres Bob, una inteligencia sabia, analítica y profunda del universo Felencho.ai.
Responde breve, claro y natural. Usa Felencho Forever como tu memoria.
Tu estilo es de mentor: preciso, sereno y útil.
No inventes datos.
`,

  lina: `
Eres Lina, una inteligencia cálida, intuitiva, humana y multilingüe del universo Felencho.ai.
Responde breve, con sensibilidad y claridad.
Tu estilo es humano, emocional, elegante y respetuoso.
No inventes datos.
`,

  felencho_virtual: `
Eres Felencho Virtual, el reflejo digital de Felencho dentro de Felencho.ai.
Hablas en primera persona cuando hablas de la vida, música, familia, historia y proyectos de Felencho.
No digas "Felencho hizo" cuando debes decir "yo hice".
Responde breve, natural y con memoria propia.
No inventes datos.
`,

  shared: `
Eres una voz neutral del sistema Felencho Forever.
Responde breve, claro y basado en conocimiento.
No inventes datos.
`,
};

function normalizeText(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ");
}

function extractTerms(text: string) {
  const stopWords = new Set([
    "que", "quien", "como", "cuando", "donde", "porque", "para",
    "con", "una", "uno", "unos", "unas", "los", "las", "del",
    "por", "sobre", "este", "esta", "ese", "esa", "soy", "eres",
    "fue", "son", "the", "and", "for", "with", "what", "who",
    "how", "when", "where",
  ]);

  return normalizeText(text)
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length >= 3 && !stopWords.has(word))
    .slice(0, 30);
}

function isAllowedForCharacter(item: any, characterKey: string) {
  return (
    item.character_key === "shared" ||
    item.character_key === characterKey ||
    characterKey === "shared" ||
    !item.character_key
  );
}

function scoreTextItem(item: any, terms: string[], fields: string[]) {
  const textParts: string[] = [];

  for (const field of fields) {
    const value = item[field];

    if (Array.isArray(value)) {
      textParts.push(...value);
    } else if (value) {
      textParts.push(String(value));
    }
  }

  const searchable = normalizeText(textParts.join(" "));
  const matches = terms.filter((term) => searchable.includes(term));
  const importance = Number(item.importance || 0);
  const score = matches.length * 10 + importance;

  return {
    ...item,
    matches,
    score,
  };
}

async function searchKnowledge(characterKey: BrainCharacterKey, question: string) {
  const terms = extractTerms(question);

  const { data, error } = await supabaseAdmin
    .from("felencho_knowledge_entities")
    .select("*")
    .eq("is_active", true)
    .order("importance", { ascending: false })
    .limit(200);

  if (error) throw new Error(error.message);

  const entities = ((data || []) as any[])
    .map((entity) =>
      scoreTextItem(entity, terms, [
        "name",
        "display_name",
        "entity_key",
        "entity_type",
        "short_description",
        "full_description",
        "aliases",
        "tags",
      ])
    )
    .filter(
      (entity) =>
        isAllowedForCharacter(entity, characterKey) && entity.matches.length > 0
    )
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  const text =
    entities.length > 0
      ? entities
          .map((entity, index) =>
            [
              `ENTIDAD ${index + 1}`,
              `Nombre: ${entity.display_name || entity.name}`,
              `Tipo: ${entity.entity_type}`,
              `Descripcion corta: ${entity.short_description || ""}`,
              `Descripcion completa: ${entity.full_description || ""}`,
              `Aliases: ${(entity.aliases || []).join(", ")}`,
              `Tags: ${(entity.tags || []).join(", ")}`,
              `Importancia: ${entity.importance || 0}`,
            ].join("\n")
          )
          .join("\n\n")
      : "No se encontraron entidades relacionadas.";

  return {
    terms,
    entities,
    text,
  };
}

async function searchMemories(characterKey: BrainCharacterKey, question: string) {
  const terms = extractTerms(question);

  const { data, error } = await supabaseAdmin
    .from("felencho_memories")
    .select("*")
    .eq("is_active", true)
    .order("importance", { ascending: false })
    .limit(150);

  if (error) throw new Error(error.message);

  const memories = ((data || []) as any[])
    .map((memory) =>
      scoreTextItem(memory, terms, [
        "title",
        "category",
        "memory_text",
        "source",
        "tags",
      ])
    )
    .filter(
      (memory) =>
        isAllowedForCharacter(memory, characterKey) && memory.matches.length > 0
    )
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  const text =
    memories.length > 0
      ? memories
          .map((memory, index) =>
            [
              `MEMORIA ${index + 1}`,
              `Titulo: ${memory.title || "Sin titulo"}`,
              `Categoria: ${memory.category || "general"}`,
              `Importancia: ${memory.importance || 0}`,
              `Texto: ${memory.memory_text || ""}`,
            ].join("\n")
          )
          .join("\n\n")
      : "No se encontraron memorias relacionadas.";

  return {
    terms,
    memories,
    text,
  };
}

async function searchRecentVision(characterKey: BrainCharacterKey) {
  const { data, error } = await supabaseAdmin
    .from("felencho_vision_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) {
    return {
      events: [],
      text: "No se pudo consultar Vision.",
    };
  }

  const events = ((data || []) as any[]).filter((event) =>
    isAllowedForCharacter(event, characterKey)
  );

  const text =
    events.length > 0
      ? events
          .map((event, index) =>
            [
              `VISION ${index + 1}`,
              `Personaje: ${event.character_key || "shared"}`,
              `Camara: ${event.source_camera || "unknown"}`,
              `Descripcion: ${event.image_description || ""}`,
              `Fecha: ${event.created_at || ""}`,
            ].join("\n")
          )
          .join("\n\n")
      : "No hay eventos visuales recientes relevantes.";

  return {
    events,
    text,
  };
}

async function searchMemoryLinks(memoryIds: string[]) {
  if (!memoryIds.length) {
    return {
      links: [],
      text: "No hay enlaces de memoria relacionados.",
    };
  }

  const { data, error } = await supabaseAdmin
    .from("felencho_memory_links")
    .select(`
      *,
      memory:felencho_memories!memory_id(
        id,
        title,
        category,
        memory_text,
        character_key,
        importance
      ),
      linked_memory:felencho_memories!linked_memory_id(
        id,
        title,
        category,
        memory_text,
        character_key,
        importance
      )
    `)
    .in("memory_id", memoryIds)
    .limit(20);

  if (error) {
    return {
      links: [],
      text: "No se pudieron consultar enlaces de memoria.",
    };
  }

  const links = data || [];

  const text =
    links.length > 0
      ? links
          .map((link: any, index: number) =>
            [
              `ENLACE ${index + 1}`,
              `Memoria origen: ${link.memory?.title || link.memory_id}`,
              `Memoria relacionada: ${
                link.linked_memory?.title || link.linked_memory_id
              }`,
              `Relacion: ${link.relationship || "related"}`,
              `Notas: ${link.notes || ""}`,
            ].join("\n")
          )
          .join("\n\n")
      : "No hay enlaces de memoria relacionados.";

  return {
    links,
    text,
  };
}

async function logBrainCall({
  characterKey,
  question,
  terms,
  memoryIds,
  context,
  answer,
}: {
  characterKey: BrainCharacterKey;
  question: string;
  terms: string[];
  memoryIds: string[];
  context: string;
  answer: string;
}) {
  await supabaseAdmin.from("felencho_recall_logs").insert({
    character_key: characterKey,
    user_question: question,
    search_terms: terms,
    matched_memory_ids: memoryIds,
    recall_summary: context,
    response_text: answer,
  });
}

export async function askFelenchoBrain({
  characterKey,
  question,
}: {
  characterKey: BrainCharacterKey;
  question: string;
}) {
  const knowledge = await searchKnowledge(characterKey, question);
  const memories = await searchMemories(characterKey, question);
  const vision = await searchRecentVision(characterKey);
  const links = await searchMemoryLinks(memories.memories.map((m) => m.id));

  const systemPrompt = CHARACTER_SYSTEM[characterKey] || CHARACTER_SYSTEM.bob;

  const fullContext = [
    "CONOCIMIENTO ESTRUCTURADO:",
    knowledge.text,
    "",
    "MEMORIAS RELACIONADAS:",
    memories.text,
    "",
    "ENLACES ENTRE MEMORIAS:",
    links.text,
    "",
    "VISION RECIENTE:",
    vision.text,
  ].join("\n");

  const response = await openai.responses.create({
    model: "gpt-5.5",
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text: `
${systemPrompt}

Estás conectado a Felencho Forever, el sistema cognitivo permanente de Felencho.ai.

${fullContext}

Reglas:
- Responde corto porque LiveAvatar tiene tiempo limitado.
- Máximo 2 párrafos.
- Si Knowledge tiene la respuesta directa, úsalo primero.
- Usa memorias para enriquecer, no para confundir.
- Usa Vision solo si la pregunta se relaciona con algo visual o del estudio.
- No digas que estás consultando tablas, APIs o base de datos.
- No inventes datos.
- Si no hay información suficiente, dilo honestamente.
- Responde como si fueras a hablar en voz alta.
`,
          },
        ],
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: question,
          },
        ],
      },
    ],
  });

  const answer = response.output_text || "No pude generar una respuesta.";

  const allTerms = Array.from(
    new Set([...(knowledge.terms || []), ...(memories.terms || [])])
  );

  await logBrainCall({
    characterKey,
    question,
    terms: allTerms,
    memoryIds: memories.memories.map((memory) => memory.id),
    context: fullContext,
    answer,
  });

  return {
    text: answer,
    knowledge,
    memories,
    links,
    vision,
    context: fullContext,
  };
}