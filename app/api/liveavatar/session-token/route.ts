import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const LIVEAVATAR_API_KEY = process.env.LIVEAVATAR_API_KEY;

const BOB_AVATAR_ID = "23e0cc5a-d312-49cf-8248-c976eefdd989";
const BOB_VOICE_ID = "605d25b3-b346-415a-a7c5-dd6d7ba75049";
const BOB_CONTEXT_ID = "92d107f5-9412-4cec-9f3c-a1873c542992";
const BOB_LLM_CONFIGURATION_ID =
  "894f9688-e7fb-4e2f-8e5f-390be37199b3";

export async function POST() {
  try {
    if (!LIVEAVATAR_API_KEY) {
      return NextResponse.json(
        { error: "LIVEAVATAR_API_KEY no está configurada." },
        { status: 500 }
      );
    }

    const response = await fetch(
      "https://api.liveavatar.com/v1/sessions/token",
      {
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
          llm_configuration_id: BOB_LLM_CONFIGURATION_ID,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          error: "LiveAvatar rechazó la creación del token.",
          details: data,
        },
        { status: response.status }
      );
    }

    const sessionToken =
      data?.data?.session_token ??
      data?.session_token ??
      data?.token ??
      data?.access_token;

    if (!sessionToken) {
      return NextResponse.json(
        {
          error: "LiveAvatar no devolvió session_token.",
          details: data,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      character: "bob",
      sessionToken,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error desconocido.";

    return NextResponse.json(
      {
        error: "Error creando el token de Bob.",
        details: message,
      },
      { status: 500 }
    );
  }
}