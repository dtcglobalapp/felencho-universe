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

type Speaker = "Bob" | "Lina" | "Felencho Virtual";

type GeneratedLine = {
  speaker: Speaker;
  dialogue: string;
  emotion: string;
};

type LineInsert = {
  scene_id: string;
  speaker: string;
  line_order: number;
  dialogue: string;
  emotion: string;
  is_active: boolean;
};

function fallbackLines(scene: Scene, topic: string): GeneratedLine[] {
  const sceneInfo =
    scene.scene_description || scene.scene_content || "Contenido de escena.";

  return [
    {
      speaker: "Bob",
      dialogue: `En esta escena sobre "${scene.scene_title}", vamos a analizar el tema "${topic}" con claridad. Punto central: ${sceneInfo}`,
      emotion: "analítico y narrativo",
    },
    {
      speaker: "Lina",
      dialogue:
        "Más allá de los datos, esta parte de la historia tiene un lado humano. Cada lucha, cada sueño y cada decisión dejan una huella emocional.",
      emotion: "reflexiva y humana",
    },
    {
      speaker: "Felencho Virtual",
      dialogue:
        "Y aquí conectamos esta conversación con el presente. Lo que analizamos no vive solo en el pasado; también habla del futuro que estamos construyendo.",
      emotion: "inspirador y futurista",
    },
  ];
}

function isValidSpeaker(value: string): value is Speaker {
  return value === "Bob" || value === "Lina" || value === "Felencho Virtual";
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

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.85,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Eres Lumina Brain. Generas diálogos originales para Bob, Lina y Felencho Virtual. Respondes solamente JSON válido.",
        },
        {
          role: "user",
          content: `
Genera diálogos originales para una escena de Felencho Mundial.

DATOS DEL EPISODIO:
Tema: ${topic}
Tipo de guion: ${scriptType}
Idioma: ${language}
Duración aproximada: ${durationMinutes} minutos
Pautas del productor ejecutivo: ${producerNotes || "Sin pautas adicionales."}

DATOS DE LA ESCENA:
Número de escena: ${scene.scene_order}
Título: ${scene.scene_title}
Descripción: ${sceneContent}

PERSONAJES:
Bob: analítico, histórico, técnico, narrador.
Lina: humana, emocional, espiritual, reflexiva.
Felencho Virtual: creador, visionario, artista, conecta con la vida real y el futuro.

INSTRUCCIONES:
- Crea exactamente 3 líneas.
- Una línea para Bob.
- Una línea para Lina.
- Una línea para Felencho Virtual.
- No repitas frases genéricas.
- Cada línea debe conectar con el tema y la escena.
- No inventes datos específicos dudosos.
- Usa español natural si el idioma es Español.
- Devuelve solo este JSON:

{
  "lines": [
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
}
`,
        },
      ],
    });

    const content = completion.choices[0]?.message?.content || "";
    const parsed = JSON.parse(content);

    if (!parsed.lines || !Array.isArray(parsed.lines)) {
      return fallbackLines(scene, topic);
    }

    const safeLines: GeneratedLine[] = parsed.lines
      .filter(
        (item: { speaker?: unknown; dialogue?: unknown }) =>
          typeof item.speaker === "string" &&
          isValidSpeaker(item.speaker) &&
          typeof item.dialogue === "string"
      )
      .map(
        (item: {
          speaker: Speaker;
          dialogue: string;
          emotion?: unknown;
        }): GeneratedLine => ({
          speaker: item.speaker,
          dialogue: item.dialogue,
          emotion:
            typeof item.emotion === "string"
              ? item.emotion
              : "natural y conversacional",
        })
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

    const sceneIds = scenes.map((scene: Scene) => scene.id);

    await supabase
      .from("lumina_scene_lines")
      .delete()
      .in("scene_id", sceneIds);

    const topic = script.topic || script.title || "Tema general";
    const scriptType = script.script_type || "podcast";
    const language = script.language || "Español";
    const durationMinutes = script.duration_minutes || 30;
    const producerNotes = script.description || "";

    const linesToInsert: LineInsert[] = [];

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