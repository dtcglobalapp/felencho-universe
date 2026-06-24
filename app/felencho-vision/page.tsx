"use client";

import { useEffect, useRef, useState } from "react";

type VisionEvent = {
  id: string;
  character_key: string;
  image_description: string;
  image_url?: string | null;
  source_camera?: string | null;
  created_at: string;
};

const characterLabels: Record<string, string> = {
  bob: "Bob",
  lina: "Lina",
  felencho_virtual: "Felencho Virtual",
  shared: "Compartido",
};

export default function FelenchoVisionPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [cameraReady, setCameraReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [savingToBrain, setSavingToBrain] = useState(false);
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [characterKey, setCharacterKey] = useState("bob");
  const [history, setHistory] = useState<VisionEvent[]>([]);

  async function loadHistory() {
    try {
      const res = await fetch("/api/vision/history", { cache: "no-store" });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Error cargando historial visual.");
      }

      setHistory(Array.isArray(json) ? json : json.data || []);
    } catch (err) {
      console.error(err);
      setError("No pude cargar el historial visual.");
    }
  }

  useEffect(() => {
    loadHistory();
  }, []);

  async function startCamera() {
    setError("");
    setMessage("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraReady(true);
        setMessage("Cámara activada correctamente.");
      }
    } catch (err) {
      console.error(err);
      setError("No pude acceder a la cámara. Revisa permisos del navegador.");
    }
  }

  function buildPrompt() {
    const name = characterLabels[characterKey] || "Bob";

    return `Describe con detalle lo que ves en esta imagen del estudio de Felencho.ai como si fueras los ojos de ${name}.
No inventes identidad de personas. No hagas comentarios sobre desnudez, ropa íntima o detalles privados innecesarios.
Describe solo elementos útiles para el estudio, podcast, invitados, equipos, objetos, pantallas, ambiente y contexto visible.
Si hay niños o personas al fondo, descríbelos de forma general y respetuosa, sin detalles personales.`;
  }

  async function captureAndAnalyze() {
    if (!videoRef.current || !canvasRef.current) return;

    setLoading(true);
    setError("");
    setMessage("");
    setDescription("");

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      canvas.width = video.videoWidth || 1920;
      canvas.height = video.videoHeight || 1080;

      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas no disponible.");

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageBase64 = canvas.toDataURL("image/jpeg", 0.88);

      const visionRes = await fetch("/api/vision", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageBase64,
          prompt: buildPrompt(),
        }),
      });

      const visionJson = await visionRes.json();

      if (!visionRes.ok) {
        throw new Error(visionJson.error || "Error analizando imagen.");
      }

      const newDescription =
        visionJson.description || "No recibí descripción visual.";

      setDescription(newDescription);

      const saveRes = await fetch("/api/vision/history", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          character_key: characterKey,
          image_description: newDescription,
          source_camera: "obsbot",
        }),
      });

      const saveJson = await saveRes.json();

      if (!saveRes.ok) {
        throw new Error(saveJson.error || "Error guardando historial visual.");
      }

      setMessage("Visión capturada y guardada en historial visual.");
      await loadHistory();
    } catch (err) {
      console.error(err);
      setError("Error analizando o guardando la visión.");
    } finally {
      setLoading(false);
    }
  }

  async function sendToMemoryInbox(item?: VisionEvent) {
    const text = item?.image_description || description;

    if (!text.trim()) {
      setError("No hay descripción visual para enviar al Brain.");
      return;
    }

    setSavingToBrain(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/felencho-brain/memory-inbox", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          suggested_by: item?.character_key || characterKey,
          character_key: item?.character_key || characterKey,
          category: "studio",
          title: "Observación visual del estudio",
          memory_text: text,
          reason:
            "Observación capturada por Felencho Vision desde la cámara OBSBOT.",
          importance: 6,
          visibility: "private",
          tags: ["vision", "obsbot", "studio", "felencho-ai"],
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Error enviando al Memory Inbox.");
      }

      setMessage("Observación enviada al Memory Inbox para aprobación.");
    } catch (err) {
      console.error(err);
      setError("No pude enviar esta visión al Memory Inbox.");
    } finally {
      setSavingToBrain(false);
    }
  }

  return (
    <main className="min-h-screen bg-black p-6 text-white">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-3xl border border-cyan-500/30 bg-gradient-to-r from-slate-950 via-black to-slate-950 p-8 shadow-2xl">
          <h1 className="text-4xl font-bold text-cyan-300">
            Felencho Vision
          </h1>
          <p className="mt-3 text-gray-300">
            Los primeros ojos visuales de Bob, Lina y Felencho Virtual.
          </p>
        </header>

        {message && (
          <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/40 p-4 text-cyan-100">
            {message}
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-950/40 p-4 text-red-200">
            {error}
          </div>
        )}

        <section className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-zinc-950 p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-yellow-300">
                  Cámara OBSBOT
                </h2>
                <p className="mt-2 text-sm text-gray-400">
                  Captura una imagen y envíala al cerebro visual.
                </p>
              </div>

              <select
                className="rounded-xl border border-white/20 bg-black p-3 text-white"
                value={characterKey}
                onChange={(e) => setCharacterKey(e.target.value)}
              >
                <option value="bob">Bob</option>
                <option value="lina">Lina</option>
                <option value="felencho_virtual">Felencho Virtual</option>
                <option value="shared">Compartido</option>
              </select>
            </div>

            <div className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-black">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="h-auto w-full"
              />
            </div>

            <canvas ref={canvasRef} className="hidden" />

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                onClick={startCamera}
                className="rounded-xl bg-cyan-500 px-5 py-3 font-bold text-black hover:bg-cyan-300"
              >
                Activar cámara
              </button>

              <button
                onClick={captureAndAnalyze}
                disabled={!cameraReady || loading}
                className="rounded-xl bg-yellow-400 px-5 py-3 font-bold text-black hover:bg-yellow-300 disabled:opacity-40"
              >
                {loading ? "Analizando..." : "Capturar visión"}
              </button>

              <button
                onClick={() => sendToMemoryInbox()}
                disabled={!description || savingToBrain}
                className="rounded-xl bg-purple-500 px-5 py-3 font-bold text-white hover:bg-purple-400 disabled:opacity-40"
              >
                {savingToBrain ? "Enviando..." : "Enviar al Brain"}
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-zinc-950 p-6">
            <h2 className="text-2xl font-semibold text-purple-300">
              Lo que está viendo
            </h2>

            <div className="mt-5 min-h-96 rounded-2xl border border-purple-500/20 bg-black p-5 text-gray-200">
              {description ? (
                <p className="whitespace-pre-wrap leading-relaxed">
                  {description}
                </p>
              ) : (
                <p className="text-gray-500">
                  Activa la cámara y pulsa “Capturar visión”.
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-zinc-950 p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-cyan-300">
                Historial visual
              </h2>
              <p className="mt-2 text-sm text-gray-400">
                Últimas observaciones guardadas por Felencho Vision.
              </p>
            </div>

            <button
              onClick={loadHistory}
              className="rounded-xl border border-cyan-500/40 px-5 py-3 font-bold text-cyan-200 hover:bg-cyan-950"
            >
              Refrescar
            </button>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {history.length === 0 && (
              <p className="text-gray-500">
                Todavía no hay historial visual.
              </p>
            )}

            {history.map((item) => (
              <article
                key={item.id}
                className="rounded-2xl border border-cyan-500/20 bg-black p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="rounded-full bg-cyan-900 px-3 py-1 text-xs text-cyan-100">
                    {characterLabels[item.character_key] || item.character_key}
                  </span>

                  <span className="text-xs text-gray-500">
                    {new Date(item.created_at).toLocaleString()}
                  </span>
                </div>

                <p className="mt-4 whitespace-pre-wrap text-gray-300">
                  {item.image_description}
                </p>

                <button
                  onClick={() => sendToMemoryInbox(item)}
                  disabled={savingToBrain}
                  className="mt-4 rounded-xl bg-purple-500 px-4 py-2 text-sm font-bold text-white hover:bg-purple-400 disabled:opacity-40"
                >
                  Enviar al Brain
                </button>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}