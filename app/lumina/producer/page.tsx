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

export default function LuminaProducerPage() {
  const [topic, setTopic] = useState("");
  const [duration, setDuration] = useState("30 minutos");
  const [style, setStyle] = useState("Documental cinematográfico");
  const [language, setLanguage] = useState("Español");
  const [notes, setNotes] = useState("");

  const [status, setStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);

  const [project, setProject] = useState<ScriptProject | null>(null);
  const [script, setScript] = useState<LuminaScript | null>(null);

  async function prepareScript() {
    if (!topic.trim()) {
      setStatus("Escribe primero el tema del episodio.");
      return;
    }

    try {
      setIsSaving(true);
      setStatus("Guardando idea en Lumina Producer...");
      setScript(null);

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
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Ejemplo: Alan Turing, su vida, aportes y muerte"
              className="mt-2 w-full rounded-xl border border-cyan-400/30 bg-black p-3 text-white outline-none"
            />
          </div>

          <div>
            <label className="text-sm text-gray-400">Duración</label>
            <select
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
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
              onChange={(e) => setStyle(e.target.value)}
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
              onChange={(e) => setLanguage(e.target.value)}
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
            onChange={(e) => setNotes(e.target.value)}
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