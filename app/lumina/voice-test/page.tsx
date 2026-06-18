"use client";

import { useState } from "react";

export default function VoiceTestPage() {
  const [message, setMessage] = useState(
    "Miriam acaba de entrar al estudio. Salúdala."
  );

  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(false);

  async function talk() {
    try {
      setLoading(true);

      const response = await fetch("/api/lumina/chat-voice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          character_id: "7da1296c-41ca-4729-b893-6a4f9a7b645b",
          user_message: message,
          channel: "felencho.ai",
          language: "es",
          user_name: "Miriam Garcia",
        }),
      });

      const data = await response.json();

      setReply(data.reply || "");

      if (data.audio_base64) {
        const audio = new Audio(
          `data:audio/mpeg;base64,${data.audio_base64}`
        );

        await audio.play();
      }
    } catch (error) {
      console.error(error);
      alert("Error reproduciendo audio.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white p-10">
      <h1 className="text-4xl font-bold mb-6">
        Lumina Voice Test
      </h1>

      <textarea
        className="w-full p-4 text-black rounded"
        rows={5}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />

      <button
        onClick={talk}
        disabled={loading}
        className="mt-4 px-6 py-3 bg-blue-600 rounded"
      >
        {loading ? "Pensando..." : "Hablar"}
      </button>

      <div className="mt-8">
        <h2 className="text-2xl mb-2">
          Respuesta
        </h2>

        <p>{reply}</p>
      </div>
    </main>
  );
}