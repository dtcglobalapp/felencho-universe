# Felencho Avatar Engine v2 — isolated experiment

Status: EXPERIMENTAL. This directory must not modify or replace the current LemonSlice/LiveKit production path.

## Non-negotiable isolation rules

- Do not change the working Lina LemonSlice integration.
- Do not change Felencho Brain, STT, TTS, LiveKit dispatch, or the stable browser flow during phase 1.
- Do not touch DTC.
- No production traffic is routed here until an explicit comparison test passes.
- The first test is offline: source portrait/video + prerecorded WAV -> rendered MP4.

## Phase 1 target

Prove that MuseTalk 1.5 can render a convincing Lina test on an isolated rented GPU.

Success criteria:

1. Lina's identity remains stable.
2. Lip sync is visibly convincing.
3. No obvious beard/face deformation or mouth-region artifacts.
4. Measure render FPS, peak GPU VRAM, wall-clock time, and GPU hourly cost.
5. Keep the current LemonSlice Lina untouched and available as the production baseline.

## Phase 2 target

Prepare Bob on the same GPU and measure Lina and Bob separately, then test two simultaneous avatar processes only if phase 1 passes.

## Candidate infrastructure

- RunPod GPU Pod (first test, not Serverless)
- Initial target: RTX A6000 48 GB Secure Cloud when available
- Persistent storage for model weights and prepared avatar assets
- GPU should be stopped after each test to stop compute billing

## Candidate visual engine

MuseTalk 1.5 (official upstream: TMElyralab/MuseTalk / jjt997/musetalk mirror). It provides real-time inference code and reusable avatar preparation. It is only the visual/lip-sync engine; Felencho Brain remains the conversational intelligence.

## Test sequence

1. Provision isolated GPU.
2. Install official MuseTalk 1.5 dependencies and weights.
3. Prepare Lina test asset.
4. Render a 20–30 second prerecorded speech sample.
5. Record FPS, VRAM, render time, and visual result.
6. If quality passes, prepare Bob.
7. If both pass individually, test simultaneous operation.
8. Only after those tests consider a LiveKit adapter.

## Production baseline

The stable LemonSlice implementation remains the reference implementation. This experiment is additive and disposable.