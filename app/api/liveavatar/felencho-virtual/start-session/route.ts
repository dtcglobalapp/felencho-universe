import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const LIVEAVATAR_API_KEY = process.env.LIVEAVATAR_API_KEY!;

const FELENCHO_AVATAR_ID = "5593a161-df04-4366-b1a9-a42fe600f239";
const FELENCHO_VOICE_ID = "fbfffd18-0ad9-47e1-accb-e335d8bf320a";
const FELENCHO_CONTEXT_ID = "88ffc16d-a14c-4c31-a48c-86bef34967ff";

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
        }),
      }
    );

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      return NextResponse.json(tokenData, { status: tokenResponse.status });
    }

    const sessionToken =
      tokenData.session_token || tokenData.token || tokenData.access_token;

    if (!sessionToken) {
      return NextResponse.json(
        {
          error: "LiveAvatar no devolvió session_token.",
          raw: tokenData,
        },
        { status: 500 }
      );
    }

    const startResponse = await fetch(
      "https://api.liveavatar.com/v1/sessions/start",
      {
        method: "POST",
        headers: {
          accept: "application/json",
          authorization: `Bearer ${sessionToken}`,
        },
      }
    );

    const startData = await startResponse.json();

    if (!startResponse.ok) {
      return NextResponse.json(startData, { status: startResponse.status });
    }

    const livekitUrl = startData.livekit_url;
    const livekitClientToken = startData.livekit_client_token;

    const meetUrl =
      livekitUrl && livekitClientToken
        ? `https://meet.livekit.io/custom?liveKitUrl=${encodeURIComponent(
            livekitUrl
          )}&token=${encodeURIComponent(livekitClientToken)}`
        : null;

    return NextResponse.json({
      success: true,
      session_token: sessionToken,
      token_data: tokenData,
      start_data: startData,
      meet_url: meetUrl,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error:
          error?.message || "Error iniciando Felencho Virtual LiveAvatar.",
      },
      { status: 500 }
    );
  }
}