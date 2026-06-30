import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const LIVEAVATAR_API_KEY = process.env.LIVEAVATAR_API_KEY!;

const FELENCHO_AVATAR_ID = "5593a161-df04-4366-b1a9-a42fe600f239";
const FELENCHO_VOICE_ID = "nJdcnZj8qIND9vBbqVQG";

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
        avatar_id: FELENCHO_AVATAR_ID,
        avatar_persona: {
          voice_id: FELENCHO_VOICE_ID,
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