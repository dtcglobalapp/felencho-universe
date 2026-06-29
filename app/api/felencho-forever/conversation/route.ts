import { NextResponse } from "next/server";
import { askFelenchoBrain, BrainCharacterKey } from "@/lib/felenchoBrainEngine";

export const runtime = "nodejs";

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

const VOICES: Record<string, string> = {
  bob: "8mBRP99B2Ng2QwsJMFQl",
  lina: "imFXYz8XIletRKLZZQaA",
  felencho_virtual: "nJdcnZj8qIND9vBbqVQG",
};

const CHARACTER_NAMES: Record<string, string> = {
  bob: "Bob",
  lina: "Lina",
  felencho_virtual: "Felencho Virtual",
};

async function generateSpeech(text: string, voiceId: string) {
  if (!ELEVENLABS_API_KEY) {
    throw new Error("Missing ELEVENLABS_API_KEY.");
  }

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.55,
          similarity_boost: 0.8,
          style: 0.25,
          use_speaker_boost: true,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ElevenLabs error: ${errorText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer).toString("base64");
}

function isValidCharacterKey(value: string): value is BrainCharacterKey {
  return (
    value === "bob" ||
    value === "lina" ||
    value === "felencho_virtual" ||
    value === "shared"
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const rawCharacterKey = body.character_key || "bob";
    const userMessage = body.message || body.user_message || "";

    if (!userMessage.trim()) {
      return NextResponse.json(
        { error: "Missing message." },
        { status: 400 }
      );
    }

    if (!isValidCharacterKey(rawCharacterKey)) {
      return NextResponse.json(
        { error: `Unknown character_key: ${rawCharacterKey}` },
        { status: 400 }
      );
    }

    const characterKey: BrainCharacterKey =
      rawCharacterKey === "shared" ? "bob" : rawCharacterKey;

    const voiceId = VOICES[characterKey];

    if (!voiceId) {
      return NextResponse.json(
        { error: `Missing voice for character_key: ${characterKey}` },
        { status: 400 }
      );
    }

    const characterName = CHARACTER_NAMES[characterKey] || "Bob";

    const brain = await askFelenchoBrain({
      characterKey,
      question: userMessage,
    });

    const answerText =
      brain.text || `${characterName} no pudo responder en este momento.`;

    const audioBase64 = await generateSpeech(answerText, voiceId);

    return NextResponse.json({
      data: {
        character_key: characterKey,
        character_name: characterName,
        user_message: userMessage,
        text: answerText,
        audio_base64: audioBase64,
        audio_mime: "audio/mpeg",
        voice_id: voiceId,
        brain: {
          knowledge: brain.knowledge,
          memories: brain.memories,
        },
      },
    });
  } catch (error) {
    console.error("Felencho Forever Conversation V2 error:", error);

    return NextResponse.json(
      { error: "Felencho Forever conversation failed." },
      { status: 500 }
    );
  }
}