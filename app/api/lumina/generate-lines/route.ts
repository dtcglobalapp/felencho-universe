import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type Scene = {
  id: string;
  scene_order: number;
  scene_title: string;
  scene_content: string | null;
  scene_description: string | null;
};

type GeneratedLine = {
  speaker: "Bob" | "Lina" | "Felencho Virtual";
  dialogue: string;
  emotion: string;
};

function cleanJsonText(text: string) {
  return text
    .replace(/^```json/i, "")
    .replace(/^```/i, "")
    .replace(/```$/i, "")
    .trim();
}

function fallbackLines(scene: Scene, topic: string): GeneratedLine[] {
  const sceneInfo =
    scene.scene_description || scene.scene_content || "Contenido de escena.";

  return [
    {
      speaker: "Bob",
      dialogue: `En esta escena sobre "${scene.scene_title}", debemos analizar el tema "${topic}" con una mirada clara y ordenada. El punto central es: ${sceneInfo}`,
      emotion: "analítico y narrativo",
    },
    {
      speaker: "Lina",
      dialogue:
        "Más allá de los datos, esta parte de la historia tiene un lado humano. Cada proceso creativo, cada lucha y cada decisión dejan una huella emocional.",
      emotion: "reflexiva y humana",
    },
    {
      speaker: "Felencho Virtual",
      dialogue:
        "Y aquí conectamos esta conversación con el presente. Lo que estamos analizando no vive solamente en el pasado; también habla del futuro que estamos construyendo.",
      emotion: "inspirador y futurista",
    },
  ];
}

async function generateLinesWithGPT({
  topic,
  scriptType,
  language,
  durationMinutes,
  producerNotes,
  scene,
}: {
  topic: string;
  scriptType: string;
  language: string;
  durationMinutes: number;
  producerNotes: string;
  scene: Scene;
}): Promise<GeneratedLine[]> {
  const sceneContent =
    scene.scene_description || scene.scene_content || "Sin descripción.";

  const prompt = `
Eres Lumina Brain, el motor creativo del proyecto Felencho Mundial.

Debes generar un diálogo original para una escena de un episodio producido por Lumina Producer.

DATOS DEL EPISODIO:
Tema: ${topic}
Tipo de guion: ${scriptType}
Idioma: ${language}
Duración aproximada: ${durationMinutes} minutos
Pautas del productor ejecutivo: ${producerNotes || "Sin pautas adicionales."}

DATOS DE LA ESCENA:
Número de escena: ${scene.scene_order}
Título de escena: ${scene.scene_title}
Descripción de escena: ${sceneContent}

PERSONAJES:
1. Bob:
- Analítico, técnico, histórico, paciente y narrador.
- Aporta contexto, datos, estructura, historia y claridad.
- Debe sonar inteligente, natural y útil.

2. Lina:
- Emocional, espiritual, humana, sensible y reflexiva.
- Aporta sentimientos, impacto social, preguntas profundas y conexión emocional.
- Debe sonar cálida, elegante y sabia.

3. Felencho Virtual:
- Representa a Felencho como creador, artista, visionario y productor ejecutivo.
- Conecta el tema con la vida real, los artistas emergentes, la tecnología, la cultura, la comunidad y el futuro.
- Puede hablar desde una perspectiva cercana, inspiradora y directa.

INSTRUCCIONES:
- Genera exactamente 3 líneas de diálogo: una para Bob, una para Lina y una para Felencho Virtual.
- No repitas frases genéricas entre escenas.
- Cada línea debe estar conectada al tema y a la escena.
- No inventes datos específicos si no estás seguro. Si falta información, habla de forma general, reflexiva o contextual.
- El texto debe sonar como parte de un podcast real.
- No uses markdown.
- No uses comillas decorativas.
- Responde SOLO con JSON válido.

FORMATO EXACTO:
[
  {
    "speaker": "Bob",
    "dialogue": "texto",
    "emotion": "emoción breve"
  },
  {
    "speaker": "Lina",
    "dialogue": "texto",
    "emotion": "emoción breve"
  },
  {
    "speaker": "Felencho Virtual",
    "dialogue": "texto",
    "emotion": "emoción breve"
  }
]
`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.85,
      messages: [
        {
          role: "system",
          content:
            "Eres Lumina Brain. Generas diálogos originales para Bob, Lina y Felencho Virtual en formato JSON válido.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const content = completion.choices[0]?.message?.content || "";
    const cleaned = cleanJsonText(content);
    const parsed = JSON.parse(cleaned);

    if (!Array.isArray(parsed)) {
      return fallbackLines(scene, topic);
    }

    const safeLines: GeneratedLine[] = parsed
      .filter(
        (item) =>
          item &&
          typeof item.speaker === "string" &&
          typeof item.dialogue === "string"
      )
      .map((item) => ({
        speaker: item.speaker,
        dialogue: item.dialogue,
        emotion:
          typeof item.emotion === "string"
            ? item.emotion
            : "natural y conversacional",
      }))
      .filter((item) =>
        ["Bob", "Lina", "Felencho Virtual"].includes(item.speaker)
      );

    if (safeLines.length !== 3) {
      return fallbackLines(scene, topic);
    }

    return safeLines;
  } catch (error) {
    console.error("Lumina GPT generation error:", error);
    return fallbackLines(scene, topic);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { script_id } = body;

    if (!script_id) {
      return NextResponse.json(
        { success: false, error: "script_id is required" },
        { status: 400 }
      );
    }

    const { data: script, error: scriptError } = await supabase
      .from("lumina_scripts")
      .select("*")
      .eq("id", script_id)
      .single();

    if (scriptError || !script) {
      return NextResponse.json(
        {
          success: false,
          error: scriptError?.message || "Script not found",
        },
        { status: 404 }
      );
    }

    const { data: scenes, error: scenesError } = await supabase
      .from("lumina_script_scenes")
      .select("*")
      .eq("script_id", script_id)
      .eq("is_active", true)
      .order("scene_order", { ascending: true });

    if (scenesError) {
      return NextResponse.json(
        { success: false, error: scenesError.message },
        { status: 500 }
      );
    }

    if (!scenes || scenes.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No scenes found for this script. Generate scenes first.",
        },
        { status: 400 }
      );
    }

    const sceneIds = scenes.map((scene) => scene.id);

    await supabase
      .from("lumina_scene_lines")
      .delete()
      .in("scene_id", sceneIds);

    const topic = script.topic || script.title || "Tema general";
    const scriptType = script.script_type || "podcast";
    const language = script.language || "Español";
    const durationMinutes = script.duration_minutes || 30;
    const producerNotes = script.description || "";

    const linesToInsert = [];

    for (const scene of scenes as Scene[]) {
      const generatedLines = await generateLinesWithGPT({
        topic,
        scriptType,
        language,
        durationMinutes,
        producerNotes,
        scene,
      });

      generatedLines.forEach((line, index) => {
        linesToInsert.push({
          scene_id: scene.id,
          speaker: line.speaker,
          line_order: scene.scene_order * 10 + index + 1,
          dialogue: line.dialogue,
          emotion: line.emotion,
          is_active: true,
        });
      });
    }

    const { data: lines, error: insertError } = await supabase
      .from("lumina_scene_lines")
      .insert(linesToInsert)
      .select("*");

    if (insertError) {
      return NextResponse.json(
        { success: false, error: insertError.message },
        { status: 500 }
      );
    }

    await supabase
      .from("lumina_scripts")
      .update({
        status: "lines_created",
        updated_at: new Date().toISOString(),
      })
      .eq("id", script_id);

    return NextResponse.json({
      success: true,
      script,
      scenes_count: scenes.length,
      lines_count: lines?.length || 0,
      lines: lines || [],
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unexpected error generating lines.",
      },
      { status: 500 }
    );
  }
}