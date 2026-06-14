"use client";

import { useState } from "react";

export default function ScriptForm() {
  const [title, setTitle] = useState("");
  const [director, setDirector] = useState("Felencho Virtual");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("");

  async function saveScript() {
    if (!title.trim()) {
      setStatus("Escribe un título primero.");
      return;
    }

    setStatus("Guardando guion...");

    const response = await fetch("/api/lumina/scripts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title,
        director,
        description,
        status: "draft",
      }),
    });

    const text = await response.text();

    if (!response.ok) {
      setStatus(`Error ${response.status}: ${text || "Sin respuesta"}`);
      return;
    }

    setStatus("Guion guardado correctamente");
    setTitle("");
    setDescription("");
  }

  return (
    <div className="mt-10 rounded-2xl border border-cyan-400/30 p-6">
      <h2 className="text-2xl font-bold text-cyan-300">
        Nuevo Guion
      </h2>

      <input
        className="mt-4 w-full rounded border border-cyan-400/30 bg-black p-3 text-white"
        placeholder="Título del guion"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <select
        className="mt-4 w-full rounded border border-cyan-400/30 bg-black p-3 text-white"
        value={director}
        onChange={(e) => setDirector(e.target.value)}
      >
        <option>Felencho Virtual</option>
        <option>Felencho Humano</option>
        <option>Bob</option>
        <option>Lina</option>
      </select>

      <textarea
        className="mt-4 h-32 w-full rounded border border-cyan-400/30 bg-black p-3 text-white"
        placeholder="Descripción del episodio o idea principal..."
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <button
        onClick={saveScript}
        className="mt-4 rounded bg-cyan-500 px-4 py-2 font-bold text-black"
      >
        Guardar Guion
      </button>

      <p className="mt-3 whitespace-pre-wrap text-gray-400">
        {status}
      </p>
    </div>
  );
}