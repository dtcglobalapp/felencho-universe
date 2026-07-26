import type {
  ActorDefinition,
} from "../../domain/ActorDefinition";
import type {
  StudioSelectionState,
} from "./StudioSelection";

export interface StudioHistorySnapshot {
  definition: ActorDefinition;
  selection: StudioSelectionState;
}
export interface StudioHistoryEntry {
  label: string;
  snapshot: StudioHistorySnapshot;
}

export interface StudioHistoryRestore {
  label: string;
  snapshot: StudioHistorySnapshot;
}

interface ActiveTransaction {
  label: string;
  before: StudioHistorySnapshot;
}

function snapshot(
  definition: ActorDefinition,
  selection: StudioSelectionState,
): StudioHistorySnapshot {
  return {
    definition,
    selection: {
      ids: [...selection.ids],
      anchorId: selection.anchorId,
    },
  };
}

export class StudioHistory {
  readonly limit: number;

  private past: StudioHistoryEntry[] =
    [];

  private future: StudioHistoryEntry[] =
    [];

  private transaction:
    ActiveTransaction | null = null;

  public constructor(limit = 100) {
    this.limit = Math.max(
      1,
      Math.floor(limit),
    );
  }

  public get canUndo(): boolean {
    return this.past.length > 0;
  }

  public get canRedo(): boolean {
    return this.future.length > 0;
  }

  public get pastCount(): number {
    return this.past.length;
  }

  public get futureCount(): number {
    return this.future.length;
  }

  public get transactionActive(): boolean {
    return Boolean(this.transaction);
  }

  public clear(): void {
    this.past = [];
    this.future = [];
    this.transaction = null;
  }

  public record(
    label: string,
    beforeDefinition: ActorDefinition,
    beforeSelection:
      StudioSelectionState,
  ): void {
    if (this.transaction) {
      return;
    }

    this.past = [
      ...this.past,
      {
        label,
        snapshot: snapshot(
          beforeDefinition,
          beforeSelection,
        ),
      },
    ].slice(-this.limit);
    this.future = [];
  }

  public beginTransaction(
    label: string,
    definition: ActorDefinition,
    selection: StudioSelectionState,
  ): void {
    if (this.transaction) {
      return;
    }

    this.transaction = {
      label,
      before: snapshot(
        definition,
        selection,
      ),
    };
  }

  public commitTransaction(
    changed: boolean,
  ): void {
    const current =
      this.transaction;

    this.transaction = null;

    if (!current || !changed) {
      return;
    }

    this.past = [
      ...this.past,
      {
        label: current.label,
        snapshot: current.before,
      },
    ].slice(-this.limit);
    this.future = [];
  }

  public cancelTransaction(): void {
    this.transaction = null;
  }

  public undo(
    currentDefinition: ActorDefinition,
    currentSelection:
      StudioSelectionState,
  ): StudioHistoryRestore | null {
    const entry =
      this.past.at(-1);

    if (!entry) {
      return null;
    }

    this.past = this.past.slice(0, -1);
    this.future = [
      {
        label: entry.label,
        snapshot: snapshot(
          currentDefinition,
          currentSelection,
        ),
      },
      ...this.future,
    ].slice(0, this.limit);

    return {
      label: entry.label,
      snapshot: entry.snapshot,
    };
  }

  public redo(
    currentDefinition: ActorDefinition,
    currentSelection:
      StudioSelectionState,
  ): StudioHistoryRestore | null {
    const entry = this.future[0];

    if (!entry) {
      return null;
    }

    this.future = this.future.slice(1);
    this.past = [
      ...this.past,
      {
        label: entry.label,
        snapshot: snapshot(
          currentDefinition,
          currentSelection,
        ),
      },
    ].slice(-this.limit);

    return {
      label: entry.label,
      snapshot: entry.snapshot,
    };
  }
}
