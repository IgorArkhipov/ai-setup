# HW-4: Process Spec, Runner Contract, And Resumable State

## Summary

Homework 4 is implemented as a small, reviewable process package under `homeworks/hw-4`.

The selected SDLC process is **Memory-Bank Long-Run Feature Execution**: a bounded agent loop for executing one step of a governed memory-bank feature, recording evidence, and stopping or resuming safely.

The package intentionally mirrors the reusable repository process documented in:

```text
memory-bank/flows/agent-process-operations.md
```

## Source Requirement

The referenced Week 4 requirement says the minimum homework package should:

1. choose one process from the local SDLC;
2. describe it with one suitable diagram and an execution contract;
3. create a runner script or prompt with a verifiable contract;
4. assemble a small state-pack that allows the run to resume safely;
5. intentionally stop and resume one run, then show a short trace.

## Requirement Mapping

| Requirement | Evidence |
| --- | --- |
| Choose one SDLC process | `process-spec.md` selects `Memory-Bank Long-Run Feature Execution`. |
| Diagram and execution contract | `process-spec.md` contains a Mermaid flowchart, a state diagram, a step contract, escalation rules, exit criteria, and observable runner contract. |
| Runner prompt or script | `runner-prompt.md` contains a bounded runner prompt and a machine-checkable response footer. |
| Resumable state-pack | `state-pack/active-context.md` and `state-pack/session-handoff.md` describe current focus, verified facts, open risks, stop reason, and exact resume action. |
| Intentional stop/resume trace | `traces/stop-resume-trace.md` records Run 1 stopping and Run 2 resuming from state artifacts. |
| Evidence that the runner used saved state | `evidence/runner-resume-invocation-2026-05-14.md` records the runner inputs, extracted active context, extracted handoff, runner decision, changed artifacts, and machine-checkable footer. |
| Clean subagent resume proof | `subagent-simulation/runner-prompt.md` was given to an isolated subagent without inherited conversation context, and `evidence/subagent-runner-resume-2026-05-14.md` records the saved facts it extracted from active context and handoff before writing its only owned artifact. |

## Files

```text
homeworks/hw-4/process-spec.md
homeworks/hw-4/runner-prompt.md
homeworks/hw-4/state-pack/active-context.md
homeworks/hw-4/state-pack/session-handoff.md
homeworks/hw-4/traces/stop-resume-trace.md
homeworks/hw-4/evidence/runner-resume-invocation-2026-05-14.md
homeworks/hw-4/subagent-simulation/runner-prompt.md
homeworks/hw-4/subagent-simulation/state-pack/active-context.md
homeworks/hw-4/subagent-simulation/state-pack/session-handoff.md
homeworks/hw-4/subagent-simulation/traces/runner-trace.md
homeworks/hw-4/evidence/subagent-runner-resume-2026-05-14.md
homeworks/hw-4/report.md
```

## Chosen Process

The process is narrow on purpose. It does not try to automate the whole feature lifecycle. It runs one execution slice:

```text
read canonical scope -> read run state -> select next STEP-* -> execute bounded work -> verify -> decide continue/done/blocked/escalation
```

This is useful for this repository because memory-bank feature work already has canonical feature packages and implementation plans. The missing operational layer is not another spec format; it is a repeatable way to keep long-running execution observable and resumable.

## Runner Contract

The runner must leave a trace after every iteration:

- step worked;
- artifacts changed;
- checks performed;
- process status;
- next action or stop reason.

The allowed statuses are:

- `continue`
- `done`
- `blocked`
- `escalation`

This makes the loop testable. A reviewer can inspect the state-pack and know whether the next session can continue without reconstructing context from chat history.

## Stop / Resume Demonstration

The demonstration intentionally stopped after drafting the process spec. The handoff recorded:

- what was already changed;
- what had been verified;
- why the run stopped;
- what exact files the resumed run should complete.

The resumed run then completed the runner prompt, active context, trace, and report. The trace is stored in:

```text
homeworks/hw-4/traces/stop-resume-trace.md
```

## Runner Resume Evidence

The first package version had a weak spot: it described a stop/resume trace, but did not separately prove that the runner consumed the saved active context and handoff.

That gap is now covered by:

```text
homeworks/hw-4/evidence/runner-resume-invocation-2026-05-14.md
```

That evidence file records:

- the runner prompt and process spec used;
- the state-pack files read before acting;
- the context extracted from `active-context.md`;
- the context extracted from `session-handoff.md`;
- the bounded runner decision;
- the artifacts changed from that saved context;
- a machine-checkable footer with process status, step worked, checks performed, next action, and stop reason.

This is the direct evidence that the agent resumed from available process-state artifacts instead of relying only on chat memory.

## Isolated Subagent Simulation

The strongest proof is the subagent simulation package:

```text
homeworks/hw-4/subagent-simulation/
```

The parent prepared a fresh active context and handoff, then launched a worker subagent with `fork_context: false`. The subagent received only one operational instruction: read and follow `homeworks/hw-4/subagent-simulation/runner-prompt.md`.

The simulation runner prompt gave the subagent a strict write boundary:

```text
homeworks/hw-4/evidence/subagent-runner-resume-2026-05-14.md
```

The subagent evidence file shows that it read:

- the runner prompt;
- the process spec;
- the subagent active context;
- the subagent session handoff;
- the subagent trace.

It then extracted the current goal, current step, stop reason, next action, write boundary, and no-escalation status from those saved state files before creating the evidence file. This demonstrates the actual homework goal: a fresh agent can resume a previous process state from disk without relying on the parent conversation.

## Verification

Run from the repository root:

```bash
rtk git diff --check
```

Run from `tools/agentscope`:

```bash
rtk npm run lint
```

Expected result: both commands exit successfully.
