"use client";

import { useState } from "react";

export default function MessageForm() {
  const [speaker, setSpeaker] = useState("Felencho Humano");
  const [speakerType, setSpeakerType] = useState("host");
  const [platform, setPlatform] = useState("studio");
  const [language, setLanguage] = useState("auto");
  const [target, setTarget] = useState("Bob");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  async function saveMessage() {
    if (!message.trim()) {
      setStatus("Escribe un mensaje primero.");
      return;
    }

    try {
      setSaving(true);
      setStatus("Guardando mensaje en Lumina...");

      const participantResponse = await fetch("/api/lumina/participants", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: speaker,
          platform,
          speaker_type: speakerType,
          language,
        }),
      });

      const participantData = await participantResponse.json();

      if (!participantResponse.ok) {
        setStatus(
          `Error creando participante: ${
            participantData?.error ||
            participantData?.details ||
            "Error desconocido."
          }`
        );
        return;
      }

      const response = await fetch("/api/lumina/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conversation_id: "lumina-studio-v1",
          participant_id: participantData?.participant?.id || null,
          speaker,
          target,
          message: message.trim(),
          message_type: "dialogue",
          platform,
          language,
        }),
      });

      const savedMessage = await response.json();

      if (!response.ok) {
        setStatus(
          `Error ${response.status}: ${
            savedMessage?.error ||
            savedMessage?.details ||
            "No se pudo guardar."
          }`
        );
        return;
      }

      setStatus(`Mensaje guardado. ${target} está pensando...`);

      const replyResponse = await fetch("/api/lumina/reply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message_id:
            savedMessage?.message?.id || savedMessage?.data?.id || savedMessage?.id,
          target_name: target,
        }),
      });

      const replyData = await replyResponse.json();

      if (!replyResponse.ok) {
        setStatus(
          `Mensaje guardado, pero hubo error generando respuesta: ${
            replyData?.error ||
            replyData?.details ||
            "Error desconocido."
          }`
        );
        return;
      }

      setStatus(`${target} respondió correctamente.`);
      setMessage("");

      setTimeout(() => {
        window.location.reload();
      }, 800);
    } catch (error) {
      console.error(error);
      setStatus("Error inesperado guardando mensaje o generando respuesta.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-10 rounded-2xl border border-cyan-400/30 bg-white/5 p-6">
      <h2 className="text-2xl font-bold text-cyan-300">
        Nuevo Mensaje Lumina
      </h2>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <input
          value={speaker}
          onChange={(e) => setSpeaker(e.target.value)}
          className="rounded border border-cyan-400/30 bg-black p-3 text-white"
          placeholder="Nombre del participante"
        />

        <select
          value={speakerType}
          onChange={(e) => setSpeakerType(e.target.value)}
          className="rounded border border-cyan-400/30 bg-black p-3 text-white"
        >
          <option value="host">Felencho / Host</option>
          <option value="avatar">Avatar</option>
          <option value="guest">Invitado</option>
          <option value="audience">Público</option>
          <option value="caller">Llamada</option>
        </select>

        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
          className="rounded border border-cyan-400/30 bg-black p-3 text-white"
        >
          <option value="studio">Studio / Felencho.ai</option>
          <option value="youtube">YouTube</option>
          <option value="facebook">Facebook</option>
          <option value="instagram">Instagram</option>
          <option value="tiktok">TikTok</option>
          <option value="whatsapp">WhatsApp</option>
          <option value="phone">Llamada telefónica</option>
          <option value="other">Otro</option>
        </select>

        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="rounded border border-cyan-400/30 bg-black p-3 text-white"
        >
          <option value="auto">Detectar idioma automáticamente</option>
          <option value="es">Español</option>
          <option value="en">English</option>
          <option value="pt">Português</option>
          <option value="fr">Français</option>
          <option value="ja">日本語</option>
          <option value="hi">हिन्दी</option>
          <option value="multi">Multi</option>
        </select>

        <select
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          className="rounded border border-cyan-400/30 bg-black p-3 text-white md:col-span-2"
        >
          <option>Bob</option>
          <option>Lina</option>
          <option>Felencho Humano</option>
          <option>Felencho Virtual</option>
        </select>
      </div>

      <textarea
        className="mt-4 h-32 w-full rounded border border-cyan-400/30 bg-black p-3 text-white"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Escribe el mensaje, pregunta del público o intervención del invitado..."
      />

      <button
        onClick={saveMessage}
        disabled={saving}
        className="mt-4 rounded bg-cyan-500 px-4 py-2 font-bold text-black disabled:opacity-50"
      >
        {saving ? "Procesando..." : "Enviar Mensaje"}
      </button>

      <p className="mt-3 text-gray-400">{status}</p>
    </div>
  );
}