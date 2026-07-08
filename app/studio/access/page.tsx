"use client";

import Image from "next/image";
import { useState } from "react";

export default function StudioAccessPage() {
  const [mode, setMode] = useState<"login" | "request">("login");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b0b0c] px-4 text-white">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#111214] p-8 shadow-2xl">
        <div className="flex flex-col items-center">
          <Image
            src="/brand/lion/lion-icon.png"
            alt="Felencho"
            width={72}
            height={72}
            className="mb-4 rounded-xl"
            priority
          />

          <h1 className="text-center text-3xl font-bold">
            Felencho Studio OS
          </h1>

          <p className="mt-3 text-center text-sm text-zinc-500">
            Entrada privada autorizada solamente.
          </p>
        </div>

        <div className="mt-6 grid grid-cols-2 rounded-xl bg-black p-1">
          <button
            onClick={() => setMode("login")}
            className={`rounded-lg py-2 text-sm font-bold ${
              mode === "login" ? "bg-cyan-500 text-black" : "text-zinc-400"
            }`}
          >
            Entrar
          </button>

          <button
            onClick={() => setMode("request")}
            className={`rounded-lg py-2 text-sm font-bold ${
              mode === "request" ? "bg-cyan-500 text-black" : "text-zinc-400"
            }`}
          >
            Solicitar
          </button>
        </div>

        {mode === "login" ? <LoginForm /> : <RequestForm />}
      </div>
    </div>
  );
}

function LoginForm() {
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
  );
}

function RequestForm() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRequest(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    const res = await fetch("/api/studio/request-access", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fullName, email, reason }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "No se pudo enviar la solicitud.");
      setLoading(false);
      return;
    }

    setMessage("Solicitud enviada. Un administrador debe aprobar tu acceso.");
    setFullName("");
    setEmail("");
    setReason("");
    setLoading(false);
  }

  return (
    <form onSubmit={handleRequest} className="mt-8 space-y-4">
      <input
        type="text"
        placeholder="Nombre completo"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none focus:border-cyan-400"
      />

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none focus:border-cyan-400"
      />

      <textarea
        placeholder="¿Por qué necesitas acceso?"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="min-h-28 w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none focus:border-cyan-400"
      />

      {error && (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-center text-sm text-red-300">
          {error}
        </p>
      )}

      {message && (
        <p className="rounded-xl border border-green-500/30 bg-green-500/10 p-3 text-center text-sm text-green-300">
          {message}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-cyan-500 px-4 py-3 font-bold text-black transition hover:bg-cyan-400 disabled:opacity-50"
      >
        {loading ? "Enviando..." : "Solicitar acceso"}
      </button>
    </form>
  );
}