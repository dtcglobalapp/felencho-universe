# Felencho Universe LiveKit + LemonSlice worker

This worker serves Lina and Bob through one LiveKit deployment, while routing their conversational intelligence through Felencho Brain.

## Runtime flow

Studio microphone -> LiveKit -> Silero VAD -> Deepgram STT -> AgentSession -> Felencho Brain -> LiveKit TTS -> LemonSlice avatar -> character display

## Stable Lina voice baseline

Known-good production baseline established on 2026-09-11:

- Commit: `a359f18dd2bf6e7fc221f9199da6d72afcef5ffa`
- Baseline branch: `baseline/lina-stable-2026-09-11`
- LiveKit agent name: `felencho-universe`
- LiveKit Agent ID: `CA_EayuspXCCzmg`
- SDK: `@livekit/agents` `1.8.1`
- LemonSlice Lina hosted agent: `agent_5d1a61f1cd17a770`
- End-of-turn mode: `turnHandling.turnDetection = "vad"`
- Browser microphone publication: Opus DTX disabled with `{ dtx: false }`
- STT: Deepgram `nova-3`, multilingual
- VAD: Silero
- Brain: Felencho Brain through the custom `FelenchoBrainAgent.llmNode()` path

This baseline was verified in a real conversation: Lina heard the studio user, transcribed speech, reached Felencho Brain, generated a Brain response, synthesized speech, and delivered it through LemonSlice.

### Critical compatibility notes

Do not remove the local `FelenchoBrainNodeMarker` from `FelenchoBrainAgent` while using `@livekit/agents` 1.8.1. In this SDK version, `AgentSession` silently returns before `generateReply()` when the agent has no configured `llm` instance, even when `llmNode()` is overridden. The marker satisfies that SDK precondition without calling an external LLM; all conversational intelligence still comes from Felencho Brain.

Do not re-enable Opus DTX for the studio microphone without retesting Safari/iPhone. With DTX enabled, silence frames can be suppressed and VAD/end-of-speech handling can fail to close the turn reliably.

Before changing LiveKit Agents versions, turn handling, microphone publication, STT, or the custom Brain node, compare against this baseline and test locally before spending LemonSlice minutes.

## Required secrets in LiveKit Cloud

- `LEMONSLICE_API_KEY`

## Automated deployment

Deployments are handled by GitHub Actions from `main` when files under `agents/lina/**` change. The workflow uses repository secrets for LiveKit credentials and passes `LEMONSLICE_API_KEY` to the deployed agent.

## Optional configuration

- `AGENT_NAME` (default: `felencho-universe`)
- `LINA_IMAGE_URL` (default: `https://www.felencho.ai/avatars/lina/lina-2x3.jpg`)
- `BOB_IMAGE_URL` (default: `https://www.felencho.ai/avatars/bob/bob-2x3.png`)
- `FELENCHO_BRAIN_URL` (default: `https://www.felencho.ai/api/felencho-forever/conversation`)

## Local fallback

The Mac is no longer required for routine deployments. Local commands are kept only as a fallback for debugging or emergency recovery.
