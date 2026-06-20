---
title: "FT-016: Implementation Plan"
doc_kind: feature
doc_function: derived
purpose: "Execution plan for resolving FT-016 review findings without redefining canonical feature scope."
derived_from:
  - feature.md
status: archived
audience: humans_and_agents
must_not_define:
  - ft_016_scope
  - ft_016_architecture
  - ft_016_acceptance_criteria
  - ft_016_blocker_state
---

# Zed Provider Review Follow-Up Implementation Plan

> **For agentic workers:** Execute this plan task-by-task. Keep each edit traceable to the review findings recorded in `protocol.md`.

## Goal Of This Plan

Resolve the closing review findings from FT-015 by hardening Zed skill discovery and JSONC configured MCP mutation behavior, then verify the result locally and through CI.

## Current State / Reference Points

| Path / module | Current role | Why relevant | Reuse / mirror |
| --- | --- | --- | --- |
| `tools/agentscope/src/providers/zed.ts` | Zed discovery and toggle planning | Contains recursive skill discovery and JSONC planning block | Keep provider ids and vault descriptors stable |
| `tools/agentscope/src/core/mutation-io.ts` | Applies JSON object-entry mutation operations | Currently parses strict JSON before deterministic writes | Reuse existing backup, atomic write, and drift-check flow |
| `tools/agentscope/test/provider-discovery.test.ts` | Provider inventory regression tests | Needs nested and symlinked Zed skill coverage | Mirror existing Zed discovery test style |
| `tools/agentscope/test/toggle.test.ts` | Mutation behavior regression tests | Has the JSONC-blocked test that should become JSONC apply/restore coverage | Mirror existing Zed configured MCP toggle test |
| `memory-bank/features/FT-015/feature.md` | Upstream Zed feature contract | Defines direct-child skill and read-write configured MCP scope | Do not reopen FT-015; record follow-up here |

## Test Strategy

| Test surface | Canonical refs | Existing coverage | Planned automated coverage | Required local suites / commands | Required CI suites / jobs | Manual-only gap / justification | Manual-only approval ref |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Zed skill discovery | `REQ-01`, `REQ-02`, `REQ-03`, `SC-01`, `SC-02` | direct real directories only | nested omitted and direct symlink discovered | `npx vitest run test/provider-discovery.test.ts` | AgentScope CI job | none | none |
| Zed configured MCP JSONC toggles | `REQ-04`, `REQ-05`, `SC-03`, `SC-04` | strict JSON apply/restore plus JSONC blocked | JSONC apply/restore succeeds and unsafe shapes still block | `npx vitest run test/toggle.test.ts` | AgentScope CI job | comment preservation is non-scope | none |
| Full package health | `REQ-06` | existing package scripts | full build, test, coverage, lint, diff check | `npm run build`; `npm test`; `npm run coverage`; `npm run lint`; `git diff --check` | GitHub Actions CI | none | none |

## Open Questions / Ambiguities

| Open Question ID | Question | Why unresolved | Blocks | Default action / escalation owner |
| --- | --- | --- | --- | --- |
| `OQ-01` | Should JSONC comment preservation be attempted? | Current mutation engine uses deterministic JSON rewrites for safety and traceability | none | Non-scope for FT-016; preserve via backup only |
| `OQ-02` | Should invalid Zed skill frontmatter names be filtered? | Review marked it residual risk and FT-015 did not require it | none | Leave out of scope unless future product requirement promotes it |
| `OQ-03` | Should untrusted project-local Zed skills be marked inactive? | Trust state is app/runtime-specific and not represented in current AgentScope inputs | none | Leave out of scope and keep as residual risk |

## Environment Contract

| Area | Contract | Used by | Failure symptom |
| --- | --- | --- | --- |
| setup | Run commands from `tools/agentscope` with existing Node/npm workspace | `STEP-02` through `STEP-05` | package commands cannot resolve dependencies |
| test | Vitest fixtures and temporary sandboxes only | all checks | real user provider state would be required |
| access / network / secrets | No `.env*` reads and no real Zed config mutation | all steps | stop if implementation needs secrets or live provider state |

## Preconditions

| Precondition ID | Canonical ref | Required state | Used by steps | Blocks start |
| --- | --- | --- | --- | --- |
| `PRE-01` | `EVID-01` | Three requested review passes have returned findings | `STEP-01` | yes |
| `PRE-02` | `FT-015` | Zed provider support exists on `main` | all steps | yes |
| `PRE-03` | user approval | User approved continuing milestones | commit / push if needed | no |

## Workstreams

| Workstream | Implements | Result | Owner | Dependencies |
| --- | --- | --- | --- | --- |
| `WS-1` | `REQ-01`, `REQ-02`, `REQ-03` | Direct-child and symlink-aware Zed skill discovery | agent | `PRE-01`, `PRE-02` |
| `WS-2` | `REQ-04`, `REQ-05` | JSONC-capable configured MCP mutation path | agent | `PRE-01`, `PRE-02` |
| `WS-3` | `REQ-06` | Protocol, evidence, verification, and commit record | agent | `WS-1`, `WS-2` |

## Approval Gates

| Approval Gate ID | Trigger | Applies to | Why approval is required | Approver / evidence |
| --- | --- | --- | --- | --- |
| `AG-01` | Pushing the follow-up commit | `STEP-06` | Remote mutation and CI follow-up | Igor Arkhipov standing approval in thread |

## Work Sequence

| Step ID | Actor | Implements | Goal | Touchpoints | Artifact | Verifies | Evidence IDs | Check command / procedure | Blocked by | Needs approval | Escalate if |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `STEP-01` | agent | `REQ-06` | Create review follow-up protocol, feature, and plan | `memory-bank/features/FT-016`, `memory-bank/features/README.md` | governed docs | docs self-check | `EVID-01` | inspect created docs | `PRE-01` | none | docs conflict with upstream |
| `STEP-02` | agent | `REQ-01`, `REQ-02`, `REQ-03` | Add failing discovery coverage | `test/provider-discovery.test.ts` | red tests | `SC-01`, `SC-02` | `EVID-02` | `npx vitest run test/provider-discovery.test.ts` | `STEP-01` | none | tests cannot express behavior without live Zed |
| `STEP-03` | agent | `REQ-04`, `REQ-05` | Add failing JSONC toggle coverage | `test/toggle.test.ts` | red tests | `SC-03`, `SC-04` | `EVID-03` | `npx vitest run test/toggle.test.ts` | `STEP-01` | none | core mutation contract forbids JSONC parsing |
| `STEP-04` | agent | `REQ-01`, `REQ-02`, `REQ-03` | Implement direct-child and symlink-aware skill discovery | `src/providers/zed.ts` | code diff | `SC-01`, `SC-02` | `EVID-02` | `npx vitest run test/provider-discovery.test.ts` | `STEP-02` | none | symlink handling is unsafe or platform-blocked |
| `STEP-05` | agent | `REQ-04`, `REQ-05` | Implement JSONC-capable mutation application and planning | `src/providers/zed.ts`, `src/core/mutation-io.ts` | code diff | `SC-03`, `SC-04` | `EVID-03` | `npx vitest run test/toggle.test.ts` | `STEP-03` | none | writes cannot stay backup-protected |
| `STEP-06` | agent | `REQ-06` | Run focused and full verification, update evidence, commit, push, and watch CI if local gates pass | package scripts, git, GitHub Actions | verification output and commit | all checks | `EVID-04`, `EVID-05` | `CHK-03`, `CHK-04`, `CHK-05` | `STEP-04`, `STEP-05` | `AG-01` | any gate fails |

## Parallelizable Work

- `PAR-01` `STEP-02` and `STEP-03` can be drafted independently, but implementation touches shared provider behavior and should be integrated in one local sequence.
- `PAR-02` `STEP-04` and `STEP-05` both affect Zed behavior and should not be assigned to separate writers in the same checkout.

## Checkpoints

| Checkpoint ID | Refs | Condition | Evidence IDs |
| --- | --- | --- | --- |
| `CP-01` | `STEP-02`, `STEP-03` | Regression tests fail for the reviewed behaviors before production code changes | `EVID-02`, `EVID-03` |
| `CP-02` | `STEP-04`, `STEP-05` | Focused tests pass after implementation | `EVID-02`, `EVID-03` |
| `CP-03` | `STEP-06` | Full local and CI gates pass | `EVID-04`, `EVID-05` |

## Execution Risks

| Risk ID | Risk | Impact | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| `ER-01` | JSONC writes remove comments | User-visible formatting change | Make comment preservation explicit non-scope and keep backup/restore evidence | JSONC apply test normalizes file |
| `ER-02` | Symlink support follows unsafe nested paths | Incorrect inventory or filesystem traversal | Inspect only direct children and never recurse through symlink targets | discovery implementation starts walking symlink target |
| `ER-03` | Core mutation JSONC parser changes behavior for non-Zed providers | Regression in existing mutation flows | Run full toggle tests and full package suite | existing JSON tests fail |

## Stop Conditions / Fallback

| Stop ID | Related refs | Trigger | Immediate action | Safe fallback state |
| --- | --- | --- | --- | --- |
| `STOP-01` | `NS-05` | Any step needs `.env*` | stop and report | no secret files read |
| `STOP-02` | `CON-02`, `REQ-05` | JSONC mutation cannot preserve backup, fingerprint, or fail-closed semantics | stop and downgrade design to read-only only after updating `feature.md` | no code write |
| `STOP-03` | `CON-04` | Symlink support requires recursive traversal | stop and keep symlink support out of scope | direct directories still supported |

## Ready For Acceptance

The plan is exhausted when `CHK-01` through `CHK-05` pass or their concrete failure is recorded, `protocol.md` contains the review and verification evidence, and the feature documents are marked done or updated with a clear stop reason.

## Execution Evidence

| Check ID | Result |
| --- | --- |
| `CHK-01` | pass: `test/provider-discovery.test.ts` 31 tests |
| `CHK-02` | pass: `test/toggle.test.ts` 17 tests |
| `CHK-03` | pass: focused provider/toggle slice 3 files / 71 tests |
| `CHK-04` | pass: build; full tests 25 files / 240 tests; coverage 82.74% statements, 72.95% branches, 93.38% functions, 82.64% lines; lint with Biome schema info only; `git diff --check` |
| `CHK-05` | pass: GitHub Actions run `27882029094` on `ad7485d276210bcdeba63d3a3574a9842f5103b6` |
