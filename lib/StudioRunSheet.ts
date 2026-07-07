export type StudioSegmentType =
  | "intro"
  | "host_welcome"
  | "panel"
  | "audience_questions"
  | "music_break"
  | "commercial_break"
  | "return_from_break"
  | "interview"
  | "closing";

export type StudioSegment = {
  id: string;
  type: StudioSegmentType;
  title: string;
  goal: string;
  durationSeconds: number;
  hostCue?: string;
  moderatorCue?: string;
  nextSegmentId?: string;
};

export type StudioRunSheet = {
  showId: string;
  title: string;
  dateLabel: string;
  currentSegmentId: string;
  segments: StudioSegment[];
};

export const defaultFelenchoRunSheet: StudioRunSheet = {
  showId: "felencho_mundial_live_default",
  title: "Felencho Mundial The Podcast",
  dateLabel: "Live Show",
  currentSegmentId: "intro",
  segments: [
    {
      id: "intro",
      type: "intro",
      title: "Intro del programa",
      goal: "Abrir con energía, identidad visual y música de Felencho.",
      durationSeconds: 45,
      hostCue: "Prepárate para entrar después del intro.",
      moderatorCue: "Reproducir intro oficial y preparar saludo inicial.",
      nextSegmentId: "host_welcome",
    },
    {
      id: "host_welcome",
      type: "host_welcome",
      title: "Bienvenida de Felencho",
      goal: "Saludar al público y presentar el tema central.",
      durationSeconds: 120,
      hostCue: "Saluda, presenta el tema y da paso a Bob.",
      moderatorCue: "Mantener energía alta y evitar introducción demasiado larga.",
      nextSegmentId: "panel_1",
    },
    {
      id: "panel_1",
      type: "panel",
      title: "Panel Bob, Lina y Felencho Virtual",
      goal: "Debate breve con perspectivas distintas, sin repetición.",
      durationSeconds: 360,
      hostCue: "Haz una pregunta compartida: ‘Para ustedes...’",
      moderatorCue: "Bob abre, Lina complementa, Felencho Virtual cierra.",
      nextSegmentId: "music_break_1",
    },
    {
      id: "music_break_1",
      type: "music_break",
      title: "Corte musical de Felencho",
      goal: "Insertar música propia de Felencho para proteger derechos de autor.",
      durationSeconds: 120,
      hostCue: "Presenta brevemente la canción o entra desde Denon DJ.",
      moderatorCue: "Usar únicamente música de Felencho.",
      nextSegmentId: "audience_questions",
    },
    {
      id: "audience_questions",
      type: "audience_questions",
      title: "Preguntas del público",
      goal: "Responder mensajes de YouTube, WhatsApp, Facebook, Instagram o web.",
      durationSeconds: 420,
      hostCue: "Lee o permite que el moderador seleccione una pregunta.",
      moderatorCue: "Priorizar preguntas claras, humanas y relevantes.",
      nextSegmentId: "commercial_break_1",
    },
    {
      id: "commercial_break_1",
      type: "commercial_break",
      title: "Pausa comercial",
      goal: "Ir a comerciales, patrocinio, bumper o descanso corto.",
      durationSeconds: 120,
      hostCue: "Despide hacia pausa: ‘Volvemos en breve’.",
      moderatorCue: "Reproducir bumper a comerciales y regreso de pausa.",
      nextSegmentId: "return_from_break_1",
    },
    {
      id: "return_from_break_1",
      type: "return_from_break",
      title: "Regreso de pausa",
      goal: "Retomar el programa con energía y continuidad.",
      durationSeconds: 45,
      hostCue: "Regresa con una frase corta y pasa al siguiente bloque.",
      moderatorCue: "Lina puede dar bienvenida de regreso.",
      nextSegmentId: "interview_1",
    },
    {
      id: "interview_1",
      type: "interview",
      title: "Entrevista o tema central",
      goal: "Desarrollar el bloque más fuerte del programa.",
      durationSeconds: 900,
      hostCue: "Mantén ritmo, escucha, repregunta y evita extenderte demasiado.",
      moderatorCue: "Controlar turnos y preparar cortes elegantes si alguien se extiende.",
      nextSegmentId: "closing",
    },
    {
      id: "closing",
      type: "closing",
      title: "Cierre del programa",
      goal: "Cerrar con gratitud, llamada a la acción y música de Felencho.",
      durationSeconds: 180,
      hostCue: "Agradece, invita a seguir el canal y despide con identidad.",
      moderatorCue: "Bob o Lina pueden despedir y Felencho Virtual puede cerrar con frase poderosa.",
    },
  ],
};

export function getCurrentSegment(runSheet: StudioRunSheet) {
  return (
    runSheet.segments.find(
      (segment) => segment.id === runSheet.currentSegmentId
    ) || runSheet.segments[0]
  );
}

export function getNextSegment(runSheet: StudioRunSheet) {
  const current = getCurrentSegment(runSheet);

  if (!current?.nextSegmentId) return null;

  return (
    runSheet.segments.find(
      (segment) => segment.id === current.nextSegmentId
    ) || null
  );
}

export function moveToNextSegment(runSheet: StudioRunSheet): StudioRunSheet {
  const next = getNextSegment(runSheet);

  if (!next) return runSheet;

  return {
    ...runSheet,
    currentSegmentId: next.id,
  };
}

export function moveToSegment(
  runSheet: StudioRunSheet,
  segmentId: string
): StudioRunSheet {
  const exists = runSheet.segments.some((segment) => segment.id === segmentId);

  if (!exists) return runSheet;

  return {
    ...runSheet,
    currentSegmentId: segmentId,
  };
}

export function getTeleprompterCue(runSheet: StudioRunSheet) {
  const current = getCurrentSegment(runSheet);
  const next = getNextSegment(runSheet);

  return {
    currentTitle: current.title,
    currentGoal: current.goal,
    hostCue: current.hostCue || "",
    moderatorCue: current.moderatorCue || "",
    durationSeconds: current.durationSeconds,
    nextTitle: next?.title || "Fin del programa",
  };
}

export function getRunSheetSummary(runSheet: StudioRunSheet) {
  return runSheet.segments.map((segment, index) => ({
    order: index + 1,
    id: segment.id,
    type: segment.type,
    title: segment.title,
    durationSeconds: segment.durationSeconds,
  }));
}