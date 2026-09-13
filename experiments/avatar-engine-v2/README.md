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

## Primary candidate — SoulX-FlashHead

SoulX-FlashHead is now the first candidate because it is designed for infinite real-time streaming talking-head generation and accepts a conditioning image rather than requiring a prerecorded avatar video. Its Lite model reports real-time operation on one RTX 4090 and up to three concurrent 25+ FPS streams on a single RTX 4090.

The repository code is Apache-2.0 licensed, and the published model card also identifies the model as Apache-2.0. No project-specific visible-watermark requirement has been found in the repository/model card reviewed so far. Preserve required license/notices in our software distribution, but do not add a vendor watermark unless a binding license term actually requires it.

Important limitation: FlashHead is a portrait/talking-head generator, not yet proof of LemonSlice-equivalent hands/full-body motion. We must test Lina's existing 2:3 reference image and judge framing, identity, idle motion, lip sync and latency before proceeding.

## Rejected as primary candidate — LiveTalking

Do not use LiveTalking as the primary Felencho Avatar Engine v2 foundation because its documented avatar-creation path is video-oriented and its README includes a publication watermark/logo statement. It may still be consulted as a technical reference for WebRTC/streaming architecture, but should not become a dependency unless those concerns are resolved explicitly.

## Secondary candidate — MuseTalk 1.5

MuseTalk remains a fallback visual engine. It provides real-time-capable lip-sync inference, but its official realtime script processes audio clips/paths and is not itself a complete live avatar server. It would require more custom streaming integration and usually benefits from a prepared video/avatar source.

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

## Phase 2 target — Bob and dual-avatar capacity

Prepare Bob from his existing reference image on the same GPU, measure Lina and Bob separately, then test two simultaneous live avatar processes only if Lina passes phase 1.

## Candidate infrastructure

- RunPod GPU Pod for the first test, not Serverless
- Re-evaluate GPU choice around FlashHead Lite; RTX 4090 is now the first performance reference because upstream reports up to three concurrent real-time streams on one RTX 4090
- Persistent storage for model weights and prepared avatar assets
- GPU should be stopped after each test to stop compute billing

## Test sequence

1. Provision an isolated GPU only after confirming the exact image and model requirements.
2. Install official SoulX-FlashHead Lite dependencies and weights.
3. Use Lina's existing reference image as conditioning input.
4. Establish continuous streaming generation from short/live TTS audio chunks.
5. Show those frames in a live browser view and measure latency/FPS/VRAM.
6. If Lina passes, prepare Bob from his reference image.
7. If both pass individually, test Lina + Bob simultaneously on one GPU.
8. Only after those tests consider replacing the LemonSlice visual leg in the stable LiveKit pipeline.

## Production baseline

The stable LemonSlice implementation remains the reference implementation. This experiment is additive and disposable.