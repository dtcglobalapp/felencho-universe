export function splitUserQuestions(message: string) {
  const clean = (message || "").trim();

  if (!clean) return [];

  const normalized = clean
    .replace(/\s+/g, " ")
    .replace(/¿/g, "")
    .replace(/\?/g, "?|")
    .replace(/\./g, ".|");

  const parts = normalized
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);

  const questionWords = [
    "quien",
    "quién",
    "que",
    "qué",
    "como",
    "cómo",
    "cuando",
    "cuándo",
    "donde",
    "dónde",
    "por que",
    "por qué",
    "cual",
    "cuál",
    "háblame",
    "dime",
    "explica",
  ];

  const questions = parts.filter((part) => {
    const lower = part.toLowerCase();
    return (
      part.includes("?") ||
      questionWords.some((word) => lower.startsWith(word))
    );
  });

  if (questions.length === 0) return [clean];

  return questions.slice(0, 3).map((q) => q.replace(/\?$/g, "").trim());
}

export function hasMultipleQuestions(message: string) {
  return splitUserQuestions(message).length > 1;
}