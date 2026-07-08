"use client";

import { useState } from "react";

export default function StudioAccessPage() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/studio/access", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, code }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Acceso denegado.");
      setLoading(false);
      return;
    }

    window.location.href = "/studio";
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#111214] p-8 shadow-2xl">
        <h1 className="text-center text-3xl font-bold text-white">
          Felencho Studio OS
        </h1>

        <p className="mt-3 text-center text-sm text-zinc-500">
          Entrada privada autorizada solamente.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <input
            type="email"
            placeholder="Email autorizado"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none focus:border-cyan-400"
          />

          <input
            type="password"
            placeholder="Llave de acceso"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none focus:border-cyan-400"
          />

          {error && (
            <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-center text-sm text-red-300">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-cyan-500 px-4 py-3 font-bold text-black transition hover:bg-cyan-400 disabled:opacity-50"
          >
            {loading ? "Verificando..." : "Entrar al Studio"}
          </button>
        </form>
      </div>
    </div>
  );
}