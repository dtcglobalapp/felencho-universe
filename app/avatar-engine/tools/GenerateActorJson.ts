import fs from "fs";
import path from "path";

const ACTOR = "Bob";

const ROOT = path.join(
  process.cwd(),
  "public",
  "actors",
  ACTOR,
  "layers",
);

const layers: any[] = [];
let zIndex = 0;

function scan(folder: string) {
  const files = fs
    .readdirSync(folder, {
      withFileTypes: true,
    })
    .sort((a, b) =>
      a.name.localeCompare(b.name),
    );

  for (const file of files) {
    const full = path.join(
      folder,
      file.name,
    );

    if (file.isDirectory()) {
      scan(full);
      continue;
    }

    if (
      !file.name
        .toLowerCase()
        .endsWith(".png")
    ) {
      continue;
    }

    const relative = full
      .replace(process.cwd(), "")
      .replace(/\\/g, "/")
      .replace("/public", "");

    const id = path
      .basename(file.name, ".png")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "_");

    layers.push({
      id,
      name: id,
      image: relative,
      zIndex: zIndex++,
      visible: true,
      transform: {
        x: 0,
        y: 0,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        opacity: 1,
        pivotX: 1080,
        pivotY: 1920,
      },
    });
  }
}

scan(ROOT);

const actor = {
  id: ACTOR,
  name: ACTOR,
  version: "1.0",

  width: 2160,
  height: 3840,
  fps: 60,

  display: {
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    maxStageWidth: 2160,
    maxStageHeight: 3840,
  },

  layers,

  rig: {
    root: "face",
  },
};

const output = path.join(
  process.cwd(),
  "public",
  "actors",
  ACTOR,
  "actor.generated.json",
);

fs.writeFileSync(
  output,
  JSON.stringify(actor, null, 2),
);

console.log("");
console.log("======================================");
console.log("Felencho Avatar Engine");
console.log("======================================");
console.log("Actor :", ACTOR);
console.log("Layers:", layers.length);
console.log("Saved :", output);
console.log("======================================");
console.log("");