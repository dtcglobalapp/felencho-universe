"use client";

import { useState } from "react";

export default function MemoryForm() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState("");

  async function saveMemory() {
    setStatus("Guardando...");

    const response = await fetch("/api/lumina/memory", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        character_name: "Felencho Humano",
        memory_type: "proyecto",
        title,
        content,
        importance: 10,
      }),
    });

    const text = await response.text();

    if (!response.ok) {
      setStatus(`Error ${response.status}: ${text || "Sin respuesta"}`);
      return;
    }

    setStatus("Memoria guardada correctamente");
    setTitle("");
    setContent("");
  }

  return (
    <div className="mt-10 rounded-2xl border border-cyan-400/30 p-6">
      <h2 className="text-2xl font-bold text-cyan-300">Nueva Memoria</h2>

      <input
        className="mt-4 w-full rounded bg-black border border-cyan-400/30 p-3"
        placeholder="Título"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <textarea
        className="mt-4 h-40 w-full rounded bg-black border border-cyan-400/30 p-3"
        placeholder="Contenido"
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />

      <button
        onClick={saveMemory}
        className="mt-4 rounded bg-cyan-500 px-4 py-2 font-bold text-black"
      >
        Guardar Memoria
      </button>

      <p className="mt-3 whitespace-pre-wrap text-gray-400">{status}</p>
    </div>
  );
}