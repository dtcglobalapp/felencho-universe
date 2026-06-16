import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type Scene = {
  id: string;
  scene_order: number;
  scene_title: string;
  scene_content: string | null;
  scene_description: string | null;
};

function createLinesForScene(scene: Scene) {
  const title = scene.scene_title || "Escena";
  const content =
    scene.scene_description || scene.scene_content || "Contenido de escena.";

  return [
    {
      speaker: "Bob",
      dialogue: `Bienvenidos a esta parte del episodio. En esta escena titulada "${title}", vamos a comprender el contexto principal: ${content}`,
      emotion: "analítico y narrativo",
    },
    {
      speaker: "Lina",
      dialogue: `Más allá de los datos, esta escena nos invita a mirar el lado humano de la historia. Cada descubrimiento, cada lucha y cada decisión tienen una huella emocional.`,
      emotion: "reflexiva y humana",
    },
    {
      speaker: "Felencho Virtual",
      dialogue: `Y aquí conectamos esta historia con nuestro presente. Lo que ocurrió en esta etapa todavía resuena en la tecnología, la cultura y la forma en que entendemos el futuro.`,
      emotion: "inspirador y futurista",
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

    const linesToInsert = scenes.flatMap((scene: Scene) => {
      const generatedLines = createLinesForScene(scene);

      return generatedLines.map((line, index) => ({
        scene_id: scene.id,
        speaker: line.speaker,
        line_order: scene.scene_order * 10 + index + 1,
        dialogue: line.dialogue,
        emotion: line.emotion,
        is_active: true,
      }));
    });

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