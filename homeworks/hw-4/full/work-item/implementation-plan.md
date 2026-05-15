# Implementation Plan: Full HW-4 Process Evidence Package

## Source

- Issue: `homeworks/hw-4/full/work-item/issue.md`
- Improved brief: `homeworks/hw-4/full/work-item/brief.md`
- Improved spec: `homeworks/hw-4/full/work-item/spec.md`

## Preconditions

- `PRE-01`: Full HW-4 requirements have been interpreted in English.
- `PRE-02`: Brief and Spec small-loop process specs exist.
- `PRE-03`: Brief and Spec small-loop prompts exist.
- `PRE-04`: Reusable small-loop runner script exists and can prepare runner requests.
- `PRE-05`: State-pack exists with `active-context.md`, `stage-state.md`, and `session-handoff.md`.

## Steps

| Step | Goal | Artifacts | Verification |
| --- | --- | --- | --- |
| `STEP-01` | Execute `brief-loop` through the reusable runner path. | `runs/brief-loop/*`, `work-item/brief.md` | Runner result status is `done`. |
| `STEP-02` | Execute `spec-loop` through the reusable runner path. | `runs/spec-loop/*`, `work-item/spec.md` | Runner result status is `done`. |
| `STEP-03` | Resume from saved state after the intentional stop. | `state/session-handoff.md`, `trace/run-trace.md` | Trace records stop/resume. |
| `STEP-04` | Complete implementation artifacts for the homework package. | `implementation-plan.md`, `implementation-output.md`, state files | Required package files exist. |
| `STEP-05` | Run checks and safe stage-equivalent verification. | `verification.md`, `evidence/package-tree.txt` | Diff check, lint, runner smoke, and file-presence checks pass. |
| `STEP-06` | Fix verification findings, if any. | Updated artifacts and verification notes | Findings resolved or escalated. |
| `STEP-07` | Write final trace/report. | `trace/run-trace.md`, `report.md` | Report maps requirements to evidence and final status. |

## Stop / Resume Gate

The large loop intentionally stopped after the initial process/state package was created. It resumed at `STEP-01` by reading:

- `state/active-context.md`
- `state/stage-state.md`
- `state/session-handoff.md`

## Check Strategy

- `rtk git diff --check`
- `cd tools/agentscope && rtk npm run lint`
- `rtk ./homeworks/hw-4/full/runners/improve-loop-runner.sh --help`
- package-tree smoke check: required full-attempt artifacts exist and are non-empty.

## HITL / Escalation

No escalation was needed for this run because:

- the work stayed inside `homeworks/hw-4/full/`;
- no production code was changed;
- no external deployment or credentials were required;
- safe local verification was sufficient for a documentation-only package.
