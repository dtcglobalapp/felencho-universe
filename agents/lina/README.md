# Lina LiveKit + LemonSlice worker

This worker keeps Lina's visual body in LemonSlice while routing her conversational intelligence through Felencho Brain.

## Runtime flow

Studio microphone -> LiveKit STT -> Felencho Brain -> LiveKit TTS -> LemonSlice avatar -> Lina display

## Required secrets in LiveKit Cloud

- `LEMONSLICE_API_KEY`

LiveKit Cloud provides its own `LIVEKIT_URL`, `LIVEKIT_API_KEY`, and `LIVEKIT_API_SECRET` to the deployed worker.

## Optional configuration

- `AGENT_NAME` (default: `lina-felencho`)
- `LINA_IMAGE_URL` (default: `https://www.felencho.ai/avatars/lina/lina-2x3.jpg`)
- `FELENCHO_BRAIN_URL` (default: `https://www.felencho.ai/api/felencho-forever/conversation`)

## Local install

```bash
cd agents/lina
npm install
npm run typecheck
npm run build
```

## LiveKit Cloud

Authenticate once:

```bash
lk cloud auth
```

From this directory, create the deployable agent once:

```bash
lk agent create
```

Then deploy updates with:

```bash
lk agent deploy
```

When `lk agent create` asks for secrets, add `LEMONSLICE_API_KEY` there rather than committing it to GitHub.
