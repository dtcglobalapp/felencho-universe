"use client";

import { useState } from "react";
import Link from "next/link";
import ProducerPanel from "../ProducerPanel";

type ScriptProject = {
  id: string;
  title: string;
  topic: string;
  duration: string | null;
  style: string | null;
  language: string | null;
  producer_notes: string | null;
  status: string | null;
  created_at: string;
};

type LuminaScript = {
  id: string;
  project_id: string | null;
  title: string;
  description: string | null;
  director: string | null;
  status: string | null;
  is_active: boolean | null;
  topic: string | null;
  script_type: string | null;
  language: string | null;
  duration_minutes: number | null;
  created_at: string;
  updated_at: string | null;
};

type LuminaScene = {
  id: string;
  script_id: string;
  project_id: string | null;
  scene_order: number;
  scene_title: string;
  scene_content: string | null;
  scene_description: string | null;
  is_active: boolean | null;
  created_at: string;
};

type LuminaLine = {
  id: string;
  scene_id: string;
  speaker: string;
  line_order: number;
  dialogue: string;
  emotion: string | null;
  is_active: boolean | null;
  created_at: string;
};

export default function LuminaProducerPage() {
  const [topic, setTopic] = useState("");
  const [duration, setDuration] = useState("30 minutos");
  const [style, setStyle] = useState("Documental cinematográfico");
  const [language, setLanguage] = useState("Español");
  const [notes, setNotes] = useState("");

  const [status, setStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [isGeneratingScenes, setIsGeneratingScenes] = useState(false);
  const [isGeneratingLines, setIsGeneratingLines] = useState(false);

  const [project, setProject] = useState<ScriptProject | null>(null);
  const [script, setScript] = useState<LuminaScript | null>(null);
  const [scenes, setScenes] = useState<LuminaScene[]>([]);
  const [lines, setLines] = useState<LuminaLine[]>([]);

  async function prepareScript() {
    if (!topic.trim()) {
      setStatus("Escribe primero el tema del episodio.");
      return;
    }

    try {
      setIsSaving(true);
      setStatus("Guardando idea en Lumina Producer...");
      setProject(null);
      setScript(null);
      setScenes([]);
      setLines([]);

      const response = await fetch("/api/lumina/script-projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: topic.trim(),
          topic: topic.trim(),
          duration,
          style,
          language,
          producer_notes: notes.trim(),
          status: "draft",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setStatus(data.error || "Error guardando la idea.");
        return;
      }

      setProject(data.project);

      setStatus(
        `Proyecto creado correctamente en Lumina Producer.\n\nID del proyecto:\n${data.project.id}\n\nTema:\n${data.project.topic}\n\nEstado:\n${data.project.status}\n\nPróximo paso: generar guion, escenas y líneas.`
      );
    } catch (error) {
      setStatus(
        error instanceof Error
          ? `Error inesperado: ${error.message}`
          : "Error inesperado guardando la idea."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function generateScript() {
    if (!project?.id) {
      setStatus("Primero crea un proyecto.");
      return;
    }

    try {
      setIsGeneratingScript(true);
      setStatus(`Generando guion para el proyecto:\n${project.title}`);
      setScript(null);
      setScenes([]);
      setLines([]);

      const response = await fetch("/api/lumina/generate-script", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          project_id: project.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setStatus(data.error || "Error generando guion.");
        return;
      }

      setScript(data.script);

      setStatus(
        `GUION GENERADO CORRECTAMENTE\n\nProyecto:\n${data.project.title}\n\nScript ID:\n${data.script.id}\n\nTipo:\n${data.script.script_type}\n\nIdioma:\n${data.script.language}\n\nDuración:\n${data.script.duration_minutes} minutos\n\nPróximo paso: generar escenas.`
      );
    } catch (error) {
      setStatus(
        error instanceof Error
          ? `Error inesperado: ${error.message}`
          : "Error inesperado generando guion."
      );
    } finally {
      setIsGeneratingScript(false);
    }
  }

  async function generateScenes() {
    if (!script?.id) {
      setStatus("Primero genera un guion.");
      return;
    }

    try {
      setIsGeneratingScenes(true);
      setStatus(`Generando escenas para el guion:\n${script.title}`);
      setScenes([]);
      setLines([]);

      const response = await fetch("/api/lumina/generate-scenes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          script_id: script.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setStatus(data.error || "Error generando escenas.");
        return;
      }

      setScenes(data.scenes || []);

      setStatus(
        `ESCENAS GENERADAS CORRECTAMENTE\n\nGuion:\n${script.title}\n\nTotal de escenas:\n${data.count || 0}\n\nPróximo paso: generar líneas.`
      );
    } catch (error) {
      setStatus(
        error instanceof Error
          ? `Error inesperado: ${error.message}`
          : "Error inesperado generando escenas."
      );
    } finally {
      setIsGeneratingScenes(false);
    }
  }

  async function generateLines() {
    if (!script?.id) {
      setStatus("Primero genera un guion.");
      return;
    }

    if (scenes.length === 0) {
      setStatus("Primero genera escenas antes de generar líneas.");
      return;
    }

    try {
      setIsGeneratingLines(true);
      setStatus(`Generando líneas para:\n${script.title}`);
      setLines([]);

      const response = await fetch("/api/lumina/generate-lines", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          script_id: script.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setStatus(data.error || "Error generando líneas.");
        return;
      }

      setLines(data.lines || []);

      setStatus(
        `LÍNEAS GENERADAS CORRECTAMENTE\n\nEscenas procesadas:\n${data.scenes_count || 0}\n\nTotal de líneas:\n${data.lines_count || 0}\n\nLumina Producer ya tiene una estructura básica de episodio.`
      );
    } catch (error) {
      setStatus(
        error instanceof Error
          ? `Error inesperado: ${error.message}`
          : "Error inesperado generando líneas."
      );
    } finally {
      setIsGeneratingLines(false);
    }
  }

  function getLinesForScene(sceneId: string) {
    return lines
      .filter((line) => line.scene_id === sceneId)
      .sort((a, b) => a.line_order - b.line_order);
  }

  return (
    <main className="min-h-screen bg-black p-10 text-white">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-cyan-400">
            Lumina Producer
          </h1>

          <p className="mt-4 max-w-4xl text-lg text-gray-300">
            Sala de control para producir episodios inteligentes de Felencho
            Mundial con Bob, Lina y Felencho Virtual.
          </p>
        </div>

        <Link
          href="/lumina"
          className="rounded-xl border border-cyan-400/40 px-4 py-2 font-semibold text-cyan-300 hover:bg-cyan-400/10"
        >
          Volver a Lumina Studio
        </Link>
      </div>

      <section className="mt-10 rounded-2xl border border-cyan-400/30 bg-white/5 p-6 shadow-lg shadow-cyan-500/10">
        <h2 className="text-2xl font-bold text-cyan-300">
          Crear idea de episodio
        </h2>

        <p className="mt-2 text-gray-400">
          Aquí Felencho, como productor ejecutivo, define el tema, duración,
          estilo y dirección del guion.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm text-gray-400">Tema del episodio</label>
            <input
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              placeholder="Ejemplo: Alan Turing, su vida, aportes y muerte"
              className="mt-2 w-full rounded-xl border border-cyan-400/30 bg-black p-3 text-white outline-none"
            />
          </div>

          <div>
            <label className="text-sm text-gray-400">Duración</label>
            <select
              value={duration}
              onChange={(event) => setDuration(event.target.value)}
              className="mt-2 w-full rounded-xl border border-cyan-400/30 bg-black p-3 text-white outline-none"
            >
              <option>10 minutos</option>
              <option>15 minutos</option>
              <option>30 minutos</option>
              <option>45 minutos</option>
              <option>60 minutos</option>
            </select>
          </div>

          <div>
            <label className="text-sm text-gray-400">Estilo</label>
            <select
              value={style}
              onChange={(event) => setStyle(event.target.value)}
              className="mt-2 w-full rounded-xl border border-cyan-400/30 bg-black p-3 text-white outline-none"
            >
              <option>Documental cinematográfico</option>
              <option>Podcast conversacional</option>
              <option>Historia dramatizada</option>
              <option>Educativo inspirador</option>
              <option>Debate entre avatares</option>
            </select>
          </div>

          <div>
            <label className="text-sm text-gray-400">Idioma</label>
            <select
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
              className="mt-2 w-full rounded-xl border border-cyan-400/30 bg-black p-3 text-white outline-none"
            >
              <option>Español</option>
              <option>English</option>
              <option>Português</option>
              <option>Français</option>
              <option>日本語</option>
              <option>हिन्दी</option>
            </select>
          </div>
        </div>

        <div className="mt-4">
          <label className="text-sm text-gray-400">
            Pautas del productor ejecutivo
          </label>

          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Ejemplo: incluir imágenes de apoyo, reflexión final, momentos dramáticos, participación de Bob, Lina y Felencho Virtual..."
            className="mt-2 h-36 w-full rounded-xl border border-cyan-400/30 bg-black p-3 text-white outline-none"
          />
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={prepareScript}
            disabled={isSaving}
            className="rounded-xl bg-cyan-500 px-5 py-3 font-bold text-black disabled:opacity-50"
          >
            {isSaving ? "GUARDANDO..." : "PREPARAR IDEA"}
          </button>

          {project && (
            <button
              onClick={generateScript}
              disabled={isGeneratingScript}
              className="rounded-xl bg-green-600 px-5 py-3 font-bold text-white disabled:opacity-50"
            >
              {isGeneratingScript ? "GENERANDO..." : "GENERAR GUIÓN"}
            </button>
          )}

          {script && (
            <button
              onClick={generateScenes}
              disabled={isGeneratingScenes}
              className="rounded-xl bg-purple-600 px-5 py-3 font-bold text-white disabled:opacity-50"
            >
              {isGeneratingScenes ? "GENERANDO..." : "GENERAR ESCENAS"}
            </button>
          )}

          {script && scenes.length > 0 && (
            <button
              onClick={generateLines}
              disabled={isGeneratingLines}
              className="rounded-xl bg-orange-600 px-5 py-3 font-bold text-white disabled:opacity-50"
            >
              {isGeneratingLines ? "GENERANDO..." : "GENERAR LÍNEAS"}
            </button>
          )}
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-cyan-400/20 bg-black/40 p-4">
            <p className="text-sm text-gray-400">Proyecto</p>
            <p className="mt-2 text-2xl font-bold text-cyan-300">
              {project ? "1" : "0"}
            </p>
          </div>

          <div className="rounded-xl border border-green-400/20 bg-black/40 p-4">
            <p className="text-sm text-gray-400">Guion</p>
            <p className="mt-2 text-2xl font-bold text-green-300">
              {script ? "1" : "0"}
            </p>
          </div>

          <div className="rounded-xl border border-purple-400/20 bg-black/40 p-4">
            <p className="text-sm text-gray-400">Escenas</p>
            <p className="mt-2 text-2xl font-bold text-purple-300">
              {scenes.length}
            </p>
          </div>

          <div className="rounded-xl border border-orange-400/20 bg-black/40 p-4">
            <p className="text-sm text-gray-400">Líneas</p>
            <p className="mt-2 text-2xl font-bold text-orange-300">
              {lines.length}
            </p>
          </div>
        </div>

        {project && (
          <div className="mt-6 rounded-xl border border-green-400/30 bg-green-500/10 p-4">
            <h3 className="text-lg font-bold text-green-300">
              Proyecto creado
            </h3>

            <p className="mt-2 text-gray-300">
              <span className="font-semibold text-green-300">Título:</span>{" "}
              {project.title}
            </p>

            <p className="mt-1 break-all text-gray-300">
              <span className="font-semibold text-green-300">ID:</span>{" "}
              {project.id}
            </p>

            <p className="mt-1 text-gray-300">
              <span className="font-semibold text-green-300">Estado:</span>{" "}
              {project.status}
            </p>
          </div>
        )}

        {script && (
          <div className="mt-6 rounded-xl border border-cyan-400/30 bg-cyan-500/10 p-4">
            <h3 className="text-lg font-bold text-cyan-300">
              Guion creado
            </h3>

            <p className="mt-2 text-gray-300">
              <span className="font-semibold text-cyan-300">Título:</span>{" "}
              {script.title}
            </p>

            <p className="mt-1 break-all text-gray-300">
              <span className="font-semibold text-cyan-300">Script ID:</span>{" "}
              {script.id}
            </p>

            <p className="mt-1 text-gray-300">
              <span className="font-semibold text-cyan-300">Tipo:</span>{" "}
              {script.script_type}
            </p>

            <p className="mt-1 text-gray-300">
              <span className="font-semibold text-cyan-300">Idioma:</span>{" "}
              {script.language}
            </p>

            <p className="mt-1 text-gray-300">
              <span className="font-semibold text-cyan-300">Duración:</span>{" "}
              {script.duration_minutes} minutos
            </p>
          </div>
        )}

        {scenes.length > 0 && (
          <div className="mt-6 rounded-xl border border-purple-400/30 bg-purple-500/10 p-4">
            <h3 className="text-lg font-bold text-purple-300">
              Escenas generadas
            </h3>

            <div className="mt-4 space-y-4">
              {scenes.map((scene) => {
                const sceneLines = getLinesForScene(scene.id);

                return (
                  <div
                    key={scene.id}
                    className="rounded-xl border border-white/10 bg-black/40 p-4"
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="rounded-full bg-purple-600 px-3 py-1 text-sm font-bold text-white">
                        Escena {scene.scene_order}
                      </span>

                      <h4 className="text-lg font-bold text-purple-200">
                        {scene.scene_title}
                      </h4>
                    </div>

                    <p className="mt-3 whitespace-pre-wrap text-gray-300">
                      {scene.scene_description ||
                        scene.scene_content ||
                        "Sin descripción de escena."}
                    </p>

                    {sceneLines.length > 0 && (
                      <div className="mt-4 space-y-3">
                        {sceneLines.map((line) => (
                          <div
                            key={line.id}
                            className="rounded-lg border border-orange-400/20 bg-orange-500/10 p-3"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-bold text-orange-300">
                                {line.speaker}
                              </span>

                              {line.emotion && (
                                <span className="rounded-full border border-orange-400/30 px-2 py-0.5 text-xs text-orange-200">
                                  {line.emotion}
                                </span>
                              )}
                            </div>

                            <p className="mt-2 whitespace-pre-wrap text-gray-200">
                              {line.dialogue}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {lines.length > 0 && (
          <div className="mt-6 rounded-xl border border-orange-400/30 bg-orange-500/10 p-4">
            <h3 className="text-lg font-bold text-orange-300">
              Líneas generadas
            </h3>

            <p className="mt-2 text-gray-300">
              Total de líneas creadas: {lines.length}
            </p>
          </div>
        )}

        {status && (
          <pre className="mt-6 whitespace-pre-wrap rounded-xl border border-cyan-400/20 bg-black/50 p-4 text-gray-300">
            {status}
          </pre>
        )}
      </section>

      <ProducerPanel />
    </main>
  );
}