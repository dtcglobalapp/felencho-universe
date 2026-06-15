import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

type ReputationAction =
  | "positive"
  | "neutral"
  | "warning"
  | "minor_violation"
  | "major_violation"
  | "ban";

function scoreDelta(action: ReputationAction) {
  switch (action) {
    case "positive":
      return 2;
    case "neutral":
      return 0;
    case "warning":
      return -5;
    case "minor_violation":
      return -10;
    case "major_violation":
      return -25;
    case "ban":
      return -100;
    default:
      return 0;
  }
}

function levelFromScore(score: number) {
  if (score >= 95) return 0;
  if (score >= 80) return 1;
  if (score >= 50) return 2;
  if (score >= 20) return 3;
  return 4;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const participantId = searchParams.get("participant_id");

    let query = supabaseAdmin
      .from("lumina_reputation")
      .select("*")
      .order("updated_at", { ascending: false });

    if (participantId) {
      query = query.eq("participant_id", participantId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({
      success: true,
      reputation: data || [],
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Error cargando reputación.",
        details: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const participant_id = body?.participant_id || null;
    const participant_name = body?.participant_name || body?.speaker || "Unknown";
    const platform = body?.platform || "studio";
    const action: ReputationAction = body?.action || "neutral";
    const ban_reason = body?.ban_reason || null;

    if (!participant_id) {
      return NextResponse.json(
        { error: "participant_id es obligatorio para reputación." },
        { status: 400 }
      );
    }

    const delta = scoreDelta(action);

    const { data: existing, error: existingError } = await supabaseAdmin
      .from("lumina_reputation")
      .select("*")
      .eq("participant_id", participant_id)
      .maybeSingle();

    if (existingError) throw existingError;

    if (!existing) {
      const startingScore = Math.max(0, Math.min(100, 100 + delta));
      const moderationLevel = levelFromScore(startingScore);

      const { data, error } = await supabaseAdmin
        .from("lumina_reputation")
        .insert({
          participant_id,
          participant_name,
          platform,
          reputation_score: startingScore,
          warnings_count:
            action === "warning" ||
            action === "minor_violation" ||
            action === "major_violation"
              ? 1
              : 0,
          positive_actions: action === "positive" ? 1 : 0,
          negative_actions: delta < 0 ? 1 : 0,
          moderation_level: moderationLevel,
          is_muted: moderationLevel >= 3,
          is_banned: action === "ban" || moderationLevel >= 4,
          ban_reason,
          banned_at:
            action === "ban" || moderationLevel >= 4
              ? new Date().toISOString()
              : null,
          updated_at: new Date().toISOString(),
        })
        .select("*")
        .single();

      if (error) throw error;

      return NextResponse.json({
        success: true,
        reputation: data,
        created: true,
      });
    }

    const newScore = Math.max(
      0,
      Math.min(100, Number(existing.reputation_score || 100) + delta)
    );

    const moderationLevel = levelFromScore(newScore);

    const warningsCount =
      Number(existing.warnings_count || 0) +
      (action === "warning" ||
      action === "minor_violation" ||
      action === "major_violation"
        ? 1
        : 0);

    const positiveActions =
      Number(existing.positive_actions || 0) + (action === "positive" ? 1 : 0);

    const negativeActions =
      Number(existing.negative_actions || 0) + (delta < 0 ? 1 : 0);

    const shouldBan = action === "ban" || moderationLevel >= 4;

    const { data, error } = await supabaseAdmin
      .from("lumina_reputation")
      .update({
        participant_name,
        platform,
        reputation_score: newScore,
        warnings_count: warningsCount,
        positive_actions: positiveActions,
        negative_actions: negativeActions,
        moderation_level: moderationLevel,
        is_muted: moderationLevel >= 3,
        is_banned: shouldBan,
        ban_reason: shouldBan ? ban_reason || existing.ban_reason : null,
        banned_at: shouldBan
          ? existing.banned_at || new Date().toISOString()
          : null,
        updated_at: new Date().toISOString(),
      })
      .eq("participant_id", participant_id)
      .select("*")
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      reputation: data,
      created: false,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Error actualizando reputación.",
        details: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}