import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();

    const title = String(form.get("title") || "").trim();

    if (!title) {
      return NextResponse.json(
        { error: "Título requerido." },
        { status: 400 }
      );
    }

    const description = String(form.get("description") || "");
    const youtube_url = String(form.get("youtube_url") || "");
    const thumbnail_url = String(form.get("thumbnail_url") || "");
    const status = String(form.get("status") || "draft");
    const language = String(form.get("language") || "es");
    const episode_type = String(form.get("episode_type") || "podcast");

    const is_featured = form.get("is_featured") === "on";

    const slug = slugify(title);

    const { error } = await supabase
      .from("podcast_episodes")
      .insert({
        title,
        slug,
        description,
        youtube_url,
        thumbnail_url,
        status,
        language,
        available_languages: [language],
        episode_type,
        is_featured,
        published_at:
          status === "published" || status === "live"
            ? new Date().toISOString()
            : null,
      });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.redirect(
      new URL("/studio/podcast", req.url),
      303
    );
  } catch {
    return NextResponse.json(
      { error: "Error interno." },
      { status: 500 }
    );
  }
}