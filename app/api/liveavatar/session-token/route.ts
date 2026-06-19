import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const LIVEAVATAR_API_KEY = process.env.LIVEAVATAR_API_KEY!;

const BOB_AVATAR_ID = "8cf8a4ef-c528-473a-a66b-322c4a695b8e";
const BOB_VOICE_ID = "605d25b3-b346-415a-a7c5-dd6d7ba75049";
const BOB_CONTEXT_ID = "92d107f5-9412-4cec-9f3c-a1873c542992";
const LUMINA_LLM_CONFIGURATION_ID = "894f9688-e7fb-4e2f-8e5f-390be37199b3";

export async function POST() {
  try {
    if (!LIVEAVATAR_API_KEY) {
      return NextResponse.json(
        { error: "LIVEAVATAR_API_KEY no está configurada." },
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
        avatar_id: BOB_AVATAR_ID,
        avatar_persona: {
          voice_id: BOB_VOICE_ID,
          context_id: BOB_CONTEXT_ID,
          language: "es",
        },
        mode: "FULL",
        is_sandbox: false,
        video_settings: {
          quality: "high",
          encoding: "H264",
        },
        interactivity_type: "CONVERSATIONAL",
        llm_configuration_id: LUMINA_LLM_CONFIGURATION_ID,
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
          "Error creando session token de LiveAvatar.",
      },
      { status: 500 }
    );
  }
}