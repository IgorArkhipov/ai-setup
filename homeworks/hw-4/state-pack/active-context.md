# Active Context

## Current Goal

Complete Homework 4 by demonstrating a reusable agent process spec, a runner prompt, a resumable state-pack, and an intentional stop/resume trace.

## Current Process

`homeworks/hw-4/process-spec.md`

## Current Step

`done`: the resumed run completed the state-pack, trace, report, and verification.

## In Progress

- The process selected for the homework is `Memory-Bank Long-Run Feature Execution`.
- The first run intentionally stopped after drafting the process spec and before completing the runner/state-pack.
- The resumed run completed the runner prompt, state artifacts, trace, and report.

## Verified Facts

- The Week 4 requirement says to choose one SDLC process, describe it with a diagram and execution contract, create a runner prompt or script with a verifiable contract, assemble a small state-pack, intentionally stop/resume one run, and show a short trace.
- `memory-bank/flows/agent-process-operations.md` already documents the reusable repository process layer in English.
- `homeworks/hw-4/report.md` existed as an empty untracked file before this package was populated.

## Open Risks

- This homework package demonstrates the run through written trace artifacts rather than by launching a separate real agent process.
- The selected process is documentation/workflow-focused, so verification is lint/diff-oriented rather than application behavior-oriented.

## Next Check

Repository documentation checks were run:

- `rtk git diff --check`
- `rtk npm run lint` from `tools/agentscope`
