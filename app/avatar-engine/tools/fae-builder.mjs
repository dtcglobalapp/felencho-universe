import fs from "node:fs";
import path from "node:path";

const PROJECT_ROOT = process.cwd();
const CHARACTER = process.argv[2] || "Bob";

const ACTOR_ROOT = path.join(
  PROJECT_ROOT,
  "public",
  "actors",
  CHARACTER,
);

const LAYERS_ROOT = path.join(
  ACTOR_ROOT,
  "layers",
);

const GENERATED_FILE = path.join(
  ACTOR_ROOT,
  "actor.generated.json",
);

const OFFICIAL_FILE = path.join(
  ACTOR_ROOT,
  "actor.json",
);

const WIDTH = 2160;
const HEIGHT = 3840;

function fail(message) {
  console.error(`\n❌ FAE Builder: ${message}\n`);
  process.exit(1);
}

function normalize(value) {
  return value
    .replace(/\\/g, "/")
    .replace(/\.png$/i, "")
    .toLowerCase()
    .replace(/[^a-z0-9/]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function makeId(relativeFile) {
  return normalize(relativeFile)
    .replace(/\//g, "_")
    .replace(/_+/g, "_");
}

function walk(folder) {
  const entries = fs.readdirSync(folder, {
    withFileTypes: true,
  });

  const files = [];

  for (const entry of entries) {
    const absolutePath = path.join(folder, entry.name);

    if (entry.isDirectory()) {
      files.push(...walk(absolutePath));
      continue;
    }

    if (entry.isFile() && entry.name.toLowerCase().endsWith(".png")) {
      files.push(absolutePath);
    }
  }

  return files;
}

function getLayerPriority(relativeFile) {
  const file = normalize(relativeFile);

  if (file.startsWith("hair/back/")) return 100;
  if (file.startsWith("armor/")) return 200;

  /*
   * La boca va detrás de FACE porque la capa FACE
   * contiene la abertura transparente de la boca.
   */
  if (file.startsWith("mouth/")) {
    if (file.includes("tongue")) return 300;
    if (file.includes("lower_teeth")) return 310;
    if (file.includes("upper_teeth")) return 320;
    return 330;
  }

  if (file.startsWith("face/")) return 400;

  if (file.startsWith("eyes/")) {
    if (file.includes("_eye")) return 500;
    if (file.includes("_pupil")) return 510;
    if (file.includes("_lower_lid")) return 520;
    if (file.includes("_upper_lid")) return 530;
    return 540;
  }

  if (file.startsWith("eyebrows/")) return 600;
  if (file.startsWith("mustache/")) return 700;

  if (file.startsWith("beard/")) {
    if (file.includes("upper")) return 800;
    if (file.includes("center")) return 810;
    if (file.includes("tip")) return 820;
    return 830;
  }

  if (file.startsWith("hair/front/")) return 900;

  return 1000;
}

function findId(layers, patterns) {
  for (const pattern of patterns) {
    const found = layers.find((layer) =>
      layer.normalizedPath.includes(pattern),
    );

    if (found) {
      return found.id;
    }
  }

  return undefined;
}

function requiredId(layers, label, patterns) {
  const id = findId(layers, patterns);

  if (!id) {
    fail(
      `No encontré la capa requerida "${label}". ` +
      `Busqué: ${patterns.join(", ")}`,
    );
  }

  return id;
}

if (!fs.existsSync(LAYERS_ROOT)) {
  fail(`No existe la carpeta: ${LAYERS_ROOT}`);
}

const pngFiles = walk(LAYERS_ROOT);

if (pngFiles.length === 0) {
  fail(`No encontré archivos PNG en ${LAYERS_ROOT}`);
}

const preparedLayers = pngFiles
  .map((absoluteFile) => {
    const relativeFile = path
      .relative(LAYERS_ROOT, absoluteFile)
      .replace(/\\/g, "/");

    return {
      absoluteFile,
      relativeFile,
      normalizedPath: normalize(relativeFile),
      priority: getLayerPriority(relativeFile),
      id: makeId(relativeFile),
    };
  })
  .sort((a, b) => {
    if (a.priority !== b.priority) {
      return a.priority - b.priority;
    }

    return a.relativeFile.localeCompare(b.relativeFile);
  });

const ids = new Set();

for (const layer of preparedLayers) {
  if (ids.has(layer.id)) {
    fail(`ID duplicado generado: ${layer.id}`);
  }

  ids.add(layer.id);
}

const layers = preparedLayers.map((layer, index) => ({
  id: layer.id,
  name: layer.id,
  image:
    `/actors/${CHARACTER}/layers/` +
    layer.relativeFile,
  zIndex: index,
  visible: true,
  transform: {
    x: 0,
    y: 0,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    opacity: 1,
    pivotX: WIDTH / 2,
    pivotY: HEIGHT / 2,
  },
  normalizedPath: layer.normalizedPath,
}));

const rig = {
  root: requiredId(
    layers,
    "face",
    ["face/face"],
  ),

  armor: findId(
    layers,
    ["armor/armor"],
  ),

  leftEye: requiredId(
    layers,
    "leftEye",
    ["eyes/left_eye"],
  ),

  rightEye: requiredId(
    layers,
    "rightEye",
    ["eyes/right_eye"],
  ),

  leftPupil: requiredId(
    layers,
    "leftPupil",
    ["eyes/left_pupil"],
  ),

  rightPupil: requiredId(
    layers,
    "rightPupil",
    ["eyes/right_pupil"],
  ),

  leftUpperEyelid: requiredId(
    layers,
    "leftUpperEyelid",
    ["eyes/left_upper_lid"],
  ),

  rightUpperEyelid: requiredId(
    layers,
    "rightUpperEyelid",
    ["eyes/right_upper_lid"],
  ),

  leftLowerEyelid: requiredId(
    layers,
    "leftLowerEyelid",
    ["eyes/left_lower_lid"],
  ),

  rightLowerEyelid: requiredId(
    layers,
    "rightLowerEyelid",
    ["eyes/right_lower_lid"],
  ),

  leftEyebrow: requiredId(
    layers,
    "leftEyebrow",
    ["eyebrows/left"],
  ),

  rightEyebrow: requiredId(
    layers,
    "rightEyebrow",
    ["eyebrows/right"],
  ),

  upperTeeth: findId(
    layers,
    ["mouth/upper_teeth"],
  ),

  lowerTeeth: findId(
    layers,
    ["mouth/lower_teeth"],
  ),

  tongue: findId(
    layers,
    ["mouth/tongue"],
  ),

  mustacheLeft: findId(
    layers,
    ["mustache/mustache_left", "mustache/left"],
  ),

  mustacheCenter: findId(
    layers,
    ["mustache/mustache_center", "mustache/center"],
  ),

  mustacheRight: findId(
    layers,
    ["mustache/mustache_right", "mustache/right"],
  ),

  beardCenter: findId(
    layers,
    ["beard/center/center"],
  ),

  beardCenterLeft: findId(
    layers,
    ["beard/center/left"],
  ),

  beardCenterRight: findId(
    layers,
    ["beard/center/right"],
  ),

  beardLeftUpper: findId(
    layers,
    ["beard/left/beard_upper_left"],
  ),

  beardLeftUpperDown: findId(
    layers,
    ["beard/left/beard_upper_left_down"],
  ),

  beardLeftTip: findId(
    layers,
    ["beard/left/beard_tip_left"],
  ),

  beardRightUpper: findId(
    layers,
    ["beard/right/upper"],
  ),

  beardRightUpperDown: findId(
    layers,
    ["beard/right/upper_down"],
  ),

  beardRightTip: findId(
    layers,
    ["beard/right/tip"],
  ),

  hairBackLower: findId(
    layers,
    ["hair/back/lower"],
  ),

  hairBackMiddle: findId(
    layers,
    ["hair/back/middle"],
  ),

  hairBackUpper: findId(
    layers,
    ["hair/back/upper"],
  ),

  hairFront: findId(
    layers,
    ["hair/front/front"],
  ),
};

for (const key of Object.keys(rig)) {
  if (rig[key] === undefined) {
    delete rig[key];
  }
}

const cleanLayers = layers.map(
  ({ normalizedPath, ...layer }) => layer,
);

const actor = {
  id: CHARACTER,
  name: CHARACTER,
  version: "1.1",
  width: WIDTH,
  height: HEIGHT,
  fps: 60,

  display: {
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    maxStageWidth: WIDTH,
    maxStageHeight: HEIGHT,
  },

  layers: cleanLayers,
  rig,
};

const json = `${JSON.stringify(actor, null, 2)}\n`;

fs.writeFileSync(GENERATED_FILE, json, "utf8");
fs.writeFileSync(OFFICIAL_FILE, json, "utf8");

console.log("\n✅ FAE Builder completado");
console.log(`✅ Personaje: ${CHARACTER}`);
console.log(`✅ Capas: ${cleanLayers.length}`);
console.log(`✅ IDs únicos: ${ids.size}`);
console.log(`✅ Rig: ${Object.keys(rig).length} conexiones`);
console.log(`✅ Generado: ${GENERATED_FILE}`);
console.log(`✅ Oficial: ${OFFICIAL_FILE}\n`);

console.table(
  cleanLayers.map((layer) => ({
    zIndex: layer.zIndex,
    id: layer.id,
    image: layer.image,
  })),
);
