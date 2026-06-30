import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type OpenAIMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const messages: OpenAIMessage[] = body.messages || [];

    const lastUserMessage =
      [...messages].reverse().find((m) => m.role === "user")?.content ??
      "Hola.";

    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000");

    const brainResponse = await fetch(
      `${baseUrl}/api/felencho-forever/conversation`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          character_key: "felencho_virtual",
          message: lastUserMessage,
        }),
      }
    );

    const brainData = await brainResponse.json();

    if (!brainResponse.ok) {
      return NextResponse.json(
        {
          error: {
            message:
              brainData.error ||
              "Error conectando con Felencho Forever.",
            type: "brain_error",
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      id: `chatcmpl-${Date.now()}`,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: "felencho-forever",

      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: brainData.data.text,
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
            "Error interno conectando LiveAvatar con Felencho Forever.",
          type: "server_error",
        },
      },
      { status: 500 }
    );
  }
}