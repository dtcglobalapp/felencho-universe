```ts
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const FELENCHO_CHARACTER_ID = "7da1296c-41ca-4729-b893-6a4f9a7b645b";

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
      "Hola Felencho.";

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
        character_id: FELENCHO_CHARACTER_ID,
        user_message: lastUserMessage,
        conversation_id: "liveavatar-felencho-v1",
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
              luminaData.error ||
              "Error conectando Felencho Virtual con Lumina.",
            type: "lumina_error",
          },
        },
        { status: 500 }
      );
    }

    const reply =
      luminaData.reply ||
      "No pude generar una respuesta en este momento.";

    return NextResponse.json({
      id: `chatcmpl-lumina-${Date.now()}`,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: body.model || "lumina-felencho-v1",
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
            "Error interno en Felencho Virtual chat completions.",
          type: "server_error",
        },
      },
      { status: 500 }
    );
  }
}
```
