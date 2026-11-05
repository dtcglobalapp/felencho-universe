import { buildHologramPreviewHtml } from "@/lib/hologramPreviewHtml";

export const dynamic = "force-dynamic";

/**
 * Experimental studio-only visual preview: embeds the existing isolated HTML
 * demonstration without editing it, contacting providers or generating audio.
 * The page exists in the feature branch and must not be merged without approval.
 */
export default async function HologramLabPage() {
  const html = await buildHologramPreviewHtml();

  return (
    <main className="min-h-screen bg-slate-950 px-3 py-6 text-white sm:px-6">
      <div className="mx-auto max-w-6xl space-y-4">
        <header className="rounded-xl border border-cyan-500/30 bg-slate-900 p-5">
          <p className="text-xs uppercase tracking-widest text-cyan-300">
            Felencho Mundial · Experimental
          </p>
          <h1 className="mt-2 text-2xl font-bold">Hologram Mode — Laboratorio</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">
            Prueba visual con ilustraciones independientes de Bob y Lina. Puedes seleccionar una grabación de audio
            desde el navegador para observar luces reactivas, probar los estados
            y detener las voces con prioridad del presentador.
          </p>
          <p className="mt-3 text-sm text-amber-200">
            No se usa RunPod, LemonSlice, Felencho Brain ni servicios TTS.
            Esta prueba no realiza llamadas de red ni está conectada a las TVs.
          </p>
        </header>
        <iframe
          title="Laboratorio visual de hologramas Bob y Lina"
          srcDoc={html}
          sandbox="allow-scripts"
          className="h-[1150px] w-full rounded-xl border border-slate-700 bg-slate-950 sm:h-[1000px]"
          referrerPolicy="no-referrer"
        />
      </div>
    </main>
  );
}
