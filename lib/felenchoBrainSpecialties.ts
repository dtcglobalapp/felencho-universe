/**
 * Felencho Brain: specialty source directory and factual-status contract.
 * Experimental, no production integration or network requests.
 *
 * A source directory does not imply that a claim is true or a source has been
 * read. Every new assertion must be attributed to a retrieved passage.
 */
export type SpecialtyKey =
  | "derecho" | "impuestos" | "religiones" | "medicina"
  | "economia" | "historia" | "vida_extraterrestre";

export type EvidenceStatus =
  | "hecho_documentado"
  | "consenso_cientifico"
  | "hipotesis"
  | "testimonio"
  | "creencia_religiosa"
  | "interpretacion"
  | "no_verificado"
  | "refutado";

export type SourceEntry = Readonly<{
  name: string;
  homepage: string;
  scope: string;
  note: string;
}>;

export type Specialty = Readonly<{
  key: SpecialtyKey;
  name: string;
  editorialRule: string;
  sources: readonly SourceEntry[];
}>;

export const SPECIALTIES: readonly Specialty[] = [
  {
    key: "derecho", name: "Derecho",
    editorialRule: "Comprobar jurisdicción, fecha, vigencia y texto oficial; no suplantar asesoría jurídica.",
    sources: [
      { name: "NYS Senate", homepage: "https://www.nysenate.gov/legislation/laws", scope: "Leyes estatales NY", note: "Confirmar vigencia y cambios" },
      { name: "Cornell LII", homepage: "https://www.law.cornell.edu/", scope: "Información legal EE. UU.", note: "Corroborar con textos oficiales" },
    ],
  },
  {
    key: "impuestos", name: "Impuestos",
    editorialRule: "Confirmar país, estado, año fiscal y clase de contribuyente; no sustituir al profesional fiscal.",
    sources: [
      { name: "IRS", homepage: "https://www.irs.gov/", scope: "Impuestos federales EE. UU.", note: "Verificar año de las normas" },
      { name: "NY Tax", homepage: "https://www.tax.ny.gov/", scope: "Impuestos estatales de NY", note: "No confundir reglas federales y estatales" },
    ],
  },
  {
    key: "religiones", name: "Teología y religiones comparadas",
    editorialRule: "Diferenciar doctrinas, interpretaciones académicas, testimonios espirituales y hechos comprobables; respetar creencias distintas.",
    sources: [
      { name: "Library of Congress", homepage: "https://www.loc.gov/", scope: "Fuentes primarias y archivo histórico", note: "Confirmar autoría, época y traducción" },
      { name: "Open Library", homepage: "https://openlibrary.org/", scope: "Catálogo bibliográfico de religiones y filosofía", note: "Un catálogo no verifica lo que afirma un libro" },
      { name: "Stanford Encyclopedia of Philosophy", homepage: "https://plato.stanford.edu/", scope: "Filosofía de religión, mente y metafísica", note: "Citar entrada y revisión" },
    ],
  },
  {
    key: "medicina", name: "Medicina y salud pública",
    editorialRule: "Priorizar evidencia clínica de calidad, fechas y límites; no diagnosticar ni prescribir.",
    sources: [
      { name: "PubMed", homepage: "https://pubmed.ncbi.nlm.nih.gov/", scope: "Artículos biomédicos", note: "Estudios aislados no equivalen a consenso" },
      { name: "CDC", homepage: "https://www.cdc.gov/", scope: "Guías de salud pública", note: "Confirmar versión vigente" },
    ],
  },
  {
    key: "economia", name: "Economía",
    editorialRule: "Citar unidad, metodología, periodo y revisiones; separar datos observados de pronósticos.",
    sources: [
      { name: "BLS", homepage: "https://www.bls.gov/", scope: "Empleo e inflación EE. UU.", note: "Distinguir fecha de publicación y referencia" },
      { name: "FRED", homepage: "https://fred.stlouisfed.org/", scope: "Series macroeconómicas", note: "Comprobar origen y revisión" },
    ],
  },
  {
    key: "historia", name: "Historia y archivos",
    editorialRule: "Separar fuente primaria, análisis historiográfico y afirmaciones sin respaldo.",
    sources: [
      { name: "National Archives", homepage: "https://www.archives.gov/", scope: "Documentos históricos", note: "Citar referencia y fecha del documento" },
      { name: "Library of Congress", homepage: "https://www.loc.gov/", scope: "Colecciones históricas", note: "Corroborar procedencia" },
    ],
  },
  {
    key: "vida_extraterrestre", name: "Astrobiología, UAP y vida extraterrestre",
    editorialRule: "Distinguir posibilidad de vida extraterrestre, búsquedas científicas, fenómenos no identificados y afirmaciones de visitas alienígenas. No confundir 'sin explicación' con 'prueba de origen extraterrestre'.",
    sources: [
      { name: "NASA Astrobiology", homepage: "https://astrobiology.nasa.gov/", scope: "Investigación sobre habitabilidad y vida", note: "La búsqueda científica no confirma detección de extraterrestres" },
      { name: "NASA UAP", homepage: "https://science.nasa.gov/uap/", scope: "Investigación de fenómenos anómalos", note: "No inferir origen extraterrestre sin evidencia" },
      { name: "AARO", homepage: "https://www.aaro.mil/", scope: "Informes oficiales de UAP", note: "Distinguir observaciones, conclusiones y limitaciones" },
      { name: "SETI Institute", homepage: "https://www.seti.org/", scope: "Búsqueda científica de señales", note: "Hipótesis y hallazgos requieren validación" },
    ],
  },
] as const;

const statusLabels: Record<EvidenceStatus, string> = {
  hecho_documentado: "Hecho documentado",
  consenso_cientifico: "Consenso científico",
  hipotesis: "Hipótesis",
  testimonio: "Testimonio",
  creencia_religiosa: "Creencia religiosa",
  interpretacion: "Interpretación",
  no_verificado: "No verificado",
  refutado: "Refutado",
};

export function planSpecialtyResearch(input: {
  question: string;
  specialty: SpecialtyKey;
}) {
  const spec = SPECIALTIES.find((s) => s.key === input.specialty);
  if (!spec || typeof input.question !== "string" || !input.question.trim() || input.question.length > 500)
    throw new Error("invalid_specialty_request");
  return {
    specialty: spec.key,
    question: input.question.trim(),
    editorialRule: spec.editorialRule,
    candidateSources: spec.sources.map((s) => ({ ...s })),
    evidenceRetrieved: false,
    citedPassages: [] as string[],
    answerStatus: "no_verificado" as EvidenceStatus,
    statusLabels,
    nextStep: "retrieve_current_sources_with_authorized_connector_then_check_claims",
  };
}

/** Never output a sourced factual claim without a retrieved passage and URL. */
export function canCiteVerifiedPassage(input: {
  sourceUrl: string; passage: string; retrievalTimestamp: string;
  corroborated: boolean;
}): boolean {
  if (!input.corroborated || !input.passage.trim()) return false;
  if (!/^https:\/\/[^\s/]+/.test(input.sourceUrl)) return false;
  return !Number.isNaN(Date.parse(input.retrievalTimestamp));
}
