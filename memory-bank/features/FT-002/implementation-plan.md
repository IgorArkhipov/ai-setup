---
title: "FT-002: Implementation Plan"
doc_kind: feature
doc_function: derived
purpose: "Archived execution plan for FT-002. Records the grounded execution slices, risk controls, and verification strategy for the shared guarded mutation engine."
derived_from:
  - feature.md
status: archived
audience: humans_and_agents
must_not_define:
  - ft_002_scope
  - ft_002_architecture
  - ft_002_acceptance_criteria
  - ft_002_blocker_state
---

# Implementation Plan

## Goal Of This Plan

Add one shared guarded mutation engine plus `toggle` and `restore` commands to `tools/agentscope` without expanding writable provider coverage beyond verified planning interfaces.

## Current State / Reference Points

| Path / module | Current role | Why relevant | Reuse / mirror |
| --- | --- | --- | --- |
| `feature.md` | Canonical FT-002 scope and verification contract | The plan must not redefine mutation semantics or acceptance | All execution steps trace to `REQ-*`, `SC-*`, and `CHK-*` here |
| `spec.md` | Archived pre-migration spec | Preserves detailed guarded-mutation requirement wording | Historical design detail only |
| `plan.md` | Archived pre-migration execution script | Preserves the original task-by-task implementation script | Historical grounding only |
| `../../tools/agentscope/src/core/discovery.ts` | Upstream selection surface from FT-001 | Writable flows depend on one normalized selected-item contract | Reuse selection and config boundaries |
| `../../tools/agentscope/src/core/mutation-*` | Shared guarded mutation modules introduced by FT-002 | Core safety logic lives here | Keep provider-neutral safety guarantees centralized |

## Test Strategy

| Test surface | Canonical refs | Existing coverage | Planned automated coverage | Required local suites / commands | Required CI suites / jobs | Manual-only gap / justification | Manual-only approval ref |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Shared mutation vocabulary and engine semantics | `REQ-01`, `REQ-03`, `REQ-04`, `SC-01`, `SC-03`, `CHK-01` | Discovery-only core from FT-001 | Add mutation-model, IO, state, engine, output, toggle, and restore coverage | `npm test` | Repository CI test job | none | `none` |
| Command and runtime contract | `REQ-02`, `REQ-05`, `SC-01`, `SC-02`, `SC-03`, `CHK-02` | Existing CLI compile and command tests | Extend command tests and build verification for the new CLI surface | `npm run build` | Repository CI build job | none | `none` |

## Open Questions / Ambiguities

| Open Question ID | Question | Why unresolved | Blocks | Default action / escalation owner |
| --- | --- | --- | --- | --- |
| `OQ-01` | Which happy-path writable coverage should prove the shared engine before real provider writes exist | Concrete provider writes were intentionally out of scope for this slice | `STEP-03` | Use a fake writable provider in tests and keep real providers blocked until a later feature |

## Environment Contract

| Area | Contract | Used by | Failure symptom |
| --- | --- | --- | --- |
| setup | Work from `tools/agentscope` with temp sandboxes for writable state | `STEP-01`, `STEP-02`, `STEP-03` | Tests touch real provider or home-directory state |
| test | `npm test` and `npm run build` are the canonical local verification commands | `CHK-01`, `CHK-02` | Safety semantics change without deterministic proof |
| access / network / secrets | No live provider writes are required; SQLite support relies on the pinned Node runtime | all steps | Mutation tests or build behavior differ from the documented runtime baseline |

## Preconditions

| Precondition ID | Canonical ref | Required state | Used by steps | Blocks start |
| --- | --- | --- | --- | --- |
| `PRE-01` | `ASM-01`, `CON-01`, `CON-02` | The FT-001 discovery model remains the upstream selector and dry-run stays read-only | `STEP-01`, `STEP-02`, `STEP-03` | yes |

## Workstreams

| Workstream | Implements | Result | Owner | Dependencies |
| --- | --- | --- | --- | --- |
| `WS-01` | `REQ-01` | Shared mutation vocabulary and provider planning hook | agent | `PRE-01` |
| `WS-02` | `REQ-03`, `REQ-04` | Guarded mutation IO, backup state, audit log, lock, and rollback engine | agent | `WS-01` |
| `WS-03` | `REQ-02`, `REQ-05` | Deterministic `toggle` and `restore` commands plus end-to-end tests | agent | `WS-01`, `WS-02`, `OQ-01` |

## Approval Gates

| Approval Gate ID | Trigger | Applies to | Why approval is required | Approver / evidence |
| --- | --- | --- | --- | --- |
| `AG-01` | none | none | FT-002 stayed within local repository state and sandboxed tests | none |

## Work Sequence

| Step ID | Actor | Implements | Goal | Touchpoints | Artifact | Verifies | Evidence IDs | Check command / procedure | Blocked by | Needs approval | Escalate if |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `STEP-01` | agent | `REQ-01` | Define the structured mutation vocabulary and provider planning contract | `src/core/mutation-models.ts`, `src/core/discovery.ts`, `src/providers/*` | Provider-neutral mutation plan model | `CHK-01` | `EVID-01` | `npm test` | `PRE-01` | `none` | The provider contract requires safety logic outside the shared core |
| `STEP-02` | agent | `REQ-03`, `REQ-04` | Implement guarded IO, backup state, audit log, lock, and rollback behavior | `src/core/mutation-*.ts`, `test/mutation-*.test.ts` | Shared guarded mutation engine | `CHK-01` | `EVID-01` | `npm test` | `STEP-01` | `none` | Apply or restore cannot guarantee atomic recovery |
| `STEP-03` | agent | `REQ-02`, `REQ-05` | Add `toggle` and `restore` command flows and final verification | `src/commands/*`, `test/toggle.test.ts`, `test/restore.test.ts`, `README.md`, `package.json` | Shipped command surface and runtime contract | `CHK-01`, `CHK-02` | `EVID-01`, `EVID-02` | `npm test && npm run build` | `STEP-02`, `OQ-01` | `none` | Real-provider behavior is required before the shared engine is proven |

## Parallelizable Work

- `PAR-01` Shared mutation-state and mutation-output work can proceed in parallel once the mutation-plan vocabulary is fixed.
- `PAR-02` Toggle and restore command work should not be parallelized ahead of the shared engine because both commands depend on the same safety contract.

## Checkpoints

| Checkpoint ID | Refs | Condition | Evidence IDs |
| --- | --- | --- | --- |
| `CP-01` | `STEP-01`, `CHK-01` | The mutation vocabulary and provider planning hook are stable and testable | `EVID-01` |
| `CP-02` | `STEP-02`, `STEP-03`, `CHK-01`, `CHK-02` | Guarded apply and restore semantics are implemented and verified through the shared command surface | `EVID-01`, `EVID-02` |

## Execution Risks

| Risk ID | Risk | Impact | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| `ER-01` | Guarded apply fails after writes begin and leaves partial live state | Provider-managed configuration is corrupted | Require backups, reverse-order rollback, and explicit failed-apply audit entries | Mutation-engine tests expose partially written state |
| `ER-02` | Dry-run and no-op accidentally create provider-managed side effects | Users lose trust in the command surface | Keep dry-run/no-op paths read-only and prove them in command tests | Backup or audit state appears after dry-run/no-op |

## Stop Conditions / Fallback

| Stop ID | Related refs | Trigger | Immediate action | Safe fallback state |
| --- | --- | --- | --- | --- |
| `STOP-01` | `REQ-03`, `REQ-04`, `FM-01` | The shared engine cannot guarantee rollback or restore safety | Stop and keep the writable path blocked | Preserve discovery-only behavior from FT-001 |

## Ready For Acceptance

FT-002 is exhausted when the mutation vocabulary is provider-neutral, dry-run remains read-only, guarded apply and restore preserve backup, audit, lock, and rollback semantics, and `npm test` plus `npm run build` pass for `tools/agentscope`.
