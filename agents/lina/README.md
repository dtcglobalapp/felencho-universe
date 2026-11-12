# Felencho Universe — LiveKit Voice Agent (no LemonSlice)

The voice worker serves Bob and Lina with separate voices, with all conversational intelligence from Felencho Brain. The visual component is the separate in-house Felencho Hologram Engine.

Pipeline: studio mic -> LiveKit -> Silero VAD -> Deepgram nova-3 STT -> custom FelenchoBrainAgent.llmNode() -> Felencho Brain -> Cartesia Sonic 3 via LiveKit Inference -> LiveKit audio track -> future browser WebAudio analyser -> Felencho hologram setState()/pushAudio().

The **browser audio analyser/state bridge is not wired or verified yet**. Existing `/live/display` is video-only and needs a new hologram display mode. Do not merge or deploy until two separate audio sessions pass a full real-life test, including interruption and safe shutdown.

Critical legacy baseline: 2026-09-11 commit `a359f18dd2bf6e7fc221f9199da6d72afcef5ffa`, SDK `@livekit/agents@1.8.1`. Keep `FelenchoBrainNodeMarker` in this version because AgentSession requires a configured LLM even with an overridden `llmNode()`. Do not re-enable microphone Opus DTX without Safari/iPhone checks.

Runtime config: LiveKit credentials on the server, optional `FELENCHO_BRAIN_URL`, independent `BOB_TTS_VOICE`, `LINA_TTS_VOICE`, `BOB_TTS_LANGUAGE`, `LINA_TTS_LANGUAGE`. No hosted avatar credentials.

On a local branch, from `agents/lina`: `npm install`, `npm run typecheck`, `npm run build`. The GitHub deploy workflow triggers on `main`, not on this preview branch.
