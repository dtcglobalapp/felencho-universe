import { supabase } from "@/lib/supabase";
import {
  presenceController,
  PresenceMode,
  PresenceState,
} from "@/lib/PresenceController";

export type StudioSyncStatus = {
  studio_id: string;
  character_id: string;
  mode: PresenceMode;
  state: PresenceState;
};

export type StudioSyncOptions = {
  studioId: string;
  onLog?: (message: string) => void;
};

export default class StudioSync {
  private studioId: string;
  private onLog?: (message: string) => void;
  private channel: ReturnType<typeof supabase.channel> | null = null;

  constructor(options: StudioSyncOptions) {
    this.studioId = options.studioId;
    this.onLog = options.onLog;
  }

  async loadInitialState() {
    const { data, error } = await supabase
      .from("felencho_studio_presence")
      .select("studio_id, character_id, mode, state")
      .eq("studio_id", this.studioId);

    if (error) {
      this.log(`Error cargando estado inicial: ${error.message}`);
      return;
    }

    (data || []).forEach((row) => {
      this.applyStatus(row as StudioSyncStatus);
    });

    this.log("Estado inicial cargado.");
  }

  subscribe() {
    if (this.channel) return;

    this.channel = supabase
      .channel(`studio-presence-${this.studioId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "felencho_studio_presence",
          filter: `studio_id=eq.${this.studioId}`,
        },
        (payload) => {
          const next = payload.new as StudioSyncStatus;
          if (!next?.character_id) return;

          this.applyStatus(next);
        }
      )
      .subscribe((status) => {
        this.log(`Realtime: ${status}`);
      });
  }

  unsubscribe() {
    if (!this.channel) return;

    supabase.removeChannel(this.channel);
    this.channel = null;
    this.log("Realtime desconectado.");
  }

  async setPresence(characterId: string) {
    await this.update(characterId, "presence", "sleeping");
  }

  async setLive(characterId: string) {
    await this.update(characterId, "live", "waking");
  }

  async setThinking(characterId: string) {
    await this.update(characterId, "live", "thinking");
  }

  async setSpeaking(characterId: string) {
    await this.update(characterId, "live", "speaking");
  }

  async sleepAll(characterIds: string[]) {
    await Promise.all(characterIds.map((id) => this.setPresence(id)));
  }

  async wakeOnly(characterId: string, allCharacterIds: string[]) {
    await Promise.all(
      allCharacterIds.map((id) =>
        id === characterId ? this.setLive(id) : this.setPresence(id)
      )
    );
  }

  private async update(
    characterId: string,
    mode: PresenceMode,
    state: PresenceState
  ) {
    const { error } = await supabase
      .from("felencho_studio_presence")
      .upsert(
        {
          studio_id: this.studioId,
          character_id: characterId,
          mode,
          state,
          updated_by: "studio-control",
        },
        {
          onConflict: "studio_id,character_id",
        }
      );

    if (error) {
      this.log(`Error actualizando ${characterId}: ${error.message}`);
      return;
    }

    this.log(`${characterId}: ${mode}/${state}`);
  }

  private applyStatus(status: StudioSyncStatus) {
    if (status.mode === "live") {
      presenceController.setLive(status.character_id);
    } else {
      presenceController.setPresence(status.character_id);
    }

    if (status.state === "thinking") {
      presenceController.think(status.character_id);
    }

    if (status.state === "speaking") {
      presenceController.speak(status.character_id);
    }

    if (status.state === "sleeping") {
      presenceController.sleep(status.character_id);
    }

    this.log(
      `Aplicado ${status.character_id}: ${status.mode}/${status.state}`
    );
  }

  private log(message: string) {
    this.onLog?.(message);
  }
}