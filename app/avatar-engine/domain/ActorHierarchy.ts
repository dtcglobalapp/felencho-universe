import type {
  ActorDefinition,
  ActorLayerDefinition,
} from "./ActorDefinition";

export interface ActorHierarchyIssue {
  code:
    | "SELF_PARENT"
    | "MISSING_PARENT"
    | "HIERARCHY_CYCLE";
  nodeId: string;
  parentId?: string;
  path: string[];
}
interface HierarchyNode {
  id: string;
  parentId?: string;
}

function hierarchyNodes(
  definition: ActorDefinition,
): HierarchyNode[] {
  return [
    ...definition.groups.map(
      (group) => ({
        id: group.id,
        parentId: group.parentId,
      }),
    ),
    ...definition.layers.map(
      (layer) => ({
        id: layer.id,
        parentId:
          layer.inheritTransform
            ? layer.parentId
            : undefined,
      }),
    ),
  ];
}

export function inspectActorHierarchy(
  definition: ActorDefinition,
): ActorHierarchyIssue[] {
  const nodes =
    hierarchyNodes(definition);
  const nodeIds = new Set(
    nodes.map((node) => node.id),
  );
  const parentById = new Map(
    nodes.map((node) => [
      node.id,
      node.parentId,
    ]),
  );
  const issues: ActorHierarchyIssue[] =
    [];

  for (const node of nodes) {
    if (!node.parentId) {
      continue;
    }

    if (node.parentId === node.id) {
      issues.push({
        code: "SELF_PARENT",
        nodeId: node.id,
        parentId: node.parentId,
        path: [node.id],
      });
      continue;
    }

    if (!nodeIds.has(node.parentId)) {
      issues.push({
        code: "MISSING_PARENT",
        nodeId: node.id,
        parentId: node.parentId,
        path: [
          node.id,
          node.parentId,
        ],
      });
      continue;
    }

    const path: string[] = [];
    const visited = new Set<string>();
    let currentId: string | undefined =
      node.id;

    while (currentId) {
      if (visited.has(currentId)) {
        const cycleStart =
          path.indexOf(currentId);

        issues.push({
          code: "HIERARCHY_CYCLE",
          nodeId: node.id,
          path: [
            ...path.slice(
              Math.max(0, cycleStart),
            ),
            currentId,
          ],
        });
        break;
      }

      visited.add(currentId);
      path.push(currentId);
      currentId =
        parentById.get(currentId);
    }
  }

  const uniqueIssues = new Map<
    string,
    ActorHierarchyIssue
  >();

  for (const issue of issues) {
    const normalizedPath =
      issue.code === "HIERARCHY_CYCLE"
        ? [...new Set(issue.path)]
            .sort()
            .join("|")
        : issue.path.join("|");

    uniqueIssues.set(
      `${issue.code}:${normalizedPath}`,
      issue,
    );
  }

  return [...uniqueIssues.values()];
}

export function canAssignActorParent(
  definition: ActorDefinition,
  nodeId: string,
  parentId: string | undefined,
): boolean {
  if (!parentId) {
    return true;
  }

  if (nodeId === parentId) {
    return false;
  }

  const candidate: ActorDefinition = {
    ...definition,
    groups: definition.groups.map(
      (group) =>
        group.id === nodeId
          ? {
              ...group,
              parentId,
            }
          : group,
    ),
    layers: definition.layers.map(
      (layer) =>
        layer.id === nodeId
          ? {
              ...layer,
              parentId,
              inheritTransform: true,
            }
          : layer,
    ),
  };

  return (
    inspectActorHierarchy(candidate)
      .length === 0
  );
}

export interface EffectiveLayerState {
  visible: boolean;
  locked: boolean;
}

export function getEffectiveLayerState(
  definition: ActorDefinition,
  layer: ActorLayerDefinition,
): EffectiveLayerState {
  let visible = layer.visible;
  let locked = layer.locked;

  if (layer.folderId) {
    const folderById = new Map(
      definition.folders.map(
        (folder) => [
          folder.id,
          folder,
        ],
      ),
    );
    const visited =
      new Set<string>();
    let folderId: string | undefined =
      layer.folderId;

    while (
      folderId &&
      !visited.has(folderId)
    ) {
      visited.add(folderId);
      const folder =
        folderById.get(folderId);

      if (!folder) {
        break;
      }

      visible =
        visible && folder.visible;
      locked = locked || folder.locked;
      folderId = folder.parentId;
    }
  }

  if (
    layer.parentId &&
    layer.inheritTransform
  ) {
    const groups = new Map(
      definition.groups.map(
        (group) => [
          group.id,
          group,
        ],
      ),
    );
    const layers = new Map(
      definition.layers.map(
        (item) => [
          item.id,
          item,
        ],
      ),
    );
    const visited =
      new Set<string>();
    let parentId: string | undefined =
      layer.parentId;

    while (
      parentId &&
      !visited.has(parentId)
    ) {
      visited.add(parentId);

      const group =
        groups.get(parentId);

      if (group) {
        visible =
          visible && group.visible;
        locked =
          locked || group.locked;
        parentId = group.parentId;
        continue;
      }

      const parentLayer =
        layers.get(parentId);

      if (!parentLayer) {
        break;
      }

      visible =
        visible &&
        parentLayer.visible;
      locked =
        locked ||
        parentLayer.locked;
      parentId =
        parentLayer.inheritTransform
          ? parentLayer.parentId
          : undefined;
    }
  }

  return {
    visible,
    locked,
  };
}
