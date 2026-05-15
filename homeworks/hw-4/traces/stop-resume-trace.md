# Stop / Resume Trace

## Trace Summary

This trace demonstrates that the process can be stopped and resumed from artifacts on disk.

## Run 1: Intentional Stop

Process status: `blocked`

Step worked: `draft-process-spec`

Artifacts changed:

- `homeworks/hw-4/process-spec.md`
- `homeworks/hw-4/state-pack/session-handoff.md`

Checks performed:

- Confirmed Week 4 requirement section from `process-specs-for-agents`.
- Confirmed the selected process is one SDLC workflow rather than a broad project.

Stop reason:

- Intentional stop before runner/state-pack/report completion, to create a real resume point.

Next action:

- Read `session-handoff.md`, then complete runner prompt, active context, trace, report, and verification.

## Run 2: Resume

Process status: `done`

Step worked: `resume-and-finish`

Artifacts changed:

- `homeworks/hw-4/runner-prompt.md`
- `homeworks/hw-4/state-pack/active-context.md`
- `homeworks/hw-4/traces/stop-resume-trace.md`
- `homeworks/hw-4/report.md`

Checks performed:

- Reconciled `state-pack/session-handoff.md` with `process-spec.md`.
- Verified that all five Week 4 requirement bullets have evidence in the homework package.
- Ran repository formatting and lint checks listed in `report.md`.

Stop reason:

- None. Homework evidence package is complete.

Next action:

- Review the homework package and submit the relevant files.

## Resume Observation

The resumed run did not need chat history to continue. The next action, unfinished artifacts, verified facts, and risks were all present in `state-pack/session-handoff.md` and `state-pack/active-context.md`.

## Run 3: Evidence-Hardening Resume Pass

Process status: `done`

Step worked: `evidence-hardening-resume`

Inputs read before acting:

- `homeworks/hw-4/runner-prompt.md`
- `homeworks/hw-4/process-spec.md`
- `homeworks/hw-4/state-pack/active-context.md`
- `homeworks/hw-4/state-pack/session-handoff.md`
- `homeworks/hw-4/traces/stop-resume-trace.md`
- `homeworks/hw-4/report.md`

Context used from saved state:

- `active-context.md` identified the homework goal, current process, completed resume state, and the risk that the evidence was only trace-based.
- `session-handoff.md` identified the original stop reason and the exact resume actions required after Run 1.

Artifacts changed:

- `homeworks/hw-4/evidence/runner-resume-invocation-2026-05-14.md`
- `homeworks/hw-4/state-pack/active-context.md`
- `homeworks/hw-4/traces/stop-resume-trace.md`
- `homeworks/hw-4/report.md`

Checks performed:

- Confirmed the runner consumed the saved active context and handoff before changing artifacts.
- Confirmed the report now points to explicit runner-consumption evidence rather than only a narrative trace.

Stop reason:

- Done. The package now includes evidence that the runner used saved process state to resume.
