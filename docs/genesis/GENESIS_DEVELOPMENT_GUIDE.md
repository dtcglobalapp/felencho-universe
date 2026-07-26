# Genesis Development Guide

## Purpose

This guide defines the engineering workflow for Genesis. It applies to editor
features, actor runtime work, asset tooling, data contracts, integrations, and
supporting documentation.

The goal is not merely to deliver features. The goal is to deliver features in
a way that keeps Genesis stable, deployable, and capable of supporting every
current and future actor through a shared architecture.

## Philosophy

Felencho Studio is the public product and Genesis Engine is its internal
digital-human technology foundation. Neither is a collection of
character-specific demos.

Development decisions must favor maintainability, modularity, performance, and
scalability. Features should be designed for Bob, Lina, Felencho Virtual, and
future characters without introducing separate implementations for each actor.

The following statements are non-negotiable:

- Never sacrifice long-term architecture for short-term convenience.
- Never break the build.
- Every Sprint must compile.
- Every Sprint must be deployable.
- Keep commits focused.
- Only modify files related to the current Sprint.

Refactoring is valuable when it creates a clearer ownership boundary, removes
duplication, improves a data contract, or enables planned growth. Refactoring
must not be used as an excuse to introduce unrelated changes into a Sprint.

### Product Language and Progressive Disclosure

- Public UI uses the Felencho Studio name.
- Genesis Engine is an internal technology name, with optional
  "Powered by Genesis Engine" attribution.
- Advanced Mode preserves professional actor-authoring tools.
- Beginner workflows must not expose engine concepts unless they become
  necessary.
- The primary customer interaction should be conversational rather than a
  multi-page setup form.
- Unimplemented AI behavior must be labeled planned and must never be
  simulated as completed work.

## Coding Standards

### General Principles

- Write clear, focused code with one responsibility per module.
- Prefer explicit interfaces and predictable data flow.
- Avoid duplicated logic.
- Avoid hidden side effects.
- Preserve existing behavior unless a Sprint explicitly changes it.
- Remove obsolete code when replacing an implementation.
- Never leave dead code.
- Use descriptive names for components, functions, state, and types.
- Only modify files related to the current Sprint.
- Do not introduce unrelated formatting or refactoring changes.
- Prefer simple control flow over clever abstractions.
- Document the reason behind non-obvious architectural constraints.

### Functions and Modules

Functions should have clear inputs, outputs, and side effects. Modules should
own a coherent capability rather than act as miscellaneous collections of
helpers.

Shared behavior belongs in shared modules. Character-specific data belongs in
actor definitions and actor asset directories. If the same behavior appears
twice, determine whether it represents a missing shared abstraction.

### Error Handling

Errors must preserve useful context. Loading, validation, parsing, and export
boundaries should produce actionable messages that identify the failed actor,
asset, operation, or contract.

Do not silently ignore invalid data unless a documented fallback is part of
the product behavior. A fallback must be deterministic and safe.

## TypeScript Standards

Genesis uses TypeScript as an architectural tool, not only as a compiler.

- Keep TypeScript strict.
- Do not use `any` to bypass type safety.
- Model actor data with explicit interfaces and types.
- Validate external or untrusted data before using it.
- Prefer narrow types over broad object shapes.
- Use type-only imports where appropriate.
- Handle nullable and optional values explicitly.
- Do not suppress compiler errors without a documented architectural reason.
- Use discriminated unions when state has distinct modes.
- Keep runtime validation aligned with static actor contracts.
- Do not use type assertions to hide an uncertain runtime shape.

Types shared across the loader, editor, renderer, runtime, and exporter form
part of the Genesis contract. Changes to those types must be evaluated across
every consumer.

Actor schema versions and Genesis Engine release versions are independent. A
schema change requires normalization, validation, export, compatibility, and
test review. Never use the product or engine release number as an actor-format
substitute.

## React Component Rules

- Keep components focused and reusable.
- Extract UI modules when they have a distinct responsibility.
- Do not duplicate UI logic.
- Keep state centralized at the appropriate shared owner.
- Pass behavior through explicit, typed props.
- Avoid character-specific conditions in shared components.
- Preserve existing interaction behavior during structural refactors.
- Do not redesign the UI unless the Sprint explicitly requests it.
- Keep rendering logic separate from editor controls where practical.
- Do not mirror the same mutable state in multiple components without a clear
  synchronization strategy.
- Keep browser effects scoped, cancellable, and properly cleaned up.

### State Ownership

State should live at the lowest common owner that must coordinate it. Editor
modules receive the data and actions they require, but they should not reach
through module boundaries to mutate unrelated state.

Actor definition state, selection state, viewport state, and history state may
have different lifecycles. Treat them as separate concerns even when the
composition layer coordinates them.

Components must request actor changes through `ActorDocumentCommands`. Direct
mutation or panel-specific document cloning is prohibited. Continuous pointer
or drag interactions must use one history transaction per user gesture.

### Component Extraction

A component should be extracted when it:

- Represents a named part of the editor architecture
- Has a distinct responsibility
- Can be described by a focused prop contract
- Reduces the size or responsibility of a composition component
- Is expected to evolve independently

Extraction must preserve behavior and styles unless the Sprint explicitly
authorizes a change.

## Folder Organization

Genesis code should be organized by responsibility.

```text
app/avatar-engine/
├── auth/             Internal access policy and temporary-session validation
├── components/       Shared avatar-engine components
├── config/           Genesis and actor-editor configuration
├── domain/           Actor schema, normalization, validation, hierarchy
├── lib/              Loading, rendering, runtime, and engine logic
├── studio/           Genesis editor composition and routes
│   ├── components/   Modular editor UI
│   └── domain/       Commands, selection, and session history
├── tools/            Asset and actor-generation tools
└── types/            Shared TypeScript contracts

app/felencho-studio/
├── page.tsx           Public Felencho Studio entry
├── components/        Conversation and guided-capture UI
├── auth/              Private Beta access UI
└── advanced/          Protected professional editor route

public/actors/
└── <ActorId>/        Actor definitions and assets

docs/genesis/         Genesis vision, rules, architecture, and roadmap

supabase/migrations/  Reviewed database migrations; never apply remotely
                      without explicit deployment approval
```

New files should be placed in the narrowest folder that accurately represents
their responsibility.

Do not create a new folder or abstraction merely to move complexity out of
sight. Folder boundaries should reflect stable architectural concepts.

## Actor Document and Asset Rules

- `actor.json` is authoritative for actor structure and configuration.
- Normalize legacy documents in memory; do not rewrite source actor packages
  as a side effect of loading.
- Keep actor schema version independent of the Studio release version.
- Store imported binary blobs only behind `ActorAssetRepository`.
- Never make IndexedDB the sole owner of layers, hierarchy, rig, construction,
  or other important actor structure.
- Distinguish bundled, local, packaged, and missing assets in data and UI.
- Preserve standalone JSON export and complete portable-package export.
- Stop portable export when any declared binary asset is unavailable.
- Keep organizational folders separate from transform groups and parent
  relationships.
- Use the shared hierarchy and transform resolver in both editor geometry and
  rendering.

## Command, Selection, and History Rules

Every actor-document mutation must pass through `ActorDocumentCommands`,
including create, rename, duplicate, delete, move, reorder, folder assignment,
visibility, locking, transforms, relationships, mouth mappings, and asset
replacement.

`StudioSelection` owns selected stable IDs and range anchors. Components derive
selected objects from the active actor document and must not cache stale
copies.

History is session-based in Genesis v0.6. It must:

- Record complete document operations
- Restore selection when appropriate
- Group continuous gestures into one transaction
- Clear Redo after a new committed mutation
- Exclude viewport and preview-only state
- Preserve actor validity across Undo and Redo

## Sprint Workflow

### 1. Define the Sprint

Record the objective, scope, acceptance criteria, and explicit non-goals. The
Sprint should describe the behavior or architectural boundary being delivered.

### 2. Inspect the Current System

Review the affected components, types, data, and runtime consumers before
editing. Confirm current behavior and identify dependencies.

### 3. Establish Scope

List the files expected to change. Only modify files related to the current
Sprint. If a necessary change expands the scope materially, stop and revise
the Sprint rather than hiding the expansion in implementation work.

### 4. Implement Incrementally

Make the smallest coherent implementation that satisfies the acceptance
criteria. Preserve existing behavior unless change is explicitly required.

### 5. Verify Continuously

Use TypeScript, linting, targeted tests, runtime checks, and production builds
in proportion to the change. Do not postpone all verification until the end.

### 6. Review the Diff

Confirm that:

- Every changed line belongs to the Sprint.
- No existing behavior changed accidentally.
- No temporary debugging code remains.
- No generated or unrelated files were added unintentionally.
- New boundaries have clear types and ownership.

### 7. Complete the Sprint

Run final build verification, document relevant architectural decisions, and
ensure the result can be deployed immediately.

Every Sprint must compile.

Every Sprint must be deployable.

## Build Verification

Never break the build.

Before completing a Sprint:

1. Run focused and affected automated tests.
2. Run TypeScript validation.
3. Run lint.
4. Run the production build.
5. Resolve all errors introduced by the Sprint.
6. Confirm affected routes are generated successfully.
7. Review warnings and determine whether they are relevant to the Sprint.
8. Verify no unrelated generated files or source changes are included.
9. Run targeted interaction checks for the affected behavior.

Actor-document releases should explicitly verify legacy actor loading, export
round trips, missing-asset behavior, Undo/Redo, selection reconciliation,
hierarchy cycle prevention, and any new command paths.

A Sprint is not complete until build verification succeeds.

If the build fails because of the environment rather than the code, document
the cause, rerun it in a valid environment, and obtain a successful result.
An assumed successful build is not verification.

## Git Workflow

- Keep commits focused.
- Create one coherent commit per completed unit of work.
- Use clear commit messages that describe the result.
- Do not mix unrelated fixes or refactors into a Sprint commit.
- Review the working tree before staging.
- Stage only files related to the current Sprint.
- Never overwrite or discard another contributor's work.
- Keep the branch in a buildable and deployable state.
- Do not commit secrets, local environment files, build artifacts, or
  temporary diagnostics.

Recommended commit messages describe the architectural or user-visible result:

```text
Extract Genesis toolbar component
Add data-driven layer ordering
Introduce actor timeline contracts
```

A commit should be understandable without reading the entire diff.

## Pull Request Workflow

Every pull request should:

- Have a clear title describing the Sprint or feature.
- Explain the objective and architectural impact.
- List the files or modules changed.
- State how the work was verified.
- Confirm that the production build succeeds.
- Avoid unrelated changes.
- Preserve existing behavior unless the change is intentional and documented.
- Be small enough to review with confidence.
- Identify follow-up work without including it opportunistically.

The pull request description should include:

1. **Purpose** — Why the change exists.
2. **Implementation** — Which modules and contracts changed.
3. **Behavior** — What users or downstream systems will observe.
4. **Verification** — Builds, tests, and manual checks performed.
5. **Risk** — Known edge cases or migration concerns.

A pull request must not be considered ready if it breaks compilation, prevents
deployment, introduces unresolved architectural debt, or includes unexplained
changes outside the Sprint.
