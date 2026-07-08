import {
  StudioRunSheet,
  getCurrentSegment,
  getNextSegment,
} from "./StudioRunSheet";

export type TeleprompterScreen = {
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