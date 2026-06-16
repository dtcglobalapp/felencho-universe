import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type SceneTemplate = {
  title: string;
  content: string;
};

function getSceneTemplates(scriptType: string | null): SceneTemplate[] {
  if (scriptType === "podcast") {
    return [
      {
        title: "Apertura del episodio",
        content: "Presentación del tema, bienvenida y contexto inicial.",
      },
      {
        title: "Pregunta central",
        content: "Se plantea la gran pregunta que guiará la conversación.",
      },
      {
        title: "Historia y contexto",
        content: "Bob aporta datos históricos y estructura informativa.",
      },
      {
        title: "Mirada humana",
        content: "Lina analiza el impacto emocional y social del tema.",
      },
      {
        title: "Opinión de Felencho Virtual",
        content: "Felencho Virtual conecta el tema con el presente.",
      },
      {
        title: "Cierre reflexivo",
        content: "Conclusión con mensaje final para la audiencia.",
      },
    ];
  }

  if (scriptType === "avatar_debate") {
    return [
      {
        title: "Presentación del debate",
        content: "Introducción del tema y presentación de posturas.",
      },
      {
        title: "Primera postura",
        content: "Bob presenta una visión analítica e histórica.",
      },
      {
        title: "Segunda postura",
        content: "Lina presenta una visión humana, emocional y ética.",
      },
      {
        title: "Intervención de Felencho Virtual",
        content: "Felencho Virtual conecta ambas posturas con la audiencia.",
      },
      {
        title: "Conclusión del debate",
        content: "Se resumen ideas y se plantea una reflexión final.",
      },
    ];
  }

  if (scriptType === "dramatized_story") {
    return [
      {
        title: "Apertura cinematográfica",
        content: "Inicio narrativo con tono emocional y visual.",
      },
      {
        title: "Origen del personaje",
        content: "Se presenta el contexto, infancia o punto de partida.",
      },
      {
        title: "Primer conflicto",
        content: "Aparece el reto principal de la historia.",
      },
      {
        title: "Momento decisivo",
        content: "La historia alcanza su punto más intenso.",
      },
      {
        title: "Consecuencias",
        content: "Se muestran los efectos de las decisiones tomadas.",
      },
      {
        title: "Legado",
        content: "Cierre dramático con reflexión final.",
      },
    ];
  }

  return [
    {
      title: "Introducción",
      content: "Presentación cinematográfica del tema y su importancia.",
    },
    {
      title: "Origen y contexto",
      content: "Se explica el nacimiento, época o contexto histórico.",
    },
    {
      title: "Formación y primeras señales",
      content: "Se exploran los primeros talentos, ideas o conflictos.",
    },
    {
      title: "Aportes principales",
      content: "Se presentan las contribuciones más importantes.",
    },
    {
      title: "Luchas y contradicciones",
      content: "Se muestran dificultades, errores, persecuciones o conflictos.",
    },
    {
      title: "Momento decisivo",
      content: "Se narra el punto de mayor impacto en la historia.",
    },
    {
      title: "Muerte, consecuencias o cierre histórico",
      content: "Se aborda el desenlace y sus interpretaciones.",
    },
    {
      title: "Legado para la humanidad",
      content: "Reflexión final sobre el impacto del tema en el presente y futuro.",
    },
  ];
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

    const templates = getSceneTemplates(script.script_type);

    const scenesToInsert = templates.map((scene, index) => ({
      script_id: script.id,
      project_id: script.project_id || null,
      scene_order: index + 1,
      scene_title: scene.title,
      scene_content: `${scene.content}\n\nTema: ${script.topic || script.title}`,
      is_active: true,
    }));

    const { data: scenes, error: insertError } = await supabase
      .from("lumina_script_scenes")
      .insert(scenesToInsert)
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
        status: "scenes_created",
        updated_at: new Date().toISOString(),
      })
      .eq("id", script.id);

    return NextResponse.json({
      success: true,
      script,
      scenes: scenes || [],
      count: scenes?.length || 0,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unexpected error generating scenes.",
      },
      { status: 500 }
    );
  }
}