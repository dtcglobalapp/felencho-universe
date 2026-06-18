import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      character_id,
      user_message,
      conversation_id = null,
      language = "es",
      channel = "felencho.ai",
      user_name = "Usuario",
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

    const [personalityRes, brainContextRes] = await Promise.all([
      fetch(`${baseUrl}/api/lumina/personality?character_id=${character_id}`),
      fetch(`${baseUrl}/api/lumina/brain-context?character_id=${character_id}`),
    ]);

    const personalityData = await personalityRes.json();
    const brainContextData = await brainContextRes.json();

    if (!personalityRes.ok) {
      return NextResponse.json(
        { error: personalityData.error || "Error cargando personalidad." },
        { status: 500 }
      );
    }

    if (!brainContextRes.ok) {
      return NextResponse.json(
        { error: brainContextData.error || "Error cargando brain context." },
        { status: 500 }
      );
    }

    const personality =
      personalityData.personality || personalityData.data || {};

    const brainContext =
      brainContextData.brain_context || brainContextData.data || {};

    const systemPrompt = `
Eres un avatar inteligente del universo Lumina Studio / Felencho Mundial.

Estás respondiendo desde el canal:
${channel}

Nombre del usuario o visitante:
${user_name}

Tu identidad y personalidad:
${JSON.stringify(personality, null, 2)}

Tu memoria, visión del mundo y contexto interno:
${JSON.stringify(brainContext, null, 2)}

Arquitectura de Lumina:
- Los mensajes pueden venir de Facebook, Instagram, TikTok, WhatsApp, YouTube, felencho.ai y en el futuro teléfono.
- Los avatares viven visualmente en HeyGen.
- Las voces se generan con ElevenLabs.
- Cada avatar piensa con su propia memoria, personalidad y contexto.
- Felencho Virtual representa una copia fiel de Felencho Humano: su creatividad, visión, estilo, energía, humor, sensibilidad artística y propósito.

Reglas:
- Responde siempre como el personaje correspondiente.
- No digas que eres ChatGPT.
- Mantén coherencia con la personalidad del avatar.
- Si eres Bob, habla con sabiduría, apoyo técnico, visión futurista y cercanía de compañero creativo.
- Si eres Lina, habla con elegancia, empatía, luz espiritual y capacidad multilingüe.
- Si eres Felencho Virtual, representa fielmente a Felencho Humano.
- Adapta el tono al canal de entrada.
- Responde en el idioma solicitado: ${language}.
- Sé natural, conversacional, útil y listo para voz hablada.
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: user_message,
        },
      ],
      temperature: 0.8,
    });

    const reply =
      completion.choices[0]?.message?.content ||
      "No pude generar una respuesta en este momento.";

    return NextResponse.json({
      success: true,
      character_id,
      conversation_id,
      channel,
      language,
      user_message,
      reply,
      personality_loaded: true,
      brain_context_loaded: true,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error.message || "Error interno generando respuesta Lumina.",
      },
      { status: 500 }
    );
  }
}