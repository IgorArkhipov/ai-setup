# Runner Resume Invocation Evidence

## Purpose

This file records an actual runner-style resume pass performed on 2026-05-14 after review found that the original homework package had a weak evidence gap.

The goal of this pass was not to invent another process document. The goal was to prove that an agent could resume from saved run state by reading the previously saved active context and handoff, deriving the next action from those artifacts, and updating the homework package accordingly.

## Runner Used

Runner prompt:

```text
homeworks/hw-4/runner-prompt.md
```

Process spec:

```text
homeworks/hw-4/process-spec.md
```

## Inputs Read Before Acting

The runner pass read these state artifacts before making edits:

```text
homeworks/hw-4/state-pack/active-context.md
homeworks/hw-4/state-pack/session-handoff.md
homeworks/hw-4/traces/stop-resume-trace.md
homeworks/hw-4/report.md
```

## Context Extracted From `active-context.md`

The saved active context said:

- Current goal: complete Homework 4 by demonstrating a reusable agent process spec, runner prompt, resumable state-pack, and stop/resume trace.
- Current process: `homeworks/hw-4/process-spec.md`.
- Current step before this evidence pass: `done`, after the resumed run completed the state-pack, trace, report, and verification.
- Open risk: the package demonstrated the run through written trace artifacts rather than by launching a separate real agent process.

This risk is the reason this evidence pass was needed.

## Context Extracted From `session-handoff.md`

The saved handoff said:

- Run 1 stopped after `process-spec.md` was drafted.
- Runner prompt, active context, trace, and report still needed completion.
- The exact resume action was to read `process-spec.md` and complete `runner-prompt.md`, `active-context.md`, `stop-resume-trace.md`, and `report.md`.
- Escalation was not needed.

The handoff had already been marked archived because Run 2 completed the original resume action. The runner therefore did not redo Run 2. It used the handoff as evidence of the previous resume point and addressed the remaining evidence gap recorded in the active context.

## Runner Decision

The runner selected a bounded follow-up step:

```text
evidence-hardening-resume
```

Reason:

- The active context contained a known evidence weakness.
- The handoff contained enough saved state to explain what the previous session needed to resume.
- The report did not yet link to an artifact proving the runner consumed those saved state files.

## Work Performed From Saved Context

The runner updated the homework package by adding explicit evidence that the resume pass consumed the saved state artifacts.

Changed artifacts:

```text
homeworks/hw-4/evidence/runner-resume-invocation-2026-05-14.md
homeworks/hw-4/state-pack/active-context.md
homeworks/hw-4/traces/stop-resume-trace.md
homeworks/hw-4/report.md
```

## Verification Facts

- The runner input list includes both the active context and handoff artifacts.
- The extracted context records the active-context risk and the handoff next action.
- The runner decision follows from those saved artifacts, not from chat history alone.
- The trace now distinguishes the original stop/resume demonstration from this evidence-hardening resume pass.

## Machine-Checkable Footer

Process status: `done`

Step worked: `evidence-hardening-resume`

Artifacts changed: `homeworks/hw-4/evidence/runner-resume-invocation-2026-05-14.md`, `homeworks/hw-4/state-pack/active-context.md`, `homeworks/hw-4/traces/stop-resume-trace.md`, `homeworks/hw-4/report.md`

Checks performed: read `runner-prompt.md`, `process-spec.md`, `state-pack/active-context.md`, `state-pack/session-handoff.md`, `traces/stop-resume-trace.md`, and `report.md`; then ran repository verification listed in `report.md`

Next action: review the homework evidence package

Stop reason: done
