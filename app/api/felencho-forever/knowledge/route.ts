import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function normalizeText(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ");
}

function extractTerms(text: string) {
  return normalizeText(text)
    .split(/\s+/)
    .filter((word) => word.length >= 3)
    .slice(0, 30);
}

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("felencho_knowledge_entities")
    .select("*")
    .eq("is_active", true)
    .order("importance", { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data || [] });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body.create_entity) {
      const { data, error } = await supabaseAdmin
        .from("felencho_knowledge_entities")
        .insert({
          entity_key: body.entity_key,
          entity_type: body.entity_type || "general",
          name: body.name,
          display_name: body.display_name || body.name,
          short_description: body.short_description || null,
          full_description: body.full_description || null,
          character_key: body.character_key || "shared",
          visibility: body.visibility || "private",
          importance: body.importance || 5,
          aliases: body.aliases || [],
          tags: body.tags || [],
          source: body.source || "manual",
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ data });
    }

    const query = body.query || body.message || body.user_message || "";
    const characterKey = body.character_key || "shared";

    if (!query.trim()) {
      return NextResponse.json({ error: "Missing query." }, { status: 400 });
    }

    const terms = extractTerms(query);

    const { data, error } = await supabaseAdmin
      .from("felencho_knowledge_entities")
      .select("*")
      .eq("is_active", true)
      .order("importance", { ascending: false })
      .limit(200);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const scored = (data || [])
      .map((entity) => {
        const searchable = normalizeText(
          [
            entity.name || "",
            entity.display_name || "",
            entity.entity_key || "",
            entity.entity_type || "",
            entity.short_description || "",
            entity.full_description || "",
            ...(entity.aliases || []),
            ...(entity.tags || []),
          ].join(" ")
        );

        const matches = terms.filter((term) => searchable.includes(term));
        const score = matches.length * 10 + Number(entity.importance || 0);

        return { ...entity, matches, score };
      })
      .filter((entity) => {
        const allowed =
          entity.character_key === "shared" ||
          entity.character_key === characterKey ||
          characterKey === "shared";

        return allowed && entity.matches.length > 0;
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);

    const knowledgeText =
      scored.length > 0
        ? scored
            .map((entity, index) =>
              [
                `ENTIDAD ${index + 1}`,
                `Nombre: ${entity.display_name || entity.name}`,
                `Tipo: ${entity.entity_type}`,
                `Descripcion corta: ${entity.short_description || ""}`,
                `Descripcion completa: ${entity.full_description || ""}`,
                `Aliases: ${(entity.aliases || []).join(", ")}`,
                `Tags: ${(entity.tags || []).join(", ")}`,
                `Importancia: ${entity.importance || 0}`,
              ].join("\n")
            )
            .join("\n\n")
        : "No se encontraron entidades relacionadas en Felencho Knowledge.";

    return NextResponse.json({
      data: {
        query,
        character_key: characterKey,
        search_terms: terms,
        matched_entities: scored,
        knowledge_text: knowledgeText,
      },
    });
  } catch (error) {
    console.error("Felencho Knowledge error:", error);
    return NextResponse.json(
      { error: "Felencho Knowledge failed." },
      { status: 500 }
    );
  }
}