# Felencho Universe LiveKit + LemonSlice worker

This worker serves Lina and Bob through one LiveKit deployment, while routing their conversational intelligence through Felencho Brain.

## Runtime flow

Studio microphone -> LiveKit STT -> Felencho Brain -> LiveKit TTS -> LemonSlice avatar -> character display

## Required secrets in LiveKit Cloud

- `LEMONSLICE_API_KEY`

## Automated deployment

Deployments are handled by GitHub Actions from the `lina-lemonslice-livekit` branch whenever files under `agents/lina/**` change. The workflow uses repository secrets for LiveKit credentials and passes `LEMONSLICE_API_KEY` to the deployed agent.

## Optional configuration

- `AGENT_NAME` (default: `felencho-universe`)
- `LINA_IMAGE_URL` (default: `https://www.felencho.ai/avatars/lina/lina-2x3.jpg`)
- `BOB_IMAGE_URL` (default: `https://www.felencho.ai/avatars/bob/bob-2x3.png`)
- `FELENCHO_BRAIN_URL` (default: `https://www.felencho.ai/api/felencho-forever/conversation`)

## Local fallback

The Mac is no longer required for routine deployments. Local commands are kept only as a fallback for debugging or emergency recovery.
