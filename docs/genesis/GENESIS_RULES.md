# Genesis Engineering Rules

## Authority

These rules apply to every Genesis Sprint, every Genesis module, and every
actor integrated with the Genesis engine.

They protect the qualities required for a professional Avatar Studio:
correctness, modularity, performance, scalability, consistency, and
deployability.

If a proposed implementation conflicts with these rules, the implementation
must change or the exception must be explicitly reviewed and documented. Time
pressure alone is not a valid exception.

## Data and Actor Rules

1. **Never hardcode avatar layers.**
   Layer identity, order, visibility, transforms, and assets must come from
   actor data.

2. **Use `actor.json` as the source of truth.**
   The editor and runtime must interpret the same actor definition.

3. **Never create character-specific engine forks.**
   Bob, Lina, Felencho Virtual, and future characters must use the same engine.

4. **Keep character variation in data and assets.**
   Do not encode character identity into shared editor controls, rendering
   branches, or runtime systems.

5. **Validate actor data before use.**
   Invalid definitions must fail with actionable diagnostics or use a
   documented safe fallback.

6. **Keep actor assets separate from editor behavior.**
   Asset locations and actor structure must not determine UI architecture.

7. **Use stable identifiers.**
   Layer, rig, animation, expression, and asset references must use explicit,
   unique identifiers.

8. **Version evolving actor contracts.**
   Format changes must consider validation, migration, backward compatibility,
   and exporter behavior.

9. **Never let provider-specific payloads become actor data contracts.**
   External AI, voice, and streaming data must pass through adapters.

## Architecture Rules

1. **Never duplicate UI logic.**
   Shared behavior must have one authoritative implementation.

2. **Keep components reusable.**
   Components should depend on typed data and commands, not actor identity.

3. **Keep modules focused on one responsibility.**
   A module must have a clear reason to change.

4. **Keep state centralized.**
   Every mutable concern must have an identifiable authoritative owner.

5. **Preserve clear system boundaries.**
   UI, state, history, loading, validation, rendering, runtime behavior, and
   export must not collapse into one layer.

6. **Prefer modular systems over monolithic components.**
   Extract stable responsibilities through explicit interfaces.

7. **Never sacrifice long-term architecture for short-term convenience.**
   A shortcut that creates duplication or unclear ownership is architectural
   debt, not delivery.

8. **Do not create parallel implementations when the shared engine can be
   extended.**

9. **Performance, modularity, and scalability come before shortcuts.**

10. **Make dependencies directional and explicit.**
    Lower-level engine modules must not depend on editor presentation modules.

11. **Use adapters at external integration boundaries.**
    Core modules must remain independent of a specific service provider.

12. **Avoid speculative abstractions.**
    Create abstractions around proven responsibilities and planned module
    boundaries.

## Editor Rules

1. **Do not redesign the UI unless requested.**

2. **Always preserve Undo/Redo.**
   History is a foundational editor capability.

3. **Every persistent editor mutation must be history-compatible.**
   A user action must be reversible as a coherent operation.

4. **Do not record view-only state as actor data.**
   Viewport zoom, temporary highlights, and transient selection behavior must
   remain distinct from actor configuration unless explicitly designed
   otherwise.

5. **Preserve interaction behavior during structural refactors.**
   Keyboard, pointer, selection, viewport, visibility, and command behavior
   must remain stable unless the Sprint changes them intentionally.

6. **Keep visual styling unchanged unless the Sprint includes design work.**

7. **Editor controls must operate on actor capabilities and data.**
   They must not assume the selected actor is Bob or any other named character.

8. **Keep coordinate systems explicit.**
   Actor space, layer-local space, stage space, and viewport space must not be
   mixed implicitly.

9. **Group continuous interactions into coherent history actions.**
   Dragging must not create an unusable series of unrelated snapshots.

10. **Never allow an editor module to mutate another module's internal state
    directly.**

## Rendering and Runtime Rules

1. **Keep the Actor Renderer independent of editor UI.**

2. **Render from validated actor data and explicit runtime state.**

3. **Preserve deterministic layer ordering.**

4. **Do not perform unnecessary expensive work per frame.**
   Cache stable calculations and assets where appropriate.

5. **Bound runtime input.**
   Clamp, validate, or reject values that can destabilize rendering or
   simulation.

6. **Separate persistent configuration from transient runtime state.**

7. **Measure performance before and after performance-sensitive changes.**

8. **Ensure new animation, expression, physics, and lip-sync systems can be
   disabled or absent without breaking base rendering.**

## TypeScript and Code Quality Rules

1. **Keep TypeScript strict.**

2. **Never use `any` as a shortcut around correct types.**

3. **Use explicit interfaces for module boundaries.**

4. **Validate unknown external data at runtime.**
   Static types do not validate JSON, network responses, or provider events.

5. **Handle errors and nullable values deliberately.**

6. **Never leave dead code.**

7. **Remove obsolete imports, variables, and implementations.**

8. **Use descriptive names.**

9. **Avoid hidden side effects.**

10. **Do not suppress build, lint, or type errors without a documented
    reason.**

11. **Keep runtime validators aligned with TypeScript contracts.**

12. **Prefer immutable updates for state participating in history.**

13. **Do not use unsafe type assertions to conceal uncertain data.**

14. **Clean up browser effects, subscriptions, observers, and animation
    frames.**

## Sprint Rules

1. **Never break the build.**

2. **Every Sprint must compile.**

3. **Every Sprint must be deployable.**

4. **Only modify files related to the current Sprint.**

5. **Keep commits focused.**

6. **Do not combine unrelated cleanup with Sprint work.**

7. **Define acceptance criteria before implementation.**

8. **Review the final diff before completion.**

9. **Verify the production build before declaring a Sprint complete.**

10. **Preserve existing functionality unless the Sprint explicitly changes
    it.**

11. **Do not leave temporary debugging code, placeholder behavior, or
    unfinished branches.**

12. **Document new architectural contracts and long-term decisions.**

13. **Escalate material scope changes instead of hiding them in the diff.**

14. **Leave the architecture stronger than it was before the Sprint.**

## Git and Review Rules

1. **Review the working tree before staging.**

2. **Never overwrite or discard another contributor's work.**

3. **Stage only Sprint-related files.**

4. **Use commit messages that describe the delivered result.**

5. **Do not commit secrets, local configuration, temporary files, or build
   artifacts.**

6. **Every pull request must state how the change was verified.**

7. **Every pull request must identify intentional behavior changes.**

8. **A pull request that does not compile is not ready for review.**

9. **A pull request with unexplained unrelated changes is not ready to
   merge.**

## Definition of Done

Genesis work is complete only when:

- The requested capability or documentation is complete.
- The implementation follows the shared architecture.
- Existing behavior is preserved unless change was requested.
- TypeScript compiles.
- The production build succeeds.
- The result is deployable.
- Undo/Redo remains correct for editor mutations.
- No dead code or temporary work remains.
- The diff contains only work related to the Sprint.
- The relevant documentation is current.
