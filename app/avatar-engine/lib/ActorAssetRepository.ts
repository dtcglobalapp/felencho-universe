import type {
  ActorAssetDefinition,
} from "../domain/ActorDefinition";

const DATABASE_NAME =
  "genesis-actor-assets";
const DATABASE_VERSION = 1;
const STORE_NAME = "assets";

interface StoredActorAsset {
  key: string;
  actorId: string;
  path: string;
  blob: Blob;
  metadata: ActorAssetDefinition;
  savedAt: number;
}

export interface PngMetadata {
  width: number;
  height: number;
  hasAlpha: boolean;
  byteLength: number;
}

export interface ActorAssetWrite {
  asset: ActorAssetDefinition;
  blob: Blob;
}

export class ActorAssetStorageError extends Error {
  public readonly code:
    | "UNAVAILABLE"
    | "OPEN_FAILED"
    | "READ_FAILED"
    | "WRITE_FAILED"
    | "DELETE_FAILED"
    | "CORRUPTED_RECORD";

  public constructor(
    code: ActorAssetStorageError["code"],
    message: string,
  ) {
    super(message);
    this.name =
      "ActorAssetStorageError";
    this.code = code;
  }
}

function readAssetDefinition(
  value: unknown,
): ActorAssetDefinition | null {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    return null;
  }

  const path = Reflect.get(
    value,
    "path",
  );
  const name = Reflect.get(
    value,
    "name",
  );
  const mediaType = Reflect.get(
    value,
    "mediaType",
  );
  const source = Reflect.get(
    value,
    "source",
  );
  const width = Reflect.get(
    value,
    "width",
  );
  const height = Reflect.get(
    value,
    "height",
  );
  const hasAlpha = Reflect.get(
    value,
    "hasAlpha",
  );
  const byteLength = Reflect.get(
    value,
    "byteLength",
  );

  if (
    typeof path !== "string" ||
    typeof name !== "string" ||
    mediaType !== "image/png" ||
    ![
      "bundled",
      "local",
      "packaged",
    ].includes(
      typeof source === "string"
        ? source
        : "",
    ) ||
    !(
      width === undefined ||
      typeof width === "number"
    ) ||
    !(
      height === undefined ||
      typeof height === "number"
    ) ||
    !(
      hasAlpha === undefined ||
      typeof hasAlpha === "boolean"
    ) ||
    !(
      byteLength === undefined ||
      typeof byteLength === "number"
    )
  ) {
    return null;
  }

  return {
    path,
    name,
    mediaType,
    source:
      source === "local"
        ? "local"
        : source === "packaged"
          ? "packaged"
          : "bundled",
    ...(typeof width === "number"
      ? { width }
      : {}),
    ...(typeof height === "number"
      ? { height }
      : {}),
    ...(typeof hasAlpha ===
    "boolean"
      ? { hasAlpha }
      : {}),
    ...(typeof byteLength ===
    "number"
      ? { byteLength }
      : {}),
  };
}

function readStoredAsset(
  value: unknown,
): StoredActorAsset | null {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    return null;
  }

  const key = Reflect.get(
    value,
    "key",
  );
  const actorId = Reflect.get(
    value,
    "actorId",
  );
  const path = Reflect.get(
    value,
    "path",
  );
  const blob = Reflect.get(
    value,
    "blob",
  );
  const savedAt = Reflect.get(
    value,
    "savedAt",
  );
  const metadata = readAssetDefinition(
    Reflect.get(value, "metadata"),
  );

  if (
    typeof key !== "string" ||
    typeof actorId !== "string" ||
    typeof path !== "string" ||
    !(blob instanceof Blob) ||
    typeof savedAt !== "number" ||
    !metadata
  ) {
    return null;
  }

  return {
    key,
    actorId,
    path,
    blob,
    metadata,
    savedAt,
  };
}

function assetKey(
  actorId: string,
  path: string,
): string {
  return `${actorId.trim().toLowerCase()}:${path}`;
}

function openDatabase(): Promise<IDBDatabase> {
  if (
    typeof indexedDB === "undefined"
  ) {
    return Promise.reject(
      new ActorAssetStorageError(
        "UNAVAILABLE",
        "El almacenamiento local de recursos no está disponible en este navegador.",
      ),
    );
  }

  return new Promise(
    (resolve, reject) => {
      let request: IDBOpenDBRequest;

      try {
        request = indexedDB.open(
          DATABASE_NAME,
          DATABASE_VERSION,
        );
      } catch {
        reject(
          new ActorAssetStorageError(
            "OPEN_FAILED",
            "No se pudo abrir el almacenamiento local de recursos.",
          ),
        );
        return;
      }

      request.onupgradeneeded = () => {
        const database =
          request.result;

        if (
          !database.objectStoreNames.contains(
            STORE_NAME,
          )
        ) {
          const store =
            database.createObjectStore(
              STORE_NAME,
              {
                keyPath: "key",
              },
            );

          store.createIndex(
            "actorId",
            "actorId",
            {
              unique: false,
            },
          );
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(
          new ActorAssetStorageError(
            "OPEN_FAILED",
            request.error?.message ??
              "No se pudo abrir el almacenamiento local de recursos.",
          ),
        );
      };

      request.onblocked = () => {
        reject(
          new ActorAssetStorageError(
            "OPEN_FAILED",
            "El almacenamiento local de recursos está bloqueado por otra pestaña.",
          ),
        );
      };
    },
  );
}

function completeTransaction(
  transaction: IDBTransaction,
  code:
    ActorAssetStorageError["code"],
  message: string,
): Promise<void> {
  return new Promise(
    (resolve, reject) => {
      transaction.oncomplete = () => {
        resolve();
      };

      transaction.onerror = () => {
        reject(
          new ActorAssetStorageError(
            code,
            transaction.error?.message ??
              message,
          ),
        );
      };

      transaction.onabort = () => {
        reject(
          new ActorAssetStorageError(
            code,
            transaction.error?.message ??
              message,
          ),
        );
      };
    },
  );
}

export async function inspectPngMetadata(
  blob: Blob,
): Promise<PngMetadata> {
  const bytes = new Uint8Array(
    await blob.arrayBuffer(),
  );
  const signature = [
    137,
    80,
    78,
    71,
    13,
    10,
    26,
    10,
  ];

  if (
    bytes.length < 33 ||
    signature.some(
      (value, index) =>
        bytes[index] !== value,
    )
  ) {
    throw new ActorAssetStorageError(
      "CORRUPTED_RECORD",
      "El recurso no contiene un archivo PNG válido.",
    );
  }

  const view = new DataView(
    bytes.buffer,
    bytes.byteOffset,
    bytes.byteLength,
  );
  const width = view.getUint32(
    16,
    false,
  );
  const height = view.getUint32(
    20,
    false,
  );
  const colorType = bytes[25];
  let hasAlpha =
    colorType === 4 ||
    colorType === 6;
  let offset = 8;

  while (
    !hasAlpha &&
    offset + 12 <= bytes.length
  ) {
    const length = view.getUint32(
      offset,
      false,
    );
    const type = String.fromCharCode(
      bytes[offset + 4] ?? 0,
      bytes[offset + 5] ?? 0,
      bytes[offset + 6] ?? 0,
      bytes[offset + 7] ?? 0,
    );

    if (type === "tRNS") {
      hasAlpha = true;
      break;
    }

    offset += length + 12;
  }

  if (
    width <= 0 ||
    height <= 0
  ) {
    throw new ActorAssetStorageError(
      "CORRUPTED_RECORD",
      "El recurso PNG contiene dimensiones inválidas.",
    );
  }

  return {
    width,
    height,
    hasAlpha,
    byteLength: blob.size,
  };
}

export function createImportedAssetPath(
  actorId: string,
  fileName: string,
  existingPaths: ReadonlySet<string>,
): string {
  const safeActorId =
    encodeURIComponent(
      actorId.trim() || "actor",
    );
  const extensionless =
    fileName
      .replace(/\.png$/i, "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "_")
      .replace(/^_+|_+$/g, "") ||
    "asset";
  let suffix = 1;
  let path =
    `/actors/${safeActorId}/imports/${extensionless}.png`;

  while (existingPaths.has(path)) {
    suffix += 1;
    path =
      `/actors/${safeActorId}/imports/${extensionless}_${suffix}.png`;
  }

  return path;
}

export class ActorAssetRepository {
  public async putAsset(
    actorId: string,
    asset: ActorAssetDefinition,
    blob: Blob,
  ): Promise<void> {
    return this.putAssets(
      actorId,
      [
        {
          asset,
          blob,
        },
      ],
    );
  }

  public async putAssets(
    actorId: string,
    entries:
      readonly ActorAssetWrite[],
  ): Promise<void> {
    if (entries.length === 0) {
      return;
    }

    const database =
      await openDatabase();

    try {
      const transaction =
        database.transaction(
          STORE_NAME,
          "readwrite",
        );
      const store =
        transaction.objectStore(
          STORE_NAME,
        );
      const normalizedActorId =
        actorId.trim().toLowerCase();

      for (
        const {
          asset,
          blob,
        } of entries
      ) {
        const record:
          StoredActorAsset = {
          key: assetKey(
            actorId,
            asset.path,
          ),
          actorId:
            normalizedActorId,
          path: asset.path,
          blob,
          metadata: {
            ...asset,
          },
          savedAt: Date.now(),
        };

        store.put(record);
      }

      await completeTransaction(
        transaction,
        "WRITE_FAILED",
        "No se pudo guardar el recurso importado.",
      );
    } finally {
      database.close();
    }
  }

  public async getAssetBlob(
    actorId: string,
    path: string,
  ): Promise<Blob | null> {
    const database =
      await openDatabase();

    try {
      const transaction =
        database.transaction(
          STORE_NAME,
          "readonly",
        );
      const request = transaction
        .objectStore(STORE_NAME)
        .get(assetKey(actorId, path));

      const result =
        await new Promise<unknown>(
          (resolve, reject) => {
            request.onsuccess = () => {
              resolve(request.result);
            };

            request.onerror = () => {
              reject(
                new ActorAssetStorageError(
                  "READ_FAILED",
                  request.error
                    ?.message ??
                    "No se pudo leer el recurso importado.",
                ),
              );
            };
          },
        );

      if (result === undefined) {
        return null;
      }

      const record =
        readStoredAsset(result);

      if (!record || record.path !== path) {
        throw new ActorAssetStorageError(
          "CORRUPTED_RECORD",
          `El recurso local "${path}" está dañado.`,
        );
      }

      return record.blob;
    } finally {
      database.close();
    }
  }

  public async listAssets(
    actorId: string,
  ): Promise<ActorAssetDefinition[]> {
    const database =
      await openDatabase();
    const normalizedActorId =
      actorId.trim().toLowerCase();

    try {
      const transaction =
        database.transaction(
          STORE_NAME,
          "readonly",
        );
      const request = transaction
        .objectStore(STORE_NAME)
        .index("actorId")
        .getAll(normalizedActorId);
      const result =
        await new Promise<unknown>(
          (resolve, reject) => {
            request.onsuccess = () => {
              resolve(request.result);
            };
            request.onerror = () => {
              reject(
                new ActorAssetStorageError(
                  "READ_FAILED",
                  request.error
                    ?.message ??
                    "No se pudieron enumerar los recursos importados.",
                ),
              );
            };
          },
        );
      const records =
        Array.isArray(result)
          ? result.map(readStoredAsset)
          : [];

      if (
        !Array.isArray(result) ||
        records.some(
          (record) => !record,
        )
      ) {
        throw new ActorAssetStorageError(
          "CORRUPTED_RECORD",
          "El almacenamiento local contiene registros de recursos dañados.",
        );
      }

      return records.flatMap(
        (record) =>
          record &&
          record.metadata.path ===
            record.path
            ? [
                {
                  ...record.metadata,
                },
              ]
            : [],
      );
    } finally {
      database.close();
    }
  }

  public async deleteAsset(
    actorId: string,
    path: string,
  ): Promise<void> {
    const database =
      await openDatabase();

    try {
      const transaction =
        database.transaction(
          STORE_NAME,
          "readwrite",
        );

      transaction
        .objectStore(STORE_NAME)
        .delete(assetKey(actorId, path));

      await completeTransaction(
        transaction,
        "DELETE_FAILED",
        `No se pudo eliminar el recurso local "${path}".`,
      );
    } finally {
      database.close();
    }
  }

  public async clearActor(
    actorId: string,
  ): Promise<void> {
    const assets =
      await this.listAssets(actorId);

    await Promise.all(
      assets.map((asset) =>
        this.deleteAsset(
          actorId,
          asset.path,
        ),
      ),
    );
  }
}
