import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = "force-dynamic";

export async function GET() {
  const { data, error } = await supabase
    .from("lumina_messages")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      conversation_id,
      participant_id,
      speaker,
      target,
      message,
      message_type,
      platform,
      language,
    } = body;

    const detectedLanguage =
      language && language !== "auto"
        ? language
        : detectLanguage(message || "");

    const { data, error } = await supabase
      .from("lumina_messages")
      .insert({
        conversation_id: conversation_id || "lumina-studio-v1",
        participant_id: participant_id || null,
        speaker,
        target: target || null,
        message,
        message_type: message_type || "dialogue",
        platform: platform || "studio",
        language: detectedLanguage,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error?.message || "Error guardando mensaje.",
      },
      { status: 500 }
    );
  }
}

function detectLanguage(text: string): string {
  const t = text.toLowerCase();

  if (
    /[ぁ-んァ-ン一-龯]/.test(text)
  ) {
    return "ja";
  }

  if (
    t.includes("hello") ||
    t.includes("how are you") ||
    t.includes("good morning")
  ) {
    return "en";
  }

  if (
    t.includes("bonjour") ||
    t.includes("comment") ||
    t.includes("merci")
  ) {
    return "fr";
  }

  if (
    t.includes("olá") ||
    t.includes("obrigado") ||
    t.includes("você")
  ) {
    return "pt";
  }

  return "es";
}