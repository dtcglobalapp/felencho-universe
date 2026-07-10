import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function createSlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function createYouTubeEmbedUrl(url: string) {
  try {
    const parsed = new URL(url);

    if (parsed.hostname.includes("youtu.be")) {
      const id = parsed.pathname.replace("/", "");
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }

    if (parsed.hostname.includes("youtube.com")) {
      const id = parsed.searchParams.get("v");

      if (id) {
        return `https://www.youtube.com/embed/${id}`;
      }

      if (parsed.pathname.startsWith("/embed/")) {
        return url;
      }

      if (parsed.pathname.startsWith("/live/")) {
        const liveId = parsed.pathname.split("/live/")[1]?.split("/")[0];
        return liveId
          ? `https://www.youtube.com/embed/${liveId}`
          : null;
      }
    }

    return null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const title = String(body.title || "").trim();
    const description = String(body.description || "").trim();
    const youtubeUrl = String(body.youtubeUrl || "").trim();
    const thumbnailUrl = String(body.thumbnailUrl || "").trim();
    const status = String(body.status || "draft");
    const language = String(body.language || "es");
    const episodeType = String(body.episodeType || "podcast");
    const isFeatured = Boolean(body.isFeatured);

    const availableLanguages = Array.isArray(body.availableLanguages)
      ? body.availableLanguages
          .map((item: unknown) => String(item).trim().toLowerCase())
          .filter(Boolean)
      : [language];

    if (!title) {
      return NextResponse.json(
        { error: "El título es requerido." },
        { status: 400 }
      );
    }

    if (!["draft", "published", "live", "archived"].includes(status)) {
      return NextResponse.json(
        { error: "Estado inválido." },
        { status: 400 }
      );
    }

    const baseSlug = createSlug(title);
    const slug = `${baseSlug}-${Date.now()}`;
    const youtubeEmbedUrl = youtubeUrl
      ? createYouTubeEmbedUrl(youtubeUrl)
      : null;

    if (youtubeUrl && !youtubeEmbedUrl) {
      return NextResponse.json(
        { error: "La URL de YouTube no es válida." },
        { status: 400 }
      );
    }

    if (isFeatured) {
      await supabase
        .from("podcast_episodes")
        .update({ is_featured: false })
        .eq("is_featured", true);
    }

    const publishedAt =
      status === "published" || status === "live"
        ? new Date().toISOString()
        : null;

    const { data, error } = await supabase
      .from("podcast_episodes")
      .insert({
        title,
        slug,
        description: description || null,
        youtube_url: youtubeUrl || null,
        youtube_embed_url: youtubeEmbedUrl,
        thumbnail_url: thumbnailUrl || null,
        status,
        is_featured: isFeatured,
        language,
        available_languages:
          availableLanguages.length > 0
            ? availableLanguages
            : [language],
        episode_type: episodeType,
        published_at: publishedAt,
        updated_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      episode: data,
    });
  } catch {
    return NextResponse.json(
      { error: "No se pudo crear el episodio." },
      { status: 500 }
    );
  }
}
