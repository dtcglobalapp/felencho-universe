# Felencho Hologram — isolated Next.js preview

Origin: private `dtcglobalapp/felencho-hologram-engine` (Lovable Character Profiles V1). Branch: `feature/lovable-hologram-studio-v1`.

Preview routes: `/hologram-preview?dev=1`, `/hologram-preview/lina`, `/hologram-preview/bob`. Existing `/presence/lina` and `/presence/bob` remain unchanged. Never merge or deploy to production until build and device tests pass.

The hologram CSS must be scoped to the `.felencho-hologram` element so it does not override the main Felencho Universe theme. Photos live in browser IndexedDB; export JSON in Lovable and import only into a trusted local preview browser. No original portraits are distributed in this code. Felencho Brain/LiveKit audio wiring and verified visual testing remain pending.

See `src/hologram/INTEGRATION.md` for technical details and dependency compatibility. No commercial accounts or avatar-video services.
