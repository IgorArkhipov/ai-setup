# Prompt: Large Feature Execution Loop

Work according to `homeworks/hw-4/full/process-specs/large-feature-execution-loop.md`.

Inputs:

- `homeworks/hw-4/full/work-item/issue.md`
- `homeworks/hw-4/full/work-item/brief.md`
- `homeworks/hw-4/full/work-item/spec.md`
- `homeworks/hw-4/full/state/active-context.md`
- `homeworks/hw-4/full/state/stage-state.md`
- `homeworks/hw-4/full/state/session-handoff.md`, if present

Rules:

1. Reuse the small-loop runner results for Brief and Spec.
2. Create or update the implementation plan from the improved Spec.
3. Implement only the homework artifact changes, not production code.
4. Run safe local checks.
5. If verification finds issues, record and fix them before final status.
6. Save state after each meaningful stage.
7. Record stop/resume explicitly.
8. End with status `done`, `blocked`, or `escalation`.
