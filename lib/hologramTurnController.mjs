/**
 * Felencho Mundial: provider-neutral orchestration for hologram audio turns.
 * EXPERIMENTAL. Does not fetch networks, access microphones, create paid voice
 * sessions or change production LiveKit/LemonSlice flows.
 *
 * Inject protected server-side adapters:
 *   brain({ character, question, signal }) -> string
 *   tts({ character, text, provider, signal }) -> opaque audio payload
 *   playback({ character, audio, signal }) -> Promise resolved when audio ends
 *   stopPlayback() -> synchronous audio cut-off
 *
 * An authorized studio controller must validate conductor identity BEFORE
 * calling request(). The boolean authorization flag is NOT authentication.
 */
export const HOLOGRAM_MODES = Object.freeze({
  LISTENING: "escuchando", THINKING: "pensando",
  SPEAKING: "hablando", SUSPENDED: "suspendido",
});

const VALID_CHARACTERS = new Set(["bob", "lina"]);
const VALID_PROVIDERS = new Set(["cartesia", "elevenlabs"]);

export class HologramTurnController {
  #brain; #tts; #playback; #stopPlayback; #onChange;
  #providers = { bob: "elevenlabs", lina: "elevenlabs" };
  #states = { bob: HOLOGRAM_MODES.LISTENING, lina: HOLOGRAM_MODES.LISTENING };
  #active = null;
  #abort = null;
  #generation = 0;

  constructor({ brain, tts, playback, stopPlayback, onChange = () => {} }) {
    for (const [label, fn] of Object.entries({ brain, tts, playback, stopPlayback, onChange })) {
      if (typeof fn !== "function") throw new TypeError(label + " adapter is required");
    }
    this.#brain = brain; this.#tts = tts;
    this.#playback = playback; this.#stopPlayback = stopPlayback; this.#onChange = onChange;
  }

  get snapshot() {
    return Object.freeze({
      active: this.#active,
      bob: Object.freeze({ mode: this.#states.bob, provider: this.#providers.bob }),
      lina: Object.freeze({ mode: this.#states.lina, provider: this.#providers.lina }),
    });
  }

  #notify(character) { this.#onChange(this.snapshot, character); }

  setProvider(character, provider) {
    if (!VALID_CHARACTERS.has(character) || !VALID_PROVIDERS.has(provider))
      throw new RangeError("Unknown character or voice provider");
    if (character === this.#active) this.interrupt("provider-switch");
    this.#providers[character] = provider;
    this.#notify(character);
  }

  setMode(character, mode) {
    if (!VALID_CHARACTERS.has(character) ||
        ![HOLOGRAM_MODES.LISTENING, HOLOGRAM_MODES.SUSPENDED].includes(mode))
      throw new RangeError("Invalid studio mode");
    if (character === this.#active) this.interrupt("manual-mode");
    this.#states[character] = mode;
    this.#notify(character);
  }

  /** Synchronous: cut audio before awaiting provider cancellation. */
  interrupt(_reason = "presenter") {
    ++this.#generation;
    this.#abort?.abort();
    this.#abort = null;
    this.#stopPlayback();
    const prior = this.#active;
    this.#active = null;
    if (prior) {
      this.#states[prior] = HOLOGRAM_MODES.LISTENING;
      this.#notify(prior);
    }
  }

  async request({ character, question, presenterAuthorized }) {
    if (presenterAuthorized !== true) throw new Error("Studio conductor authorization required");
    if (!VALID_CHARACTERS.has(character)) throw new RangeError("Unknown cohost");
    if (typeof question !== "string" || !question.trim() || question.length > 2000)
      throw new RangeError("Invalid question");
    if (this.#states[character] === HOLOGRAM_MODES.SUSPENDED)
      throw new Error("Cohost suspended");

    this.interrupt("next-turn");
    const generation = this.#generation;
    const abort = new AbortController();
    this.#abort = abort;
    this.#active = character;
    this.#states[character] = HOLOGRAM_MODES.THINKING;
    this.#notify(character);
    const current = () => !abort.signal.aborted && this.#generation === generation;

    try {
      const text = await this.#brain({ character, question: question.trim(), signal: abort.signal });
      if (!current()) return { status: "cancelled" };
      if (typeof text !== "string" || !text.trim()) throw new Error("Brain returned no answer");
      const audio = await this.#tts({
        character, text: text.trim(), provider: this.#providers[character], signal: abort.signal,
      });
      if (!current()) return { status: "cancelled" };
      this.#states[character] = HOLOGRAM_MODES.SPEAKING;
      this.#notify(character);
      await this.#playback({ character, audio, signal: abort.signal });
      if (!current()) return { status: "cancelled" };
      return { status: "completed", character, text: text.trim() };
    } catch (error) {
      if (!current() || error?.name === "AbortError") return { status: "cancelled" };
      return { status: "error", reason: error instanceof Error ? error.message : "Unknown error" };
    } finally {
      if (current()) {
        this.#states[character] = HOLOGRAM_MODES.LISTENING;
        this.#active = null;
        this.#abort = null;
        this.#notify(character);
      }
    }
  }
}
