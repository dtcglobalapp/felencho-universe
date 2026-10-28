import {
  StudioRunSheet,
  getCurrentSegment,
  getNextSegment,
} from "./StudioRunSheet";

export type PresenterVoiceCue = {
  character: "bob" | "lina";
  action: "wake" | "sleep";
  phrase: string;
};

const presenterVoiceCues: Record<string, PresenterVoiceCue[]> = {
  host_welcome: [{ character: "bob", action: "wake", phrase: "Bob, vamos contigo" }],
  panel_1: [
    { character: "bob", action: "wake", phrase: "Bob, vamos contigo" },
    { character: "bob", action: "sleep", phrase: "Gracias, Bob. Seguimos" },
    { character: "lina", action: "wake", phrase: "Lina, te escuchamos" },
    { character: "lina", action: "sleep", phrase: "Gracias, Lina. Continuamos" },
  ],
  return_from_break_1: [
    { character: "lina", action: "wake", phrase: "Lina, te escuchamos" },
    { character: "lina", action: "sleep", phrase: "Gracias, Lina. Continuamos" },
  ],
  closing: [
    { character: "bob", action: "wake", phrase: "Bob, vamos contigo" },
    { character: "bob", action: "sleep", phrase: "Gracias, Bob. Seguimos" },
    { character: "lina", action: "wake", phrase: "Lina, te escuchamos" },
    { character: "lina", action: "sleep", phrase: "Gracias, Lina. Continuamos" },
  ],
};

export type TeleprompterScreen = {
  voiceCues: PresenterVoiceCue[];
  title: string;
  goal: string;
  currentSegment: string;
  nextSegment: string;
  remainingSeconds: number;

  bigCue: string;
  smallCue: string;

  moderatorHint: string;

  countdownColor: "green" | "yellow" | "red";
};

export function buildTeleprompterScreen(
  runSheet: StudioRunSheet,
  elapsedSeconds = 0
): TeleprompterScreen {

  const current = getCurrentSegment(runSheet);

  const next = getNextSegment(runSheet);

  const remaining = Math.max(
    current.durationSeconds - elapsedSeconds,
    0
  );

  let countdownColor: "green" | "yellow" | "red" = "green";

  if (remaining <= 15) countdownColor = "red";
  else if (remaining <= 45) countdownColor = "yellow";

  return {

    title: runSheet.title,
    voiceCues: presenterVoiceCues[current.id] ?? [],

    goal: current.goal,

    currentSegment: current.title,

    nextSegment: next?.title ?? "Fin del Programa",

    remainingSeconds: remaining,

    bigCue: current.hostCue ?? "",

    smallCue:
      next
        ? `Próximo bloque: ${next.title}`
        : "Gracias por acompañarnos.",

    moderatorHint:
      current.moderatorCue ?? "",

    countdownColor,
  };
}

export function shouldWrapUp(
  runSheet: StudioRunSheet,
  elapsedSeconds: number
) {

  const current = getCurrentSegment(runSheet);

  return elapsedSeconds >= current.durationSeconds - 15;

}

export function shouldInterruptSpeaker(
  elapsedSpeakerSeconds: number,
  maxSeconds = 45
) {

  return elapsedSpeakerSeconds >= maxSeconds;

}

export function nextSpeakerHint(
  currentSpeaker: string,
  nextSpeaker: string
) {

  return {

    currentSpeaker,

    nextSpeaker,

    message:
      `${currentSpeaker} debe cerrar elegantemente y entregar la palabra a ${nextSpeaker}.`

  };

}