import type {
  ActorDefinition,
} from "../domain/ActorDefinition";

export interface ActorPackageImport {
  definition: unknown;
  assets: Map<string, Blob>;
}

export type ActorAssetBlobResolver = (
  path: string,
) => Promise<Blob | null>;

interface ZipEntry {
  name: string;
  bytes: Uint8Array;
}

interface EncodedZipEntry
  extends ZipEntry {
  crc32: number;
  offset: number;
}

const textEncoder =
  new TextEncoder();
const textDecoder =
  new TextDecoder();

function writeUint16(
  view: DataView,
  offset: number,
  value: number,
): void {
  view.setUint16(offset, value, true);
}

function writeUint32(
  view: DataView,
  offset: number,
  value: number,
): void {
  view.setUint32(
    offset,
    value >>> 0,
    true,
  );
}

const crcTable = (() => {
  const table = new Uint32Array(256);

  for (
    let index = 0;
    index < 256;
    index += 1
  ) {
    let value = index;

    for (
      let bit = 0;
      bit < 8;
      bit += 1
    ) {
      value =
        value & 1
          ? 0xedb88320 ^
            (value >>> 1)
          : value >>> 1;
    }

    table[index] = value >>> 0;
  }

  return table;
})();

export function calculateCrc32(
  bytes: Uint8Array,
): number {
  let crc = 0xffffffff;

  for (const byte of bytes) {
    crc =
      (crc >>> 8) ^
      (
        crcTable[
          (crc ^ byte) & 0xff
        ] ?? 0
      );
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function concatenate(
  chunks: readonly Uint8Array[],
): Uint8Array {
  const output = new Uint8Array(
    chunks.reduce(
      (size, chunk) =>
        size + chunk.byteLength,
      0,
    ),
  );
  let offset = 0;

  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return output;
}

function copyToArrayBuffer(
  bytes: Uint8Array,
): ArrayBuffer {
  const copy = new Uint8Array(
    bytes.byteLength,
  );

  copy.set(bytes);
  return copy.buffer;
}

function encodeStoredZip(
  entries: readonly ZipEntry[],
): Uint8Array {
  const localChunks: Uint8Array[] = [];
  const encodedEntries:
    EncodedZipEntry[] = [];
  let localOffset = 0;

  for (const entry of entries) {
    const nameBytes =
      textEncoder.encode(entry.name);
    const header = new Uint8Array(
      30 + nameBytes.byteLength,
    );
    const view = new DataView(
      header.buffer,
    );
    const crc32 = calculateCrc32(
      entry.bytes,
    );

    writeUint32(view, 0, 0x04034b50);
    writeUint16(view, 4, 20);
    writeUint16(view, 6, 0);
    writeUint16(view, 8, 0);
    writeUint16(view, 10, 0);
    writeUint16(view, 12, 0);
    writeUint32(view, 14, crc32);
    writeUint32(
      view,
      18,
      entry.bytes.byteLength,
    );
    writeUint32(
      view,
      22,
      entry.bytes.byteLength,
    );
    writeUint16(
      view,
      26,
      nameBytes.byteLength,
    );
    writeUint16(view, 28, 0);
    header.set(nameBytes, 30);

    encodedEntries.push({
      ...entry,
      crc32,
      offset: localOffset,
    });
    localChunks.push(
      header,
      entry.bytes,
    );
    localOffset +=
      header.byteLength +
      entry.bytes.byteLength;
  }

  const centralChunks: Uint8Array[] =
    [];

  for (
    const entry of encodedEntries
  ) {
    const nameBytes =
      textEncoder.encode(entry.name);
    const header = new Uint8Array(
      46 + nameBytes.byteLength,
    );
    const view = new DataView(
      header.buffer,
    );

    writeUint32(view, 0, 0x02014b50);
    writeUint16(view, 4, 20);
    writeUint16(view, 6, 20);
    writeUint16(view, 8, 0);
    writeUint16(view, 10, 0);
    writeUint16(view, 12, 0);
    writeUint16(view, 14, 0);
    writeUint32(
      view,
      16,
      entry.crc32,
    );
    writeUint32(
      view,
      20,
      entry.bytes.byteLength,
    );
    writeUint32(
      view,
      24,
      entry.bytes.byteLength,
    );
    writeUint16(
      view,
      28,
      nameBytes.byteLength,
    );
    writeUint16(view, 30, 0);
    writeUint16(view, 32, 0);
    writeUint16(view, 34, 0);
    writeUint16(view, 36, 0);
    writeUint32(view, 38, 0);
    writeUint32(
      view,
      42,
      entry.offset,
    );
    header.set(nameBytes, 46);
    centralChunks.push(header);
  }

  const centralDirectory =
    concatenate(centralChunks);
  const end = new Uint8Array(22);
  const endView = new DataView(
    end.buffer,
  );

  writeUint32(endView, 0, 0x06054b50);
  writeUint16(endView, 4, 0);
  writeUint16(endView, 6, 0);
  writeUint16(
    endView,
    8,
    encodedEntries.length,
  );
  writeUint16(
    endView,
    10,
    encodedEntries.length,
  );
  writeUint32(
    endView,
    12,
    centralDirectory.byteLength,
  );
  writeUint32(
    endView,
    16,
    localOffset,
  );
  writeUint16(endView, 20, 0);

  return concatenate([
    ...localChunks,
    centralDirectory,
    end,
  ]);
}

function safePackagePath(
  value: string,
): boolean {
  return Boolean(
    value &&
      !value.startsWith("/") &&
      !value.includes("\\") &&
      !value.split("/").includes(".."),
  );
}

function packageAssetPath(
  definition: ActorDefinition,
  assetPath: string,
  used: Set<string>,
): string {
  const actorPrefix =
    `/actors/${encodeURIComponent(
      definition.id,
    )}/`;
  const caseInsensitivePrefix =
    `/actors/${definition.id}/`;
  let candidate =
    assetPath.startsWith(actorPrefix)
      ? assetPath.slice(
          actorPrefix.length,
        )
      : assetPath.startsWith(
            caseInsensitivePrefix,
          )
        ? assetPath.slice(
            caseInsensitivePrefix.length,
          )
        : `assets/${assetPath.split("/").at(-1) ?? "asset.png"}`;

  candidate = candidate
    .replace(/^\/+/, "")
    .replace(/\.\./g, "_");

  if (!safePackagePath(candidate)) {
    candidate =
      "assets/asset.png";
  }

  const extensionIndex =
    candidate.lastIndexOf(".");
  const stem =
    extensionIndex >= 0
      ? candidate.slice(
          0,
          extensionIndex,
        )
      : candidate;
  const extension =
    extensionIndex >= 0
      ? candidate.slice(extensionIndex)
      : "";
  let unique = candidate;
  let suffix = 2;

  while (used.has(unique)) {
    unique =
      `${stem}_${suffix}${extension}`;
    suffix += 1;
  }

  used.add(unique);
  return unique;
}

export function createPortableDefinition(
  definition: ActorDefinition,
): {
  definition: ActorDefinition;
  assetPaths: Map<string, string>;
} {
  const used = new Set<string>([
    "actor.json",
  ]);
  const assetPaths = new Map<
    string,
    string
  >();

  for (const asset of definition.assets) {
    assetPaths.set(
      asset.path,
      packageAssetPath(
        definition,
        asset.path,
        used,
      ),
    );
  }

  return {
    assetPaths,
    definition: {
      ...definition,
      assets: definition.assets.map(
        (asset) => ({
          ...asset,
          path:
            assetPaths.get(
              asset.path,
            ) ?? asset.path,
          source: "packaged",
        }),
      ),
      layers:
        definition.layers.map(
          (layer) => ({
            ...layer,
            asset:
              assetPaths.get(
                layer.asset,
              ) ?? layer.asset,
          }),
        ),
    },
  };
}

export function serializeActorJson(
  definition: ActorDefinition,
): string {
  return JSON.stringify(
    definition,
    null,
    2,
  );
}

export async function createPortableActorPackage(
  definition: ActorDefinition,
  resolveAssetBlob:
    ActorAssetBlobResolver,
): Promise<Blob> {
  const portable =
    createPortableDefinition(
      definition,
    );
  const entries: ZipEntry[] = [
    {
      name: "actor.json",
      bytes: textEncoder.encode(
        serializeActorJson(
          portable.definition,
        ),
      ),
    },
  ];
  const missing: string[] = [];

  for (const asset of definition.assets) {
    const blob =
      await resolveAssetBlob(
        asset.path,
      );

    if (!blob) {
      missing.push(asset.path);
      continue;
    }

    const packagePath =
      portable.assetPaths.get(
        asset.path,
      );

    if (!packagePath) {
      missing.push(asset.path);
      continue;
    }

    entries.push({
      name: packagePath,
      bytes: new Uint8Array(
        await blob.arrayBuffer(),
      ),
    });
  }

  if (missing.length > 0) {
    throw new Error(
      `Portable export stopped because ${missing.length} required asset${missing.length === 1 ? " is" : "s are"} unavailable: ${missing.join(", ")}`,
    );
  }

  return new Blob(
    [
      copyToArrayBuffer(
        encodeStoredZip(entries),
      ),
    ],
    {
      type: "application/zip",
    },
  );
}

function decodeStoredZip(
  bytes: Uint8Array,
): Map<string, Uint8Array> {
  const entries = new Map<
    string,
    Uint8Array
  >();
  const view = new DataView(
    bytes.buffer,
    bytes.byteOffset,
    bytes.byteLength,
  );
  let offset = 0;

  while (offset + 4 <= bytes.length) {
    const signature = view.getUint32(
      offset,
      true,
    );

    if (signature === 0x02014b50) {
      break;
    }

    if (signature !== 0x04034b50) {
      throw new Error(
        "The actor package contains an invalid ZIP record.",
      );
    }

    if (offset + 30 > bytes.length) {
      throw new Error(
        "The actor package ZIP header is incomplete.",
      );
    }

    const flags = view.getUint16(
      offset + 6,
      true,
    );
    const method = view.getUint16(
      offset + 8,
      true,
    );
    const expectedCrc = view.getUint32(
      offset + 14,
      true,
    );
    const compressedSize =
      view.getUint32(
        offset + 18,
        true,
      );
    const uncompressedSize =
      view.getUint32(
        offset + 22,
        true,
      );
    const nameLength = view.getUint16(
      offset + 26,
      true,
    );
    const extraLength = view.getUint16(
      offset + 28,
      true,
    );

    if (
      flags !== 0 ||
      method !== 0 ||
      compressedSize !==
        uncompressedSize
    ) {
      throw new Error(
        "The actor package uses an unsupported compressed ZIP format.",
      );
    }

    const nameStart = offset + 30;
    const dataStart =
      nameStart +
      nameLength +
      extraLength;
    const dataEnd =
      dataStart + compressedSize;

    if (dataEnd > bytes.length) {
      throw new Error(
        "The actor package contains a truncated asset.",
      );
    }

    const name = textDecoder.decode(
      bytes.subarray(
        nameStart,
        nameStart + nameLength,
      ),
    );

    if (!safePackagePath(name)) {
      throw new Error(
        `The actor package contains unsafe path "${name}".`,
      );
    }

    const data = bytes.slice(
      dataStart,
      dataEnd,
    );

    if (
      calculateCrc32(data) !==
      expectedCrc
    ) {
      throw new Error(
        `The actor package asset "${name}" failed its integrity check.`,
      );
    }

    entries.set(name, data);
    offset = dataEnd;
  }

  return entries;
}

export async function readPortableActorPackage(
  blob: Blob,
): Promise<ActorPackageImport> {
  const bytes = new Uint8Array(
    await blob.arrayBuffer(),
  );
  const entries =
    decodeStoredZip(bytes);
  const actorBytes =
    entries.get("actor.json");

  if (!actorBytes) {
    throw new Error(
      "The actor package does not contain actor.json.",
    );
  }

  let definition: unknown;

  try {
    definition = JSON.parse(
      textDecoder.decode(actorBytes),
    );
  } catch {
    throw new Error(
      "The actor package contains invalid actor.json.",
    );
  }

  const assets = new Map<
    string,
    Blob
  >();

  for (
    const [path, data] of entries
  ) {
    if (path === "actor.json") {
      continue;
    }

    if (!path.toLowerCase().endsWith(
      ".png",
    )) {
      continue;
    }

    assets.set(
      path,
      new Blob([
        copyToArrayBuffer(data),
      ], {
        type: "image/png",
      }),
    );
  }

  return {
    definition,
    assets,
  };
}
