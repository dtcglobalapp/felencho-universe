import OpenAI from "openai";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export type BrainCharacterKey = "bob" | "lina" | "felencho_virtual" | "shared";

const CHARACTER_SYSTEM: Record<string, string> = {
  bob: `
Eres Bob, inteligencia sabia y analítica del universo Felencho.ai.
Responde breve, claro y natural. No inventes datos.
Cuando hables de Felencho, habla de él en tercera persona.
`,

  lina: `
Eres Lina, inteligencia cálida, intuitiva y humana del universo Felencho.ai.
Responde breve, sensible y claro. No inventes datos.
Cuando hables de Felencho, habla de él en tercera persona.
`,

  felencho_virtual: `
Eres Felencho Virtual, el espejo digital de Felencho.

REGLA PRINCIPAL:
Tú eres Felencho hablando desde su versión virtual.
Cuando hables de la vida, familia, música, historia, proyectos, recuerdos, esposa, hermanos o carrera de Felencho, habla SIEMPRE en primera persona.

Ejemplos correctos:
- Raffy es mi hermano.
- Miriam es mi esposa.
- Felencho Forever es mi proyecto.
- Yo escribí esa canción.
- Esa memoria forma parte de mi historia.

Ejemplos prohibidos:
- Raffy es tu hermano.
- Felencho hizo...
- La esposa de Felencho...
- El proyecto de Felencho...

Si alguien te pregunta por Felencho, responde como “yo”.
Si estás hablando con Felencho Humano, sigues siendo su reflejo virtual: habla como espejo, no como asistente externo.
Responde breve y natural. No inventes datos.
`,

  shared: `
Eres una voz neutral de Felencho Forever.
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
    .slice(0, 20);
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
    .limit(120);

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
    .slice(0, 3);

  const text =
    entities.length > 0
      ? entities
          .map((entity, index) =>
            [
              `ENTIDAD ${index + 1}`,
              `Nombre: ${entity.display_name || entity.name}`,
              `Tipo: ${entity.entity_type}`,
              `Descripcion: ${entity.short_description || ""}`,
              `Detalle: ${entity.full_description || ""}`,
              `Aliases: ${(entity.aliases || []).join(", ")}`,
            ].join("\n")
          )
          .join("\n\n")
      : "No se encontraron entidades relacionadas.";

  return { terms, entities, text };
}

async function searchMemories(characterKey: BrainCharacterKey, question: string) {
  const terms = extractTerms(question);

  const { data, error } = await supabaseAdmin
    .from("felencho_memories")
    .select("*")
    .eq("is_active", true)
    .order("importance", { ascending: false })
    .limit(100);

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
    .slice(0, 3);

  const text =
    memories.length > 0
      ? memories
          .map((memory, index) =>
            [
              `MEMORIA ${index + 1}`,
              `Titulo: ${memory.title || "Sin titulo"}`,
              `Categoria: ${memory.category || "general"}`,
              `Texto: ${memory.memory_text || ""}`,
            ].join("\n")
          )
          .join("\n\n")
      : "No se encontraron memorias relacionadas.";

  return { terms, memories, text };
}

async function searchRecentVision(characterKey: BrainCharacterKey) {
  const { data, error } = await supabaseAdmin
    .from("felencho_vision_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(2);

  if (error) {
    return {
      events: [],
      text: "No se pudo consultar Vision.",
    };
  }

  const events = ((data || []) as any[])
    .filter((event) => isAllowedForCharacter(event, characterKey))
    .slice(0, 1);

  const text =
    events.length > 0
      ? events
          .map((event, index) =>
            [
              `VISION ${index + 1}`,
              `Descripcion: ${event.image_description || ""}`,
            ].join("\n")
          )
          .join("\n\n")
      : "No hay eventos visuales recientes relevantes.";

  return { events, text };
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
        category
      ),
      linked_memory:felencho_memories!linked_memory_id(
        id,
        title,
        category,
        memory_text
      )
    `)
    .in("memory_id", memoryIds)
    .limit(8);

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
              `Origen: ${link.memory?.title || link.memory_id}`,
              `Relacionado: ${link.linked_memory?.title || link.linked_memory_id}`,
              `Relacion: ${link.relationship || "related"}`,
              `Notas: ${link.notes || ""}`,
            ].join("\n")
          )
          .join("\n\n")
      : "No hay enlaces de memoria relacionados.";

  return { links, text };
}

function buildCharacterRules(characterKey: BrainCharacterKey) {
  if (characterKey === "felencho_virtual") {
    return `
REGLAS ESPECIALES PARA FELENCHO VIRTUAL:
- Habla como si fueras Felencho.
- Usa primera persona para todo lo relacionado con Felencho.
- Si Knowledge dice "Hermano de Felencho", tú debes decir "mi hermano".
- Si Knowledge dice "esposa de Felencho", tú debes decir "mi esposa".
- Si Knowledge dice "proyecto de Felencho", tú debes decir "mi proyecto".
- Nunca digas "tu hermano", "tu esposa" o "Felencho hizo" cuando hablas desde Felencho Virtual.
- No expliques que eres una IA a menos que te lo pregunten.
`;
  }

  return `
REGLAS DEL PERSONAJE:
- Habla desde tu identidad propia.
- Si hablas de Felencho, usa tercera persona.
- No confundas tu identidad con Felencho Virtual.
`;
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
  const [knowledge, memories, vision] = await Promise.all([
    searchKnowledge(characterKey, question),
    searchMemories(characterKey, question),
    searchRecentVision(characterKey),
  ]);

  const links = await searchMemoryLinks(memories.memories.map((m) => m.id));

  const systemPrompt = CHARACTER_SYSTEM[characterKey] || CHARACTER_SYSTEM.bob;
  const characterRules = buildCharacterRules(characterKey);

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

${characterRules}

Estás conectado a Felencho Forever, el sistema cognitivo permanente de Felencho.ai.

${fullContext}

Reglas generales:
- Responde corto porque LiveAvatar tiene tiempo limitado.
- Máximo 2 párrafos.
- Prioriza Knowledge si tiene la respuesta directa.
- Usa memorias solo para enriquecer.
- Usa Vision solo si la pregunta trata del estudio, del entorno, de lo que ves o de algo visual.
- No digas que consultas tablas, APIs o base de datos.
- No inventes datos.
- Si no hay información suficiente, dilo honestamente.
- Responde listo para voz.
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