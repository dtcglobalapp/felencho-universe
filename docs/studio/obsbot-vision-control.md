# OBSBOT Vision + Camera Control — Studio OS (development specification)

## Architecture
- CONFIRMED: OBSBOT Tiny 2 connects directly to Felencho's Mac ('la bestia'), serving as the private studio computer.
- Local Vision Engine samples video frames with explicit consent, then sends concise scene descriptions to Felencho Gateway.
- Bob and Lina receive descriptions through a shared room context stream. Do not send raw camera video to an LLM by default.
- PTZ/zoom commands MUST be handled by a local camera adapter, never by the LLM directly.
- The adapter supports `pan`, `tilt`, `zoom`, `home`, and `stop` only when confirmed by the exact OBSBOT model and SDK/protocol.
- No control endpoint is enabled until the camera model, transport, software, and permissions are verified.

## Command lifecycle
1. Before recording, Felencho manages guest-specific informed consent and activates the studio's vision/control permissions for that session.
2. During an authorized session, Bob and Lina may request bounded camera movements without repeatedly interrupting Felencho for permission.
3. Gateway validates the active session grant, permitted zones, limits, rate limit, and guest restrictions; the local Mac adapter executes supported commands.
4. Adapter reports the result; Vision Engine updates both avatars.
5. Felencho has a persistent one-click STOP / disable switch that overrides all requests.

## Safety and privacy
- Felencho obtains informed guest consent before live vision; merely entering the studio is not blanket consent to permanent data retention. Never infer identity from a face.
- Store interview memories (guest name, approved public biographical details, topics, previous interview summary and date) only with explicit retention consent and correction/deletion controls. Do not store face images, biometric templates or video by default; facial recognition is not required for returning-guest memory.
- Keep vision context and commands local unless necessary; never expose camera credentials.
- Use bounded angles and zoom, cooldown, and an operator-controlled disable switch.
- No autonomous scanning of private areas or movement while recording confidential material.
- In the first test, OBSBOT is read-only. Once the exact control protocol and safety limits are validated, Felencho authorizes camera autonomy once per session, not once per movement.

## Prerequisites
- CONFIRMED from purchase screenshot dated June 22, 2026: OBSBOT Tiny 2 (4K PTZ webcam), not Tiny 2 Lite or Tiny 2 4K as a separate product family.
- OBSBOT Tiny 2 has motorized pan/tilt, AI tracking, voice/gesture control and digital zoom.
- Verify Tiny 2-specific software control interface (OBSBOT Center / supported SDK, protocol or local automation) before coding any motor commands.
- Confirm available USB/HDMI/NDI feed and supported PTZ control protocol.
- Implement a local bridge on the studio Mac and test in a simulated camera mode before connecting hardware.

## Podcast research
- Felencho Brain uses internal knowledge/memory retrieval.
- Conditional web search on current affairs is implemented in the development branch, not production.
- Cite source and date in spoken answer; distinguish verified reporting from opinion and conditional future scenarios.
