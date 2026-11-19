# Felencho Mundial — Bob/Lina Light Engine: integration staging

**Status:** isolated code branch for local tests only. NOT installed on La Bestia, NOT merged, NOT connected to real Felencho Brain audio, NOT shown on physical TVs.

## Approved visual assets (DO NOT REGENERATE)
- Lovable Felencho Light Engine project: `7463d17a-45e2-4f13-9c5c-48fd8dd8e2ea`.
- Lina approved appearance: `/lina-v3-audio`; Bob supplied: `/bob-v1` (Felencho reports approval).
- Source: `src/presence/*`, `src/bridge/FelenchoPresenceBridge.ts`, `src/assets/bob-v1-portrait.jpg`, `src/assets/lina-v2-portrait.jpg`, `src/assets/lina-v2-sleep.webp`, plus listed dependencies in Lovable's `INTEGRACION-LOCAL.md`.
- Those binary assets and the renderer are **not yet copied into this GitHub branch**. The two new files here are a bridge scaffold only. Do not alter the old presence routes until these assets are transferred and approved.

## Existing system (as inspected on feature/ipad-teleprompter-lab-v1)
- Studio Control :7892 starts the existing Next web process on :3001 and wake bridge on 127.0.0.1:7891.
- `wake-bridge.mjs` exposes per-persona SSE `/events?persona=bob|lina`, with actions IDLE/LISTENING/SPEAKING/SLEEP; wake events contain **no audio bands**.
- New `/api/studio-light/events?persona=...` is a **read-only** same-origin proxy so a browser can subscribe without referring to its own 127.0.0.1. Only the Next server contacts 7891.
- `lib/studioLightPresence.ts` validates events and adapts each to renderer `setState` and zeroes energy outside SPEAKING. It does NOT synthesize, decode, play or duplicate audio. It does not command Felencho Brain.

## Next safe integration stages
1. Transfer the full Lovable renderer **plus binary assets** into an isolated Next route, e.g. `/studio-light/bob` and `/studio-light/lina`, with React 19 and existing Three.js. Do not remove `/hologram-local-lab/*` or current TV links. Compare screenshots to approved Lovable portraits before proceeding.
2. Wire each screen's own presence controller to `connectLocalWakeEvents(character,{setState,pushAudio})` in a client effect, returning cleanup on unmount. Never attach Bob's stream to Lina. Test two independent tabs and no audio.
3. At the single audio playback point on **La Bestia**, route already-authorized Dylan/Serena playback through LiveKit/RØDECaster as today. Send envelope/FFT data via a **separate** local bridge to that character's renderer (or attach analyser to an existing track with muted/visual-only destination). Never start a second playing audio element on the TV. Existing wake events alone cannot provide frequency-reactive lip/energy.
4. Felencho Brain/Director must be the **source of truth for turns**; derive IDLE/LISTENING/THINKING/SPEAKING/WATCHING/SLEEP from real turn transitions and media playout. The current wake bridge supports only four states, so this stage requires a new authenticated local event source rather than claiming completeness.
5. Validate both physical portrait TVs in Chrome with a route reachable from each TV's host on the LAN. The **current Studio Control web spawn binds 127.0.0.1:3001**, meaning it is not remotely reachable from a separate Windows TV computer. DO NOT restart the running panel merely to change bind address. Inspect host firewall and network, schedule a controlled restart/test with Felencho. Prefer reverse-proxy/sidecar where practical and keep rollback path.
6. Validate isolation, one-audio-path/no feedback, zero chat loop, 6-state timing, FPS/GPU, source permissions and recovery after browser reconnect, **then** propose a separate PR to bring it into active studio.

## Minimal no-impact checks after building branch locally (NOT run by this connector)
- `npm run build`
- `curl -i http://127.0.0.1:3001/api/studio-light/events?persona=invalid` -> HTTP 400
- With 7891 running: `curl -N http://127.0.0.1:3001/api/studio-light/events?persona=bob` -> SSE connection
- From existing Studio Control "Probar Bob": only Bob SSE should see LISTENING -> IDLE.
- Repeat with Lina and compare independent windows.
- Check panel service PIDs before/after tests and never use `all-stop`.

## Security/quality
The SSE route contains no private transcript/audio; it merely forwards states. Actual Brain events should be validated, locally authenticated and never exposed on public Vercel deployments. These modules **do not establish a transport to Felencho Brain** on their own. No lips/visemes needed for the approved visual production baseline.
