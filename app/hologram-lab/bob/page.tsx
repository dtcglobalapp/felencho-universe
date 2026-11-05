import { buildHologramPreviewHtml } from "@/lib/hologramPreviewHtml";
export const dynamic = "force-dynamic";

/** Experimental, separate TV feed. Production /presence/bob stays untouched. */
export default async function HologramBOBScreen() {
  const html = await buildHologramPreviewHtml({ character: "bob", tvMode: true });
  return (
    <main className="min-h-screen bg-[#020814]">
      <iframe
        title="BOB — pantalla holográfica independiente"
        srcDoc={html}
        sandbox="allow-scripts"
        allow="autoplay"
        className="block h-screen w-screen border-0 bg-[#020814]"
        referrerPolicy="no-referrer"
      />
      <div className="sr-only">Pantalla vertical independiente para Bob, holograma azul y dorado. Demostración sin conexión de audio en vivo.</div>
    </main>
  );
}
