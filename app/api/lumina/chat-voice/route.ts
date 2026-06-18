import { NextResponse } from "next/server";

const VOICE_IDS: Record<string, string> = {
  bob: "8mBRP99B2Ng2QwsJMFQl",
  lina: "imFXYz8XIletRKLZZQaA",
  felencho: "nJdcnZj8qIND9vBbqVQG",
  "felencho virtual": "nJdcnZj8qIND9vBbqVQG",
};

function getCharacterKey(characterName: string) {
  return characterName.toLowerCase().trim();
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      character_id,
      user_message,
      conversation_id = "lumina-studio-v1",
      language = "es",
      channel = "felencho.ai",
      user_name = "Felencho",
    } = body;

    if (!character_id || !user_message) {
      return NextResponse.json(
        { error: "character_id y user_message son requeridos." },
        { status: 400 }
      );
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000");

    const chatRes = await fetch(`${baseUrl}/api/lumina/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        character_id,
        user_message,
        conversation_id,
        language,
        channel,
        user_name,
      }),
    });

    const chatData = await chatRes.json();

    if (!chatRes.ok || !chatData.reply) {
      return NextResponse.json(
        {
          error: chatData.error || "Error generando respuesta Lumina.",
          details: chatData,
        },
        { status: chatRes.status || 500 }
      );
    }

    const characterName = chatData.character_name || "bob";
    const characterKey = getCharacterKey(characterName);
    const voiceId = VOICE_IDS[characterKey] || VOICE_IDS.bob;

    const elevenRes = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": process.env.ELEVENLABS_API_KEY!,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: chatData.reply,
          model_id: "eleven_multilingual_v2",
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
          chat: chatData,
        },
        { status: elevenRes.status }
      );
    }

    const audioArrayBuffer = await elevenRes.arrayBuffer();
    const audioBase64 = Buffer.from(audioArrayBuffer).toString("base64");

    return NextResponse.json({
      success: true,
      character_id,
      character_name: characterName,
      conversation_id: chatData.conversation_id,
      channel,
      language,
      user_name,
      user_message,
      reply: chatData.reply,
      voice_id: voiceId,
      audio_mime_type: "audio/mpeg",
      audio_base64: audioBase64,
      chat: {
        personality_loaded: chatData.personality_loaded,
        brain_context_loaded: chatData.brain_context_loaded,
        memory_loaded: chatData.memory_loaded,
        memory_saved: chatData.memory_saved,
        profile_memory_loaded: chatData.profile_memory_loaded,
        relevant_profiles_used: chatData.relevant_profiles_used,
        profile_memories_used: chatData.profile_memories_used,
        profile_relationships_used: chatData.profile_relationships_used,
        history_messages_used: chatData.history_messages_used,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error.message || "Error interno generando chat con voz Lumina.",
      },
      { status: 500 }
    );
  }
}