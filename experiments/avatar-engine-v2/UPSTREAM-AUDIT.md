# Upstream audit — LiveKit + MuseTalk Avatar

Upstream evaluated: `plutus123/Livekit_MuseTalk_Avatar`

Purpose: determine whether this is a credible isolated starting point for a Felencho Avatar Engine live proof before spending GPU time.

## What is real and useful

- Publishes a generated avatar as a LiveKit local video track named `avatar_video`.
- Uses a `VideoSource` and continuously captures generated frames into LiveKit.
- Contains a TTS wrapper that intercepts synthesized audio chunks, yields the original chunks immediately for playback, resamples them to 16 kHz, and sends the same audio to MuseTalk for lip-sync.
- Supports preparation from a folder containing a single image as well as a source video.
- Uses MuseTalk 1.5-style prepared avatar assets and precomputed latents/masks.
- Keeps the visual path separable enough that Felencho Brain can replace the sample OpenAI LLM later.
- Integration code is MIT licensed; preserve upstream and dependency license notices.

## Important risks found before deployment

1. The sample project targets `livekit-agents ~=1.2`, while Felencho Universe stable currently uses a newer LiveKit Agents generation. Do **not** drop this code into the stable worker or upgrade/downgrade the stable worker for this experiment.
2. The sample `AvatarSession` contains an older/unused audio-capture hook, but `agent_with_avatar.py` implements a newer TTS interception wrapper. The isolated proof should exercise that wrapper directly rather than assume every path in the repository is production-ready.
3. The source-image path proves face/lip-sync first. A still image cannot create semantic hand gestures. A short reusable source video can later preserve subtle idle head/body/hand movement while MuseTalk changes the speaking face region.
4. The README's performance claims must be measured on our rented GPU. Do not accept claimed FPS as our result.
5. Keep this experiment out of the current LemonSlice production dispatch and do not create or modify production routes until the isolated test passes.

## First acceptance test

The first paid GPU test is successful only if all of the following happen in the same live session:

- Lina appears from her reference image.
- User speech is received live.
- A spoken reply is synthesized.
- The same TTS audio drives Lina's mouth continuously.
- Lina's generated video is published as a live stream, not a completed MP4.
- We measure startup time, first-video-frame latency, first-speaking-frame latency, sustained FPS, peak VRAM, and GPU cost.

## Isolation strategy

Run the upstream-compatible Python environment on the rented GPU as a separate experiment. Do not change the stable `agents/lina` dependency versions. Keep LemonSlice production untouched. The experimental process must have an explicit shutdown path so GPU compute can be stopped immediately after the test.

## After Lina passes

1. Replace the sample LLM with Felencho Brain while keeping the proven avatar/TTS interception path.
2. Test a 5–10 second Lina idle source video to add natural passive body/hand movement.
3. Prepare Bob.
4. Measure Lina + Bob concurrently on the same GPU.
5. Only then design a clean production adapter and consider replacing the LemonSlice visual leg.