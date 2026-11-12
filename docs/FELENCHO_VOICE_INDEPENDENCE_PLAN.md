# Felencho Mundial — Independent Voice and AI Infrastructure Plan
**Decision:** 2026-11-11. **Status:** researched architecture and test plan; NOT deployed. Branch `feature/lovable-hologram-studio-v1`.

## Correction and objective
Felencho was previously told Cartesia was free and unlimited; that was incorrect. No provider TTS free tier should be represented as unlimited. Member-scale interactive voice must not depend on provider-imposed TTS minute quotas.

**Nonnegotiable:** Keep existing Lina/Bob voices, LiveKit/Cartesia workflow and hologram visuals/aural-visual Sentidos unchanged until an alternative is licensed, tested and explicitly approved. No upgrades or deployments in this phase.

## Current exact dependency chain
`agents/lina/src/main.ts` invokes `inference.STT({model:"deepgram/nova-3", language:"multi"})`, calls `FELENCHO_BRAIN_URL` (default hosted Felencho Brain) for LLM responses, invokes `inference.TTS({model:"cartesia/sonic-3"})`, and publishes audio into LiveKit. Inference usage is routed/billed through LiveKit Cloud, not necessarily the Cartesia direct plan. `lib/felenchoBrainEngine.ts` invokes hosted OpenAI Responses API. Database is hosted Supabase. **Replacing TTS alone doesn't remove cloud STT/LLM/transport/database dependencies.**

## Legally usable self-hosted TTS candidates (verify model AND voice weights for commercial use)
| Engine | Licence evidence | Languages/fit | Risks |
| --- | --- | --- | --- |
| Qwen3-TTS-12Hz-0.6B-Base | Apache-2.0 model card; https://huggingface.co/Qwen/Qwen3-TTS-12Hz-0.6B-Base ; https://github.com/QwenLM/Qwen3-TTS | 10 languages, Spanish/English, cloning with authorized sample, streaming architecture | Test hardware, chunk latency, pronunciation and stability. Voice similarity is not assured. |
| Kokoro-82M | Apache-2.0 weights https://huggingface.co/hexgrad/Kokoro-82M | Lightweight, preset voices, English/Spanish and several others | No straightforward voice cloning. Compare Spanish/Caribbean accents and expressiveness. |
| Chatterbox Multilingual V3 | MIT https://github.com/resemble-ai/chatterbox and model https://huggingface.co/ResembleAI/chatterbox | 23+ languages and regional Spanish model; voice cloning with authorized reference | Maintainers announced project archive/retired research Aug 2026. We assume maintenance/security risk. |
| F5-TTS official pre-trained weights | CC-BY-NC https://github.com/SWivid/F5-TTS | Not a commercial option without separately licensed weights | MIT code does **not** override noncommercial model weights. |

## Migration strategy with La Bestia (M4 Max)
1. **Bench isolated on Mac, NO changes to production:** evaluate Qwen3-TTS 0.6B via an Apple Silicon inference stack e.g. MLX-Audio https://github.com/Neywa-Labs/mlx-audio . Verify exact model versions and transitive licenses before installation.
2. Generate 20 test utterances for each candidate with accents, Spanish/English code switching, Spanish regional terms, numbers, pauses, laughter, interruption. No original Lina/Bob cloned voice without rights/authorization for reference audio.
3. Instrument median/p95 first-audio latency, realtime factor, memory footprint, quality, voice identity, CPU/GPU impact on Mac visual rendering, and 2/5/10 parallel request stress tests. Do not promise simultaneous user capacity until measured.
4. Develop a **provider-agnostic TTS adapter**, exposing streaming PCM/WebSocket to voice worker with a uniform typed contract, cancellation/interruption, audio levels for hologram Sentidos. Keep current Cartesia adapter intact; select local adapter only in isolated lab.
5. For community scale deploy containerized inference on owned or rented dedicated GPUs after verified capacity, with queue, per-user rate limits for fair access, monitoring, health-checks and regional transport. Owned model **no third-party TTS minute fee**, but infrastructure costs and physical capacity remain.
6. Plan separately: **STT** via whisper.cpp (Apple Silicon) https://github.com/ggml-org/whisper.cpp and multilingual quality evaluation; **LLM** via compatible self-host model+inference once tested; **transport** via self-hosted LiveKit https://docs.livekit.io/transport/self-hosting/ ; and **database** migration optional and independent. Private membership service can stay hosted until security gates pass.
7. Acceptance before rollout: side-by-side comparison with current Cartesia Lina voice, natural Spanish dialogue, safe interruptions, pushAudio/voice states for six Sentidos, no clipping/delay, and 10-minute real-world conversations. Producer approves audio independently. Roll back any failure; production stays unchanged.

## Business guardrails
- No promise of free unlimited compute, zero electricity costs, or infinite concurrency.
- No provider lock-in: keep modular voice, STT, LLM and transport adapters. Domain and user data controlled by Felencho.ai; audit all model licences before monetizing. Rights to voice-cloned source samples and consent are mandatory.
- Membership pricing needs total cost per conversation (voice synthesis + STT + LLM + bandwidth + storage + GPU + monitoring), not only TTS minutes. New models must pass usability, licensing and privacy gates.
- Notably the Qwen3-TTS 0.6B model is ~2.52GB repository as of current model card; no guaranteed speed on M4 Max without profiling.

## Current status and approved next action
This document is research / technical roadmap only. No executable changes, no server deployment, no Cartesia replacement, no secrets accessed. Next: build disposable local benchmark in an isolated directory that NEVER modifies live agent or holo screen. Record benchmark metrics and ask Felencho to compare voices.

## Sources verified 2026-11-11
- https://huggingface.co/Qwen/Qwen3-TTS-12Hz-0.6B-Base
- https://github.com/QwenLM/Qwen3-TTS
- https://huggingface.co/hexgrad/Kokoro-82M
- https://github.com/resemble-ai/chatterbox
- https://github.com/SWivid/F5-TTS
- https://github.com/Neywa-Labs/mlx-audio
- https://github.com/ggml-org/whisper.cpp
- https://docs.livekit.io/transport/self-hosting/
- https://docs.livekit.io/agents/models/tts/
