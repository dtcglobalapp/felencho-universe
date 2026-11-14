// Offline, editorially curated science brief for Felencho Mundial.
// These are stable reference facts, not a live internet connection or a medical diagnosis.
// References checked 2026-11-14; do not claim that Qwen browsed them during a show.
const BRAIN_SCIENCE = [
  'BIBLIOTECA CIENTIFICA LOCAL: Cerebro humano, neurociencia e inteligencia artificial.',
  'FUENTES: NIH BRAIN Initiative — https://www.nih.gov/brain/about ; NIH Human Neuroscience — https://www.nih.gov/brain/research/human-neuroscience ; BrainFacts / Society for Neuroscience — https://www.brainfacts.org/brainfacts2/core-concepts/your-complex-brain',
  'HECHO: el cerebro humano tiene aproximadamente 86 mil millones de neuronas. La cifra es aproximada y no equivale a una cifra de parámetros de un modelo de IA.',
  'HECHO: las neuronas se comunican mediante redes y circuitos; las funciones del cerebro también involucran células gliales y diversos sistemas del organismo.',
  'HECHO: el NIH estudia la relación entre células, circuitos, percepción, pensamiento, recuerdos, conducta, lenguaje y decisiones; muchas preguntas sobre conciencia y funcionamiento cerebral siguen abiertas.',
  'COMPARACION: un modelo de lenguaje digital no es una copia funcional del cerebro biológico; las analogías son útiles pero tienen límites. Evita comparar neuronas con parámetros como si fueran idénticos.',
  'MATIZ: distintos tipos de inteligencia artificial pueden reconocer patrones, generar texto e imágenes y procesar información; no se ha establecido que tengan la experiencia subjetiva humana.',
  'MITO: no se utiliza solo el 10% del cerebro. Las redes cerebrales tienen distintas actividades según el momento, pero no existe un 90% normalmente inactivo.',
  'CRITERIO EDITORIAL: cita de palabra la fuente o di que es conocimiento de la biblioteca local; distingue hechos, hipótesis y opinión personal. No inventes experimentos ni cifras de consumo de energía, velocidad o agua. Si piden un dato reciente, pide verificarlo antes de afirmarlo.'
].join('\n');

export function loadStudioScience(question: string): string {
  const normalized=question.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  if(/\b(cerebro|cerebral|neuronas?|neurociencia|mente humana|conciencia|sinapsis|inteligencia artificial|\bia\b|brain|neural)\b/.test(normalized))return BRAIN_SCIENCE;
  return '';
}
