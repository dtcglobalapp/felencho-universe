# Felencho Avatar Engine v2 — isolated experiment

Status: EXPERIMENTAL. This directory must not modify or replace the current LemonSlice/LiveKit production path.

## Non-negotiable isolation rules

- Do not change the working Lina LemonSlice integration.
- Do not change Felencho Brain, STT, TTS, LiveKit dispatch, or the stable browser flow during the experiment.
- Do not touch DTC.
- No production traffic is routed here until an explicit comparison test passes.
- A prerecorded clip may be used only as a smoke test for visual quality. It does **not** count as success.
- Prefer candidates that accept a single reference image and do not impose a visible vendor watermark on our published output.

## Primary goal

The experiment succeeds only if Lina can participate **live and interactively**: Felencho Brain produces a reply, TTS audio is delivered continuously to the avatar engine, the visual engine generates synchronized frames with acceptable latency, and the video is streamed to the browser/TV while the conversation is happening.

## Primary practical candidate — LiveKit + MuseTalk 1.5 integration

The first implementation target is the open-source `plutus123/Livekit_MuseTalk_Avatar` architecture because it is already shaped like the system Felencho Universe needs:

- real-time WebRTC through LiveKit;
- MuseTalk 1.5 lip-sync at a claimed 25–30 FPS on a single GPU;
- full-duplex/VAD conversation flow;
- a LiveKit audio track and video track published continuously;
- avatar preparation from either a **single image** or a short source video;
- MIT-licensed integration code, with the included dependency notices preserved.

We will not use its OpenAI STT/LLM/TTS choices as our brain stack. The experiment should reuse the existing Felencho Brain, current STT/TTS choices, and existing LiveKit project wherever practical. The only new leg under test is the self-hosted visual avatar renderer.

### Hands/body expectation

A single still image gives us the simplest first proof, but it will not provide semantic hand gestures like LemonSlice. If Lina passes the live single-image test, the next visual-quality test should prepare Lina from a short 5–10 second source video made from the same reference image with subtle natural idle motion. MuseTalk modifies the face/lip region while cycling prepared source frames, so a source video can preserve some natural head/body/hand movement even though those gestures are not yet chosen intelligently from the conversation.

This gives us a two-step path:

1. prove true live conversation from one Lina photo;
2. improve natural body/hands with a short prepared idle video without changing the realtime architecture.

## Secondary candidate — SoulX-FlashHead

Keep SoulX-FlashHead as a secondary candidate. Its Lite model is designed for infinite streaming portrait generation and reports up to three concurrent 25+ FPS streams on a single RTX 4090. However, the released Gradio streaming demo still accepts an audio file and emits multi-second MP4 segments, so it requires more adaptation for our exact live microphone/TTS pipeline than the LiveKit-MuseTalk integration.

## Rejected as primary candidate — LiveTalking

Do not use LiveTalking as the primary Felencho Avatar Engine v2 foundation because its documented avatar-creation path is video-oriented and its README includes a publication watermark/logo statement. It may still be consulted as a technical reference for WebRTC/streaming architecture, but should not become a dependency unless those concerns are resolved explicitly.

## Phase 1 target — Lina live proof

Prove on an isolated rented GPU that Lina can be rendered from her existing reference image with live conversational audio, not merely exported as a finished MP4.

Success criteria:

1. Lina's identity remains stable.
2. Lip sync is visibly convincing.
3. No obvious face deformation or mouth-region artifacts.
4. Frames are generated continuously fast enough for a live session.
5. Measure added avatar latency, render FPS, peak GPU VRAM, and GPU hourly cost.
6. A live browser session can receive Lina's moving video while audio is being produced.
7. No vendor watermark appears in the rendered output unless legally required.
8. Keep the current LemonSlice Lina untouched and available as the production baseline.

## Phase 2 target — natural idle body motion

If Lina passes from a single still image, prepare a short Lina source video from the same identity with subtle natural head, shoulder, arm and hand motion. Use that as the reusable avatar source and confirm that lip-sync remains stable while the base movement continues.

## Phase 3 target — Bob and dual-avatar capacity

Prepare Bob from his existing reference image on the same GPU, measure Lina and Bob separately, then test two simultaneous live avatar processes only after Lina passes the first two phases.

## Candidate infrastructure

- RunPod GPU Pod for the first test, not Serverless.
- Start with an NVIDIA GPU that has at least 12 GB VRAM; for Lina + Bob simultaneously, prefer substantially more headroom, with RTX 4090-class hardware as the first serious dual-avatar test target.
- Persistent storage for model weights and prepared avatar assets.
- GPU should be stopped after each test to stop compute billing.

## Test sequence

1. Provision an isolated GPU only after confirming the exact image and model requirements.
2. Install the LiveKit-MuseTalk integration and MuseTalk 1.5 weights.
3. Prepare Lina from her existing reference image.
4. Replace the sample project's OpenAI brain/voice path with the existing Felencho Brain + current TTS/STT path while preserving its realtime avatar/video-track machinery.
5. Publish Lina as a live LiveKit video track and measure latency/FPS/VRAM.
6. If Lina passes, test the short idle-video source to add natural body/hand movement.
7. If Lina still passes, prepare Bob.
8. If both pass individually, test Lina + Bob simultaneously on one GPU.
9. Only after those tests consider replacing the LemonSlice visual leg in the stable LiveKit pipeline.

## Production baseline

The stable LemonSlice implementation remains the reference implementation. This experiment is additive and disposable.