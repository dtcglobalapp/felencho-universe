"use client";

import { useState } from "react";

type ProducerSession = {
  id: string;
  script_id: string;
  current_scene_id: string | null;
  current_line_id: string | null;
  mode: string;
  status: string;
  producer_note: string | null;
  is_live: boolean;
};

type ProducerLine = {
  id: string;
  character_name?: string;
  speaker?: string;
  line_text?: string;
  content?: string;
};

export default function ProducerPanel() {
  const [session, setSession] = useState<ProducerSession | null>(null);
  const [status, setStatus] = useState("idle");
  const [sceneId, setSceneId] = useState("--");
  const [lineId, setLineId] = useState("--");
  const [actor, setActor] = useState("--");
  const [currentText, setCurrentText] = useState("");
  const [message, setMessage] = useState("");

  async function createSession() {
    try {
      setMessage("Creando sesión Lumina Producer...");

      const response = await fetch("/api/lumina/lumina_producer/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          script_id: "lumina-studio-v1",
          mode: "rehearsal",
          status: "idle",
          producer_note: "Sesión creada desde Felencho.ai / Lumina Studio V1",
          is_live: false,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Error creando sesión.");
        return;
      }

      const newSession: ProducerSession = data.session;

      setSession(newSession);
      setStatus(newSession.status || "idle");
      setSceneId(newSession.current_scene_id || "--");
      setLineId(newSession.current_line_id || "--");
      setActor(data.current_line?.character_name || data.current_line?.speaker || "--");
      setCurrentText(data.current_line?.line_text || data.current_line?.content || "");
      setMessage("Sesión creada correctamente.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? `Error inesperado: ${error.message}`
          : "Error inesperado creando sesión."
      );
    }
  }

  async function handleAction(action: string) {
    if (!session?.id) {
      setMessage("Primero crea una sesión.");
      return;
    }

    try {
      const response = await fetch("/api/lumina/lumina_producer/session", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          session_id: session.id,
          action,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Error ejecutando acción.");
        return;
      }

      const updatedSession: ProducerSession = data.session;

      setSession(updatedSession);
      setStatus(updatedSession.status || "idle");
      setSceneId(updatedSession.current_scene_id || "--");
      setLineId(updatedSession.current_line_id || "--");
      setMessage(`Acción ejecutada: ${action}`);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? `Error inesperado: ${error.message}`
          : "Error inesperado ejecutando acción."
      );
    }
  }

  async function nextLine() {
    if (!session?.id) {
      setMessage("Primero crea una sesión.");
      return;
    }

    try {
      const response = await fetch("/api/lumina/lumina_producer/next", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          session_id: session.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Error avanzando Producer.");
        return;
      }

      if (data.action === "finished") {
        setStatus("finished");
        setActor("--");
        setCurrentText("El guion terminó.");
        setMessage("Guion finalizado.");
        return;
      }

      if (data.line) {
        setLineId(data.line.id || "--");
        setSceneId(data.line.scene_id || data.scene?.id || "--");
        setActor(data.line.character_name || data.line.speaker || "--");
        setCurrentText(data.line.line_text || data.line.content || "");
      }

      if (data.scene) {
        setSceneId(data.scene.id || "--");
      }

      setMessage(`Producer avanzó: ${data.action}`);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? `Error inesperado: ${error.message}`
          : "Error inesperado avanzando Producer."
      );
    }
  }

  return (
    <section className="mt-10 rounded-2xl border border-cyan-400/30 bg-white/5 p-6 shadow-lg shadow-cyan-500/10">
      <h2 className="text-2xl font-bold text-cyan-300">
        Lumina Producer
      </h2>

      <p className="mt-2 text-gray-400">
        Centro de control de producción automática e inteligente para Felencho Mundial.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <div className="rounded-xl bg-black/40 p-4">
          <div className="text-sm text-gray-400">Estado</div>
          <div className="mt-2 text-xl font-bold text-cyan-300">{status}</div>
        </div>

        <div className="rounded-xl bg-black/40 p-4">
          <div className="text-sm text-gray-400">Escena ID</div>
          <div className="mt-2 break-all text-sm font-bold text-cyan-300">
            {sceneId}
          </div>
        </div>

        <div className="rounded-xl bg-black/40 p-4">
          <div className="text-sm text-gray-400">Línea ID</div>
          <div className="mt-2 break-all text-sm font-bold text-cyan-300">
            {lineId}
          </div>
        </div>

        <div className="rounded-xl bg-black/40 p-4">
          <div className="text-sm text-gray-400">Actor</div>
          <div className="mt-2 text-xl font-bold text-cyan-300">{actor}</div>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-cyan-400/20 bg-black/40 p-4">
        <div className="text-sm text-gray-400">Línea actual</div>
        <p className="mt-2 whitespace-pre-wrap text-gray-200">
          {currentText || "Todavía no hay línea cargada."}
        </p>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          onClick={createSession}
          className="rounded-xl bg-cyan-500 px-4 py-2 font-bold text-black"
        >
          CREATE SESSION
        </button>

        <button
          onClick={() => handleAction("start")}
          className="rounded-xl bg-green-600 px-4 py-2 font-bold text-white"
        >
          START
        </button>

        <button
          onClick={nextLine}
          className="rounded-xl bg-blue-600 px-4 py-2 font-bold text-white"
        >
          NEXT
        </button>

        <button
          onClick={() => handleAction("pause")}
          className="rounded-xl bg-yellow-600 px-4 py-2 font-bold text-white"
        >
          PAUSE
        </button>

        <button
          onClick={() => handleAction("resume")}
          className="rounded-xl bg-cyan-700 px-4 py-2 font-bold text-white"
        >
          RESUME
        </button>

        <button
          onClick={() => handleAction("finish")}
          className="rounded-xl bg-red-600 px-4 py-2 font-bold text-white"
        >
          FINISH
        </button>
      </div>

      <p className="mt-4 whitespace-pre-wrap text-gray-400">{message}</p>
    </section>
  );
}