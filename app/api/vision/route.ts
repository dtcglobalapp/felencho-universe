import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const imageBase64 = body.imageBase64;
    const prompt =
      body.prompt ||
      "Describe con detalle lo que ves en esta imagen para que Bob, Lina y Felencho Virtual puedan entender la escena del estudio.";

    if (!imageBase64) {
      return NextResponse.json(
        { error: "Missing imageBase64." },
        { status: 400 }
      );
    }

    const cleanBase64 = imageBase64.includes(",")
      ? imageBase64.split(",")[1]
      : imageBase64;

    // Instantiate only on a real vision request, never while building routes.
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Felencho Vision no está configurado." },
        { status: 503 }
      );
    }
    const openai = new OpenAI({ apiKey });

    const response = await openai.responses.create({
      model: "gpt-5.5",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: prompt,
            },
            {
              type: "input_image",
              image_url: `data:image/jpeg;base64,${cleanBase64}`,
              detail: "high",
            },
          ],
        },
      ],
    });

    return NextResponse.json({
      description: response.output_text,
    });
  } catch (error) {
    console.error("Vision API error:", error);

    return NextResponse.json(
      {
        error: "Vision analysis failed.",
      },
      { status: 500 }
    );
  }
}