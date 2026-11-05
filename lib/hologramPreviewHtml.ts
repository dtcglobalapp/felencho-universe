import { readFile } from "node:fs/promises";
import path from "node:path";

export type HologramCharacter = "bob" | "lina";

const RESOURCE_EXPRESSION = "figure.src='/hologram-assets/'+m.id+'.svg';";

export function isHologramCharacter(value: string): value is HologramCharacter {
  return value === "bob" || value === "lina";
}

/**
 * Return a self-contained HTML preview. An iframe with sandbox=allow-scripts
 * gets an opaque origin: external /hologram-assets paths can fail to load.
 * Embed trusted, static SVG artwork as data URLs to eliminate that dependency.
 * No credentials, external requests, microphones or avatar providers.
 */
export async function buildHologramPreviewHtml(
  opts: { character?: HologramCharacter; tvMode?: boolean } = {},
): Promise<string> {
  const base = process.cwd();
  const [html, bob, lina] = await Promise.all([
    readFile(path.join(base, "tools/runpod/demo/hologram_audio_reactive.html"), "utf8"),
    readFile(path.join(base, "public/hologram-assets/bob.svg"), "utf8"),
    readFile(path.join(base, "public/hologram-assets/lina.svg"), "utf8"),
  ]);
  if (!html.includes(RESOURCE_EXPRESSION)) {
    throw new Error("Hologram image loading contract changed");
  }
  const assets = {
    bob: Buffer.from(bob).toString("base64"),
    lina: Buffer.from(lina).toString("base64"),
  };
  let result = html.replace(
    RESOURCE_EXPRESSION,
    "figure.src='data:image/svg+xml;base64,'+({bob:" +
      JSON.stringify(assets.bob) + ",lina:" + JSON.stringify(assets.lina) +
      "})[m.id];",
  );

  if (opts.character) {
    const other = opts.character === "bob" ? "lina" : "bob";
    // Keep original DOM controls present for the existing turn simulator.
    // Only show the character assigned to this independent display.
    const presentation = [
      "body{padding:0;overflow-x:hidden}",
      "header,.note,#presenter-interrupt,#presenter-status{display:none}",
      ".screens{display:block;width:100%;max-width:none;margin:0}",
      ".screen{border:0;border-radius:0;width:100%;max-width:none}",
      ".screen canvas{width:100%;height:auto;max-height:100vh;object-fit:contain}",
      '.screen[aria-label="Holograma de ' + (other === "bob" ? "Bob" : "Lina") + '"]{display:none}',
      opts.tvMode ? ".overlay,.controls{display:none}" : ".controls{justify-content:center}",
    ].join("\n");
    result = result.replace("</style>", presentation + "\n</style>");
  }
  return result;
}
