import { buildHologramPreviewHtml } from "@/lib/hologramPreviewHtml";
export const dynamic = "force-dynamic";

/** Experimental, separate TV feed. Production /presence/lina stays untouched. */
export default async function HologramLINAScreen() {
  const html = await buildHologramPreviewHtml({ character: "lina", tvMode: true });
  return (
    <main className="min-h-screen bg-[#020814]">
      <iframe
        title="LINA — pantalla holográfica independiente"
        srcDoc={html}
        sandbox="allow-scripts"
        allow="autoplay"
        className="block h-screen w-screen border-0 bg-[#020814]"
        referrerPolicy="no-referrer"
      />
      <div className="sr-only">Pantalla vertical independiente para Lina, holograma cian y violeta. Demostración sin conexión de audio en vivo.</div>
    </main>
  );
}
