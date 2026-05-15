# Active Context

## Current Goal

Complete Homework 4 by demonstrating a reusable agent process spec, a runner prompt, a resumable state-pack, and an intentional stop/resume trace.

## Current Process

`homeworks/hw-4/process-spec.md`

## Current Step

`done`: the resumed run completed the state-pack, trace, report, verification, and explicit runner-consumption evidence.

## In Progress

- The process selected for the homework is `Memory-Bank Long-Run Feature Execution`.
- The first run intentionally stopped after drafting the process spec and before completing the runner/state-pack.
- The resumed run completed the runner prompt, state artifacts, trace, and report.
- A follow-up runner-style pass on 2026-05-14 used the saved active context and handoff to harden the evidence package.
- An isolated subagent simulation with no forked parent conversation context produced `homeworks/hw-4/evidence/subagent-runner-resume-2026-05-14.md`.

## Verified Facts

- The Week 4 requirement says to choose one SDLC process, describe it with a diagram and execution contract, create a runner prompt or script with a verifiable contract, assemble a small state-pack, intentionally stop/resume one run, and show a short trace.
- `memory-bank/flows/agent-process-operations.md` already documents the reusable repository process layer in English.
- `homeworks/hw-4/report.md` existed as an empty untracked file before this package was populated.
- `homeworks/hw-4/evidence/runner-resume-invocation-2026-05-14.md` records the concrete runner inputs read from the saved state-pack and the decision made from them.
- `homeworks/hw-4/evidence/subagent-runner-resume-2026-05-14.md` records a stronger isolated-subagent resume proof.

## Open Risks

- The homework package still uses a prompt-runner transcript rather than a separately launched agent CLI process.
- The selected process is documentation/workflow-focused, so verification is lint/diff-oriented rather than application behavior-oriented.

## Next Check

Repository documentation checks were run:

- `rtk git diff --check`
- `rtk npm run lint` from `tools/agentscope`
