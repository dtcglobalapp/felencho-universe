"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  calculateActorCompleteness,
} from "../domain/ActorCompleteness";
import {
  normalizeActorDefinition,
  sortActorLayers,
} from "../domain/ActorNormalizer";
import {
  canAssignActorParent,
  getEffectiveLayerState,
} from "../domain/ActorHierarchy";
import {
  validateActorDefinition,
} from "../domain/ActorValidator";
import {
  ActorAssetRepository,
  createImportedAssetPath,
  inspectPngMetadata,
} from "../lib/ActorAssetRepository";
import {
  loadActorImage,
  resolveActorAssets,
} from "../lib/ActorAssetResolver";
import {
  createPortableActorPackage,
  readPortableActorPackage,
  serializeActorJson,
} from "../lib/ActorExporter";
import {
  loadActor,
} from "../lib/ActorLoader";
import {
  loadActorRegistry,
} from "../lib/ActorRegistry";
import ActorValidationPanel from "./components/ActorValidationPanel";
import ActorSetupPanel from "./components/ActorSetupPanel";
import AssetLibrary from "./components/AssetLibrary";
import DiagnosticsPanel from "./components/DiagnosticsPanel";
import HistoryPanel from "./components/HistoryPanel";
import Inspector from "./components/Inspector";
import LayersPanel from "./components/LayersPanel";
import MouthBuilder from "./components/MouthBuilder";
import ProjectHub from "./components/ProjectHub";
import RigMapper from "./components/RigMapper";
import StudioCanvas from "./components/StudioCanvas";
import Toolbar from "./components/Toolbar";
import {
  ActorDocumentCommands,
} from "./domain/ActorDocumentCommands";
import {
  EMPTY_STUDIO_SELECTION,
  StudioSelection,
} from "./domain/StudioSelection";
import {
  StudioHistory,
} from "./domain/StudioHistory";
import {
  ActorProjectRepository,
  createEmptyActorDefinition,
} from "./domain/ActorProjectRepository";
import {
  diagnoseStudioActor,
} from "./domain/StudioDiagnostics";

import type {
  ActorAssetDefinition,
  ActorDefinition,
  ActorDiagnostic,
  ActorMouthPose,
  ActorTransform,
  LoadedActor,
} from "../types/Actor";
import type {
  ActorPoint,
} from "../domain/ActorTransformResolver";
import type {
  ActorDocumentCommandResult,
} from "./domain/ActorDocumentCommands";
import type {
  LayerRowSelectModifiers,
} from "./components/LayerRow";
import type {
  StudioGuide,
  StudioViewportState,
} from "./components/StudioCanvas";
import type {
  StudioSelectionState,
} from "./domain/StudioSelection";
import type {
  ActorProjectSummary,
} from "./domain/ActorProjectRepository";

const DEFAULT_ACTOR_ID = "Bob";
const HISTORY_LIMIT = 100;
const LIVE_VALIDATION_CODES =
  new Set([
    "EMPTY_LAYER_COLLECTION",
    "MISSING_LAYER_ASSET",
    "UNSUPPORTED_LAYER_TYPE",
    "MISSING_LAYER_FOLDER",
    "UNDECLARED_LAYER_ASSET",
    "MISSING_RIG_TARGET",
    "MISSING_REQUIRED_MOUTH_POSE",
    "MISSING_MOUTH_POSE_TARGET",
  ]);
const ASSET_RUNTIME_DIAGNOSTIC_CODES =
  new Set([
    "LOCAL_ASSET_MISSING",
    "ASSET_STORAGE_UNAVAILABLE",
    "LAYER_ASSET_LOAD_FAILED",
  ]);

type ActorLoadState =
  | "loading"
  | "ready"
  | "error";

type RightPanel =
  | "inspector"
  | "setup"
  | "rig"
  | "mouth"
  | "validation"
  | "diagnostics"
  | "history";

interface AvatarStudioProps {
  actorId?: string;
}

function getDraftStorageKey(
  actorId: string,
): string {
  return `felencho-avatar-studio:${actorId.toLowerCase()}:draft`;
}

function actorIdFromUnknown(
  value: unknown,
  fallback: string,
): string {
  if (
    value &&
    typeof value === "object" &&
    "id" in value &&
    typeof value.id === "string" &&
    value.id.trim()
  ) {
    return value.id.trim();
  }

  return fallback;
}

function withDefinition(
  actor: LoadedActor,
  definition: ActorDefinition,
): LoadedActor {
  const layerImages = new Map<
    string,
    HTMLImageElement
  >();

  for (const layer of definition.layers) {
    const image =
      actor.assetImages.get(
        layer.asset,
      );

    if (image) {
      layerImages.set(layer.id, image);
    }
  }

  return {
    ...actor,
    definition,
    layerImages,
  };
}

function downloadBlob(
  blob: Blob,
  fileName: string,
): void {
  const url =
    URL.createObjectURL(blob);
  const link =
    document.createElement("a");

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 0);
}

function diagnosticsKey(
  diagnostic: ActorDiagnostic,
): string {
  return [
    diagnostic.severity,
    diagnostic.code,
    diagnostic.path ?? "",
    diagnostic.layerId ?? "",
    diagnostic.message,
  ].join(":");
}

function uniqueDiagnostics(
  diagnostics:
    readonly ActorDiagnostic[],
): ActorDiagnostic[] {
  const unique = new Map<
    string,
    ActorDiagnostic
  >();

  for (const item of diagnostics) {
    unique.set(
      diagnosticsKey(item),
      item,
    );
  }

  return [...unique.values()];
}

export default function AvatarStudio({
  actorId = DEFAULT_ACTOR_ID,
}: AvatarStudioProps) {
  const requestedActorId =
    actorId.trim() ||
    DEFAULT_ACTOR_ID;
  const [
    activeProjectKey,
    setActiveProjectKey,
  ] = useState(requestedActorId);
  const storageKey = useMemo(
    () =>
      getDraftStorageKey(
        activeProjectKey,
      ),
    [activeProjectKey],
  );
  const repositoryRef = useRef(
    new ActorAssetRepository(),
  );
  const historyRef = useRef(
    new StudioHistory(HISTORY_LIMIT),
  );
  const projectRepositoryRef =
    useRef(
      new ActorProjectRepository(),
    );
  const actorStorageIdRef =
    useRef(requestedActorId);
  const actorRef =
    useRef<LoadedActor | null>(null);
  const selectionRef =
    useRef<StudioSelectionState>({
      ...EMPTY_STUDIO_SELECTION,
    });
  const viewportRef =
    useRef<StudioViewportState>({
      zoom: 1,
      panX: 0,
      panY: 0,
    });
  const transactionChangedRef =
    useRef(false);
  const [
    actor,
    setActor,
  ] = useState<LoadedActor | null>(
    null,
  );
  const [
    actorLoadState,
    setActorLoadState,
  ] = useState<ActorLoadState>(
    "loading",
  );
  const [
    actorLoadError,
    setActorLoadError,
  ] = useState<string | null>(
    null,
  );
  const [
    selection,
    setSelection,
  ] = useState<StudioSelectionState>({
    ...EMPTY_STUDIO_SELECTION,
  });
  const [viewport, setViewport] =
    useState<StudioViewportState>({
      zoom: 1,
      panX: 0,
      panY: 0,
    });
  const [showGrid, setShowGrid] =
    useState(true);
  const [
    showSafeArea,
    setShowSafeArea,
  ] = useState(false);
  const [
    showRulers,
    setShowRulers,
  ] = useState(true);
  const [
    snapToGrid,
    setSnapToGrid,
  ] = useState(false);
  const [guides, setGuides] =
    useState<StudioGuide[]>([]);
  const [soloMode, setSoloMode] =
    useState(false);
  const [dimOthers, setDimOthers] =
    useState(true);
  const [status, setStatus] =
    useState("Cargando actor...");
  const [savedAt, setSavedAt] =
    useState<string | null>(null);
  const [
    historyStatus,
    setHistoryStatus,
  ] = useState({
    canUndo: false,
    canRedo: false,
    pastCount: 0,
    futureCount: 0,
    pastLabels: [] as string[],
    futureLabels: [] as string[],
  });
  const [
    rightPanel,
    setRightPanel,
  ] = useState<RightPanel>(
    "inspector",
  );
  const [
    projectHubOpen,
    setProjectHubOpen,
  ] = useState(false);
  const [
    localProjects,
    setLocalProjects,
  ] = useState<
    ActorProjectSummary[]
  >([]);
  const [
    bundledActors,
    setBundledActors,
  ] = useState<
    {
      key: string;
      name: string;
      version: string;
      description: string;
    }[]
  >([]);

  const refreshHistory = useCallback(
    () => {
      const history =
        historyRef.current;

      setHistoryStatus({
        canUndo: history.canUndo,
        canRedo: history.canRedo,
        pastCount:
          history.pastCount,
        futureCount:
          history.futureCount,
        pastLabels:
          history.pastLabels,
        futureLabels:
          history.futureLabels,
      });
    },
    [],
  );

  const refreshProjects =
    useCallback(() => {
      setLocalProjects(
        projectRepositoryRef.current.list(),
      );
    }, []);

  useEffect(() => {
    refreshProjects();
  }, [refreshProjects]);

  useEffect(() => {
    loadActorRegistry()
      .then((registry) => {
        setBundledActors(
          registry.actors.map(
            (entry) => ({
              key:
                entry.definition
                  .split("/")
                  .filter(Boolean)
                  .at(-2) ??
                entry.id,
              name: entry.name,
              version: entry.version,
              description:
                entry.description,
            }),
          ),
        );
      })
      .catch(() => {
        setBundledActors([
          {
            key: "Bob",
            name: "Bob",
            version: "development",
            description:
              "Bundled actor project",
          },
        ]);
      });
  }, []);

  const updateSelection = useCallback(
    (
      next:
        | StudioSelectionState
        | ((
            current:
              StudioSelectionState,
          ) => StudioSelectionState),
    ) => {
      const resolved =
        typeof next === "function"
          ? next(selectionRef.current)
          : next;

      selectionRef.current =
        resolved;
      setSelection(resolved);
    },
    [],
  );

  const updateViewport = useCallback(
    (next: StudioViewportState) => {
      viewportRef.current = next;
      setViewport(next);
    },
    [],
  );

  const setCurrentActor = useCallback(
    (next: LoadedActor | null) => {
      const current =
        actorRef.current;
      const retainedUrls = new Set(
        next?.objectUrls ?? [],
      );

      for (
        const url of
        current?.objectUrls ?? []
      ) {
        if (!retainedUrls.has(url)) {
          URL.revokeObjectURL(url);
        }
      }

      actorRef.current = next;
      setActor(next);
    },
    [],
  );

  useEffect(
    () => () => {
      for (
        const url of
        actorRef.current
          ?.objectUrls ?? []
      ) {
        URL.revokeObjectURL(url);
      }
    },
    [],
  );

  const applyCommand = useCallback(
    (
      label: string,
      command:
        ActorDocumentCommandResult,
    ): boolean => {
      const current =
        actorRef.current;

      if (!current || !command.changed) {
        return false;
      }

      historyRef.current.record(
        label,
        current.definition,
        selectionRef.current,
      );

      const nextActor =
        withDefinition(
          current,
          command.definition,
        );
      const orderedIds = [
        ...command.definition.groups.map(
          (group) => group.id,
        ),
        ...sortActorLayers(
          command.definition.layers,
          "descending",
        ).map((layer) => layer.id),
      ];
      const nextSelection =
        StudioSelection.replace(
          command.selectionIds,
          orderedIds,
        );

      setCurrentActor(nextActor);
      updateSelection(nextSelection);
      transactionChangedRef.current =
        true;
      refreshHistory();
      setStatus(label);
      return true;
    },
    [
      refreshHistory,
      setCurrentActor,
      updateSelection,
    ],
  );

  const runCommand = useCallback(
    (
      label: string,
      create: (
        definition: ActorDefinition,
        selectionIds:
          readonly string[],
      ) => ActorDocumentCommandResult,
    ): boolean => {
      const current =
        actorRef.current;

      if (!current) {
        return false;
      }

      return applyCommand(
        label,
        create(
          current.definition,
          selectionRef.current.ids,
        ),
      );
    },
    [applyCommand],
  );

  const hydrateDefinition =
    useCallback(
      async (
        definition: ActorDefinition,
        baseDiagnostics:
          readonly ActorDiagnostic[] = [],
      ): Promise<LoadedActor> => {
        const resolved =
          await resolveActorAssets(
            definition,
            repositoryRef.current,
          );

        return {
          definition,
          layerImages:
            resolved.layerImages,
          assetImages:
            resolved.assetImages,
          assetUrls:
            resolved.assetUrls,
          diagnostics:
            uniqueDiagnostics([
              ...baseDiagnostics,
              ...resolved.diagnostics,
            ]),
          objectUrls:
            resolved.objectUrls,
        };
      },
      [],
    );

  const restoreHistory =
    useCallback(
      async (
        direction: "undo" | "redo",
      ) => {
        const current =
          actorRef.current;

        if (!current) {
          return;
        }

        const restored =
          direction === "undo"
            ? historyRef.current.undo(
                current.definition,
                selectionRef.current,
              )
            : historyRef.current.redo(
                current.definition,
                selectionRef.current,
              );

        if (!restored) {
          setStatus(
            direction === "undo"
              ? "No hay cambios para deshacer"
              : "No hay cambios para rehacer",
          );
          return;
        }

        try {
          const nextActor =
            await hydrateDefinition(
              restored.snapshot
                .definition,
            );
          const orderedIds = [
            ...nextActor.definition.groups.map(
              (group) => group.id,
            ),
            ...sortActorLayers(
              nextActor.definition.layers,
              "descending",
            ).map(
              (layer) => layer.id,
            ),
          ];

          setCurrentActor(nextActor);
          updateSelection(
            StudioSelection.reconcile(
              restored.snapshot
                .selection,
              orderedIds,
            ),
          );
          setStatus(
            `${direction === "undo" ? "Undo" : "Redo"} · ${restored.label}`,
          );
          refreshHistory();
        } catch (error: unknown) {
          setStatus(
            error instanceof Error
              ? error.message
              : "No se pudo restaurar el historial.",
          );
        }
      },
      [
        hydrateDefinition,
        refreshHistory,
        setCurrentActor,
        updateSelection,
      ],
    );

  useEffect(() => {
    let active = true;

    window.queueMicrotask(() => {
      if (!active) {
        return;
      }

      setCurrentActor(null);
      updateSelection(
        StudioSelection.clear(),
      );
      historyRef.current.clear();
      setActorLoadState("loading");
      setActorLoadError(null);
      setSavedAt(null);
      setStatus(
        `Loading ${activeProjectKey}...`,
      );
      refreshHistory();
    });

    const prepare = async () => {
      const localDefinition =
        projectRepositoryRef.current.load(
          activeProjectKey,
        );
      const base = localDefinition
        ? await (() => {
            const normalized =
              normalizeActorDefinition(
                localDefinition,
                {
                  sourceActorId:
                    activeProjectKey,
                },
              );

            return hydrateDefinition(
              normalized.definition,
              normalized.warnings,
            );
          })()
        : await loadActor(
            activeProjectKey,
            repositoryRef.current,
          );
      let definition =
        base.definition;
      let diagnostics = [
        ...base.diagnostics,
      ];

      try {
        const stored =
          window.localStorage.getItem(
            storageKey,
          );

        if (stored) {
          const parsed: unknown =
            JSON.parse(stored);
          const normalized =
            normalizeActorDefinition(
              parsed,
              {
                sourceActorId:
                  actorIdFromUnknown(
                    parsed,
                    activeProjectKey,
                  ),
              },
            );

          definition =
            normalized.definition;
          diagnostics = [
            ...normalized.warnings,
          ];
        }
      } catch {
        diagnostics.push({
          severity: "warning",
          code:
            "DRAFT_RESTORE_FAILED",
          message:
            "El borrador local no pudo restaurarse; se cargó la definición original.",
        });
      }

      if (
        definition === base.definition
      ) {
        return base;
      }

      for (const url of base.objectUrls) {
        URL.revokeObjectURL(url);
      }

      return hydrateDefinition(
        definition,
        diagnostics,
      );
    };

    prepare()
      .then((loaded) => {
        if (!active) {
          for (
            const url of
            loaded.objectUrls
          ) {
            URL.revokeObjectURL(url);
          }
          return;
        }

        setCurrentActor(loaded);
        actorStorageIdRef.current =
          loaded.definition.id;
        setActorLoadState("ready");
        const ordered =
          sortActorLayers(
            loaded.definition.layers,
            "descending",
          );
        const initial =
          StudioSelection.replace(
            ordered[0]
              ? [ordered[0].id]
              : [],
            ordered.map(
              (layer) => layer.id,
            ),
          );

        updateSelection(initial);
        setStatus(
          `${loaded.definition.name} · ${loaded.layerImages.size}/${loaded.definition.layers.length} capas cargadas`,
        );
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }

        const message =
          error instanceof Error
            ? error.message
            : "No se pudo cargar el actor.";

        setCurrentActor(null);
        updateSelection(
          StudioSelection.clear(),
        );
        setActorLoadState("error");
        setActorLoadError(message);
        setStatus(message);
      });

    return () => {
      active = false;
    };
  }, [
    hydrateDefinition,
    activeProjectKey,
    refreshHistory,
    setCurrentActor,
    storageKey,
    updateSelection,
  ]);

  useEffect(() => {
    if (!actor) {
      return;
    }

    const timeout =
      window.setTimeout(() => {
        try {
          window.localStorage.setItem(
            storageKey,
            serializeActorJson(
              actor.definition,
            ),
          );
          setSavedAt(
            new Date().toLocaleTimeString(),
          );
        } catch {
          setStatus(
            "El borrador local no pudo guardarse. Exporta el actor para conservar los cambios.",
          );
        }
      }, 300);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [
    actor,
    storageKey,
  ]);

  useEffect(() => {
    if (!actor) {
      return;
    }

    const orderedIds = [
      ...actor.definition.groups.map(
        (group) => group.id,
      ),
      ...sortActorLayers(
        actor.definition.layers,
        "descending",
      ).map((layer) => layer.id),
    ];
    const reconciled =
      StudioSelection.reconcile(
        selectionRef.current,
        orderedIds,
      );

    if (
      reconciled !==
      selectionRef.current
    ) {
      updateSelection(reconciled);
    }
  }, [
    actor,
    updateSelection,
  ]);

  const deleteSelectedLayers =
    useCallback(
      (
        layerIds:
          readonly string[] =
          selectionRef.current.ids,
      ) => {
        if (layerIds.length === 0) {
          return;
        }

        runCommand(
          "Delete selection",
          (definition) => {
            const selectedLayers =
              layerIds.filter((id) =>
                definition.layers.some(
                  (layer) =>
                    layer.id === id,
                ),
              );
            const selectedGroups =
              layerIds.filter((id) =>
                definition.groups.some(
                  (group) =>
                    group.id === id,
                ),
              );
            const layersCommand =
              ActorDocumentCommands.deleteLayers(
                definition,
                selectedLayers,
              );
            const groupCommand =
              ActorDocumentCommands.deleteGroups(
                layersCommand.definition,
                selectedGroups,
                layersCommand.selectionIds,
              );

            return {
              definition:
                groupCommand.definition,
              selectionIds:
                groupCommand.selectionIds,
              changed:
                layersCommand.changed ||
                groupCommand.changed,
            };
          },
        );
      },
      [runCommand],
    );

  const duplicateLayers = useCallback(
    (
      layerIds:
        readonly string[] =
        selectionRef.current.ids,
    ): readonly string[] => {
      const current =
        actorRef.current;

      if (!current) {
        return [];
      }

      const command =
        ActorDocumentCommands.duplicateLayers(
          current.definition,
          layerIds,
        );

      applyCommand(
        "Duplicate layers",
        command,
      );
      return command.changed
        ? command.selectionIds
        : layerIds;
    },
    [applyCommand],
  );

  const nudgeSelection = useCallback(
    (
      deltaX: number,
      deltaY: number,
    ) => {
      runCommand(
        "Move selection",
        (
          definition,
          selectionIds,
        ) => {
          const layerIds =
            selectionIds.filter((id) =>
              definition.layers.some(
                (layer) =>
                  layer.id === id,
              ),
            );
          const groupIds =
            selectionIds.filter((id) =>
              definition.groups.some(
                (group) =>
                  group.id === id,
              ),
            );
          let currentDefinition =
            definition;
          let changed = false;
          const layerCommand =
            ActorDocumentCommands.moveLayers(
              currentDefinition,
              layerIds,
              deltaX,
              deltaY,
            );

          currentDefinition =
            layerCommand.definition;
          changed =
            layerCommand.changed;

          for (
            const groupId of groupIds
          ) {
            const group =
              currentDefinition.groups.find(
                (item) =>
                  item.id === groupId,
              );

            if (!group || group.locked) {
              continue;
            }

            const groupCommand =
              ActorDocumentCommands.updateGroup(
                currentDefinition,
                groupId,
                {
                  transform: {
                    x:
                      group.transform.x +
                      deltaX,
                    y:
                      group.transform.y +
                      deltaY,
                  },
                },
                selectionIds,
              );

            currentDefinition =
              groupCommand.definition;
            changed =
              changed ||
              groupCommand.changed;
          }

          return {
            definition:
              currentDefinition,
            selectionIds: [
              ...selectionIds,
            ],
            changed,
          };
        },
      );
    },
    [runCommand],
  );

  useEffect(() => {
    const keyDown = (
      event: KeyboardEvent,
    ) => {
      const target =
        event.target instanceof
        HTMLElement
          ? event.target
          : null;
      const typing =
        target?.tagName === "INPUT" ||
        target?.tagName ===
          "TEXTAREA" ||
        target?.tagName === "SELECT" ||
        target?.isContentEditable;
      const commandKey =
        event.metaKey ||
        event.ctrlKey;

      if (typing) {
        return;
      }

      if (
        commandKey &&
        event.key.toLowerCase() ===
          "a"
      ) {
        event.preventDefault();
        const current =
          actorRef.current;

        if (current) {
          const ids =
            sortActorLayers(
              current.definition.layers,
              "descending",
            ).map(
              (layer) =>
                layer.id,
            );

          updateSelection(
            StudioSelection.replace(
              ids,
              ids,
            ),
          );
        }
        return;
      }

      if (
        event.key === "Escape"
      ) {
        updateSelection(
          StudioSelection.clear(),
        );
        return;
      }

      if (
        commandKey &&
        event.key.toLowerCase() ===
          "z"
      ) {
        event.preventDefault();
        void restoreHistory(
          event.shiftKey
            ? "redo"
            : "undo",
        );
        return;
      }

      if (
        commandKey &&
        event.key.toLowerCase() ===
          "y"
      ) {
        event.preventDefault();
        void restoreHistory("redo");
        return;
      }

      if (
        commandKey &&
        event.key.toLowerCase() ===
          "d"
      ) {
        event.preventDefault();
        duplicateLayers();
        return;
      }

      if (
        event.key === "Delete" ||
        event.key === "Backspace"
      ) {
        event.preventDefault();
        deleteSelectedLayers();
        return;
      }

      const amount =
        event.shiftKey ? 10 : 1;

      if (
        event.key === "ArrowLeft"
      ) {
        event.preventDefault();
        nudgeSelection(-amount, 0);
      }

      if (
        event.key === "ArrowRight"
      ) {
        event.preventDefault();
        nudgeSelection(amount, 0);
      }

      if (
        event.key === "ArrowUp"
      ) {
        event.preventDefault();
        nudgeSelection(0, -amount);
      }

      if (
        event.key === "ArrowDown"
      ) {
        event.preventDefault();
        nudgeSelection(0, amount);
      }
    };

    window.addEventListener(
      "keydown",
      keyDown,
    );

    return () => {
      window.removeEventListener(
        "keydown",
        keyDown,
      );
    };
  }, [
    deleteSelectedLayers,
    duplicateLayers,
    nudgeSelection,
    restoreHistory,
    updateSelection,
  ]);

  const importPngs = useCallback(
    async (
      files: readonly File[],
    ) => {
      const current =
        actorRef.current;

      if (!current) {
        return;
      }

      let workingActor = current;
      let workingSelection =
        selectionRef.current;
      const beforeDefinition =
        current.definition;
      const beforeSelection =
        selectionRef.current;
      let imported = 0;
      let failed = 0;
      let lastFailure:
        string | null = null;

      for (const file of files) {
        let source:
          string | null = null;

        try {
          if (
            file.type !==
              "image/png" &&
            !file.name
              .toLowerCase()
              .endsWith(".png")
          ) {
            throw new Error(
              `${file.name} is not a PNG file.`,
            );
          }

          const metadata =
            await inspectPngMetadata(
              file,
            );
          const path =
            createImportedAssetPath(
              workingActor.definition.id,
              file.name,
              new Set(
                workingActor.definition.assets.map(
                  (asset) =>
                    asset.path,
                ),
              ),
            );
          const asset:
            ActorAssetDefinition = {
            path,
            name: file.name,
            mediaType:
              "image/png",
            source: "local",
            ...metadata,
          };

          source =
            URL.createObjectURL(file);
          const image =
            await loadActorImage(source);

          await repositoryRef.current.putAsset(
            workingActor.definition.id,
            asset,
            file,
          );
          const assetImages = new Map(
            workingActor.assetImages,
          );
          const assetUrls = new Map(
            workingActor.assetUrls,
          );

          assetImages.set(path, image);
          assetUrls.set(path, source);
          workingActor = {
            ...workingActor,
            assetImages,
            assetUrls,
            objectUrls: [
              ...workingActor.objectUrls,
              source,
            ],
          };

          const assetCommand =
            ActorDocumentCommands.addAsset(
              workingActor.definition,
              asset,
              workingSelection.ids,
            );
          const layerCommand =
            ActorDocumentCommands.createLayer(
              assetCommand.definition,
              {
                id: file.name,
                name: file.name.replace(
                  /\.png$/i,
                  "",
                ),
                asset: path,
                width:
                  metadata.width,
                height:
                  metadata.height,
              },
            );

          workingActor =
            withDefinition(
              workingActor,
              layerCommand.definition,
            );
          source = null;
          workingSelection =
            StudioSelection.replace(
              layerCommand.selectionIds,
              sortActorLayers(
                layerCommand.definition
                  .layers,
                "descending",
              ).map(
                (layer) => layer.id,
              ),
            );
          imported += 1;
        } catch (error: unknown) {
          if (source) {
            URL.revokeObjectURL(
              source,
            );
          }

          failed += 1;
          lastFailure =
            error instanceof Error
              ? error.message
              : `No se pudo importar ${file.name}.`;
        }
      }

      if (imported === 0) {
        setStatus(
          lastFailure ??
            "No se importó ningún PNG.",
        );
        return;
      }

      historyRef.current.record(
        `Import ${imported} PNG asset${imported === 1 ? "" : "s"}`,
        beforeDefinition,
        beforeSelection,
      );
      setCurrentActor(workingActor);
      updateSelection(
        workingSelection,
      );
      refreshHistory();
      setStatus(
        `${imported} PNG asset${imported === 1 ? "" : "s"} imported${failed > 0 ? ` · ${failed} failed` : ""}`,
      );
    },
    [
      refreshHistory,
      setCurrentActor,
      updateSelection,
    ],
  );

  const replaceAsset = useCallback(
    async (
      oldPath: string,
      file: File,
    ) => {
      const current =
        actorRef.current;

      if (!current) {
        return;
      }

      let source:
        string | null = null;

      try {
        const metadata =
          await inspectPngMetadata(
            file,
          );
        const path =
          createImportedAssetPath(
            current.definition.id,
            file.name,
            new Set(
              current.definition.assets
                .filter(
                  (asset) =>
                    asset.path !==
                    oldPath,
                )
                .map(
                  (asset) =>
                    asset.path,
                ),
            ),
          );
        const asset:
          ActorAssetDefinition = {
          path,
          name: file.name,
          mediaType: "image/png",
          source: "local",
          ...metadata,
        };

        source =
          URL.createObjectURL(file);
        const image =
          await loadActorImage(source);

        await repositoryRef.current.putAsset(
          current.definition.id,
          asset,
          file,
        );
        const assetImages = new Map(
          current.assetImages,
        );
        const assetUrls = new Map(
          current.assetUrls,
        );

        assetImages.set(path, image);
        assetUrls.set(path, source);

        const prepared: LoadedActor = {
          ...current,
          assetImages,
          assetUrls,
          objectUrls: [
            ...current.objectUrls,
            source,
          ],
        };
        actorRef.current = prepared;

        const command =
          ActorDocumentCommands.replaceAsset(
            current.definition,
            oldPath,
            asset,
            selectionRef.current.ids,
          );

        applyCommand(
          "Replace asset",
          command,
        );
        source = null;
      } catch (error: unknown) {
        if (source) {
          URL.revokeObjectURL(source);
        }

        setStatus(
          error instanceof Error
            ? error.message
            : "No se pudo reemplazar el recurso.",
        );
      }
    },
    [applyCommand],
  );

  const importPackage =
    useCallback(
      async (file: File) => {
        const current =
          actorRef.current;

        try {
          const imported =
            await readPortableActorPackage(
              file,
            );
          const importedActorId =
            actorIdFromUnknown(
              imported.definition,
              activeProjectKey,
            );
          const normalized =
            normalizeActorDefinition(
              imported.definition,
              {
                sourceActorId:
                  importedActorId,
              },
            );
          const packageAssets: {
            asset:
              ActorAssetDefinition;
            blob: Blob;
          }[] = [];

          for (
            const asset of
            normalized.definition.assets
          ) {
            const packagePath = [
              ...imported.assets.keys(),
            ].find(
              (path) =>
                asset.path === path ||
                asset.path.endsWith(
                  `/${path}`,
                ),
            );

            if (!packagePath) {
              throw new Error(
                `The package is missing required asset "${asset.path}".`,
              );
            }

            const blob =
              imported.assets.get(
                packagePath,
              );

            if (!blob) {
              throw new Error(
                `The package asset "${packagePath}" is unavailable.`,
              );
            }

            packageAssets.push({
              blob,
              asset: {
                ...asset,
                source: "packaged",
              },
            });
          }

          await repositoryRef.current.putAssets(
            normalized.definition.id,
            packageAssets,
          );

          const hydrated =
            await hydrateDefinition(
              {
                ...normalized.definition,
                assets:
                  normalized.definition.assets.map(
                    (asset) => ({
                      ...asset,
                      source:
                        "packaged",
                    }),
                  ),
              },
              normalized.warnings,
            );

          if (current) {
            historyRef.current.record(
              "Import actor package",
              current.definition,
              selectionRef.current,
            );
          } else {
            historyRef.current.clear();
          }
          setCurrentActor(hydrated);
          const ordered =
            sortActorLayers(
              hydrated.definition.layers,
              "descending",
            );
          updateSelection(
            StudioSelection.replace(
              ordered[0]
                ? [ordered[0].id]
                : [],
              ordered.map(
                (layer) => layer.id,
              ),
            ),
          );
          refreshHistory();
          setStatus(
            `${hydrated.definition.name} package imported`,
          );
        } catch (error: unknown) {
          setStatus(
            error instanceof Error
              ? error.message
              : "No se pudo importar el actor package.",
          );
        }
      },
      [
        hydrateDefinition,
        refreshHistory,
        activeProjectKey,
        setCurrentActor,
        updateSelection,
      ],
    );

  const exportActor = useCallback(
    () => {
      const current =
        actorRef.current;

      if (!current) {
        return;
      }

      downloadBlob(
        new Blob(
          [
            serializeActorJson(
              current.definition,
            ),
          ],
          {
            type:
              "application/json;charset=utf-8",
          },
        ),
        "actor.json",
      );
      setStatus(
        "actor.json exportado",
      );
    },
    [],
  );

  const exportPackage =
    useCallback(async () => {
      const current =
        actorRef.current;

      if (!current) {
        return;
      }

      setStatus(
        "Preparando actor package...",
      );

      try {
        const assetByPath = new Map(
          current.definition.assets.map(
            (asset) => [
              asset.path,
              asset,
            ],
          ),
        );
        const archive =
          await createPortableActorPackage(
            current.definition,
            async (path) => {
              const asset =
                assetByPath.get(path);

              if (
                asset?.source !==
                "bundled"
              ) {
                return (
                  await repositoryRef.current.getAssetBlob(
                    current.definition.id,
                    path,
                  )
                ) ??
                  repositoryRef.current.getAssetBlob(
                    actorStorageIdRef.current,
                    path,
                  );
              }

              try {
                const response =
                  await fetch(path, {
                    cache: "no-store",
                  });

                return response.ok
                  ? response.blob()
                  : null;
              } catch {
                return null;
              }
            },
          );

        downloadBlob(
          archive,
          `${current.definition.id}.genesis.zip`,
        );
        setStatus(
          "Portable actor package exportado",
        );
      } catch (error: unknown) {
        setStatus(
          error instanceof Error
            ? error.message
            : "No se pudo exportar el actor package.",
        );
      }
    }, []);

  const resetViewport = useCallback(
    () => {
      updateViewport({
        zoom: 1,
        panX: 0,
        panY: 0,
      });
      setStatus("Vista restaurada");
    },
    [updateViewport],
  );

  const centerActor = useCallback(
    () => {
      updateViewport({
        ...viewportRef.current,
        panX: 0,
        panY: 0,
      });
      setStatus("Actor centrado");
    },
    [updateViewport],
  );

  const resetActor = useCallback(
    async () => {
      const current =
        actorRef.current;

      if (!current) {
        return;
      }

      if (
        !window.confirm(
          `¿Restaurar la definición original de ${current.definition.name}?`,
        )
      ) {
        return;
      }

      try {
        const savedDefinition =
          projectRepositoryRef.current.load(
            activeProjectKey,
          );
        const original =
          savedDefinition
            ? await (() => {
                const normalized =
                  normalizeActorDefinition(
                    savedDefinition,
                    {
                      sourceActorId:
                        activeProjectKey,
                    },
                  );

                return hydrateDefinition(
                  normalized.definition,
                  normalized.warnings,
                );
              })()
            : await loadActor(
                activeProjectKey,
                repositoryRef.current,
              );

        historyRef.current.record(
          "Reset actor",
          current.definition,
          selectionRef.current,
        );
        window.localStorage.removeItem(
          storageKey,
        );
        setCurrentActor(original);
        const ordered =
          sortActorLayers(
            original.definition.layers,
            "descending",
          );

        updateSelection(
          StudioSelection.replace(
            ordered[0]
              ? [ordered[0].id]
              : [],
            ordered.map(
              (layer) => layer.id,
            ),
          ),
        );
        resetViewport();
        refreshHistory();
        setStatus(
          `${original.definition.name} restaurado`,
        );
      } catch (error: unknown) {
        setStatus(
          error instanceof Error
            ? error.message
            : "No se pudo restaurar el actor.",
        );
      }
    },
    [
      refreshHistory,
      activeProjectKey,
      hydrateDefinition,
      resetViewport,
      setCurrentActor,
      storageKey,
      updateSelection,
    ],
  );

  const copyStoredAssets =
    useCallback(
      async (
        definition: ActorDefinition,
        sourceActorId: string,
        targetActorId: string,
      ) => {
        if (
          sourceActorId.toLowerCase() ===
          targetActorId.toLowerCase()
        ) {
          return;
        }

        const entries: {
          asset:
            ActorAssetDefinition;
          blob: Blob;
        }[] = [];

        for (const asset of
          definition.assets) {
          if (
            asset.source ===
            "bundled"
          ) {
            continue;
          }

          const blob =
            (
              await repositoryRef.current.getAssetBlob(
                sourceActorId,
                asset.path,
              )
            ) ??
            (
              await repositoryRef.current.getAssetBlob(
                targetActorId,
                asset.path,
              )
            );

          if (blob) {
            entries.push({
              asset,
              blob,
            });
          }
        }

        await repositoryRef.current.putAssets(
          targetActorId,
          entries,
        );
      },
      [],
    );

  const saveCurrentProject =
    useCallback(async () => {
      const current =
        actorRef.current;

      if (!current) {
        return;
      }

      try {
        await copyStoredAssets(
          current.definition,
          actorStorageIdRef.current,
          current.definition.id,
        );
        projectRepositoryRef.current.save(
          activeProjectKey,
          current.definition,
        );
        actorStorageIdRef.current =
          current.definition.id;
        refreshProjects();
        setStatus(
          `${current.definition.name} saved`,
        );
      } catch (error: unknown) {
        setStatus(
          error instanceof Error
            ? error.message
            : "Project could not be saved.",
        );
      }
    }, [
      activeProjectKey,
      copyStoredAssets,
      refreshProjects,
    ]);

  const createProject =
    useCallback(
      (input: {
        id: string;
        name: string;
        width: number;
        height: number;
        fps: number;
      }) => {
        try {
          const definition =
            createEmptyActorDefinition(
              input,
            );
          const summary =
            projectRepositoryRef.current.create(
              definition,
            );

          refreshProjects();
          setProjectHubOpen(false);
          setActiveProjectKey(
            summary.key,
          );
        } catch (error: unknown) {
          setStatus(
            error instanceof Error
              ? error.message
              : "Actor project could not be created.",
          );
        }
      },
      [refreshProjects],
    );

  const openProject =
    useCallback((key: string) => {
      setProjectHubOpen(false);
      setActiveProjectKey(key);
    }, []);

  const saveProjectAs =
    useCallback(
      async (
        preferredKey: string,
      ) => {
        const current =
          actorRef.current;

        if (!current) {
          return;
        }

        try {
          await copyStoredAssets(
            current.definition,
            actorStorageIdRef.current,
            current.definition.id,
          );
          const summary =
            projectRepositoryRef.current.saveAs(
              current.definition,
              preferredKey,
            );

          actorStorageIdRef.current =
            current.definition.id;
          refreshProjects();
          setProjectHubOpen(false);
          setActiveProjectKey(
            summary.key,
          );
        } catch (error: unknown) {
          setStatus(
            error instanceof Error
              ? error.message
              : "Project copy could not be saved.",
          );
        }
      },
      [
        copyStoredAssets,
        refreshProjects,
      ],
    );

  const duplicateProject =
    useCallback(
      async (
        preferredKey: string,
        name: string,
      ) => {
        const current =
          actorRef.current;

        if (!current) {
          return;
        }

        const safeId =
          createEmptyActorDefinition({
            id: preferredKey,
            name,
            width:
              current.definition.width,
            height:
              current.definition.height,
            fps:
              current.definition.fps,
          }).id;
        const definition: ActorDefinition = {
          ...current.definition,
          id: safeId,
          name:
            name.trim() ||
            `${current.definition.name} Copy`,
        };

        try {
          await copyStoredAssets(
            definition,
            actorStorageIdRef.current,
            definition.id,
          );
          const summary =
            projectRepositoryRef.current.saveAs(
              definition,
              preferredKey,
            );

          refreshProjects();
          setProjectHubOpen(false);
          setActiveProjectKey(
            summary.key,
          );
        } catch (error: unknown) {
          setStatus(
            error instanceof Error
              ? error.message
              : "Project could not be duplicated.",
          );
        }
      },
      [
        copyStoredAssets,
        refreshProjects,
      ],
    );

  const deleteProject =
    useCallback(
      (key: string) => {
        projectRepositoryRef.current.delete(
          key,
        );
        refreshProjects();

        if (key === activeProjectKey) {
          setActiveProjectKey(
            DEFAULT_ACTOR_ID,
          );
        }
      },
      [
        activeProjectKey,
        refreshProjects,
      ],
    );

  const orderedLayers = useMemo(
    () =>
      actor
        ? sortActorLayers(
            actor.definition.layers,
            "descending",
          )
        : [],
    [actor],
  );
  const orderedLayerIds = useMemo(
    () =>
      orderedLayers.map(
        (layer) => layer.id,
      ),
    [orderedLayers],
  );
  const selectedLayers = useMemo(
    () =>
      selection.ids.flatMap(
        (id) => {
          const layer =
            actor?.definition.layers.find(
              (item) =>
                item.id === id,
            );
          return layer
            ? [layer]
            : [];
        },
      ),
    [
      actor,
      selection.ids,
    ],
  );
  const selectedGroups = useMemo(
    () =>
      selection.ids.flatMap(
        (id) => {
          const group =
            actor?.definition.groups.find(
              (item) =>
                item.id === id,
            );
          return group
            ? [group]
            : [];
        },
      ),
    [
      actor,
      selection.ids,
    ],
  );
  const loadedLayerIds = useMemo(
    () =>
      new Set(
        actor
          ? actor.layerImages.keys()
          : [],
      ),
    [actor],
  );
  const effectiveLockedLayerIds =
    useMemo(
      () =>
        new Set(
          actor
            ? actor.definition.layers
                .filter(
                  (layer) =>
                    getEffectiveLayerState(
                      actor.definition,
                      layer,
                    ).locked,
                )
                .map(
                  (layer) =>
                    layer.id,
                )
            : [],
        ),
      [actor],
    );
  const validation = useMemo(
    () =>
      actor
        ? validateActorDefinition(
            actor.definition,
          )
        : null,
    [actor],
  );
  const diagnostics = useMemo(
    () => {
      const currentLayerIds =
        new Set(
          actor?.definition.layers.map(
            (layer) => layer.id,
          ) ?? [],
        );
      const retainedDiagnostics =
        (
          actor?.diagnostics ?? []
        ).filter((item) => {
          if (
            LIVE_VALIDATION_CODES.has(
              item.code,
            )
          ) {
            return false;
          }

          if (
            item.layerId &&
            !currentLayerIds.has(
              item.layerId,
            )
          ) {
            return false;
          }

          return !(
            item.layerId &&
            loadedLayerIds.has(
              item.layerId,
            ) &&
            ASSET_RUNTIME_DIAGNOSTIC_CODES.has(
              item.code,
            )
          );
        });

      return uniqueDiagnostics([
        ...retainedDiagnostics,
        ...(validation?.errors ??
          []),
        ...(validation?.warnings ??
          []),
      ]);
    },
    [
      actor,
      loadedLayerIds,
      validation,
    ],
  );
  const completeness = useMemo(
    () =>
      actor
        ? calculateActorCompleteness(
            actor.definition,
          )
        : null,
    [actor],
  );
  const studioDiagnostics =
    useMemo(
      () =>
        actor
          ? diagnoseStudioActor(
              actor.definition,
              new Set(
                actor.assetUrls.keys(),
              ),
              diagnostics.filter(
                (item) =>
                  item.severity ===
                  "error",
              ).length,
            )
          : null,
      [actor, diagnostics],
    );

  const selectLayer = useCallback(
    (
      layerId: string,
      modifiers:
        LayerRowSelectModifiers,
    ): readonly string[] => {
      const next =
        StudioSelection.select(
          selectionRef.current,
          layerId,
          orderedLayerIds,
          modifiers,
        );

      updateSelection(next);
      return next.ids;
    },
    [
      orderedLayerIds,
      updateSelection,
    ],
  );

  const createLayerFromAsset =
    useCallback(
      (
        assetPath: string,
        point?: ActorPoint,
      ) => {
        const current =
          actorRef.current;

        if (!current) {
          return;
        }

        const asset =
          current.definition.assets.find(
            (item) =>
              item.path ===
              assetPath,
          );

        if (!asset) {
          return;
        }

        runCommand(
          "Create layer from asset",
          (definition) =>
            ActorDocumentCommands.createLayer(
              definition,
              {
                id: asset.name,
                name:
                  asset.name.replace(
                    /\.png$/i,
                    "",
                  ),
                asset: asset.path,
                x:
                  point?.x ??
                  0,
                y:
                  point?.y ??
                  0,
                width: asset.width,
                height: asset.height,
              },
            ),
        );
      },
      [runCommand],
    );

  const handleReorderLayers =
    useCallback(
      (
        draggedIds:
          readonly string[],
        targetLayerId: string,
      ) => {
        const dragged =
          new Set(draggedIds);
        const remaining =
          orderedLayerIds.filter(
            (id) => !dragged.has(id),
          );
        const targetIndex =
          remaining.indexOf(
            targetLayerId,
          );

        if (targetIndex < 0) {
          return;
        }

        const nextOrder = [
          ...remaining.slice(
            0,
            targetIndex,
          ),
          ...orderedLayerIds.filter(
            (id) => dragged.has(id),
          ),
          ...remaining.slice(
            targetIndex,
          ),
        ];

        runCommand(
          "Reorder layers",
          (
            definition,
            selectionIds,
          ) =>
            ActorDocumentCommands.reorderLayers(
              definition,
              nextOrder,
              selectionIds,
            ),
        );
      },
      [
        orderedLayerIds,
        runCommand,
      ],
    );

  const beginCanvasTransform =
    useCallback((label: string) => {
      const current =
        actorRef.current;

      if (
        !current ||
        historyRef.current
          .transactionActive
      ) {
        return;
      }

      transactionChangedRef.current =
        false;
      historyRef.current.beginTransaction(
        label,
        current.definition,
        selectionRef.current,
      );
    }, []);

  const endCanvasTransform =
    useCallback(
      (changed: boolean) => {
        historyRef.current.commitTransaction(
          changed ||
            transactionChangedRef.current,
        );
        transactionChangedRef.current =
          false;
        refreshHistory();
      },
      [refreshHistory],
    );

  const moveCanvasSelection =
    useCallback(
      (
        layerIds: readonly string[],
        deltaX: number,
        deltaY: number,
      ) =>
        runCommand(
          "Move layers",
          (definition) =>
            ActorDocumentCommands.moveLayers(
              definition,
              layerIds,
              deltaX,
              deltaY,
            ),
        ),
      [runCommand],
    );

  const setCanvasTransform =
    useCallback(
      (
        layerIds: readonly string[],
        patch:
          Partial<ActorTransform>,
      ) =>
        runCommand(
          "Transform layers",
          (definition) =>
            ActorDocumentCommands.setTransforms(
              definition,
              layerIds,
              patch,
            ),
        ),
      [runCommand],
    );

  const canUndo =
    historyStatus.canUndo;
  const canRedo =
    historyStatus.canRedo;

  return (
    <main
      style={{
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        display: "grid",
        gridTemplateRows:
          "auto minmax(0,1fr) 32px",
        color: "#ffffff",
        background: "#030506",
        fontFamily:
          "Inter, Arial, sans-serif",
      }}
    >
      {projectHubOpen && (
        <ProjectHub
          open
          currentProjectKey={
            activeProjectKey
          }
          currentActorName={
            actor?.definition.name ??
            activeProjectKey
          }
          bundledActors={
            bundledActors
          }
          localProjects={
            localProjects
          }
          onClose={() =>
            setProjectHubOpen(false)
          }
          onOpenProject={
            openProject
          }
          onCreateProject={
            createProject
          }
          onSave={() => {
            void saveCurrentProject();
          }}
          onSaveAs={
            saveProjectAs
          }
          onDuplicate={(
            key,
            name,
          ) => {
            void duplicateProject(
              key,
              name,
            );
          }}
          onDelete={deleteProject}
        />
      )}

      <Toolbar
        actorLoaded={
          actorLoadState === "ready"
        }
        canUndo={canUndo}
        canRedo={canRedo}
        dimOthers={dimOthers}
        soloMode={soloMode}
        showGrid={showGrid}
        showSafeArea={showSafeArea}
        showRulers={showRulers}
        snapToGrid={snapToGrid}
        onOpenProjects={() => {
          refreshProjects();
          setProjectHubOpen(true);
        }}
        onSaveProject={() => {
          void saveCurrentProject();
        }}
        onUndo={() => {
          void restoreHistory("undo");
        }}
        onRedo={() => {
          void restoreHistory("redo");
        }}
        onToggleHighlight={() =>
          setDimOthers(
            (value) => !value,
          )
        }
        onToggleSolo={() =>
          setSoloMode(
            (value) => !value,
          )
        }
        onToggleGrid={() =>
          setShowGrid(
            (value) => !value,
          )
        }
        onToggleSafeArea={() =>
          setShowSafeArea(
            (value) => !value,
          )
        }
        onToggleRulers={() =>
          setShowRulers(
            (value) => !value,
          )
        }
        onToggleSnap={() =>
          setSnapToGrid(
            (value) => !value,
          )
        }
        onCenterActor={centerActor}
        onResetView={resetViewport}
        onResetActor={() => {
          void resetActor();
        }}
        onExportActor={exportActor}
        onExportPackage={() => {
          if (
            studioDiagnostics &&
            !studioDiagnostics.packageReady &&
            !window.confirm(
              "Package preflight reports blocking issues. Export anyway for diagnostic or backup purposes?",
            )
          ) {
            return;
          }

          void exportPackage();
        }}
        onImportPngs={(files) => {
          void importPngs(files);
        }}
        onImportPackage={(file) => {
          void importPackage(file);
        }}
      />

      <section
        style={{
          minHeight: 0,
          display: "grid",
          gridTemplateColumns:
            "300px minmax(0,1fr) 340px",
        }}
      >
        <div
          style={{
            minHeight: 0,
            display: "grid",
            gridTemplateRows:
              "minmax(250px,3fr) minmax(210px,2fr)",
          }}
        >
          <LayersPanel
            actorLoaded={
              actorLoadState ===
              "ready"
            }
            folders={
              actor?.definition.folders ??
              []
            }
            groups={
              actor?.definition.groups ??
              []
            }
            layers={orderedLayers}
            selectedLayerIds={
              selectedLayers.map(
                (layer) => layer.id,
              )
            }
            selectedGroupId={
              selectedGroups[0]?.id ??
              null
            }
            loadedLayerIds={
              loadedLayerIds
            }
            diagnostics={diagnostics}
            onSelectLayer={
              selectLayer
            }
            onSelectGroup={(
              groupId,
            ) =>
              updateSelection({
                ids: [groupId],
                anchorId: groupId,
              })
            }
            onToggleLayerVisibility={(
              layerId,
            ) => {
              const layer =
                actorRef.current?.definition.layers.find(
                  (item) =>
                    item.id ===
                    layerId,
                );

              if (layer) {
                runCommand(
                  "Toggle layer visibility",
                  (definition) =>
                    ActorDocumentCommands.setLayerVisibility(
                      definition,
                      [layerId],
                      !layer.visible,
                    ),
                );
              }
            }}
            onToggleLayerLock={(
              layerId,
            ) => {
              const layer =
                actorRef.current?.definition.layers.find(
                  (item) =>
                    item.id ===
                    layerId,
                );

              if (layer) {
                runCommand(
                  "Toggle layer lock",
                  (definition) =>
                    ActorDocumentCommands.setLayerLock(
                      definition,
                      [layerId],
                      !layer.locked,
                    ),
                );
              }
            }}
            onRenameLayer={(
              layerId,
              name,
            ) =>
              runCommand(
                "Rename layer",
                (
                  definition,
                  selectionIds,
                ) =>
                  ActorDocumentCommands.renameLayer(
                    definition,
                    layerId,
                    name,
                    selectionIds,
                  ),
              )
            }
            onDuplicateLayers={
              duplicateLayers
            }
            onDeleteLayers={
              deleteSelectedLayers
            }
            onCreateFolder={() =>
              runCommand(
                "Create folder",
                (
                  definition,
                  selectionIds,
                ) =>
                  ActorDocumentCommands.createFolder(
                    definition,
                    "NEW FOLDER",
                    selectionIds,
                  ),
              )
            }
            onToggleFolderVisibility={(
              folderId,
            ) => {
              const folder =
                actorRef.current?.definition.folders.find(
                  (item) =>
                    item.id ===
                    folderId,
                );

              if (folder) {
                runCommand(
                  "Toggle folder visibility",
                  (
                    definition,
                    selectionIds,
                  ) =>
                    ActorDocumentCommands.updateFolder(
                      definition,
                      folderId,
                      {
                        visible:
                          !folder.visible,
                      },
                      selectionIds,
                    ),
                );
              }
            }}
            onToggleFolderLock={(
              folderId,
            ) => {
              const folder =
                actorRef.current?.definition.folders.find(
                  (item) =>
                    item.id ===
                    folderId,
                );

              if (folder) {
                runCommand(
                  "Toggle folder lock",
                  (
                    definition,
                    selectionIds,
                  ) =>
                    ActorDocumentCommands.updateFolder(
                      definition,
                      folderId,
                      {
                        locked:
                          !folder.locked,
                      },
                      selectionIds,
                    ),
                );
              }
            }}
            onRenameFolder={(
              folderId,
              name,
            ) =>
              runCommand(
                "Rename folder",
                (
                  definition,
                  selectionIds,
                ) =>
                  ActorDocumentCommands.updateFolder(
                    definition,
                    folderId,
                    { name },
                    selectionIds,
                  ),
              )
            }
            onDeleteFolder={(
              folderId,
            ) =>
              runCommand(
                "Delete folder",
                (
                  definition,
                  selectionIds,
                ) =>
                  ActorDocumentCommands.deleteFolder(
                    definition,
                    folderId,
                    selectionIds,
                  ),
              )
            }
            onAssignLayersToFolder={(
              layerIds,
              folderId,
            ) =>
              runCommand(
                "Move layers to folder",
                (definition) =>
                  ActorDocumentCommands.assignFolder(
                    definition,
                    layerIds,
                    folderId,
                  ),
              )
            }
            onReorderLayers={
              handleReorderLayers
            }
            onReorderFolders={(
              folderId,
              targetFolderId,
            ) => {
              const folderIds =
                (
                  actorRef.current
                    ?.definition.folders ??
                  []
                ).map(
                  (folder) =>
                    folder.id,
                );
              const remaining =
                folderIds.filter(
                  (id) =>
                    id !== folderId,
                );
              const targetIndex =
                remaining.indexOf(
                  targetFolderId,
                );

              if (targetIndex >= 0) {
                const next = [
                  ...remaining.slice(
                    0,
                    targetIndex,
                  ),
                  folderId,
                  ...remaining.slice(
                    targetIndex,
                  ),
                ];

                runCommand(
                  "Reorder folders",
                  (
                    definition,
                    selectionIds,
                  ) =>
                    ActorDocumentCommands.reorderFolders(
                      definition,
                      next,
                      selectionIds,
                    ),
                );
              }
            }}
            onCreateGroup={(
              layerIds,
            ) =>
              runCommand(
                "Create group",
                (definition) =>
                  ActorDocumentCommands.createGroup(
                    definition,
                    "Group",
                    layerIds,
                  ),
              )
            }
            onToggleGroupVisibility={(
              groupId,
            ) => {
              const group =
                actorRef.current?.definition.groups.find(
                  (item) =>
                    item.id ===
                    groupId,
                );

              if (group) {
                runCommand(
                  "Toggle group visibility",
                  (
                    definition,
                    selectionIds,
                  ) =>
                    ActorDocumentCommands.updateGroup(
                      definition,
                      groupId,
                      {
                        visible:
                          !group.visible,
                      },
                      selectionIds,
                    ),
                );
              }
            }}
            onToggleGroupLock={(
              groupId,
            ) => {
              const group =
                actorRef.current?.definition.groups.find(
                  (item) =>
                    item.id ===
                    groupId,
                );

              if (group) {
                runCommand(
                  "Toggle group lock",
                  (
                    definition,
                    selectionIds,
                  ) =>
                    ActorDocumentCommands.updateGroup(
                      definition,
                      groupId,
                      {
                        locked:
                          !group.locked,
                      },
                      selectionIds,
                    ),
                );
              }
            }}
            onDeleteGroup={(
              groupId,
            ) =>
              runCommand(
                "Delete group",
                (
                  definition,
                  selectionIds,
                ) =>
                  ActorDocumentCommands.deleteGroups(
                    definition,
                    [groupId],
                    selectionIds,
                  ),
              )
            }
          />

          <AssetLibrary
            actorLoaded={
              actorLoadState === "ready"
            }
            assets={
              actor?.definition.assets ??
              []
            }
            layers={
              actor?.definition.layers ??
              []
            }
            assetUrls={
              actor?.assetUrls ??
              new Map()
            }
            selectedLayerIds={
              selectedLayers.map(
                (layer) => layer.id,
              )
            }
            onImportPngs={(files) => {
              void importPngs(files);
            }}
            onReplaceAsset={(
              path,
              file,
            ) => {
              void replaceAsset(
                path,
                file,
              );
            }}
            onDeleteAsset={(path) => {
              const useCount =
                actor?.definition.layers.filter(
                  (layer) =>
                    layer.asset === path,
                ).length ?? 0;

              if (
                !window.confirm(
                  useCount > 0
                    ? `Delete this asset reference? ${useCount} layer${useCount === 1 ? "" : "s"} will be marked missing.`
                    : "Delete this unused asset reference?",
                )
              ) {
                return;
              }

              runCommand(
                "Delete asset",
                (
                  definition,
                  selectionIds,
                ) =>
                  ActorDocumentCommands.deleteAsset(
                    definition,
                    path,
                    selectionIds,
                  ),
              );
            }}
            onCreateLayerFromAsset={
              createLayerFromAsset
            }
            onSelectAssetLayers={(
              path,
            ) => {
              const ids =
                actor?.definition.layers
                  .filter(
                    (layer) =>
                      layer.asset ===
                      path,
                  )
                  .map(
                    (layer) =>
                      layer.id,
                  ) ?? [];

              updateSelection(
                StudioSelection.replace(
                  ids,
                  orderedLayerIds,
                ),
              );
            }}
          />
        </div>

        <section
          style={{
            minWidth: 0,
            minHeight: 0,
            position: "relative",
          }}
        >
          <StudioCanvas
            actor={actor}
            selectedLayerIds={
              selection.ids
            }
            viewport={viewport}
            showGrid={showGrid}
            showSafeArea={
              showSafeArea
            }
            showRulers={showRulers}
            snapToGrid={snapToGrid}
            guides={guides}
            dimOthers={dimOthers}
            soloMode={soloMode}
            onViewportChange={
              updateViewport
            }
            onCanvasSelect={(
              layerId,
              modifiers,
            ) =>
              selectLayer(
                layerId,
                modifiers,
              )
            }
            onClearSelection={() =>
              updateSelection(
                StudioSelection.clear(),
              )
            }
            onBeginTransform={
              beginCanvasTransform
            }
            onMoveSelection={
              moveCanvasSelection
            }
            onSetSelectionTransform={
              setCanvasTransform
            }
            onEndTransform={
              endCanvasTransform
            }
            onDuplicateSelection={
              duplicateLayers
            }
            onDropAsset={(
              path,
              point,
            ) =>
              createLayerFromAsset(
                path,
                point,
              )
            }
            onGuidesChange={(next) =>
              setGuides([...next])
            }
          />

          {actorLoadState ===
            "error" &&
            actorLoadError && (
              <div
                role="alert"
                style={{
                  position:
                    "absolute",
                  left: "50%",
                  top: "50%",
                  width:
                    "min(460px, calc(100% - 40px))",
                  transform:
                    "translate(-50%, -50%)",
                  padding: 18,
                  border:
                    "1px solid rgba(255,110,110,0.45)",
                  borderRadius: 8,
                  color: "#ffb0b0",
                  background:
                    "rgba(24,4,6,0.92)",
                  fontSize: 11,
                  lineHeight: 1.6,
                  textAlign:
                    "center",
                }}
              >
                <strong>
                  ACTOR LOAD FAILED
                </strong>
                <div>
                  {actorLoadError}
                </div>
              </div>
            )}

          <div
            style={{
              position: "absolute",
              left: 34,
              bottom: 12,
              padding: "7px 9px",
              border:
                "1px solid rgba(75,214,255,0.2)",
              borderRadius: 5,
              color:
                "rgba(255,255,255,0.52)",
              background:
                "rgba(2,6,8,0.78)",
              fontSize: 9,
              lineHeight: 1.55,
              pointerEvents: "none",
            }}
          >
            Wheel zoom · Space pan ·
            Alt-drag duplicate ·
            Arrows move · Shift 10 px
          </div>

          <div
            style={{
              position: "absolute",
              right: 12,
              bottom: 12,
              padding: "7px 9px",
              border:
                "1px solid rgba(75,214,255,0.2)",
              borderRadius: 5,
              color: "#6ee6ff",
              background:
                "rgba(2,6,8,0.82)",
              fontSize: 9,
              pointerEvents: "none",
            }}
          >
            {Math.round(
              viewport.zoom * 100,
            )}
            %
          </div>
        </section>

        <section
          style={{
            minHeight: 0,
            display: "grid",
            gridTemplateRows:
              "58px minmax(0,1fr)",
            borderLeft:
              "1px solid rgba(70,210,255,0.14)",
            background: "#070b0e",
          }}
        >
          <div
            role="tablist"
            aria-label="Actor editing panels"
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(4,1fr)",
              borderBottom:
                "1px solid rgba(70,210,255,0.1)",
            }}
          >
            {(
              [
                [
                  "inspector",
                  "INSPECTOR",
                ],
                ["setup", "ACTOR"],
                ["rig", "RIG"],
                ["mouth", "MOUTH"],
                [
                  "validation",
                  `BUILD ${completeness?.percentage ?? 0}%`,
                ],
                [
                  "diagnostics",
                  `DIAG ${diagnostics.length + (studioDiagnostics?.diagnostics.length ?? 0)}`,
                ],
                ["history", "HISTORY"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={
                  rightPanel === id
                }
                onClick={() =>
                  setRightPanel(id)
                }
                style={{
                  border: 0,
                  borderBottom:
                    rightPanel === id
                      ? "2px solid #67d9ff"
                      : "2px solid transparent",
                  color:
                    rightPanel === id
                      ? "#67d9ff"
                      : "rgba(255,255,255,0.42)",
                  background:
                    "transparent",
                  fontSize: 8,
                  letterSpacing:
                    "0.08em",
                  cursor: "pointer",
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {rightPanel ===
            "inspector" && (
            <Inspector
              actorLoaded={
                actorLoadState ===
                "ready"
              }
              layers={selectedLayers}
              selectedGroups={
                selectedGroups
              }
              allLayers={
                actor?.definition.layers ??
                []
              }
              folders={
                actor?.definition.folders ??
                []
              }
              groups={
                actor?.definition.groups ??
                []
              }
              loadedLayerIds={
                loadedLayerIds
              }
              effectiveLockedLayerIds={
                effectiveLockedLayerIds
              }
              onRenameLayer={(
                layerId,
                name,
              ) =>
                runCommand(
                  "Rename layer",
                  (
                    definition,
                    selectionIds,
                  ) =>
                    ActorDocumentCommands.renameLayer(
                      definition,
                      layerId,
                      name,
                      selectionIds,
                    ),
                )
              }
              onChangeLayerId={(
                layerId,
                nextId,
              ) =>
                runCommand(
                  "Change layer ID",
                  (
                    definition,
                    selectionIds,
                  ) =>
                    ActorDocumentCommands.changeLayerId(
                      definition,
                      layerId,
                      nextId,
                      selectionIds,
                    ),
                )
              }
              onTransformChange={(
                layerIds,
                key,
                value,
              ) =>
                runCommand(
                  "Edit transform",
                  (definition) =>
                    ActorDocumentCommands.setTransforms(
                      definition,
                      layerIds,
                      {
                        [key]: value,
                      },
                    ),
                )
              }
              onOpacityChange={(
                layerIds,
                value,
              ) =>
                runCommand(
                  "Edit opacity",
                  (definition) =>
                    ActorDocumentCommands.setLayerProperties(
                      definition,
                      layerIds,
                      {
                        opacity: value,
                      },
                    ),
                )
              }
              onLayerPropertyChange={(
                layerIds,
                patch,
              ) =>
                runCommand(
                  "Edit layer properties",
                  (definition) =>
                    ActorDocumentCommands.setLayerProperties(
                      definition,
                      layerIds,
                      patch,
                    ),
                )
              }
              onLayerMetadataChange={(
                layerIds,
                patch,
              ) =>
                runCommand(
                  "Edit layer metadata",
                  (definition) =>
                    ActorDocumentCommands.setLayerMetadata(
                      definition,
                      layerIds,
                      patch,
                    ),
                )
              }
              onLayerRuntimeChange={(
                layerIds,
                kind,
                profile,
              ) =>
                runCommand(
                  "Edit layer runtime metadata",
                  (definition) =>
                    ActorDocumentCommands.setLayerRuntimeMetadata(
                      definition,
                      layerIds,
                      kind,
                      profile,
                    ),
                )
              }
              onParentChange={(
                layerIds,
                parentId,
              ) =>
                runCommand(
                  "Edit layer relationship",
                  (definition) =>
                    ActorDocumentCommands.setParent(
                      definition,
                      layerIds,
                      parentId,
                    ),
                )
              }
              canAssignParent={(
                nodeIds,
                parentId,
              ) => {
                const definition =
                  actorRef.current
                    ?.definition;

                return Boolean(
                  definition &&
                    nodeIds.every(
                      (nodeId) =>
                        canAssignActorParent(
                          definition,
                          nodeId,
                          parentId,
                        ),
                    ),
                );
              }}
              onNudge={
                nudgeSelection
              }
              onResetTransform={() =>
                runCommand(
                  "Reset transform",
                  (
                    definition,
                    selectionIds,
                  ) =>
                    ActorDocumentCommands.resetTransforms(
                      definition,
                      selectionIds,
                    ),
                )
              }
              onAlign={(axis) =>
                runCommand(
                  "Align layers",
                  (
                    definition,
                    selectionIds,
                  ) =>
                    ActorDocumentCommands.alignLayers(
                      definition,
                      selectionIds,
                      axis,
                    ),
                )
              }
              onDistribute={(axis) =>
                runCommand(
                  "Distribute layers",
                  (
                    definition,
                    selectionIds,
                  ) =>
                    ActorDocumentCommands.distributeLayers(
                      definition,
                      selectionIds,
                      axis,
                    ),
                )
              }
              onUpdateGroup={(
                groupId,
                patch,
              ) =>
                runCommand(
                  "Edit group",
                  (
                    definition,
                    selectionIds,
                  ) =>
                    ActorDocumentCommands.updateGroup(
                      definition,
                      groupId,
                      patch,
                      selectionIds,
                    ),
                )
              }
              onDeleteGroup={(
                groupId,
              ) =>
                runCommand(
                  "Delete group",
                  (
                    definition,
                    selectionIds,
                  ) =>
                    ActorDocumentCommands.deleteGroups(
                      definition,
                      [groupId],
                      selectionIds,
                    ),
                )
              }
            />
          )}

          {rightPanel === "setup" && (
            <ActorSetupPanel
              actor={
                actor?.definition ??
                null
              }
              onUpdateActor={(patch) =>
                runCommand(
                  "Edit actor settings",
                  (
                    definition,
                    selectionIds,
                  ) =>
                    ActorDocumentCommands.updateActor(
                      definition,
                      patch,
                      selectionIds,
                    ),
                )
              }
              onUpdateFolder={(
                folderId,
                patch,
              ) =>
                runCommand(
                  "Edit folder hierarchy",
                  (
                    definition,
                    selectionIds,
                  ) =>
                    ActorDocumentCommands.updateFolder(
                      definition,
                      folderId,
                      patch,
                      selectionIds,
                    ),
                )
              }
            />
          )}

          {rightPanel === "rig" && (
            <RigMapper
              actor={
                actor?.definition ??
                null
              }
              onSetRole={(
                role,
                value,
              ) =>
                runCommand(
                  "Map rig role",
                  (
                    definition,
                    selectionIds,
                  ) =>
                    ActorDocumentCommands.setRigRole(
                      definition,
                      role,
                      value,
                      selectionIds,
                    ),
                )
              }
            />
          )}

          {rightPanel === "mouth" && (
            <MouthBuilder
              actorLoaded={
                actorLoadState ===
                "ready"
              }
              layers={
                actor?.definition.layers ??
                []
              }
              construction={
                actor?.definition.construction ??
                null
              }
              onMapPose={(
                pose: ActorMouthPose,
                layerId,
              ) =>
                runCommand(
                  "Map mouth pose",
                  (
                    definition,
                    selectionIds,
                  ) =>
                    ActorDocumentCommands.setMouthPose(
                      definition,
                      pose,
                      layerId,
                      selectionIds,
                    ),
                )
              }
              onSelectLayer={(
                layerId,
              ) => {
                selectLayer(
                  layerId,
                  {
                    additive: false,
                    range: false,
                  },
                );
                setRightPanel(
                  "inspector",
                );
              }}
            />
          )}

          {rightPanel ===
            "validation" && (
            <ActorValidationPanel
              actorLoaded={
                actorLoadState ===
                "ready"
              }
              diagnostics={
                diagnostics
              }
              completeness={
                completeness
              }
              onSelectLayer={(
                layerId,
              ) =>
                selectLayer(
                  layerId,
                  {
                    additive: false,
                    range: false,
                  },
                )
              }
            />
          )}

          {rightPanel ===
            "diagnostics" && (
            <DiagnosticsPanel
              structural={
                diagnostics
              }
              studio={
                studioDiagnostics
              }
              onSelectLayer={(
                layerId,
              ) => {
                selectLayer(
                  layerId,
                  {
                    additive: false,
                    range: false,
                  },
                );
                setRightPanel(
                  "inspector",
                );
              }}
            />
          )}

          {rightPanel ===
            "history" && (
            <HistoryPanel
              past={
                historyStatus.pastLabels
              }
              future={
                historyStatus.futureLabels
              }
              onUndo={() => {
                void restoreHistory(
                  "undo",
                );
              }}
              onRedo={() => {
                void restoreHistory(
                  "redo",
                );
              }}
            />
          )}
        </section>
      </section>

      <footer
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent:
            "space-between",
          gap: 12,
          padding: "0 12px",
          borderTop:
            "1px solid rgba(70,210,255,0.16)",
          color:
            "rgba(255,255,255,0.44)",
          background: "#05090b",
          fontFamily:
            "ui-monospace, monospace",
          fontSize: 9,
          letterSpacing: "0.04em",
        }}
      >
        <span
          style={{
            overflow: "hidden",
            textOverflow:
              "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {status}
        </span>
        <span
          style={{
            flexShrink: 0,
          }}
        >
          HISTORY{" "}
          {historyStatus.pastCount}/
          {HISTORY_LIMIT}
          {" · "}
          {selection.ids.length} SELECTED
          {" · "}
          {savedAt
            ? `DRAFT ${savedAt}`
            : "SESSION READY"}
        </span>
      </footer>
    </main>
  );
}
