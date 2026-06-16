"use client";

import { useState } from "react";
import Link from "next/link";
import ProducerPanel from "../ProducerPanel";

export default function LuminaProducerPage() {
  const [topic, setTopic] = useState("");
  const [duration, setDuration] = useState("30 minutos");
  const [style, setStyle] = useState("Documental cinematográfico");
  const [language, setLanguage] = useState("Español");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("");

  function prepareScript() {
    if (!topic.trim()) {
      setStatus("Escribe primero el tema del episodio.");
      return;
    }

    setStatus(
      `Idea preparada para Lumina Producer:\n\nTema: ${topic}\nDuración: ${duration}\nEstilo: ${style}\nIdioma: ${language}\nNotas: ${
        notes || "Sin notas adicionales."
      }\n\nPróximo paso: conectar este formulario al generador automático de guiones.`
    );
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

        <button
          onClick={prepareScript}
          className="mt-6 rounded-xl bg-cyan-500 px-5 py-3 font-bold text-black"
        >
          PREPARAR IDEA
        </button>

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