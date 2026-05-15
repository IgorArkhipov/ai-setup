# Issue: Add A Full HW-4 Process Evidence Package

## Problem

The preliminary HW-4 attempt documented a useful long-run process and later added an isolated subagent resume proof, but it did not implement the full Week 4 assignment shape:

- two separate small improvement loops for `Brief` and `Spec`;
- runner prompt/script artifacts for those loops;
- a large SDLC loop that reuses the small loops;
- state updates after multiple stages;
- a trace/report for one real run of the large loop.

## Desired Outcome

Create a complete English HW-4 attempt under:

```text
homeworks/hw-4/full/
```

The result should be reviewable as a standalone homework submission and should preserve the preliminary attempt as historical context.

## Scope

In scope:

- English translation/interpretation of the full requirements.
- Process specs for brief and spec improvement loops.
- Prompt files for brief and spec improvement loops.
- A reusable runner script for the small loops.
- A large feature/task execution loop with saved state.
- A run trace showing stop/resume and final status.
- A report mapping requirements to evidence.

Out of scope:

- Changing production code in `tools/agentscope`.
- Creating a real deployment environment.
- Reading `.env*` files.

## Acceptance

- All new artifacts are saved under `homeworks/hw-4/full/`.
- The large loop reuses the brief/spec small-loop runner.
- The state-pack has 2-3 files and records meaningful stage transitions.
- The run trace names the actual runners used and the stop/resume point.
- Repository verification commands pass.
