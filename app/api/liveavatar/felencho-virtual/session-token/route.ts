import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const LIVEAVATAR_API_KEY = process.env.LIVEAVATAR_API_KEY!;

const FELENCHO_AVATAR_ID = "5593a161-df04-4366-b1a9-a42fe600f239";
const FELENCHO_VOICE_ID = "fbfffd18-0ad9-47e1-accb-e335d8bf320a";
const FELENCHO_CONTEXT_ID = "88ffc16d-a14c-4c31-a48c-86bef34967ff";

// OJO: todavía falta crear esta LLM Configuration en LiveAvatar
// usando base_url: https://www.felencho.ai/api/liveavatar/felencho-virtual
const FELENCHO_LLM_CONFIGURATION_ID = "PENDIENTE";

export async function POST() {
  try {
    if (!LIVEAVATAR_API_KEY) {
      return NextResponse.json(
        { error: "LIVEAVATAR_API_KEY no está configurada." },
        { status: 500 }
      );
    }

    if (FELENCHO_LLM_CONFIGURATION_ID === "67110991-9d89-4664-8915-cf04a9578cec") {
      return NextResponse.json(
        {
          error:
            "Falta crear FELENCHO_LLM_CONFIGURATION_ID en LiveAvatar para Felencho Virtual.",
        },
        { status: 500 }
      );
    }

    const response = await fetch("https://api.liveavatar.com/v1/sessions/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": LIVEAVATAR_API_KEY,
      },
      body: JSON.stringify({
        avatar_id: FELENCHO_AVATAR_ID,
        avatar_persona: {
          voice_id: FELENCHO_VOICE_ID,
          context_id: FELENCHO_CONTEXT_ID,
          language: "es",
        },
        mode: "FULL",
        is_sandbox: false,
        video_settings: {
          quality: "high",
          encoding: "H264",
        },
        interactivity_type: "CONVERSATIONAL",
        llm_configuration_id: FELENCHO_LLM_CONFIGURATION_ID,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      {
        error:
          error?.message ||
          "Error creando session token de Felencho Virtual.",
      },
      { status: 500 }
    );
  }
}