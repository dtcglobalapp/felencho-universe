import { StudioHologramVoiceSender, type HologramCharacter } from "@/lib/HologramAudioBridge";

export type StudioAudioOptions = {
  onLog?: (message: string) => void;
};

class StudioAudioEngine {
  private currentAudio: HTMLAudioElement | null = null;
  private finishCurrent: (() => void) | null = null;
  private hasStarted = false;
  private hologramSender: StudioHologramVoiceSender | null = null;
  private onLog?: (message: string) => void;

  configure(options: StudioAudioOptions = {}) {
    this.onLog = options.onLog;
  }

  async play(audioUrl: string, character?: HologramCharacter) {
    this.stop();
    this.hasStarted = false;

    return new Promise<void>((resolve, reject) => {
      const audio = new Audio(audioUrl);

      this.currentAudio = audio;
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        if (this.currentAudio === audio) this.cleanup();
        resolve();
      };
      this.finishCurrent = finish;

      audio.onplay = () => {
        this.hasStarted = true;
        this.log("🔊 StudioAudio reproduciendo desde La Bestia.");
      };

      audio.onended = () => {
        finish();
        this.log("✅ StudioAudio terminó reproducción.");
      };

      audio.onerror = () => {
        if (this.currentAudio !== audio) return;
        this.cleanup();

        if (this.hasStarted) {
          this.log("⚠️ StudioAudio terminó con aviso no crítico.");
          resolve();
          return;
        }

        reject(new Error("No se pudo iniciar el audio."));
      };

      const startPlayback = async () => {
        // Always begin studio playback first. Never put Web Audio setup
        // in the critical path; AudioContext can remain suspended
        // indefinitely outside a browser user gesture.
        await audio.play();
        if (!character || this.currentAudio !== audio || audio.ended) return;
        const sender = new StudioHologramVoiceSender();
        this.hologramSender = sender;
        try {
          const connected = await sender.connect(audio, character);
          if (!connected) {
            sender.disconnect();
            if (this.hologramSender === sender) this.hologramSender = null;
            this.log("⚠️ Web Audio no autorizado por el navegador; voz original continúa.");
          }
        } catch {
          sender.disconnect();
          if (this.hologramSender === sender) this.hologramSender = null;
          this.log("⚠️ Sin señal holográfica; voz del estudio continúa.");
        }
      };
      startPlayback().catch((error) => {
        if (this.currentAudio !== audio) return;
        this.cleanup();

        if (this.hasStarted) {
          this.log("⚠️ StudioAudio canceló después de iniciar.");
          resolve();
          return;
        }

        reject(error);
      });
    });
  }

  stop() {
    if (!this.currentAudio) return;

    try {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
    } catch {}

    const finish = this.finishCurrent;
    this.cleanup();
    finish?.();
  }

  private cleanup() {
    this.hologramSender?.disconnect();
    this.hologramSender = null;
    if (!this.currentAudio) return;

    this.currentAudio.onplay = null;
    this.currentAudio.onended = null;
    this.currentAudio.onerror = null;
    this.currentAudio = null;
    this.finishCurrent = null;
  }

  private log(message: string) {
    this.onLog?.(message);
  }
}

const StudioAudio = new StudioAudioEngine();

export default StudioAudio;