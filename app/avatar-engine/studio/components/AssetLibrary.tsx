import {
  useMemo,
  useRef,
  useState,
} from "react";

import type {
  ActorAssetDefinition,
  ActorLayerDefinition,
} from "../../types/Actor";

import PanelTitle from "./PanelTitle";

interface AssetLibraryProps {
  actorLoaded: boolean;
  assets: readonly ActorAssetDefinition[];
  layers: readonly ActorLayerDefinition[];
  assetUrls: ReadonlyMap<string, string>;
  selectedLayerIds: readonly string[];
  onImportPngs: (
    files: readonly File[],
  ) => void;
  onReplaceAsset: (
    oldPath: string,
    file: File,
  ) => void;
  onDeleteAsset: (path: string) => void;
  onCreateLayerFromAsset: (
    path: string,
  ) => void;
}

function assetFolder(path: string): string {
  const segments =
    path.split("/").filter(Boolean);

  return segments
    .slice(0, -1)
    .join("/") || "/";
}

export default function AssetLibrary({
  actorLoaded,
  assets,
  layers,
  assetUrls,
  selectedLayerIds,
  onImportPngs,
  onReplaceAsset,
  onDeleteAsset,
  onCreateLayerFromAsset,
}: AssetLibraryProps) {
  const importInputRef =
    useRef<HTMLInputElement | null>(
      null,
    );
  const replaceInputRef =
    useRef<HTMLInputElement | null>(
      null,
    );
  const [search, setSearch] =
    useState("");
  const [folder, setFolder] =
    useState("ALL");
  const [selectedPath, setSelectedPath] =
    useState<string | null>(null);
  const folders = useMemo(
    () => [
      "ALL",
      ...new Set(
        assets.map((asset) =>
          assetFolder(asset.path),
        ),
      ),
    ],
    [assets],
  );
  const visibleAssets = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    return assets.filter((asset) => {
      if (
        folder !== "ALL" &&
        assetFolder(asset.path) !==
          folder
      ) {
        return false;
      }

      return (
        !query ||
        asset.name
          .toLowerCase()
          .includes(query) ||
        asset.path
          .toLowerCase()
          .includes(query)
      );
    });
  }, [
    assets,
    folder,
    search,
  ]);
  const selectedAsset =
    assets.find(
      (asset) =>
        asset.path === selectedPath,
    ) ?? null;
  const selectedLayerAsset =
    layers.find(
      (layer) =>
        selectedLayerIds.includes(
          layer.id,
        ),
    )?.asset;

  return (
    <section
      style={{
        minHeight: 0,
        display: "grid",
        gridTemplateRows:
          "48px auto minmax(0,1fr) auto",
        borderTop:
          "1px solid rgba(70,210,255,0.14)",
        background: "#070b0e",
      }}
    >
      <PanelTitle
        title="ASSETS"
        subtitle={`${assets.length} PNG`}
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "minmax(0,1fr) 90px",
          gap: 6,
          padding: "8px",
        }}
      >
        <input
          type="search"
          value={search}
          placeholder="Search assets"
          onChange={(event) =>
            setSearch(
              event.target.value,
            )
          }
          style={controlStyle}
        />
        <select
          value={folder}
          onChange={(event) =>
            setFolder(
              event.target.value,
            )
          }
          style={controlStyle}
        >
          {folders.map((item) => (
            <option
              key={item}
              value={item}
            >
              {item === "ALL"
                ? "All folders"
                : item.split("/").at(-1)}
            </option>
          ))}
        </select>
      </div>

      <div
        style={{
          minHeight: 0,
          overflowY: "auto",
          display: "grid",
          gridTemplateColumns:
            "repeat(2,minmax(0,1fr))",
          alignContent: "start",
          gap: 7,
          padding: "0 8px 10px",
        }}
      >
        {visibleAssets.map((asset) => {
          const source =
            assetUrls.get(asset.path) ??
            "";
          const missing = !source;
          const selected =
            selectedPath ===
            asset.path;

          return (
            <button
              key={asset.path}
              type="button"
              draggable
              title={asset.path}
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed =
                  "copy";
                event.dataTransfer.setData(
                  "application/x-genesis-asset",
                  asset.path,
                );
                event.dataTransfer.setData(
                  "text/plain",
                  asset.path,
                );
              }}
              onClick={() =>
                setSelectedPath(
                  asset.path,
                )
              }
              onDoubleClick={() =>
                onCreateLayerFromAsset(
                  asset.path,
                )
              }
              style={{
                minWidth: 0,
                padding: 5,
                border: selected
                  ? "1px solid rgba(78,213,255,0.72)"
                  : "1px solid rgba(255,255,255,0.07)",
                borderRadius: 5,
                color:
                  "rgba(255,255,255,0.72)",
                background: selected
                  ? "rgba(41,175,218,0.16)"
                  : "rgba(255,255,255,0.025)",
                textAlign: "left",
                cursor: "grab",
              }}
            >
              <span
                aria-label={
                  missing
                    ? "Missing asset preview"
                    : `${asset.name} preview`
                }
                style={{
                  height: 62,
                  display: "grid",
                  placeItems: "center",
                  borderRadius: 3,
                  border:
                    "1px solid rgba(255,255,255,0.05)",
                  color: "#ffd36a",
                  backgroundColor:
                    "#11171a",
                  backgroundImage:
                    source
                      ? `linear-gradient(45deg,rgba(255,255,255,.025) 25%,transparent 25%,transparent 75%,rgba(255,255,255,.025) 75%),linear-gradient(45deg,rgba(255,255,255,.025) 25%,transparent 25%,transparent 75%,rgba(255,255,255,.025) 75%),url("${source}")`
                      : undefined,
                  backgroundPosition:
                    source
                      ? "0 0,6px 6px,center"
                      : undefined,
                  backgroundSize:
                    source
                      ? "12px 12px,12px 12px,contain"
                      : undefined,
                  backgroundRepeat:
                    source
                      ? "repeat,repeat,no-repeat"
                      : undefined,
                  fontSize: 18,
                }}
              >
                {missing ? "⚠" : ""}
              </span>

              <span
                style={{
                  display: "block",
                  marginTop: 5,
                  overflow: "hidden",
                  textOverflow:
                    "ellipsis",
                  whiteSpace: "nowrap",
                  fontSize: 9,
                }}
              >
                {asset.name}
              </span>
              <span
                style={{
                  display: "block",
                  marginTop: 2,
                  color:
                    "rgba(255,255,255,0.32)",
                  fontSize: 7,
                  textTransform:
                    "uppercase",
                }}
              >
                {asset.source}
                {asset.width &&
                asset.height
                  ? ` · ${asset.width}×${asset.height}`
                  : ""}
              </span>
            </button>
          );
        })}
      </div>

      <div
        style={{
          display: "grid",
          gap: 6,
          padding: 8,
          borderTop:
            "1px solid rgba(70,210,255,0.08)",
        }}
      >
        {selectedAsset && (
          <div
            style={{
              color:
                "rgba(255,255,255,0.42)",
              fontSize: 8,
              lineHeight: 1.5,
            }}
          >
            {selectedAsset.width ??
              "?"}
            ×
            {selectedAsset.height ??
              "?"}{" "}
            ·{" "}
            {selectedAsset.hasAlpha ===
            undefined
              ? "ALPHA UNKNOWN"
              : selectedAsset.hasAlpha
                ? "TRANSPARENT"
                : "OPAQUE"}
            {" · "}
            {selectedAsset.byteLength
              ? `${Math.ceil(selectedAsset.byteLength / 1024)} KB`
              : "SIZE UNKNOWN"}
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(4,minmax(0,1fr))",
            gap: 5,
          }}
        >
          <LibraryButton
            label="IMPORT"
            disabled={!actorLoaded}
            onClick={() =>
              importInputRef.current?.click()
            }
          />
          <LibraryButton
            label="ADD LAYER"
            disabled={!selectedAsset}
            onClick={() => {
              if (selectedAsset) {
                onCreateLayerFromAsset(
                  selectedAsset.path,
                );
              }
            }}
          />
          <LibraryButton
            label="REPLACE"
            disabled={
              !selectedAsset &&
              !selectedLayerAsset
            }
            onClick={() =>
              replaceInputRef.current?.click()
            }
          />
          <LibraryButton
            label="DELETE"
            tone="#ffaaaa"
            disabled={!selectedAsset}
            onClick={() => {
              if (selectedAsset) {
                onDeleteAsset(
                  selectedAsset.path,
                );
                setSelectedPath(null);
              }
            }}
          />
        </div>

        <input
          ref={importInputRef}
          type="file"
          accept="image/png"
          multiple
          hidden
          onChange={(event) => {
            const files = [
              ...(
                event.target.files ??
                []
              ),
            ];
            event.target.value = "";

            if (files.length > 0) {
              onImportPngs(files);
            }
          }}
        />
        <input
          ref={replaceInputRef}
          type="file"
          accept="image/png"
          hidden
          onChange={(event) => {
            const file =
              event.target.files?.[0];
            event.target.value = "";
            const path =
              selectedAsset?.path ??
              selectedLayerAsset;

            if (file && path) {
              onReplaceAsset(
                path,
                file,
              );
            }
          }}
        />
      </div>
    </section>
  );
}

const controlStyle:
  React.CSSProperties = {
    minWidth: 0,
    width: "100%",
    boxSizing: "border-box",
    padding: "6px 7px",
    border:
      "1px solid rgba(255,255,255,0.1)",
    borderRadius: 4,
    color: "#ffffff",
    background: "#10171b",
    fontSize: 9,
  };

function LibraryButton({
  label,
  onClick,
  disabled = false,
  tone = "rgba(255,255,255,0.68)",
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        minHeight: 28,
        padding: "4px",
        border:
          "1px solid rgba(92,216,255,0.16)",
        borderRadius: 4,
        color: tone,
        background:
          "rgba(255,255,255,0.035)",
        fontSize: 8,
        cursor: disabled
          ? "not-allowed"
          : "pointer",
        opacity: disabled ? 0.35 : 1,
      }}
    >
      {label}
    </button>
  );
}
