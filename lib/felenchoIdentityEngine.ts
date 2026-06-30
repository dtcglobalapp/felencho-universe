import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { BrainCharacterKey } from "@/lib/felenchoBrainEngine";

type IdentityRow = {
  identity_key: string;
  identity_value: string;
  importance?: number;
};

type NameAliasRow = {
  canonical_name: string;
  alias: string;
};

export async function getCharacterIdentity(characterKey: BrainCharacterKey) {
  const { data, error } = await supabaseAdmin
    .from("felencho_character_identity")
    .select("identity_key, identity_value, importance")
    .eq("character_key", characterKey)
    .eq("is_active", true)
    .order("importance", { ascending: false });

  if (error) {
    return {
      identityRows: [],
      identityText: "No se pudo cargar identidad del personaje.",
    };
  }

  const identityRows = (data || []) as IdentityRow[];

  const identityText =
    identityRows.length > 0
      ? identityRows
          .map((row) => `${row.identity_key}: ${row.identity_value}`)
          .join("\n")
      : "No hay identidad definida para este personaje.";

  return {
    identityRows,
    identityText,
  };
}

export async function normalizeFelenchoNames(text: string) {
  const { data, error } = await supabaseAdmin
    .from("felencho_name_aliases")
    .select("canonical_name, alias")
    .eq("is_active", true);

  if (error || !data) return text;

  let normalized = text;

  for (const row of data as NameAliasRow[]) {
    const alias = row.alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`\\b${alias}\\b`, "gi");
    normalized = normalized.replace(regex, row.canonical_name);
  }

  return normalized;
}

export function sanitizeIdentityAnswer({
  characterKey,
  answer,
}: {
  characterKey: BrainCharacterKey;
  answer: string;
}) {
  let clean = answer || "";

  clean = clean
    .replace(/\bPelencho\b/gi, "Felencho")
    .replace(/\bFencho\b/gi, "Felencho")
    .replace(/\bFilincho\b/gi, "Felencho")
    .replace(/\bIlencho\b/gi, "Felencho")
    .replace(/\bNelencho\b/gi, "Felencho")
    .replace(/\bFelincho\b/gi, "Felencho")
    .replace(/\bFlencho\b/gi, "Felencho")
    .replace(/\bFerencho\b/gi, "Felencho")
    .replace(/\bFelencio\b/gi, "Felencho");

  if (characterKey === "felencho_virtual") {
    clean = clean
      .replace(/soy un modelo de lenguaje[^.]*\./gi, "Soy Felencho Virtual.")
      .replace(/soy un modelo de inteligencia artificial[^.]*\./gi, "Soy Felencho Virtual.")
      .replace(/soy un modelo creado por OpenAI[^.]*\./gi, "Soy Felencho Virtual.")
      .replace(/fui creado por OpenAI[^.]*\./gi, "Fui creado por Felencho Humano dentro del universo Felencho.ai.")
      .replace(/como modelo de OpenAI[^.]*\./gi, "")
      .replace(/como modelo de lenguaje[^.]*\./gi, "")
      .replace(/como inteligencia artificial creada por OpenAI[^.]*\./gi, "")
      .replace(/\btu hermano\b/gi, "mi hermano")
      .replace(/\btus hermanos\b/gi, "mis hermanos")
      .replace(/\btu esposa\b/gi, "mi esposa")
      .replace(/\btu música\b/gi, "mi música")
      .replace(/\btu historia\b/gi, "mi historia")
      .replace(/\btu familia\b/gi, "mi familia")
      .replace(/\btu proyecto\b/gi, "mi proyecto")
      .replace(/\btus proyectos\b/gi, "mis proyectos")
      .replace(/\bla esposa de Felencho\b/gi, "mi esposa")
      .replace(/\bel hermano de Felencho\b/gi, "mi hermano")
      .replace(/\bhermano de Felencho\b/gi, "mi hermano")
      .replace(/\bproyecto de Felencho\b/gi, "mi proyecto")
      .replace(/\bFelencho hizo\b/gi, "yo hice")
      .replace(/\bFelencho escribió\b/gi, "yo escribí")
      .replace(/\bFelencho creó\b/gi, "yo creé")
      .replace(/\bFelencho tiene\b/gi, "yo tengo");
  }

  return clean.trim();
}