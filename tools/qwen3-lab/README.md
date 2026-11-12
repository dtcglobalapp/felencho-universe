# Felencho Mundial — Qwen3-TTS Mac isolated laboratory

**Standalone only:** does not alter `agents/lina/`, LiveKit, Cartesia, Next.js, Hologram Mode or production.
Scripts create `~/felencho-qwen3-tts-lab` instead of writing model files into the main repository.

## Why CustomVoice is the first model
Qwen3-TTS 0.6B **Base** requires a consented voice reference for cloning and has no preset speakers. For the first two audible samples, use **0.6B CustomVoice**, which has speakers `Serena` (female) and `Uncle_Fu` (older male). Their native language is Chinese, so **neutral Spanish is NOT guaranteed**. These are only temporary voice candidates. If they sound unnatural, compare alternative speakers and proceed with Base + a permitted Spanish reference.

## On La Bestia
Open Terminal; do not stop the running Next.js process and do not paste commands into its active terminal:
```bash
cd ~/Documents/felencho-hologram-check
git pull --ff-only
bash tools/qwen3-lab/setup-mac.sh
bash tools/qwen3-lab/generate-mac.sh
open ~/felencho-qwen3-tts-lab/output
```

Requirements: Apple Silicon macOS, `python3.12`; free disk space for pip libraries and downloaded Hugging Face model; working Internet for initial installation. Installation uses `mlx-audio==0.3.1` (pin subject to validation). **It is not guaranteed that its third-party dependencies work on each specific macOS installation.** If errors occur, stop and share the FIRST error. Do not use `sudo` or reconfigure system Python.

The scripts use `mlx_audio.tts.generate` documented by mlx-audio with `--model`, `--text`, `--voice`, `--lang_code`, `--output_path`. First invocation downloads checkpoint. Files should be under the output directory; note whether output path creates a WAV or subfolder.

### Acceptance checklist
- Can speak understandable Spanish using Lina/Serena and Bob/Uncle_Fu (neutral accent desired; not assumed).
- Can synthesize English; then separately test remaining eight languages with written input and human-language review.
- Capture Mac system details: `sysctl -n hw.memsize`, `sw_vers -productVersion`, `python3.12 --version`.
- Capture per-sample elapsed time with `time bash tools/qwen3-lab/generate-mac.sh`, but cold download time must not be confused with TTS latency; re-run on warm cache.
- No API keys, no Cartesia credits. Does not run LLM or STT, does not demonstrate two-agent capacity yet.
- Only test preapproved local voice presets. No cloning someone's voice without authorization.

### Sources
https://github.com/QwenLM/Qwen3-TTS
https://github.com/Neywa-Labs/mlx-audio/blob/main/docs/getting-started/quickstart-cli.md
https://huggingface.co/mlx-community/Qwen3-TTS-12Hz-0.6B-CustomVoice-8bit


## Second phase: eight remaining languages and elapsed time

**Producer verdict on first recordings (2026-11-11):**
- Lina Spanish / Serena: **excellent**
- Bob Spanish / Uncle_Fu: **excellent**
- Lina English / Serena: **excellent**

The next script does not overwrite any of those WAVs. It creates new WAVs in `~/felencho-qwen3-tts-lab/output/languages`, and one text log `benchmark-tiempos.txt`.

```bash
cd ~/Documents/felencho-hologram-check
git pull --ff-only
bash tools/qwen3-lab/test-remaining-languages-mac.sh
open ~/felencho-qwen3-tts-lab/output/languages
```

It tests Portuguese, French, German, Italian, Chinese, Japanese, Korean and Russian with a preset voice and language flag. Use the log's `real` field for **total per-process elapsed time**; each command starts a fresh MLX process and model load. This does NOT measure first-audio streaming latency, end-to-end interactive response, concurrency or a permanent loaded server. Review each language with someone competent in that language. Internet should not be required after download unless the local cache misses a file.
