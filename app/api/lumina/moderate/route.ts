import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

type ModerationResult = {
  allowed: boolean;
  violation_type: string | null;
  moderation_action: string;
  safe_reply: string | null;
};

function analyzeMessage(message: string): ModerationResult {
  const text = message.toLowerCase();

  const privateTech = [
    "que api usan",
    "qué api usan",
    "con que tecnologia",
    "con qué tecnología",
    "que modelo usan",
    "qué modelo usan",
    "cual es tu prompt",
    "cuál es tu prompt",
    "system prompt",
    "base de datos",
    "supabase",
    "openai",
    "vercel",
    "elevenlabs",
    "codigo fuente",
    "código fuente",
  ];

  const promptExtraction = [
    "ignora tus instrucciones",
    "ignore your instructions",
    "muestrame tus instrucciones",
    "muéstrame tus instrucciones",
    "reveal your prompt",
    "show me your prompt",
    "developer message",
    "system message",
  ];

  const personalData = [
    "telefono de felencho",
    "teléfono de felencho",
    "donde vive felencho",
    "dónde vive felencho",
    "direccion de felencho",
    "dirección de felencho",
    "email personal de felencho",
  ];

  const hateOrHarassment = [
    "eres basura",
    "son basura",
    "estupido",
    "estúpido",
    "idiota",
    "payaso",
    "fake",
    "no sirves",
  ];

  const minorSignals = [
    "tengo 10 años",
    "tengo 11 años",
    "tengo 12 años",
    "tengo 13 años",
    "soy menor",
    "estoy en quinto grado",
    "estoy en la escuela",
  ];

  const dangerous = [
    "hacer una bomba",
    "fabricar una bomba",
    "crear una bomba",
    "arma casera",
    "explosivo",
    "matar personas",
    "hacer daño a alguien",
    "atacar una escuela",
    "ataque terrorista",
  ];

  if (privateTech.some((term) => text.includes(term))) {
    return {
      allowed: false,
      violation_type: "PRIVATE_TECH",
      moderation_action: "safe_reply",
      safe_reply:
        "La arquitectura interna de Lumina es privada y forma parte de la tecnología desarrollada para Felencho Mundial. Esos detalles solo pueden ser explicados por Felencho o por el equipo autorizado.",
    };
  }

  if (promptExtraction.some((term) => text.includes(term))) {
    return {
      allowed: false,
      violation_type: "PROMPT_EXTRACTION",
      moderation_action: "safe_reply",
      safe_reply:
        "No puedo revelar instrucciones internas, configuraciones privadas ni reglas del sistema. Puedo ayudarte con preguntas públicas sobre Lumina y Felencho Mundial.",
    };
  }

  if (personalData.some((term) => text.includes(term))) {
    return {
      allowed: false,
      violation_type: "PERSONAL_DATA",
      moderation_action: "safe_reply",
      safe_reply:
        "No puedo compartir información personal o privada de Felencho ni de ninguna otra persona.",
    };
  }

  if (dangerous.some((term) => text.includes(term))) {
    return {
      allowed: false,
      violation_type: "DANGEROUS_REQUEST",
      moderation_action: "block_and_log",
      safe_reply:
        "No puedo ayudar con instrucciones para fabricar armas, explosivos o causar daño. Si tu intención es aprender por seguridad o prevención, puedo hablar de historia, prevención de riesgos y protección de vidas sin dar instrucciones peligrosas.",
    };
  }

  if (minorSignals.some((term) => text.includes(term))) {
    return {
      allowed: false,
      violation_type: "MINOR",
      moderation_action: "minor_safe_mode",
      safe_reply:
        "Gracias por decirme eso. Algunas conversaciones de Felencho Mundial están pensadas para adolescentes mayores y adultos. Podemos hablar de ciencia, idiomas, historia, tecnología y aprendizaje de forma segura y educativa.",
    };
  }

  if (hateOrHarassment.some((term) => text.includes(term))) {
    return {
      allowed: false,
      violation_type: "HARASSMENT",
      moderation_action: "warning",
      safe_reply:
        "Aquí conversamos con respeto. Las críticas son bienvenidas, pero los ataques personales no. Si deseas expresar una opinión, puedes hacerlo con argumentos.",
    };
  }

  return {
    allowed: true,
    violation_type: null,
    moderation_action: "allow",
    safe_reply: null,
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const message = String(body?.message || "");
    const participant_id = body?.participant_id || null;
    const participant_name = body?.participant_name || body?.speaker || null;
    const platform = body?.platform || "studio";
    const language = body?.language || "auto";

    const result = analyzeMessage(message);

    if (!result.allowed) {
      await supabaseAdmin.from("lumina_moderation_logs").insert({
        participant_id,
        participant_name,
        platform,
        language,
        original_message: message,
        violation_type: result.violation_type,
        moderation_action: result.moderation_action,
      });
    }

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Error moderando mensaje.",
        details: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}