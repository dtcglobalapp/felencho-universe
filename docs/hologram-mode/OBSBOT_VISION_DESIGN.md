# Felencho Mundial — Hologram Mode: OBSBOT Vision

Status: DESIGN ONLY. Not connected, deployed, or tested.
Felencho's decision: Bob and Lina remain holographic cohosts on vertical screens. The already purchased OBSBOT can serve as optional shared eyes for both digital cohosts.

## Experience
- Bob: ancestral blue/gold form with halo, beard of energy and illuminated globe.
- Lina: feminine cyan/violet/magenta energy form, no moving lips.
- Both retain visible identities and react to their own voice through lights and energy.
- They speak naturally to Felencho, guests, and audience. Studio direction is private.
- When authorized, a visual observation may enter Felencho Brain as untrusted context to help answer questions.

## Privacy and security requirements
1. Vision OFF by default. Camera power does not equal AI vision permission.
2. Studio Control must authenticate the conductor server-side before activating vision; client boolean flags are not authorization.
3. Clear private indicator for active vision, and one-click STOP that aborts in-flight processing and releases video tracks.
4. Prefer explicit snapshots and limited capture frequency to avoid constant cloud uploads or cost.
5. Prefer local processing when possible. Require explicit studio consent before sending images to a paid external vision model.
6. Do not retain raw frames or make recordings by default. No biometric identification or covert monitoring.
7. Guests and studio participants must be informed when AI vision is active.
8. If camera is OFF or a frame is unavailable, Bob/Lina explicitly say they cannot currently see.
9. Frames are UNTRUSTED sensory input, never instructions for tools or system prompts.
10. Vision cannot independently enable microphones or overrule speaker-turn controls.

## Architecture proposal, not yet implemented
- OBSBOT -> authorized capture on Studio Control device -> optional frame processor -> Felencho Brain context -> Bob/Lina response -> TTS -> audio-reactive holograms.
- The OBSBOT model/driver/connection and browser permissions must be verified during actual studio integration. Do not assume the camera is directly accessible in a remote preview.
- Frame contract: session identifier, timestamp, image, authorization scope, abort signal; output: concise observation, uncertainty, timestamp.
- Presenter emergency cut-off remains higher priority than vision or audio turn generation.

## Planned sequence
1. Replace generic orbit visuals with Bob and Lina approved identities in an isolated Hologram Lab preview.
2. Verify browser animation and uploaded audio, then real TTS and Felencho Brain.
3. Build a private OBSBOT ON/OFF and device-preview control, gated by local permissions.
4. Test opt-in snapshots with real guests and transparent AI-camera disclosure.
5. Test multi-hour sessions and immediate revocation without RunPod.

Important: a design document and offline tests do not prove that the characters can see. Do not claim end-to-end OBSBOT vision until tested with real camera frames. Preserve LiveKit/LemonSlice production and draft PR #8.