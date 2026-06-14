"use client";

import { useState } from "react";

const characters = [
  "Felencho Humano",
  "Felencho Virtual",
  "Bob",
  "Lina",
];

export default function ConversationForm() {
  const [speaker, setSpeaker] = useState("Felencho Humano");
  const [target, setTarget] = useState("Bob");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function saveConversation() {
    if (!message.trim()) {
      setStatus("Escribe un mensaje primero.");
      return;
    }

    try {
      setIsSaving(true);
      setStatus("Guardando conversación...");

      const payload = {
        conversation_id: "lumina-studio-v1",
        speaker,
        target,
        message: message.trim(),
        message_type: "dialogue",
      };

      const conversationResponse = await fetch("/api/lumina/conversations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const conversationText = await conversationResponse.text();

      if (!conversationResponse.ok) {
        setStatus(
          `Error guardando conversación ${conversationResponse.status}: ${
            conversationText || "Sin respuesta"
          }`
        );
        return;
      }

      const messageResponse = await fetch("/api/lumina/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const messageText = await messageResponse.text();

      if (!messageResponse.ok) {
        setStatus(
          `Conversación guardada, pero error guardando mensaje ${messageResponse.status}: ${
            messageText || "Sin respuesta"
          }`
        );
        return;
      }

      setStatus("Conversación guardada correctamente.");
      setMessage("");
    } catch (error) {
      setStatus(
        error instanceof Error
          ? `Error inesperado: ${error.message}`
          : "Error inesperado guardando conversación."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="mt-10 rounded-2xl border border-cyan-400/30 bg-white/5 p-6">
      <h2 className="text-2xl font-bold text-cyan-300">
        Nueva Conversación
      </h2>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <select
          className="w-full rounded border border-cyan-400/30 bg-black p-3 text-white"
          value={speaker}
          onChange={(e) => setSpeaker(e.target.value)}
        >
          {characters.map((character) => (
            <option key={character}>{character}</option>
          ))}
        </select>

        <select
          className="w-full rounded border border-cyan-400/30 bg-black p-3 text-white"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
        >
          {characters.map((character) => (
            <option key={character}>{character}</option>
          ))}
        </select>
      </div>

      <textarea
        className="mt-4 h-32 w-full rounded border border-cyan-400/30 bg-black p-3 text-white"
        placeholder="Escribe el mensaje..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />

      <button
        onClick={saveConversation}
        disabled={isSaving}
        className="mt-4 rounded bg-cyan-500 px-4 py-2 font-bold text-black disabled:opacity-50"
      >
        {isSaving ? "Guardando..." : "Guardar Conversación"}
      </button>

      <p className="mt-3 whitespace-pre-wrap text-gray-400">{status}</p>
    </div>
  );
}