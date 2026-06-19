import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BOB_CHARACTER_ID = "37e736a2-38ef-4de3-8ae9-2df61c2281d2";

type OpenAIMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const messages: OpenAIMessage[] = body.messages || [];
    const lastUserMessage =
      [...messages].reverse().find((msg) => msg.role === "user")?.content ||
      "Hola Bob.";

    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000");

    const luminaResponse = await fetch(`${baseUrl}/api/lumina/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        character_id: BOB_CHARACTER_ID,
        user_message: lastUserMessage,
        conversation_id: "liveavatar-bob-v1",
        language: "es",
        channel: "liveavatar",
        user_name: "Felencho",
      }),
    });

    const luminaData = await luminaResponse.json();

    if (!luminaResponse.ok) {
      return NextResponse.json(
        {
          error: {
            message:
              luminaData.error || "Error conectando LiveAvatar con Lumina.",
            type: "lumina_error",
          },
        },
        { status: 500 }
      );
    }

    const reply =
      luminaData.reply || "No pude generar una respuesta en este momento.";

    return NextResponse.json({
      id: `chatcmpl-lumina-${Date.now()}`,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: body.model || "lumina-bob-v1",
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: reply,
          },
          finish_reason: "stop",
        },
      ],
      usage: {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: {
          message:
            error?.message ||
            "Error interno en LiveAvatar Lumina chat completions.",
          type: "server_error",
        },
      },
      { status: 500 }
    );
  }
}