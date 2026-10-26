# OBSBOT Vision + Camera Control — Studio OS (development specification)

## Architecture
- OBSBOT camera feeds the private studio computer via USB/HDMI capture.
- Local Vision Engine samples video frames with explicit consent, then sends concise scene descriptions to Felencho Gateway.
- Bob and Lina receive descriptions through a shared room context stream. Do not send raw camera video to an LLM by default.
- PTZ/zoom commands MUST be handled by a local camera adapter, never by the LLM directly.
- The adapter supports `pan`, `tilt`, `zoom`, `home`, and `stop` only when confirmed by the exact OBSBOT model and SDK/protocol.
- No control endpoint is enabled until the camera model, transport, software, and permissions are verified.

## Command lifecycle
1. Avatar requests a movement with reason, target and duration.
2. Gateway validates permission, room, operator consent, limits and rate limit.
3. Studio operator authorizes movement or selects a preset; local adapter executes.
4. Adapter reports observed result; Vision Engine updates both avatars.
5. A physical/GUI STOP overrides all requests.

## Safety and privacy
- Guests opt in before live vision. Never infer personal identity from a face.
- Do not store face images, biometric templates or video by default.
- Keep vision context and commands local unless necessary; never expose camera credentials.
- Use bounded angles and zoom, cooldown, and an operator-controlled disable switch.
- No autonomous scanning of private areas or movement while recording confidential material.
- In the first test, OBSBOT is read-only: camera movement requires Felencho approval.

## Prerequisites
- Confirm exact OBSBOT model (e.g. Tail 2, Tiny 2, Meet 2, etc.).
- Confirm available USB/HDMI/NDI feed and supported PTZ control protocol.
- Implement a local bridge on the studio Mac and test in a simulated camera mode before connecting hardware.

## Podcast research
- Felencho Brain uses internal knowledge/memory retrieval.
- Conditional web search on current affairs is implemented in the development branch, not production.
- Cite source and date in spoken answer; distinguish verified reporting from opinion and conditional future scenarios.
