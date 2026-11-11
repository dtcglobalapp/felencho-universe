# Felencho Mundial — Preflight Qwen3-TTS & Dedicated GPU Rental (2026-11-11)

**Decision state:** RESEARCH ONLY. No purchases, no server deployments, no installations, no production changes. Read with `docs/FELENCHO_MUNDIAL_DOC_MASTER.md`.

## Producer requirements and roles
- Podcast first: Felencho and BOB/LINA, natural interrupts, Spanish Caribbean and English, two 55" vertical holograms, studio hardware and remote guests.
- Later: secure international private channels, scalable GPU workers, persistent identity/memory. No provider-specific minute quotas for TTS/STT/LLM, but own hardware/cloud compute costs remain.
- **La Bestia is not a required 24/7 server**: MacBook Pro M4 Max is the physical studio controller, RØDECaster/USB/cameras/teleprompter; local models run only while Mac is awake/on. Remote AI compute can be 24/7, while the Mac remains physical equipment I/O at the studio. A GPU Linux server is not a drop-in replacement for MacOS, camera capture or peripherals.
- Do not confuse source under our control with infrastructure under our control: current `agents/lina/src/main.ts` uses STT Deepgram Nova 3 and TTS Cartesia Sonic 3 through LiveKit Inference Cloud, while `lib/felenchoBrainEngine.ts` invokes hosted OpenAI and Supabase is hosted.

## Qwen3-TTS model facts verified on official sources
- `Qwen/Qwen3-TTS-12Hz-0.6B-Base`: Hugging Face model card apache-2.0, 10 languages including Spanish and English, voice cloning from authorized example, ~2.52 GB repo download (not actual peak VRAM). URL https://huggingface.co/Qwen/Qwen3-TTS-12Hz-0.6B-Base
- `Qwen/Qwen3-TTS-12Hz-0.6B-CustomVoice`: apache-2.0, 9 preset timbres, 10 languages; listed native voices Chinese, English, Japanese, Korean — **no native Spanish timbre in official presets**. For natural Caribbean Spanish, Base + licensed Spanish-language reference or voice development may be necessary. https://huggingface.co/Qwen/Qwen3-TTS-12Hz-0.6B-CustomVoice
- Real-time audio chunk architecture; 97ms claimed in technical research is **a benchmark for first audio on selected hardware**, not an end-to-end promise on M4 Max, a low-cost GPU, through STT/LLM/network. Evaluate p50/p95 warm and cold latencies and interruptions. https://arxiv.org/abs/2601.15621
- License covers Qwen weights and code as published, not rights to other people's reference voices, personal data, third-party dependencies, or trademark/voice impersonation rights.
- Must measure 1 vs 2 agents under full voice roundtrip, memory, CPU and GPU utilization, language code-switch, long 45–60 min test, and whether streaming decoder implementation supports cancellation/interruption.

## Dedicated server vs GPU pod (supplier prices checked 2026-11-11)
Costs below are provider **public advertised rates**, not signed offers; monthly continuous conversion uses 730 hours. Tax, disk, outbound traffic or setup may be extra. Rates vary by location/availability.

| Candidate | Published offer | 24/7 base estimate | Suitability |
| --- | --- | --- | --- |
| **Hetzner GEX45 dedicated** | $249/mo (€214/mo) plus $249 (€209) ONE-TIME setup, 24GB NVIDIA RTX PRO 4000 Blackwell, i5-13500, 64GB RAM, 2x512GB NVMe, 1Gbps, dedicated Linux root & TCP/UDP firewall, Finland | $249/mo recurring; $498 first month + tax if billed USD | Closest all-in-one independent machine for modest podcast: GPU TTS+quantized 8B LLM+STT, web/LiveKit UDP. However 24 GB VRAM constraints and Europe→NY latency must be tested. No certainty of 2 simultaneous full-stack streams. Provider https://www.hetzner.com/pressroom/hetzner-expands-its-gpu-portfolio-with-the-gex45/ and https://www.hetzner.com/dedicated-rootserver/gex45/ |
| **RunPod RTX A5000 24GB Pod** | $0.27/hr | ~$197/mo GPU continuously + volume/storage | Low-cost model test; 25 GB RAM and 9 vCPUs listed on Secure, likely insufficient for all-in-one 8B + full services in conservative configuration. RunPod pods API exposes HTTP/TCP ports; UDP WebRTC LiveKit requires independent reachable UDP machine or verified specialized networking. https://www.runpod.io/pricing |
| **RunPod A40 / A6000 48GB Pod** | $0.59/hr on public list | ~$431/mo GPU continuously + volume/storage | More VRAM headroom for models; external VPS for SFU / TURN and ingress may be needed because Pods standard port exposure HTTP/TCP. Self-managed software even if GPU hosted. https://www.runpod.io/pricing |
| **Hetzner GEX63 dedicated** | $1199/mo (€999/mo) + $1199 setup, 96GB RTX PRO 6000 Blackwell, 128GB system RAM, 2x1.92TB NVMe | $1199/mo + setup + tax | More realistic future consolidated LLM/STT/TTS and modest multi-member traffic; expensive to buy before benchmarks. https://www.hetzner.com/pressroom/hetzner-expands-gpu-portfolio-with-new-gex63-featuring-nvidia-rtx-pro-6000-blackwell-max-q/ |
| **RunPod RTX A5000 on-demand lab** | $0.27/hr | ~$13.50 for 50 GPU hours (plus storage) | Low-risk isolated Linux/CUDA benchmark; do not assume complete LiveKit production can be hosted on this Pod. |

**Important provider distinction:** A full dedicated server with routable UDP is a suitable candidate for both LiveKit server and GPU inference. RunPod Pod API documented external protocols `http`/`tcp`; cannot promise full LiveKit SFU/TURN UDP operation on a Pod without additional networking and explicit verification. LiveKit requires UDP ICE/mux and TLS/ports. Sources https://github.com/runpod/docs/blob/main/api-reference/openapi.json and https://docs.livekit.io/transport/self-hosting/ports-firewall/ .

**Hardware reality:** M4 Max unified memory amount in Felencho's specific Mac is not yet measured. NVIDIA 24GB VRAM and separate 64GB system RAM are NOT automatically equivalent to Apple M4 Max unified GPU memory. A Linux CUDA GPU dedicated server has different performance and drivers. Quantized local LLM 8B may occupy ~5–8GB VRAM plus caches, Qwen TTS and STT add several more GB; **capacity only established by profiling**.

## Recommended architecture
`La Bestia (studio I/O, local website, PTZ, RØDECaster)` ⇄ `Felencho.ai backend / authenticated network` ⇄ `LiveKit server self-hosted` ⇄ `self-hosted STT / LLM / TTS` ⇄ `Felencho Brain & authorized memory` → separate Bob/Lina display streams. No proprietary hosted inference in the target podcast path. Website hosting, DNS, authentication, network and security may still have external costs; this is cloud infrastructure rental not media streaming-as-a-service. Keep existing production path as isolated fallback during migration.

First all-in-one prototype benchmark: **Hetzner GEX45** (fixed cost) vs **RunPod A40/A6000 48GB** (better GPU memory but more work to host LiveKit) vs **Mac M4 Max** (free existing hardware, not always on). Do not commit to GEX45 until production latency NY↔Finland, 24GB VRAM full-model footprint and interruption reliability are measured.

### Recommended stage gates before paying monthly
1. Run local Qwen3 TTS 0.6B on La Bestia with authorized Spanish reference; try 0.6B CustomVoice without cloning. Separate cold vs warm latency/turn completion from model-only benchmark.
2. On-demand CUDA GPU session (e.g. $13.50 for 50h A5000) run TTS+Whisper.cpp+Qwen3 8B quantized locally, load-test two agents. Monitor VRAM/process memory, 45–60 min podcast.
3. Evaluate hosted **GEX45 dedicated** at $249/mo + setup only if benchmark suggests sufficient headroom and transatlantic delay acceptable; or rent 48GB GPU + separate UDP SFU for increased flexibility. For production US audience seek data center near New York if remote roundtrip tests show unacceptable delay; Hetzner GEX45 currently Finland.
4. Measure total costs including storage, 24/7 GPU, security/backups, domain DNS, data transfer, maintenance, member auth and payment. Never claim unlimited capacity or zero monthly costs.
5. Set up self-hosted LiveKit with TLS/UDP/TURN and a private controlled test room, then move one agent then both, preserving all hologram, state transitions and voice-control requirements.
6. Only after stable studio podcast consider private member channels; RLS and authorization are unfinished and must be fixed before they handle private memories.

### Licensing / models for full brain
- Qwen3-8B LLM model: Apache-2.0 model card https://huggingface.co/Qwen/Qwen3-8B ; select an authorized 4-bit quantization and evaluate actual Spanish performance and VRAM consumption.
- Whisper.cpp: open-source local STT https://github.com/ggml-org/whisper.cpp ; suitable for evaluation but needs live partial transcription, voice-turn and Spanish code switch testing.
- MLX Audio for M-series test https://github.com/Neywa-Labs/mlx-audio . CUDA deployment is separate; code/weights remain portable, Apple Metal implementation isn't identical to Linux CUDA path.

**No modifications to production, no purchases, no server or Qwen installed.** Record exact experiment result before changing this status.
