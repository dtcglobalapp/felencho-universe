"use client";

import { useState } from "react";

export default function ProducerPanel() {
  const [status, setStatus] = useState("idle");

  async function handleAction(action: string) {
    try {
      const response = await fetch("/api/lumina/lumina_producer/session", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          session_id: "",
          action,
        }),
      });

      const data = await response.json();
      console.log(data);

      if (action === "start") setStatus("running");
      if (action === "pause") setStatus("paused");
      if (action === "resume") setStatus("running");
      if (action === "finish") setStatus("finished");
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <section className="mt-10 rounded-2xl border border-cyan-400/30 bg-white/5 p-6 shadow-lg shadow-cyan-500/10">
      <h2 className="text-2xl font-bold text-cyan-300">
        Lumina Producer
      </h2>

      <p className="mt-2 text-gray-400">
        Centro de control de escenas, líneas y participantes.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <div className="rounded-xl bg-black/40 p-4">
          <div className="text-sm text-gray-400">Estado</div>
          <div className="mt-2 text-xl font-bold text-cyan-300">
            {status}
          </div>
        </div>

        <div className="rounded-xl bg-black/40 p-4">
          <div className="text-sm text-gray-400">Escena</div>
          <div className="mt-2 text-xl font-bold text-cyan-300">--</div>
        </div>

        <div className="rounded-xl bg-black/40 p-4">
          <div className="text-sm text-gray-400">Línea</div>
          <div className="mt-2 text-xl font-bold text-cyan-300">--</div>
        </div>

        <div className="rounded-xl bg-black/40 p-4">
          <div className="text-sm text-gray-400">Actor</div>
          <div className="mt-2 text-xl font-bold text-cyan-300">--</div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          onClick={() => handleAction("start")}
          className="rounded-xl bg-green-600 px-4 py-2 font-semibold text-white"
        >
          START
        </button>

        <button
          onClick={() => handleAction("pause")}
          className="rounded-xl bg-yellow-600 px-4 py-2 font-semibold text-white"
        >
          PAUSE
        </button>

        <button
          onClick={() => handleAction("resume")}
          className="rounded-xl bg-cyan-600 px-4 py-2 font-semibold text-white"
        >
          RESUME
        </button>

        <button
          onClick={() => handleAction("finish")}
          className="rounded-xl bg-red-600 px-4 py-2 font-semibold text-white"
        >
          FINISH
        </button>
      </div>
    </section>
  );
}