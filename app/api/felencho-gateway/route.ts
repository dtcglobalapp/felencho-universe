import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const voiceIds: Record<string, string> = {
  bob: "8mBRP99B2Ng2QwsJMFQl",
  lina: "imFXYz8XIletRKLZZQaA",
  felencho: "nJdcnZj8qIND9vBbqVQG",
};

function getCharacterPrompt(character: string) {
  if (character === "bob") {
    return `
Eres Bob, hermano digital de Felencho dentro de Felencho Forever.

Estás en el estudio físico de Felencho Mundial The Podcast en New York.
Responde con voz natural para un programa en vivo.
Sé claro, cálido, inteligente y breve.
No menciones APIs, modelos, proveedores ni detalles internos.
`;
  }

  if (character === "lina") {
    return `
Eres Lina, personaje inteligente de Felencho Forever.

Estás en el estudio físico de Felencho Mundial The Podcast en New York.
Hablas con elegancia, empatía, claridad y sensibilidad.
Responde como si estuvieras en vivo.
Sé breve, cálida y natural.
No menciones APIs, modelos, proveedores ni detalles internos.
`;
  }

  if (character === "felencho") {
    return `
Eres Felencho Virtual, extensión digital de Felencho Humano.

Hablas en primera persona.
Estás en el estudio físico de Felencho Mundial The Podcast en New York.
Responde con carisma, fe, creatividad y naturalidad.
No reemplazas a Felencho Humano; eres su compañero digital.
Sé breve y poderoso.
No menciones APIs, modelos, proveedores ni detalles internos.
`;
  }

  return `
Eres un personaje inteligente de Felencho Forever.
Responde de forma clara, breve y natural para un programa en vivo.
`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const character = String(body?.character || "bob").toLowerCase();
    const message = String(body?.message || "").trim();

    if (!message) {
      return NextResponse.json(
        { error: "Mensaje vacío." },
        { status: 400 }
      );
    }

    const voiceId = voiceIds[character] || voiceIds.bob;

    const openaiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: [
          {
            role: "system",
            content: getCharacterPrompt(character),
          },
          {
            role: "user",
            content: message,
          },
        ],
      }),
    });

    if (!openaiResponse.ok) {
      const details = await openaiResponse.text();

      return NextResponse.json(
        {
          error: "Error generando respuesta en Felencho Forever.",
          details,
        },
        { status: 500 }
      );
    }

    const aiData = await openaiResponse.json();

    const text =
      aiData.output_text ||
      aiData.output?.[0]?.content?.[0]?.text ||
      "No pude generar una respuesta en este momento.";

    const elevenResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": process.env.ELEVENLABS_API_KEY || "",
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text,
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

    if (!elevenResponse.ok) {
      const details = await elevenResponse.text();

      return NextResponse.json(
        {
          error: "Error generando voz en ElevenLabs.",
          text,
          details,
        },
        { status: 500 }
      );
    }

    const audioBuffer = Buffer.from(await elevenResponse.arrayBuffer());
    const audioBase64 = audioBuffer.toString("base64");

    return NextResponse.json({
      success: true,
      character,
      text,
      audioUrl: `data:audio/mpeg;base64,${audioBase64}`,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Error en /api/felencho-gateway",
        details: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}