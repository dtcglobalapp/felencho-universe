"use client";

import { useRef, useState } from "react";

export default function FelenchoVisionClient() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [cameraReady, setCameraReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  async function startCamera() {
    setError("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraReady(true);
      }
    } catch (err) {
      console.error(err);
      setError("No pude acceder a la cámara. Revisa permisos del navegador.");
    }
  }

  async function captureAndAnalyze() {
    if (!videoRef.current || !canvasRef.current) return;

    setLoading(true);
    setError("");
    setDescription("");

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;

      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas no disponible.");

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageBase64 = canvas.toDataURL("image/jpeg", 0.85);

      const res = await fetch("/api/vision", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageBase64,
          prompt:
            "Describe con detalle lo que ves en esta imagen del estudio de Felencho.ai. Habla como si fueras los ojos de Bob, Lina y Felencho Virtual. No inventes identidad de personas, solo describe lo visible.",
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Error analizando imagen.");
      }

      setDescription(json.description || "No recibí descripción.");
    } catch (err) {
      console.error(err);
      setError("Error analizando la imagen.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-black p-6 text-white">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-3xl border border-cyan-500/30 bg-gradient-to-r from-slate-950 via-black to-slate-950 p-8">
          <h1 className="text-4xl font-bold text-cyan-300">
            Felencho Vision
          </h1>
          <p className="mt-3 text-gray-300">
            Primer ojo visual de Bob, Lina y Felencho Virtual.
          </p>
        </header>

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-950/40 p-4 text-red-200">
            {error}
          </div>
        )}

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-zinc-950 p-6">
            <h2 className="text-2xl font-semibold text-yellow-300">
              Cámara OBSBOT
            </h2>

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
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-zinc-950 p-6">
            <h2 className="text-2xl font-semibold text-purple-300">
              Lo que Bob está viendo
            </h2>

            <div className="mt-5 min-h-80 rounded-2xl border border-purple-500/20 bg-black p-5 text-gray-200">
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
      </div>
    </main>
  );
}