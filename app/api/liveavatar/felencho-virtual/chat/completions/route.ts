import { NextResponse } from "next/server";
import { askFelenchoBrain } from "@/lib/felenchoBrainEngine";

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
      [...messages].reverse().find((msg) => msg.role === "user")?.content ||
      "Hola.";

    const brain = await askFelenchoBrain({
      characterKey: "felencho_virtual",
      question: lastUserMessage,
    });

    const reply =
      brain.text || "No pude generar una respuesta en este momento.";

    return NextResponse.json({
      id: `chatcmpl-felencho-${Date.now()}`,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: body.model || "felencho-forever-brain",
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
            "Error conectando Felencho Virtual con Felencho Forever Brain.",
          type: "server_error",
        },
      },
      { status: 500 }
    );
  }
}