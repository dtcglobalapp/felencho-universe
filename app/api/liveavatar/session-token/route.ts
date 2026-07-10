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

    const tokenResponse = await fetch(
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

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      return NextResponse.json(
        {
          error: "LiveAvatar rechazó la creación del token.",
          details: tokenData,
        },
        { status: tokenResponse.status }
      );
    }

    const sessionToken =
      tokenData?.data?.session_token ??
      tokenData?.session_token ??
      tokenData?.token ??
      tokenData?.access_token;

    if (!sessionToken) {
      return NextResponse.json(
        {
          error: "LiveAvatar no devolvió session_token.",
          details: tokenData,
        },
        { status: 500 }
      );
    }

    const startResponse = await fetch(
      "https://api.liveavatar.com/v1/sessions/start",
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${sessionToken}`,
        },
      }
    );

    const startData = await startResponse.json();

    if (!startResponse.ok) {
      return NextResponse.json(
        {
          error: "LiveAvatar no pudo iniciar la sesión.",
          details: startData,
        },
        { status: startResponse.status }
      );
    }

    const livekitUrl =
      startData?.data?.livekit_url ??
      startData?.livekit_url ??
      startData?.data?.livekitUrl ??
      startData?.livekitUrl;

    const livekitClientToken =
      startData?.data?.livekit_client_token ??
      startData?.livekit_client_token ??
      startData?.data?.livekitClientToken ??
      startData?.livekitClientToken;

    const sessionId =
      startData?.data?.session_id ??
      startData?.session_id ??
      tokenData?.data?.session_id ??
      tokenData?.session_id ??
      null;

    if (!livekitUrl || !livekitClientToken) {
      return NextResponse.json(
        {
          error: "La sesión inició, pero faltan las credenciales de LiveKit.",
          details: startData,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      character: "bob",
      sessionId,
      sessionToken,
      livekitUrl,
      livekitClientToken,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error desconocido.";

    return NextResponse.json(
      {
        error: "Error iniciando LiveAvatar de Bob.",
        details: message,
      },
      { status: 500 }
    );
  }
}