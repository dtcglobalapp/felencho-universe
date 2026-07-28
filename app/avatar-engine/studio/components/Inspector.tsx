import type {
  ReactNode,
} from "react";

import {
  GENESIS_BLEND_MODES,
} from "../../config/ActorEditorConfig";

import type {
  ActorBlendMode,
  ActorFolderDefinition,
  ActorGroupDefinition,
  ActorLayerDefinition,
  ActorTransform,
} from "../../types/Actor";

import PanelTitle from "./PanelTitle";

type TransformKey =
  keyof ActorTransform;

interface InspectorProps {
  actorLoaded: boolean;
  layers: readonly ActorLayerDefinition[];
  selectedGroups: readonly ActorGroupDefinition[];
  allLayers: readonly ActorLayerDefinition[];
  folders: readonly ActorFolderDefinition[];
  groups: readonly ActorGroupDefinition[];
  loadedLayerIds: ReadonlySet<string>;
  effectiveLockedLayerIds:
    ReadonlySet<string>;
  onRenameLayer: (
    layerId: string,
    name: string,
  ) => void;
  onChangeLayerId: (
    layerId: string,
    nextId: string,
  ) => void;
  onTransformChange: (
    layerIds: readonly string[],
    key: TransformKey,
    value: number,
  ) => void;
  onOpacityChange: (
    layerIds: readonly string[],
    value: number,
  ) => void;
  onLayerPropertyChange: (
    layerIds: readonly string[],
    patch: Partial<
      Pick<
        ActorLayerDefinition,
        | "folderId"
        | "asset"
        | "visible"
        | "locked"
        | "blendMode"
        | "inheritTransform"
      >
    >,
  ) => void;
  onLayerMetadataChange: (
    layerIds: readonly string[],
    patch: {
      category?: string;
      semanticRole?: string;
    },
  ) => void;
  onLayerRuntimeChange: (
    layerIds: readonly string[],
    kind: "animation" | "physics",
    profile: string,
  ) => void;
  onParentChange: (
    layerIds: readonly string[],
    parentId: string | undefined,
  ) => void;
  canAssignParent: (
    nodeIds: readonly string[],
    parentId: string | undefined,
  ) => boolean;
  onNudge: (
    deltaX: number,
    deltaY: number,
  ) => void;
  onResetTransform: () => void;
  onAlign: (
    axis:
      | "left"
      | "centerX"
      | "right"
      | "top"
      | "centerY"
      | "bottom",
  ) => void;
  onDistribute: (
    axis: "x" | "y",
  ) => void;
  onUpdateGroup: (
    groupId: string,
    patch: Partial<
      Pick<
        ActorGroupDefinition,
        | "name"
        | "visible"
        | "locked"
        | "parentId"
      >
    > & {
      transform?: Partial<
        ActorTransform
      >;
    },
  ) => void;
  onDeleteGroup: (
    groupId: string,
  ) => void;
}

function sharedValue<
  T,
>(
  values: readonly T[],
): T | undefined {
  const first = values[0];

  return values.every(
    (value) => value === first,
  )
    ? first
    : undefined;
}

function clamp(
  value: number,
  minimum: number,
  maximum: number,
): number {
  return Math.min(
    maximum,
    Math.max(minimum, value),
  );
}

function isActorBlendMode(
  value: string,
): value is ActorBlendMode {
  return GENESIS_BLEND_MODES.some(
    (mode) => mode === value,
  );
}

export default function Inspector({
  actorLoaded,
  layers,
  selectedGroups,
  allLayers,
  folders,
  groups,
  loadedLayerIds,
  effectiveLockedLayerIds,
  onRenameLayer,
  onChangeLayerId,
  onTransformChange,
  onOpacityChange,
  onLayerPropertyChange,
  onLayerMetadataChange,
  onLayerRuntimeChange,
  onParentChange,
  canAssignParent,
  onNudge,
  onResetTransform,
  onAlign,
  onDistribute,
  onUpdateGroup,
  onDeleteGroup,
}: InspectorProps) {
  const layer = layers[0] ?? null;
  const selectedGroup =
    selectedGroups[0] ?? null;
  const layerIds = layers.map(
    (item) => item.id,
  );
  const multiple = layers.length > 1;
  const locked =
    layers.length > 0 &&
    layers.every(
      (item) =>
        effectiveLockedLayerIds.has(
          item.id,
        ),
    );

  const transformValue = (
    key: TransformKey,
  ) =>
    sharedValue(
      layers.map(
        (item) =>
          item.transform[key],
      ),
    );

  return (
    <aside
      style={{
        minHeight: 0,
        overflowY: "auto",
        background: "#070b0e",
      }}
    >
      <PanelTitle
        title="INSPECTOR"
        subtitle={
          multiple
            ? `${layers.length} LAYERS`
            : layer
              ? layer.name
              : selectedGroup
                ? `GROUP · ${selectedGroup.name}`
              : actorLoaded
                ? "NO SELECTION"
                : "NO ACTOR"
        }
      />

      {layer ? (
        <div
          style={{
            padding: "12px 14px 28px",
          }}
        >
          <SectionLabel>
            LAYER
          </SectionLabel>

          <TextField
            label="Layer Name"
            value={
              multiple
                ? ""
                : layer.name
            }
            placeholder={
              multiple
                ? "Multiple selection"
                : undefined
            }
            disabled={multiple}
            onCommit={(value) =>
              onRenameLayer(
                layer.id,
                value,
              )
            }
          />

          <TextField
            label="Layer ID"
            value={
              multiple
                ? ""
                : layer.id
            }
            placeholder={
              multiple
                ? "Multiple selection"
                : undefined
            }
            disabled={multiple}
            onCommit={(value) =>
              onChangeLayerId(
                layer.id,
                value,
              )
            }
          />

          <SelectField
            label="Folder"
            value={
              sharedValue(
                layers.map(
                  (item) =>
                    item.folderId ??
                    "",
                ),
              ) ?? "__mixed__"
            }
            onChange={(value) =>
              onLayerPropertyChange(
                layerIds,
                {
                  folderId:
                    value || undefined,
                },
              )
            }
          >
            <option value="__mixed__" disabled>
              Mixed
            </option>
            <option value="">
              Unassigned
            </option>
            {folders.map((folder) => (
              <option
                key={folder.id}
                value={folder.id}
              >
                {folder.name}
              </option>
            ))}
          </SelectField>

          <TextField
            label="Asset Path"
            value={
              multiple
                ? ""
                : layer.asset
            }
            placeholder={
              multiple
                ? "Multiple selection"
                : "No asset"
            }
            disabled={multiple}
            onCommit={(value) =>
              onLayerPropertyChange(
                [layer.id],
                {
                  asset: value,
                },
              )
            }
          />

          <InfoRow
            label="Asset Status"
            value={
              layers.every((item) =>
                loadedLayerIds.has(
                  item.id,
                ),
              )
                ? "LOADED"
                : layers.some((item) =>
                      loadedLayerIds.has(
                        item.id,
                      ),
                    )
                  ? "MIXED"
                  : "MISSING OR UNAVAILABLE"
            }
            tone={
              layers.every((item) =>
                loadedLayerIds.has(
                  item.id,
                ),
              )
                ? "success"
                : "warning"
            }
          />

          <TextField
            label="Semantic Role"
            value={
              multiple
                ? ""
                : (
                    layer.metadata
                      ?.semanticRole ?? ""
                  )
            }
            placeholder={
              multiple
                ? "Multiple selection"
                : "Example: leftEye"
            }
            disabled={multiple}
            onCommit={(semanticRole) =>
              onLayerMetadataChange(
                [layer.id],
                { semanticRole },
              )
            }
          />

          <TextField
            label="Category"
            value={
              multiple
                ? ""
                : (
                    layer.metadata
                      ?.category ?? ""
                  )
            }
            placeholder={
              multiple
                ? "Multiple selection"
                : "Example: face"
            }
            disabled={multiple}
            onCommit={(category) =>
              onLayerMetadataChange(
                [layer.id],
                { category },
              )
            }
          />

          <TextField
            label="Animation Profile"
            value={
              multiple
                ? ""
                : (
                    typeof layer
                      .animation
                      ?.profile ===
                    "string"
                      ? layer.animation
                          .profile
                      : ""
                  )
            }
            placeholder={
              multiple
                ? "Multiple selection"
                : "Optional runtime profile"
            }
            disabled={multiple}
            onCommit={(profile) =>
              onLayerRuntimeChange(
                [layer.id],
                "animation",
                profile,
              )
            }
          />

          <TextField
            label="Physics Profile"
            value={
              multiple
                ? ""
                : (
                    typeof layer
                      .physics
                      ?.profile ===
                    "string"
                      ? layer.physics
                          .profile
                      : ""
                  )
            }
            placeholder={
              multiple
                ? "Multiple selection"
                : "Optional runtime profile"
            }
            disabled={multiple}
            onCommit={(profile) =>
              onLayerRuntimeChange(
                [layer.id],
                "physics",
                profile,
              )
            }
          />

          <SelectField
            label="Visible"
            value={
              sharedValue(
                layers.map(
                  (item) =>
                    item.visible
                      ? "true"
                      : "false",
                ),
              ) ?? "__mixed__"
            }
            onChange={(value) =>
              onLayerPropertyChange(
                layerIds,
                {
                  visible:
                    value === "true",
                },
              )
            }
          >
            <option value="__mixed__" disabled>
              Mixed
            </option>
            <option value="true">
              Yes
            </option>
            <option value="false">
              No
            </option>
          </SelectField>

          <SelectField
            label="Locked"
            value={
              sharedValue(
                layers.map(
                  (item) =>
                    item.locked
                      ? "true"
                      : "false",
                ),
              ) ?? "__mixed__"
            }
            onChange={(value) =>
              onLayerPropertyChange(
                layerIds,
                {
                  locked:
                    value === "true",
                },
              )
            }
          >
            <option value="__mixed__" disabled>
              Mixed
            </option>
            <option value="true">
              Yes
            </option>
            <option value="false">
              No
            </option>
          </SelectField>

          <SelectField
            label="Blend Mode"
            value={
              sharedValue(
                layers.map(
                  (item) =>
                    item.blendMode,
                ),
              ) ?? "__mixed__"
            }
            onChange={(value) => {
              if (
                isActorBlendMode(value)
              ) {
                onLayerPropertyChange(
                  layerIds,
                  {
                    blendMode:
                      value,
                  },
                );
              }
            }}
          >
            <option value="__mixed__" disabled>
              Mixed
            </option>
            {GENESIS_BLEND_MODES.map(
              (mode) => (
                <option
                  key={mode}
                  value={mode}
                >
                  {mode}
                </option>
              ),
            )}
          </SelectField>

          <SectionLabel>
            HIERARCHY
          </SectionLabel>

          <SelectField
            label="Transform Parent"
            value={
              sharedValue(
                layers.map(
                  (item) =>
                    item.parentId ??
                    "",
                ),
              ) ?? "__mixed__"
            }
            onChange={(value) =>
              onParentChange(
                layerIds,
                value || undefined,
              )
            }
          >
            <option value="__mixed__" disabled>
              Mixed
            </option>
            <option value="">
              No parent
            </option>
            <optgroup label="Groups">
              {groups.map((group) => (
                <option
                  key={group.id}
                  value={group.id}
                  disabled={
                    !canAssignParent(
                      layerIds,
                      group.id,
                    )
                  }
                >
                  {group.name}
                </option>
              ))}
            </optgroup>
            <optgroup label="Layers">
              {allLayers
                .filter(
                  (item) =>
                    !layerIds.includes(
                      item.id,
                    ),
                )
                .map((item) => (
                  <option
                    key={item.id}
                    value={item.id}
                    disabled={
                      !canAssignParent(
                        layerIds,
                        item.id,
                      )
                    }
                  >
                    {item.name}
                  </option>
                ))}
            </optgroup>
          </SelectField>

          <SelectField
            label="Inherit Transform"
            value={
              sharedValue(
                layers.map(
                  (item) =>
                    item.inheritTransform
                      ? "true"
                      : "false",
                ),
              ) ?? "__mixed__"
            }
            onChange={(value) =>
              onLayerPropertyChange(
                layerIds,
                {
                  inheritTransform:
                    value === "true",
                },
              )
            }
          >
            <option value="__mixed__" disabled>
              Mixed
            </option>
            <option value="true">
              Yes
            </option>
            <option value="false">
              No
            </option>
          </SelectField>

          <SectionLabel>
            TRANSFORM
          </SectionLabel>

          <NumberField
            label="Position X"
            value={transformValue("x")}
            disabled={locked}
            onChange={(value) =>
              onTransformChange(
                layerIds,
                "x",
                value,
              )
            }
          />
          <NumberField
            label="Position Y"
            value={transformValue("y")}
            disabled={locked}
            onChange={(value) =>
              onTransformChange(
                layerIds,
                "y",
                value,
              )
            }
          />
          <NumberField
            label="Rotation"
            value={transformValue(
              "rotation",
            )}
            step={0.5}
            disabled={locked}
            onChange={(value) =>
              onTransformChange(
                layerIds,
                "rotation",
                value,
              )
            }
          />
          <NumberField
            label="Scale X"
            value={transformValue(
              "scaleX",
            )}
            step={0.01}
            disabled={locked}
            onChange={(value) =>
              onTransformChange(
                layerIds,
                "scaleX",
                value,
              )
            }
          />
          <NumberField
            label="Scale Y"
            value={transformValue(
              "scaleY",
            )}
            step={0.01}
            disabled={locked}
            onChange={(value) =>
              onTransformChange(
                layerIds,
                "scaleY",
                value,
              )
            }
          />
          <NumberField
            label="Pivot X"
            value={transformValue(
              "pivotX",
            )}
            step={0.5}
            disabled={locked}
            onChange={(value) =>
              onTransformChange(
                layerIds,
                "pivotX",
                value,
              )
            }
          />
          <NumberField
            label="Pivot Y"
            value={transformValue(
              "pivotY",
            )}
            step={0.5}
            disabled={locked}
            onChange={(value) =>
              onTransformChange(
                layerIds,
                "pivotY",
                value,
              )
            }
          />
          <NumberField
            label="Opacity"
            value={sharedValue(
              layers.map(
                (item) =>
                  item.opacity,
              ),
            )}
            min={0}
            max={1}
            step={0.05}
            disabled={locked}
            onChange={(value) =>
              onOpacityChange(
                layerIds,
                clamp(value, 0, 1),
              )
            }
          />

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(3,1fr)",
              gap: 6,
              marginTop: 10,
            }}
          >
            <ActionButton
              label="FLIP H"
              disabled={locked}
              onClick={() => {
                const current =
                  transformValue(
                    "scaleX",
                  );

                if (
                  current !== undefined
                ) {
                  onTransformChange(
                    layerIds,
                    "scaleX",
                    current * -1,
                  );
                }
              }}
            />
            <ActionButton
              label="FLIP V"
              disabled={locked}
              onClick={() => {
                const current =
                  transformValue(
                    "scaleY",
                  );

                if (
                  current !== undefined
                ) {
                  onTransformChange(
                    layerIds,
                    "scaleY",
                    current * -1,
                  );
                }
              }}
            />
            <ActionButton
              label="RESET"
              disabled={locked}
              onClick={onResetTransform}
            />
          </div>

          <SectionLabel>
            PRECISION
          </SectionLabel>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(3, 1fr)",
              gap: 7,
            }}
          >
            <span />
            <ActionButton
              label="↑"
              disabled={locked}
              onClick={() =>
                onNudge(0, -1)
              }
            />
            <span />
            <ActionButton
              label="←"
              disabled={locked}
              onClick={() =>
                onNudge(-1, 0)
              }
            />
            <ActionButton
              label="•"
              disabled={locked}
              onClick={
                onResetTransform
              }
            />
            <ActionButton
              label="→"
              disabled={locked}
              onClick={() =>
                onNudge(1, 0)
              }
            />
            <span />
            <ActionButton
              label="↓"
              disabled={locked}
              onClick={() =>
                onNudge(0, 1)
              }
            />
            <span />
          </div>

          {multiple && (
            <>
              <SectionLabel>
                ALIGN PIVOTS
              </SectionLabel>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(3,1fr)",
                  gap: 6,
                }}
              >
                <ActionButton
                  label="LEFT"
                  onClick={() =>
                    onAlign("left")
                  }
                />
                <ActionButton
                  label="CENTER X"
                  onClick={() =>
                    onAlign(
                      "centerX",
                    )
                  }
                />
                <ActionButton
                  label="RIGHT"
                  onClick={() =>
                    onAlign("right")
                  }
                />
                <ActionButton
                  label="TOP"
                  onClick={() =>
                    onAlign("top")
                  }
                />
                <ActionButton
                  label="CENTER Y"
                  onClick={() =>
                    onAlign(
                      "centerY",
                    )
                  }
                />
                <ActionButton
                  label="BOTTOM"
                  onClick={() =>
                    onAlign("bottom")
                  }
                />
                <ActionButton
                  label="SPACE X"
                  disabled={
                    layers.length < 3
                  }
                  onClick={() =>
                    onDistribute("x")
                  }
                />
                <ActionButton
                  label="SPACE Y"
                  disabled={
                    layers.length < 3
                  }
                  onClick={() =>
                    onDistribute("y")
                  }
                />
              </div>
            </>
          )}

          {multiple && (
            <div
              style={{
                marginTop: 12,
                padding: 9,
                border:
                  "1px solid rgba(255,255,255,0.07)",
                borderRadius: 5,
                color:
                  "rgba(255,255,255,0.4)",
                background:
                  "rgba(255,255,255,0.025)",
                fontSize: 9,
                lineHeight: 1.5,
              }}
            >
              Mixed fields are blank.
              Numeric edits apply the same
              value to every selected
              unlocked layer. Canvas
              multi-transform is limited
              to safe translation.
            </div>
          )}
        </div>
      ) : selectedGroup ? (
        <div
          style={{
            padding: "12px 14px 28px",
          }}
        >
          <SectionLabel>
            TRANSFORM GROUP
          </SectionLabel>

          <TextField
            label="Group Name"
            value={selectedGroup.name}
            onCommit={(name) =>
              onUpdateGroup(
                selectedGroup.id,
                { name },
              )
            }
          />

          <InfoRow
            label="Group ID"
            value={selectedGroup.id}
          />

          <SelectField
            label="Visible"
            value={
              selectedGroup.visible
                ? "true"
                : "false"
            }
            onChange={(value) =>
              onUpdateGroup(
                selectedGroup.id,
                {
                  visible:
                    value === "true",
                },
              )
            }
          >
            <option value="true">
              Yes
            </option>
            <option value="false">
              No
            </option>
          </SelectField>

          <SelectField
            label="Locked"
            value={
              selectedGroup.locked
                ? "true"
                : "false"
            }
            onChange={(value) =>
              onUpdateGroup(
                selectedGroup.id,
                {
                  locked:
                    value === "true",
                },
              )
            }
          >
            <option value="true">
              Yes
            </option>
            <option value="false">
              No
            </option>
          </SelectField>

          <SelectField
            label="Parent Group"
            value={
              selectedGroup.parentId ??
              ""
            }
            onChange={(value) =>
              onUpdateGroup(
                selectedGroup.id,
                {
                  parentId:
                    value || undefined,
                },
              )
            }
          >
            <option value="">
              No parent
            </option>
            {groups
              .filter(
                (group) =>
                  group.id !==
                  selectedGroup.id,
              )
              .map((group) => (
                <option
                  key={group.id}
                  value={group.id}
                  disabled={
                    !canAssignParent(
                      [
                        selectedGroup.id,
                      ],
                      group.id,
                    )
                  }
                >
                  {group.name}
                </option>
              ))}
          </SelectField>

          <SectionLabel>
            SHARED TRANSFORM & PIVOT
          </SectionLabel>

          {(
            [
              ["x", "Position X", 1],
              ["y", "Position Y", 1],
              [
                "rotation",
                "Rotation",
                0.5,
              ],
              [
                "scaleX",
                "Scale X",
                0.01,
              ],
              [
                "scaleY",
                "Scale Y",
                0.01,
              ],
              [
                "pivotX",
                "Pivot X",
                0.5,
              ],
              [
                "pivotY",
                "Pivot Y",
                0.5,
              ],
            ] as const
          ).map(
            ([key, label, step]) => (
              <NumberField
                key={key}
                label={label}
                value={
                  selectedGroup
                    .transform[key]
                }
                step={step}
                disabled={
                  selectedGroup.locked
                }
                onChange={(value) =>
                  onUpdateGroup(
                    selectedGroup.id,
                    {
                      transform: {
                        [key]:
                          value,
                      },
                    },
                  )
                }
              />
            ),
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "1fr 1fr",
              gap: 7,
              marginTop: 12,
            }}
          >
            <ActionButton
              label="RESET GROUP"
              disabled={
                selectedGroup.locked
              }
              onClick={() =>
                onUpdateGroup(
                  selectedGroup.id,
                  {
                    transform: {
                      x: 0,
                      y: 0,
                      rotation: 0,
                      scaleX: 1,
                      scaleY: 1,
                    },
                  },
                )
              }
            />
            <ActionButton
              label="DELETE GROUP"
              disabled={false}
              onClick={() =>
                onDeleteGroup(
                  selectedGroup.id,
                )
              }
            />
          </div>

          <div
            style={{
              marginTop: 12,
              color:
                "rgba(255,255,255,0.38)",
              fontSize: 9,
              lineHeight: 1.5,
            }}
          >
            Group transforms are inherited
            by child layers. Organizational
            folders remain independent.
          </div>
        </div>
      ) : (
        <div
          style={{
            padding: 18,
            color:
              "rgba(255,255,255,0.4)",
            fontSize: 11,
            lineHeight: 1.6,
          }}
        >
          {actorLoaded
            ? "Selecciona una o más capas para editar sus propiedades."
            : "No hay un actor cargado."}
        </div>
      )}
    </aside>
  );
}

function SectionLabel({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div
      style={{
        margin: "17px 0 9px",
        paddingBottom: 6,
        borderBottom:
          "1px solid rgba(70,210,255,0.12)",
        color: "#67d9ff",
        fontSize: 9,
        letterSpacing: "0.14em",
      }}
    >
      {children}
    </div>
  );
}

function TextField({
  label,
  value,
  onCommit,
  placeholder,
  disabled = false,
}: {
  label: string;
  value: string;
  onCommit: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <label style={fieldLabelStyle}>
      <span>{label}</span>
      <input
        type="text"
        defaultValue={value}
        key={value}
        placeholder={placeholder}
        disabled={disabled}
        onBlur={(event) =>
          onCommit(event.target.value)
        }
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.currentTarget.blur();
          }
        }}
        style={fieldControlStyle}
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label style={fieldLabelStyle}>
      <span>{label}</span>
      <select
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value,
          )
        }
        style={fieldControlStyle}
      >
        {children}
      </select>
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
  step = 1,
  min,
  max,
  disabled = false,
}: {
  label: string;
  value: number | undefined;
  onChange: (value: number) => void;
  step?: number;
  min?: number;
  max?: number;
  disabled?: boolean;
}) {
  return (
    <label style={fieldLabelStyle}>
      <span>{label}</span>
      <input
        type="number"
        value={
          value === undefined
            ? ""
            : Number.isInteger(value)
              ? value
              : Number(
                  value.toFixed(4),
                )
        }
        placeholder={
          value === undefined
            ? "Mixed"
            : undefined
        }
        step={step}
        min={min}
        max={max}
        disabled={disabled}
        onChange={(event) => {
          const next = Number(
            event.target.value,
          );

          if (Number.isFinite(next)) {
            onChange(next);
          }
        }}
        style={fieldControlStyle}
      />
    </label>
  );
}

function ActionButton({
  label,
  onClick,
  disabled = false,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        minHeight: 32,
        border:
          "1px solid rgba(81,214,255,0.18)",
        borderRadius: 4,
        color: "#ffffff",
        background:
          "rgba(255,255,255,0.04)",
        fontSize: 9,
        cursor: disabled
          ? "not-allowed"
          : "pointer",
        opacity: disabled ? 0.4 : 1,
      }}
    >
      {label}
    </button>
  );
}

function InfoRow({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?:
    | "default"
    | "success"
    | "warning";
}) {
  const color =
    tone === "success"
      ? "#67e6b5"
      : tone === "warning"
        ? "#ffd36a"
        : "rgba(255,255,255,0.68)";

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns:
          "1fr 142px",
        alignItems: "center",
        gap: 8,
        marginBottom: 8,
        color:
          "rgba(255,255,255,0.6)",
        fontSize: 10,
      }}
    >
      <span>{label}</span>
      <span
        style={{
          overflow: "hidden",
          textOverflow:
            "ellipsis",
          color,
          fontFamily:
            "ui-monospace, monospace",
          fontSize: 8,
          textAlign: "right",
        }}
      >
        {value}
      </span>
    </div>
  );
}

const fieldLabelStyle:
  React.CSSProperties = {
    display: "grid",
    gridTemplateColumns:
      "1fr 142px",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
    color:
      "rgba(255,255,255,0.6)",
    fontSize: 10,
  };

const fieldControlStyle:
  React.CSSProperties = {
    minWidth: 0,
    width: "100%",
    boxSizing: "border-box",
    padding: "6px 7px",
    border:
      "1px solid rgba(255,255,255,0.12)",
    borderRadius: 4,
    color: "#ffffff",
    background: "#10171b",
    outline: "none",
    fontSize: 9,
  };
