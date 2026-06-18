import { NextResponse } from "next/server";

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY!;

const VOICE_IDS: Record<string, string> = {
  bob: "8mBRP99B2Ng2QwsJMFQl",
  lina: "imFXYz8XIletRKLZZQaA",
  felencho: "nJdcnZj8qIND9vBbqVQG",
  "felencho virtual": "nJdcnZj8qIND9vBbqVQG",
};

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      character = "bob",
      text,
      model_id = "eleven_multilingual_v2",
    } = body;

    if (!text) {
      return NextResponse.json(
        { error: "El campo text es requerido." },
        { status: 400 }
      );
    }

    const voiceId =
      VOICE_IDS[String(character).toLowerCase()] || VOICE_IDS.bob;

    const elevenRes = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          model_id,
          voice_settings: {
            stability: 0.45,
            similarity_boost: 0.85,
            style: 0.35,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!elevenRes.ok) {
      const errorText = await elevenRes.text();

      return NextResponse.json(
        {
          error: "Error generando audio con ElevenLabs.",
          details: errorText,
        },
        { status: elevenRes.status }
      );
    }

    const audioBuffer = await elevenRes.arrayBuffer();

    return new Response(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Disposition": 'inline; filename="lumina-voice.mp3"',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error.message || "Error interno generando voz Lumina.",
      },
      { status: 500 }
    );
  }
}