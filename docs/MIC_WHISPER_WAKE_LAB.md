# Local microphone to Whisper wake-word lab

This is an **isolated offline diagnostic**, not a production voice agent and not a browser control.

Flow: RODECaster Pro II Secondary (AVFoundation audio device 0, verify on each launch) → FFmpeg 16 kHz mono WAV in temporary local storage → installed `whisper-cli` with Spanish Small multilingual model → `routeTranscript` → printed LISTENING candidate.

## On La Bestia
```bash
cd ~/Documents/felencho-hologram-visual-test
git fetch origin
git switch --track origin/feature/local-mic-whisper-wake-lab
node --test tools/hologram-local-lab/wake-words.test.mjs
node tools/hologram-local-lab/mic-whisper-wake.mjs --dry-text "Lina, me escuchas"
node tools/hologram-local-lab/mic-whisper-wake.mjs --once --device 0 --seconds 6
```

Repeat continuously by omitting `--once`. Stop with Ctrl+C (completes the current chunk first). Local recordings are deleted at the end of each segment. No recording or transcript is uploaded to GitHub or sent to any service. Do not execute this command from a shared remote machine. Do not use a monitor return-feed as the input to prevent voices from activating each other.

**Known limitations**: segment-based (not streaming); fixed-duration recordings can split an utterance; no VAD/barge-in/echo cancellation; first run depends on macOS microphone permission; device indices may change. Output `LISTENING` is diagnostic text only; hologram displays are untouched. Do not claim Bob/Lina heard, responded or were commanded by this script.

Do not modify approved Bob/Lina images, orbital animation, Qwen3-TTS, LiveKit, Cartesia, Felencho Brain or production.

## New opt-in visual wake bridge (port 7891)

The state bridge is **not** a voice agent. It sends only an ephemeral `{target,action:"LISTENING"}` event via a localhost-only HTTP POST to subscribed Bob/Lina screens using SSE. Each matching screen enters LISTENING for 3.5 seconds and returns to IDLE if no other state superseded it. SPEAKING has priority. No transcripts or audio are sent to the browser bridge. The lab control strip shows bridge connectivity. Never expose port 7891 on LAN, tunnels, or production.

After pulling the branch, launch bridge in a NEW terminal:
```bash
cd ~/Documents/felencho-hologram-visual-test
node tools/hologram-local-lab/wake-bridge.mjs
```

Keep Next.js on 3001 and open both `http://127.0.0.1:3001/hologram-local-lab/lina` and `/bob` on **the same hostname 127.0.0.1**.

From another terminal:
```bash
cd ~/Documents/felencho-hologram-visual-test
node tools/hologram-local-lab/mic-whisper-wake.mjs --dry-text "Lina me escuchas" --bridge
node tools/hologram-local-lab/mic-whisper-wake.mjs --once --device 0 --seconds 6 --bridge
```

To monitor repeatedly, omit `--once`. The program captures 6-second chunks sequentially, which is not continuous streaming and can miss or cut words. The browser receives only wake events; it will NOT understand or answer questions. Disconnect/stop with Ctrl+C. The lab's LiveKit subscription continues independently.
