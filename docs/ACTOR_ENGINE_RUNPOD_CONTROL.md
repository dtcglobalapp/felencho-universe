# Felencho Actor Engine - RunPod Control

Status: experimental. Production Presence, LiveKit and LemonSlice remain unchanged.

## Proven components

- EchoMimic V3-Flash produced a 121-frame Lina test with satisfactory facial animation.
- MuseTalk V1.5 produced a 5-second Lina sample with lip sync but little eye or body motion.
- The RunPod RTX 4090 is rented separately from Felencho Brain.

## Control-plane requirements

1. Read GPU utilization, model availability and bounded test logs.
2. Avoid running arbitrary commands from a public endpoint.
3. Use authenticated, least-privilege access; never commit API tokens or SSH keys.
4. Keep all experiments separate from live studio routes and stable LemonSlice baseline.
5. Add a permitted test runner only after diagnostics and access controls pass review.
6. Preserve a cloud-to-home migration path for a future local GPU server.

## Next integration milestone

A local-only RunPod diagnostic service behind a secure tunnel, followed by a Studio OS status view. Do not expose an unauthenticated HTTP service from the Pod.
