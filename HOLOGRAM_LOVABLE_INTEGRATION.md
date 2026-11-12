# Felencho Hologram — isolated Next.js preview

Origin: private `dtcglobalapp/felencho-hologram-engine` (Lovable Character Profiles V1). Branch: `feature/lovable-hologram-studio-v1`.

Preview routes: `/hologram-preview?dev=1`, `/hologram-preview/lina`, `/hologram-preview/bob`. Existing `/presence/lina` and `/presence/bob` remain unchanged. Never merge or deploy to production until build and device tests pass.

The hologram CSS must be scoped to the `.felencho-hologram` element so it does not override the main Felencho Universe theme. Photos live in browser IndexedDB; export JSON in Lovable and import only into a trusted local preview browser. No original portraits are distributed in this code. Felencho Brain/LiveKit audio wiring and verified visual testing remain pending.

See `src/hologram/INTEGRATION.md` for technical details and dependency compatibility. No commercial accounts or avatar-video services.

## Build blocker before merging

The added module dependencies have been declared in `package.json`, but **`package-lock.json` has not yet been regenerated**. Before `npm ci` or a preview deployment, run `npm install` from the root of `felencho-universe`, commit the regenerated `package-lock.json` to this feature branch, then run `npm run build`. This is an explicit pending verification step; do not call this PR deployable until those checks pass.

Existing `/presence/lina` and `/presence/bob` still use the legacy video avatar. Only the new `/hologram-preview` routes use this module. Images from Lovable are stored in that site's browser IndexedDB and do not travel through GitHub; export profile JSON and import it on a trusted preview browser. Do not publish private photo JSON or include it in a public Git commit.

The current visual engine is **not yet connected** to per-character audio from Felencho Brain / LiveKit. Its development panel may enable an audio simulator when SPEAKING is selected. Studio production requires explicit external voice signals and a separate approved cutover.
