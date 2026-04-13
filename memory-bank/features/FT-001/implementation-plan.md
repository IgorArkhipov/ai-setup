---
title: "FT-001: Implementation Plan"
doc_kind: feature
doc_function: derived
purpose: "Archived execution plan for FT-001. Records the grounded execution slices, verification strategy, and delivered checkpoints without redefining canonical feature facts."
derived_from:
  - feature.md
status: archived
audience: humans_and_agents
must_not_define:
  - ft_001_scope
  - ft_001_architecture
  - ft_001_acceptance_criteria
  - ft_001_blocker_state
---

# Implementation Plan

## Goal Of This Plan

Build the first read-only discovery foundation in `tools/agentscope` so later writable features can rely on one normalized provider inventory.

## Current State / Reference Points

| Path / module | Current role | Why relevant | Reuse / mirror |
| --- | --- | --- | --- |
| `feature.md` | Canonical FT-001 scope and verification contract | The plan must not redefine feature facts | All workstreams trace back to `REQ-*`, `SC-*`, and `CHK-*` here |
| `spec.md` | Archived pre-migration spec | Retains detailed requirement wording from the original execution period | Historical design detail only |
| `plan.md` | Archived pre-migration execution script | Preserves the original task-by-task implementation sequencing | Historical grounding only |
| `../../tools/agentscope/src/core/*` | Shared discovery and config core | The feature introduced these modules | Reuse shared normalization and config boundaries |
| `../../tools/agentscope/src/providers/*` | Provider-specific discovery surfaces | Discovery contracts are grounded here | Keep provider logic localized |

## Test Strategy

| Test surface | Canonical refs | Existing coverage | Planned automated coverage | Required local suites / commands | Required CI suites / jobs | Manual-only gap / justification | Manual-only approval ref |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Provider discovery and fixture validation | `REQ-01`, `REQ-03`, `REQ-04`, `SC-01`, `SC-02`, `CHK-01` | Bootstrap capability validation only | Add fixture-backed provider discovery, config, path, list, and doctor coverage | `npm test` | Repository CI test job | none | `none` |
| Package compile validity | `REQ-05`, `EC-02`, `CHK-02` | Existing package build | Keep build verification green after command and provider changes | `npm run build` | Repository CI build job | none | `none` |

## Open Questions / Ambiguities

| Open Question ID | Question | Why unresolved | Blocks | Default action / escalation owner |
| --- | --- | --- | --- | --- |
| `OQ-01` | Which provider file shapes are stable enough to lock as fixtures | The project started from a bootstrap capability matrix only | `STEP-01` | Ground the contract in committed sanitized fixtures before implementation proceeds |

## Environment Contract

| Area | Contract | Used by | Failure symptom |
| --- | --- | --- | --- |
| setup | Work from `tools/agentscope` with fixture-backed temp sandboxes only | `STEP-01`, `STEP-02`, `STEP-03` | Provider tests depend on real home-directory state |
| test | `npm test` and `npm run build` are the canonical local verification commands | `CHK-01`, `CHK-02` | Discovery behavior changes without automated proof |
| access / network / secrets | No live provider writes and no dependency on `.env` or real home-directory config | all steps | Verification ceases to be deterministic or safe |

## Preconditions

| Precondition ID | Canonical ref | Required state | Used by steps | Blocks start |
| --- | --- | --- | --- | --- |
| `PRE-01` | `ASM-01`, `CON-02` | Discovery remains read-only and fixture-backed | `STEP-01`, `STEP-02`, `STEP-03` | yes |

## Workstreams

| Workstream | Implements | Result | Owner | Dependencies |
| --- | --- | --- | --- | --- |
| `WS-01` | `REQ-01` | Committed provider capability baseline and fixture validators | agent | `PRE-01` |
| `WS-02` | `REQ-02`, `REQ-03` | Shared config, path, discovery, and output modules | agent | `WS-01` |
| `WS-03` | `REQ-04`, `REQ-05` | Grounded provider discovery and CLI command behavior | agent | `WS-01`, `WS-02` |

## Approval Gates

| Approval Gate ID | Trigger | Applies to | Why approval is required | Approver / evidence |
| --- | --- | --- | --- | --- |
| `AG-01` | none | none | FT-001 stayed within local, read-only, fixture-backed work | none |

## Work Sequence

| Step ID | Actor | Implements | Goal | Touchpoints | Artifact | Verifies | Evidence IDs | Check command / procedure | Blocked by | Needs approval | Escalate if |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `STEP-01` | agent | `REQ-01` | Replace the bootstrap fixture baseline with the committed provider discovery contract | `src/providers/registry.ts`, `test/fixtures/**`, `README.md` | Verified capability matrix and fixture validators | `CHK-01` | `EVID-01` | `npm test -- test/provider-capabilities.test.ts` | `PRE-01`, `OQ-01` | `none` | Provider fixture assumptions cannot be grounded safely |
| `STEP-02` | agent | `REQ-02`, `REQ-03` | Add shared config loading, path helpers, normalized discovery models, and deterministic output | `src/core/*`, `test/config.test.ts`, `test/paths.test.ts`, `test/discovery.test.ts` | Shared discovery core | `CHK-01` | `EVID-01` | `npm test` | `STEP-01` | `none` | Config precedence or item normalization conflicts with feature scope |
| `STEP-03` | agent | `REQ-04`, `REQ-05` | Ground provider discovery and ship `providers`, `doctor`, and `list` | `src/providers/*`, `src/commands/*`, `test/*`, `README.md` | Shipped discovery CLI behavior | `CHK-01`, `CHK-02` | `EVID-01`, `EVID-02` | `npm test && npm run build` | `STEP-02` | `none` | Discovery requires live mutation or undocumented provider roots |

## Parallelizable Work

- `PAR-01` Once the shared discovery models are stable, provider-specific discovery work for Claude, Codex, and Cursor can proceed as disjoint slices.
- `PAR-02` Fixture updates and README matrix updates should not be parallelized with registry-contract edits because they share the same source of truth.

## Checkpoints

| Checkpoint ID | Refs | Condition | Evidence IDs |
| --- | --- | --- | --- |
| `CP-01` | `STEP-01`, `CHK-01` | The committed fixture baseline and capability matrix match the shipped provider contract | `EVID-01` |
| `CP-02` | `STEP-02`, `STEP-03`, `CHK-01`, `CHK-02` | Shared discovery core and provider commands are implemented and verified locally | `EVID-01`, `EVID-02` |

## Execution Risks

| Risk ID | Risk | Impact | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| `ER-01` | Provider file-shape assumptions drift from committed fixtures | Doctor and discovery become misleading | Lock the fixture contract in tests and README together | Provider tests fail after fixture or parser edits |
| `ER-02` | Shared discovery abstractions overfit one provider | Later providers become inconsistent | Keep provider-specific parsing in `src/providers/*` and shared logic in `src/core/*` | New provider logic requires provider-specific branching in the core |

## Stop Conditions / Fallback

| Stop ID | Related refs | Trigger | Immediate action | Safe fallback state |
| --- | --- | --- | --- | --- |
| `STOP-01` | `REQ-04`, `CON-01` | Discovery requires undocumented provider roots or provider-managed writes | Stop and raise the scope issue upstream | Preserve the read-only grounded provider subset only |

## Ready For Acceptance

FT-001 is exhausted when the committed discovery contract is locked in fixtures, the shared config and discovery core is in place, provider discovery works for Claude Code, Codex, and Cursor, and `npm test` plus `npm run build` pass for `tools/agentscope`.
