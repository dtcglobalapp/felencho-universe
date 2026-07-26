export interface StudioSelectionState {
  ids: string[];
  anchorId: string | null;
}

export interface SelectionModifiers {
  additive: boolean;
  range: boolean;
}

export const EMPTY_STUDIO_SELECTION:
  StudioSelectionState = {
    ids: [],
    anchorId: null,
  };

function uniqueExistingIds(
  ids: readonly string[],
  orderedIds: readonly string[],
): string[] {
  const existing =
    new Set(orderedIds);

  return [...new Set(ids)].filter(
    (id) => existing.has(id),
  );
}

export const StudioSelection = {
  select(
    current: StudioSelectionState,
    id: string,
    orderedIds: readonly string[],
    modifiers: SelectionModifiers = {
      additive: false,
      range: false,
    },
  ): StudioSelectionState {
    if (!orderedIds.includes(id)) {
      return current;
    }

    if (
      modifiers.range &&
      current.anchorId &&
      orderedIds.includes(
        current.anchorId,
      )
    ) {
      const start =
        orderedIds.indexOf(
          current.anchorId,
        );
      const end =
        orderedIds.indexOf(id);
      const rangeIds =
        orderedIds.slice(
          Math.min(start, end),
          Math.max(start, end) + 1,
        );

      return {
        ids: modifiers.additive
          ? uniqueExistingIds(
              [
                ...current.ids,
                ...rangeIds,
              ],
              orderedIds,
            )
          : rangeIds,
        anchorId: current.anchorId,
      };
    }

    if (modifiers.additive) {
      const alreadySelected =
        current.ids.includes(id);

      return {
        ids: alreadySelected
          ? current.ids.filter(
              (item) => item !== id,
            )
          : uniqueExistingIds(
              [...current.ids, id],
              orderedIds,
            ),
        anchorId: id,
      };
    }

    return {
      ids: [id],
      anchorId: id,
    };
  },

  replace(
    ids: readonly string[],
    orderedIds: readonly string[],
  ): StudioSelectionState {
    const normalized =
      uniqueExistingIds(
        ids,
        orderedIds,
      );

    return {
      ids: normalized,
      anchorId:
        normalized.at(-1) ?? null,
    };
  },

  reconcile(
    current: StudioSelectionState,
    orderedIds: readonly string[],
  ): StudioSelectionState {
    const ids = uniqueExistingIds(
      current.ids,
      orderedIds,
    );
    const anchorId =
      current.anchorId &&
      orderedIds.includes(
        current.anchorId,
      )
        ? current.anchorId
        : ids.at(-1) ?? null;

    if (
      anchorId === current.anchorId &&
      ids.length ===
        current.ids.length &&
      ids.every(
        (id, index) =>
          id === current.ids[index],
      )
    ) {
      return current;
    }

    return {
      ids,
      anchorId,
    };
  },

  clear(): StudioSelectionState {
    return {
      ...EMPTY_STUDIO_SELECTION,
    };
  },
};
