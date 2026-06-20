---
title: "FT-012: Implementation Plan"
doc_kind: feature
doc_function: derived
purpose: "Execution plan for FT-012. Records grounded dashboard parity steps, risks, and verification without redefining canonical feature scope."
derived_from:
  - feature.md
status: archived
audience: humans_and_agents
must_not_define:
  - ft_012_scope
  - ft_012_architecture
  - ft_012_acceptance_criteria
  - ft_012_blocker_state
---

# Terminal Dashboard And CLI Filter Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

## Goal Of This Plan

Implement the FT-012 slice: add `agentscope dashboard`, dashboard state/render/plan/apply behavior, post-apply snapshot refresh, and `list --kind` / `list --category` filters.

## Current State / Reference Points

| Path / module | Current role | Why relevant | Reuse / mirror |
| --- | --- | --- | --- |
| `tmp/Agentscope Implementation Plan.md` | Original plan and gap ledger | Names dashboard, filters, staged apply, and post-apply snapshot behavior | Use only as source scope; current worktree remains authoritative |
| `tools/agentscope/src/cli.ts` | Registers current CLI commands | Must add `dashboard` and list filter flags | Mirror existing command routing pattern |
| `tools/agentscope/src/commands/list.ts` | Discovery list command with provider/layer filters | Must add kind/category filtering and validation | Keep existing warnings behavior |
| `tools/agentscope/src/commands/toggle.ts` | Single-item dry-run/apply command | Dashboard apply must reuse the same planning and mutation engine concepts | Reuse provider `planToggle` and `executeTogglePlan` |
| `tools/agentscope/src/mcp/helpers.ts` | Bulk/single planning helper patterns | Useful for selector, blocked, and fingerprint concepts | Reuse behavior where it fits, no copy-pasted provider writes |
| `tools/agentscope/src/core/snapshots.ts` | Snapshot writer | Dashboard successful apply must refresh snapshots here | Use `writeDiscoverySnapshot` |
| `tools/agentscope/src/core/output.ts` | Human/JSON rendering style | Dashboard output should stay deterministic and terse | Mirror line-oriented output |
| `tools/agentscope/test/list.test.ts` and `test/cli.test.ts` | Current command tests | Must add filter and dashboard route coverage | Extend existing fixtures |
| `tools/agentscope/test/support/mutation-sandbox.ts` | Safe temp roots | Use for dashboard apply tests | No real provider roots |

## Test Strategy

| Test surface | Canonical refs | Existing coverage | Planned automated coverage | Required local suites / commands | Required CI suites / jobs | Manual-only gap / justification | Manual-only approval ref |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Dashboard state | `REQ-02`, `SC-02` | none | reducer/filter/stage/selection tests | `npx vitest run test/dashboard-state.test.ts` | AgentScope CI job | none | `none` |
| Dashboard render | `REQ-01`, `REQ-03`, `SC-01`, `SC-05` | none | command output tests for summary, list, details, preview, blocked state | `npx vitest run test/dashboard.test.ts` | AgentScope CI job | none | `none` |
| Dashboard apply | `REQ-04`, `SC-03`, `SC-04`, `NEG-02`, `NEG-04` | toggle and snapshot tested separately | staged dry-run no-write and confirmed apply with snapshot refresh | `npx vitest run test/dashboard.test.ts test/toggle.test.ts test/snapshot.test.ts` | AgentScope CI job | none | `none` |
| List filters | `REQ-05`, `NEG-01` | provider/layer only | kind/category valid and invalid filters in human/JSON output | `npx vitest run test/list.test.ts test/cli.test.ts` | AgentScope CI job | none | `none` |
| Docs/health | `REQ-06`, `EC-05`, `EC-06` | README and canonical command-surface docs lack dashboard command | README, PRD-003, `memory-bank/domain/frontend.md`, feature docs, full local suite and CI | `npm run build`, `npm test`, `npm run coverage`, `npm run lint`, `git diff --check` | full CI workflow | none | `AG-001` |

## Open Questions / Ambiguities

| Open Question ID | Question | Why unresolved | Blocks | Default action / escalation owner |
| --- | --- | --- | --- | --- |
| `OQ-01` | Should FT-012 introduce React/Ink? | Current codebase intentionally shipped CLI/MCP without UI dependencies | no | Start with deterministic terminal dashboard. Escalate only if acceptance cannot be met. |
| `OQ-02` | Should dashboard apply support arbitrary bulk selectors in this slice? | MCP already owns bulk fingerprint plans; dashboard state can stage multiple exact items | no | Support repeated exact staged items; defer broad selector bulk UX unless a later feature asks for it. |

## Environment Contract

| Area | Contract | Used by | Failure symptom |
| --- | --- | --- | --- |
| setup | Work from repo root and `tools/agentscope`; use Node 25.9+ package scripts | all steps | build or tests fail before feature changes |
| search | Do not use `.env*`; use fff for indexed grep/search | all steps | sensitive or forbidden file access |
| tests | Use committed fixtures and temp sandboxes only | dashboard apply tests | real provider file path appears in diff or test writes |
| git | Main branch is allowed; one commit per feature slice; push after green local checks | final step | unrelated files staged or CI unobserved |

## Approval Gates

| Gate ID | Maps to protocol gate | Required before | Approval source | Evidence required before use |
| --- | --- | --- | --- | --- |
| `AG-001` | `H2` | committing, pushing, and treating CI as acceptance evidence | user standing approval for feature-slice commit/push after local verification | targeted tests, build, full tests, coverage, lint, diff check, and resolved review findings |

## Preconditions

| Precondition ID | Canonical ref | Required state | Used by steps | Blocks start |
| --- | --- | --- | --- | --- |
| `PRE-01` | `CON-01`, `NS-05` | No `.env*` files are read or used | all steps | yes |
| `PRE-02` | `ASM-01`, `DEC-01` | Dashboard is implemented as a thin terminal surface first | `STEP-01` through `STEP-08` | no |
| `PRE-03` | `CON-01`, `CON-02` | Existing mutation and snapshot helpers stay authoritative | `STEP-05`, `STEP-06` | yes |

## Workstreams

| Workstream | Implements | Result | Owner | Dependencies |
| --- | --- | --- | --- | --- |
| `WS-01` | `REQ-05` | List kind/category filters | agent | none |
| `WS-02` | `REQ-01`, `REQ-02`, `REQ-03` | Dashboard state and deterministic render | agent | none |
| `WS-03` | `REQ-04` | Dashboard staged apply and snapshot refresh | agent | `WS-02` |
| `WS-04` | `REQ-06` | README and governed docs closed | agent | `WS-01` through `WS-03` |
| `WS-05` | all | Review, verification, commit, push, CI | agent + subagent | `WS-04` |

## Work Sequence

| Step ID | Actor | Implements | Goal | Touchpoints | Artifact | Verifies | Evidence IDs | Check command / procedure | Blocked by | Needs approval | Escalate if |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `STEP-01` | explorer subagent | all | Audit remaining plan gaps and confirm FT-012 scope | plan, code, docs | gap report | `CHK-04` | `EVID-04` | subagent result | none | none | report identifies a higher-priority blocker |
| `STEP-02` | agent | `REQ-05` | Add RED tests for list kind/category filters and invalid values | `test/list.test.ts`, `test/cli.test.ts` | failing tests | `CHK-03` | `EVID-03` | targeted tests | `PRE-01` | none | filters need new taxonomy |
| `STEP-03` | agent | `REQ-05` | Implement list filter validation and CLI flags | `src/commands/list.ts`, `src/cli.ts` | filter support | `CHK-03` | `EVID-03` | targeted tests | `STEP-02` | none | warnings behavior changes unexpectedly |
| `STEP-04` | agent | `REQ-01`, `REQ-02`, `REQ-03` | Add dashboard state/render RED tests | `test/dashboard-state.test.ts`, `test/dashboard.test.ts` | failing tests | `CHK-01` | `EVID-01` | targeted tests | `PRE-01` | none | state requires a new persistence model |
| `STEP-05` | agent | `REQ-01`, `REQ-02`, `REQ-03` | Implement dashboard state, rendering, and command registration | `src/commands/dashboard.ts`, `src/ui/*`, `src/cli.ts` | dashboard command | `CHK-01` | `EVID-01` | targeted tests | `STEP-04` | none | command bypasses discovery |
| `STEP-06` | agent | `REQ-04` | Add RED tests for dashboard staged no-write, confirmed apply, blocked apply, and snapshot refresh | `test/dashboard.test.ts` | failing tests | `CHK-02` | `EVID-02` | targeted tests | `STEP-05`, `PRE-03` | none | write path needs new mutation semantics |
| `STEP-07` | agent | `REQ-04` | Implement dashboard staged apply and snapshot refresh through existing helpers | `src/commands/dashboard.ts`, `src/ui/state.ts` | safe apply path | `CHK-02` | `EVID-02` | targeted tests | `STEP-06` | none | snapshot refresh writes stale discovery |
| `STEP-08` | agent | `REQ-06` | Update README and close governed docs | `README.md`, `memory-bank/domain/frontend.md`, `FT-012/*`, `PRD-003`, indexes | docs | `CHK-04` | `EVID-04` | lint/diff review | `STEP-07` | none | docs overclaim interaction support |
| `STEP-09` | reviewer subagent | all | Review diff for spec compliance and code quality | current diff | review report | `CHK-04` | `EVID-04` | subagent review | `STEP-08` | none | unresolved findings remain |
| `STEP-10` | agent | all | Run full local verification | package and repo root | terminal evidence | `CHK-04` | `EVID-04` | build/test/coverage/lint/diff | `STEP-09` | none | any check fails |
| `STEP-11` | agent | all | Commit, push, watch CI, and archive feature docs if green | git, CI | commit and CI URL | `CHK-05` | `EVID-05` | push and `gh run watch` | `STEP-10` | `AG-001` | CI fails |

## Parallelizable Work

- `PAR-01` Explorer audit can run while main agent creates docs and starts TDD.
- `PAR-02` Spec/code review subagents run after implementation and before final verification.
- `PAR-03` Do not parallelize code edits across dashboard and list filters unless write scopes are split explicitly.

## Checkpoints

| Checkpoint ID | Refs | Condition | Evidence IDs |
| --- | --- | --- | --- |
| `CP-01` | `STEP-03` | List filters are implemented and targeted tests pass | `EVID-03` |
| `CP-02` | `STEP-05` | Dashboard command renders deterministic non-mutating output | `EVID-01` |
| `CP-03` | `STEP-07` | Dashboard confirmed apply writes through mutation engine and refreshes snapshot | `EVID-02` |
| `CP-04` | `STEP-11` | CI is green after push | `EVID-05` |

## Execution Risks

| Risk ID | Risk | Impact | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| `ER-01` | Dashboard grows into a full interactive framework rewrite | Scope and dependency churn | Keep deterministic terminal surface; defer React/Ink unless required | new dependency needed only for rendering |
| `ER-02` | Dashboard apply duplicates toggle logic | Safety regression | Centralize planning/execution helpers; tests inspect backup/snapshot behavior | provider files written without backup |
| `ER-03` | Coverage drops below CI threshold | CI failure | Run local coverage before commit and add focused tests | branch coverage near threshold |

## Stop Conditions / Fallback

| Stop ID | Related refs | Trigger | Immediate action | Safe fallback state |
| --- | --- | --- | --- | --- |
| `STOP-01` | `PRE-01` | `.env*` access required | Stop and report | no source changes committed |
| `STOP-02` | `CON-01` | Dashboard needs direct provider writes | Stop and redesign upstream | docs and tests only |
| `STOP-03` | `CHK-04` | Full local verification cannot pass | Fix or report exact failing check | uncommitted working tree |

## Ready For Acceptance

- All FT-012 local `CHK-*` entries pass.
- `feature.md` is set to `delivery_status: done`.
- `implementation-plan.md` is set to `status: archived`.
- `protocol.md` records review and verification evidence.
- CI must be monitored after push; if it fails, reopen the feature and address the failing check before continuing to the next slice.

## Checks And Evidence

| Check ID | Command / procedure | Result |
| --- | --- | --- |
| `CHK-01` | `cd tools/agentscope && npx vitest run test/dashboard-state.test.ts test/dashboard.test.ts` | covered by focused FT-012 run, passed |
| `CHK-02` | `cd tools/agentscope && npx vitest run test/dashboard.test.ts test/toggle.test.ts test/snapshot.test.ts` | passed, 3 files / 26 tests |
| `CHK-03` | `cd tools/agentscope && npx vitest run test/list.test.ts test/cli.test.ts` | covered by focused FT-012 run, passed |
| `CHK-04a` | `cd tools/agentscope && npx vitest run test/dashboard-state.test.ts test/dashboard.test.ts test/list.test.ts test/cli.test.ts` | passed, 4 files / 37 tests |
| `CHK-04b` | `cd tools/agentscope && npm run build` | passed |
| `CHK-04c` | `cd tools/agentscope && npm test` | passed, 25 files / 224 tests |
| `CHK-04d` | `cd tools/agentscope && npm run coverage` | passed, statements 83.97%, branches 73.36%, functions 94.17%, lines 83.98% |
| `CHK-04e` | `cd tools/agentscope && npm run lint` | passed with existing Biome schema-version info |
| `CHK-04f` | `git diff --check` | passed |
| `CHK-04g` | subagent standards and TypeScript code-quality reviews | findings resolved |
