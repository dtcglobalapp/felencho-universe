"use client";
import { useState } from "react";

export default function DisplayPairingPage() {
  const [character, setCharacter] = useState<"bob" | "lina">("bob");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function approve(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/studio/display-pairing", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve", character, code }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudo autorizar");
      setMessage("Pantalla autorizada. Ya puede recibir video de " + (character === "bob" ? "Bob" : "Lina") + ".");
      setCode("");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Error"); }
    finally { setBusy(false); }
  }
  return <main className="min-h-screen bg-zinc-950 p-8 text-white">
    <div className="mx-auto max-w-lg space-y-6 rounded-2xl border border-white/20 p-8">
      <h1 className="text-3xl font-bold">Felencho Mundial · Vincular pantalla</h1>
      <p className="text-zinc-300">En la computadora Windows abre la pantalla de Bob o Lina. Escribe aquí el código de seis dígitos que aparece.</p>
      <form onSubmit={approve} className="space-y-4">
        <label className="block">Personaje
          <select value={character} onChange={(e) => setCharacter(e.target.value as "bob" | "lina")} className="mt-2 block w-full rounded bg-zinc-800 p-3">
            <option value="bob">Bob</option><option value="lina">Lina</option>
          </select>
        </label>
        <label className="block">Código temporal
          <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" maxLength={6} required pattern="[0-9]{6}" className="mt-2 block w-full rounded bg-zinc-800 p-3 text-2xl tracking-widest" placeholder="000000" />
        </label>
        <button disabled={busy || code.length !== 6} className="rounded bg-white px-6 py-3 font-semibold text-black disabled:opacity-50">{busy ? "Autorizando..." : "Autorizar pantalla"}</button>
      </form>
      {message && <p role="status">{message}</p>}
    </div>
  </main>;
}
