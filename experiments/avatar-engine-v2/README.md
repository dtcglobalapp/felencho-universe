# Felencho Avatar Engine v2 — isolated experiment

Status: EXPERIMENTAL. This directory must not modify or replace the current LemonSlice/LiveKit production path.

## Non-negotiable isolation rules

- Do not change the working Lina LemonSlice integration.
- Do not change Felencho Brain, STT, TTS, LiveKit dispatch, or the stable browser flow during the experiment.
- Do not touch DTC.
- No production traffic is routed here until an explicit comparison test passes.
- A prerecorded clip may be used only as a smoke test for visual quality. It does **not** count as success.

## Primary goal

The experiment succeeds only if Lina can participate **live and interactively**: Felencho Brain produces a reply, TTS audio is delivered continuously to the avatar engine, MuseTalk (or a replacement visual engine) generates synchronized frames with acceptable latency, and the video is streamed to the browser/TV while the conversation is happening.

## Important MuseTalk limitation

MuseTalk 1.5 provides real-time-capable inference, but its official realtime script is an inference pipeline that processes audio paths/clips and describes itself as simulating online chatting. It is not, by itself, a ready-made WebRTC/LiveKit avatar server. Felencho Avatar Engine v2 therefore needs a thin streaming adapter that accepts live TTS audio chunks, feeds them to the visual engine, and publishes generated frames continuously.

MuseTalk is primarily a lip-sync/face-region engine. Natural idle movement, head/eye motion, and later body/hand motion may require a prepared source video loop and/or an additional motion module. Do not claim LemonSlice-equivalent full-body behavior until measured.

## Phase 1 target — Lina live proof

Prove on an isolated rented GPU that Lina can be rendered with live conversational audio, not merely exported as a finished MP4.

Success criteria:

1. Lina's identity remains stable.
2. Lip sync is visibly convincing.
3. No obvious face deformation or mouth-region artifacts.
4. Frames are generated continuously fast enough for a live session.
5. Measure added avatar latency, render FPS, peak GPU VRAM, and GPU hourly cost.
6. A live browser session can receive Lina's moving video while audio is being produced.
7. Keep the current LemonSlice Lina untouched and available as the production baseline.

## Phase 2 target — Bob and dual-avatar capacity

Prepare Bob on the same GPU, measure Lina and Bob separately, then test two simultaneous live avatar processes only if Lina passes phase 1.

## Candidate infrastructure

- RunPod GPU Pod for the first test, not Serverless
- Initial target: RTX A6000 48 GB Secure Cloud when available
- Persistent storage for model weights and prepared avatar assets
- GPU should be stopped after each test to stop compute billing

## Candidate visual engine

MuseTalk 1.5 (official upstream: TMElyralab/MuseTalk). It provides real-time-capable inference code and reusable avatar preparation. It is only the visual/lip-sync engine; Felencho Brain remains the conversational intelligence.

## Test sequence

1. Provision isolated GPU.
2. Install official MuseTalk 1.5 dependencies and weights.
3. Prepare Lina's avatar source.
4. Run a short visual smoke test if necessary; this does not count as success.
5. Build the smallest streaming adapter: live TTS/audio chunks -> MuseTalk -> continuous frames.
6. Show those frames in a live browser view and measure latency/FPS/VRAM.
7. If Lina passes, prepare Bob.
8. If both pass individually, test Lina + Bob simultaneously.
9. Only after those tests consider replacing the LemonSlice visual leg in the stable LiveKit pipeline.

## Production baseline

The stable LemonSlice implementation remains the reference implementation. This experiment is additive and disposable.