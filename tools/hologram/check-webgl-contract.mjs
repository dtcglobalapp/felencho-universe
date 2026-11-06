/**
 * Felencho Mundial — Hologram Engine source smoke gate.
 *
 * Run: node tools/hologram/check-webgl-contract.mjs
 * No credentials, no network calls, no billed avatar sessions.
 * This checks syntax and the architectural constraints only.
 * It does not prove that a WebGL frame was rendered.
 */
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";

const root = resolve(import.meta.dirname, "../..");
const engine = readFileSync(join(root, "public/hologram-engine/engine.html"), "utf8");
const entity = readFileSync(join(root, "public/hologram-engine/energy-entity.js"), "utf8");
const screen = readFileSync(join(root, "components/hologram/HologramScreenBridge.tsx"), "utf8");

function must(condition, label) {
  assert.ok(condition, label);
  console.log("OK:", label);
}

must(/buildEnergyEntity\(THREE,character\)/.test(engine), "3D energy entity is mounted");
must(/new THREE\.WebGLRenderer\(/.test(engine), "real WebGL scene");
must(/new THREE\.ShaderMaterial\(/.test(entity), "light-field surface shader");
must(/TubeGeometry/.test(entity), "3D filaments");
must(/felencho-hologram-frame/.test(engine), "voice envelope receiver");
must(/subscribeHologramVoice/.test(screen), "studio realtime receiver");
must(!/\.glb|GLTFLoader|fallbackVideo|VideoTexture|new Audio\(/.test(engine),
  "display does not require GLB, loop videos or local audio");
must(!/<(?:button|input|label)\b/i.test(engine), "TV has no controls");
must(!/textContent|innerText|innerHTML/.test(engine), "TV has no diagnostic text");
must(/source\s*!==\s*window\.parent/.test(engine) || /event\.source\s*!==\s*window\.parent/.test(engine),
  "voice messages scoped to parent");
const script = engine.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];
must(Boolean(script), "module script exists");
const directory = mkdtempSync(join(tmpdir(), "felencho-holo-"));
try {
  for (const [name, code] of [["energy-entity.mjs", entity], ["engine.mjs", script]]) {
    const path = join(directory, name);
    writeFileSync(path, code, "utf8");
    const result = spawnSync(process.execPath, ["--check", path], { encoding: "utf8" });
    if (result.status !== 0) throw Error(name + ": " + result.stderr);
    console.log("OK:", name, "parses");
  }
} finally {
  rmSync(directory, { recursive: true, force: true });
}
console.log("SOURCE CONTRACT PASSED. Runtime render and portrait-TV QA still required.");
