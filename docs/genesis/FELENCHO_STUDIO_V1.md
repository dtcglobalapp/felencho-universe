# Felencho Studio V1.0

## Status

Felencho Studio V1.0 is the private production environment used to author
Felencho's Digital Actors. It is not a public platform, marketplace, SaaS
application, social network, or customer-facing actor generator.

The production sequence is:

1. Complete and operate Felencho Studio.
2. Build Bob.
3. Build Lina.
4. Build Felencho Virtual.

## Architectural Decision

`ActorDefinition` remains the authoritative actor document. Felencho Studio
adds project lifecycle and professional authoring workflows around that
contract without introducing a second actor format.

The existing normalization, validation, hierarchy, transform, history, asset,
renderer, and portable-package systems remain authoritative. Version 1.0
extends those systems through focused modules:

- `ActorProjectRepository` owns browser-local project identity, project lists,
  explicit saves, Save As, and duplication.
- `ActorSetupPanel` authors actor identity, canvas, display, construction, blink,
  and folder hierarchy.
- `RigMapper` maps runtime roles explicitly to stable layer IDs.
- `StudioDiagnostics` evaluates asset, performance, and package readiness.
- `HistoryPanel` exposes the existing transaction history to the artist.
- `ProjectHub` owns new, open, save, Save As, duplicate, and delete workflows.

Browser storage is working storage, not the only archival format. A portable
actor package remains the durable interchange and backup artifact.

## Private Access Contract

Felencho Studio is reachable from the public maintenance page through the
deliberately understated **Studio Login** access point. Authentication is
invitation-based and is evaluated on the server against the Studio access
tables. A successful login creates an opaque, hashed server-side session and
sets a Secure, HttpOnly, SameSite=Lax browser cookie.

The authenticated production flow is:

1. Public maintenance page
2. Studio Login
3. Authorized email and invitation-key verification
4. Protected Felencho Studio dashboard
5. Protected Digital Actor Editor

The dashboard, editor, legacy Studio route, and direct Avatar Studio route are
all protected independently. The route proxy performs an early access check,
while protected server pages repeat authorization before rendering. The login
page remains public and redirects an already-authorized session directly to its
requested protected destination.

## V1.0 Authoring Contract

An artist must be able to complete the following without editing JSON:

- Create or open an actor project
- Edit actor identity, dimensions, display settings, and FPS
- Import, replace, diagnose, and organize PNG assets
- Create, name, order, group, parent, lock, and transform layers
- Assign semantic roles and runtime profiles
- Configure all rig mappings and mouth poses
- Configure blink behavior
- Validate construction, structure, assets, performance, and package readiness
- Save, duplicate, export, and re-import the actor

## Explicit Non-Goals

Version 1.0 does not implement brain, voice, Gateway, Presence, podcast
orchestration, television delivery, or Digital Actor runtime integration.
Those systems begin only after the authoring environment is accepted.

## Mission 03

Mission 03 is **Build Bob**. Bob must be authored through the same data-driven
workflows that will later build Lina and Felencho Virtual. Bob-specific editor
features or hardcoded layer roles are prohibited.
