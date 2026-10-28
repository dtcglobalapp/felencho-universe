export type StudioAudioOptions = {
  onLog?: (message: string) => void;
};

class StudioAudioEngine {
  private currentAudio: HTMLAudioElement | null = null;
  private finishCurrent: (() => void) | null = null;
  private hasStarted = false;
  private onLog?: (message: string) => void;

  configure(options: StudioAudioOptions = {}) {
    this.onLog = options.onLog;
  }

  async play(audioUrl: string) {
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
        if (this.currentAudio !== audio) return;
        this.cleanup();

        if (this.hasStarted) {
          this.log("⚠️ StudioAudio terminó con aviso no crítico.");
          resolve();
          return;
        }

        reject(new Error("No se pudo iniciar el audio."));
      };

      audio.play().catch((error) => {
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