---
title: "FT-003: Implementation Plan"
doc_kind: feature
doc_function: derived
purpose: "Archived execution plan for FT-003. Records the grounded execution slices, test strategy, and verification checkpoints for the first writable Claude integration."
derived_from:
  - feature.md
status: archived
audience: humans_and_agents
must_not_define:
  - ft_003_scope
  - ft_003_architecture
  - ft_003_acceptance_criteria
  - ft_003_blocker_state
---

# Implementation Plan

## Goal Of This Plan

Validate Claude as the first real writable provider in AgentScope by grounding discovery, vault-backed skill toggles, settings-backed MCP and tool toggles, and end-to-end restore behavior.

## Current State / Reference Points

| Path / module | Current role | Why relevant | Reuse / mirror |
| --- | --- | --- | --- |
| `feature.md` | Canonical FT-003 scope and verification contract | The plan must not redefine Claude scope or acceptance | All steps trace to `REQ-*`, `SC-*`, and `CHK-*` here |
| `spec.md` | Archived pre-migration spec | Preserves detailed Claude requirement wording from the original execution period | Historical design detail only |
| `plan.md` | Archived pre-migration execution script | Preserves the original task-by-task implementation script | Historical grounding only |
| `../../tools/agentscope/src/providers/claude.ts` | Claude discovery and planning module | Claude-specific logic is intentionally localized here | Keep provider-specific parsing and planning grounded in one module |
| `../../tools/agentscope/src/core/mutation-engine.ts` | Shared guarded mutation engine from FT-002 | Claude execution must reuse the generic engine | Do not add Claude-specific execution branches in the core |

## Test Strategy

| Test surface | Canonical refs | Existing coverage | Planned automated coverage | Required local suites / commands | Required CI suites / jobs | Manual-only gap / justification | Manual-only approval ref |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Claude discovery and CLI filtering | `REQ-01`, `REQ-05`, `SC-01`, `SC-04`, `CHK-01` | Discovery-only Claude baseline and list coverage from FT-001 | Extend provider-discovery, list, and CLI tests for provider/layer filtering and validation | `npm test` | Repository CI test job | none | `none` |
| Claude vault-backed and settings-backed toggles | `REQ-02`, `REQ-03`, `REQ-04`, `SC-02`, `SC-03`, `CHK-01` | Shared mutation engine from FT-002 plus fake writable provider tests | Add real Claude sandboxed toggle and restore coverage for skills, configured MCPs, and tools | `npm test` | Repository CI test job | none | `none` |
| Package compile validity | `REQ-04`, `EC-01`, `CHK-02` | Existing package build | Keep build verification green after Claude integration lands | `npm run build` | Repository CI build job | none | `none` |

## Open Questions / Ambiguities

| Open Question ID | Question | Why unresolved | Blocks | Default action / escalation owner |
| --- | --- | --- | --- | --- |
| `OQ-01` | How should disabled project skills remain discoverable after their live directories move into a vault | FT-002 introduced generic guarded mutation only, not provider-level vault semantics | `STEP-02` | Add one provider-neutral vault metadata layer and keep disabled-skill discovery deterministic |

## Environment Contract

| Area | Contract | Used by | Failure symptom |
| --- | --- | --- | --- |
| setup | Work from `tools/agentscope` with temp Claude home and project sandboxes derived from committed fixtures | `STEP-01`, `STEP-02`, `STEP-03` | Tests mutate committed fixtures or real Claude state |
| test | `npm test` and `npm run build` are the canonical local verification commands | `CHK-01`, `CHK-02` | Claude behavior changes without deterministic proof |
| access / network / secrets | No real home-directory Claude config is read or written in automated tests | all steps | The feature depends on external machine state rather than committed fixtures |

## Preconditions

| Precondition ID | Canonical ref | Required state | Used by steps | Blocks start |
| --- | --- | --- | --- | --- |
| `PRE-01` | `ASM-01`, `CON-01`, `CON-02` | FT-001 discovery and FT-002 guarded mutation semantics are already in place | `STEP-01`, `STEP-02`, `STEP-03` | yes |

## Workstreams

| Workstream | Implements | Result | Owner | Dependencies |
| --- | --- | --- | --- | --- |
| `WS-01` | `REQ-01`, `REQ-05` | Normalized Claude discovery and filterable CLI behavior | agent | `PRE-01` |
| `WS-02` | `REQ-02` | Provider-neutral vault metadata and reversible Claude skill toggles | agent | `WS-01`, `OQ-01` |
| `WS-03` | `REQ-03`, `REQ-04` | Claude settings-backed MCP and tool toggles with end-to-end verification | agent | `WS-01`, `WS-02` |

## Approval Gates

| Approval Gate ID | Trigger | Applies to | Why approval is required | Approver / evidence |
| --- | --- | --- | --- | --- |
| `AG-01` | none | none | FT-003 stayed within fixture-backed local sandboxes and repository code | none |

## Work Sequence

| Step ID | Actor | Implements | Goal | Touchpoints | Artifact | Verifies | Evidence IDs | Check command / procedure | Blocked by | Needs approval | Escalate if |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `STEP-01` | agent | `REQ-01`, `REQ-05` | Normalize Claude discovery and add explicit provider/layer filtering behavior | `src/providers/claude.ts`, `src/commands/list.ts`, `src/cli.ts`, `test/provider-discovery.test.ts`, `test/list.test.ts` | Shipped Claude discovery contract | `CHK-01` | `EVID-01` | `npm test` | `PRE-01` | `none` | Discovery cannot preserve stable IDs or explicit validation |
| `STEP-02` | agent | `REQ-02` | Add vault metadata and reversible project-skill toggle planning | `src/core/mutation-vault.ts`, `src/providers/claude.ts`, `test/mutation-vault.test.ts`, `test/support/claude-sandbox.ts` | Reversible disabled-skill flow | `CHK-01` | `EVID-01` | `npm test` | `STEP-01`, `OQ-01` | `none` | Disabled skills cannot remain discoverable by stable ID |
| `STEP-03` | agent | `REQ-03`, `REQ-04`, `REQ-05` | Add settings-backed MCP and tool toggles and run end-to-end verification | `src/providers/claude.ts`, `test/toggle.test.ts`, `test/restore.test.ts`, `README.md` | First real writable provider integration | `CHK-01`, `CHK-02` | `EVID-01`, `EVID-02` | `npm test && npm run build` | `STEP-02` | `none` | The generic mutation engine needs Claude-specific execution logic to succeed |

## Parallelizable Work

- `PAR-01` CLI filter validation and Claude fixture hardening can proceed alongside discovery-shape updates once the normalized Claude item model is fixed.
- `PAR-02` Skill vault work and settings-backed toggle work should not overlap on `src/providers/claude.ts` until the normalized discovery contract is stable.

## Checkpoints

| Checkpoint ID | Refs | Condition | Evidence IDs |
| --- | --- | --- | --- |
| `CP-01` | `STEP-01`, `CHK-01` | Claude discovery is normalized across supported layers and invalid layer input is rejected explicitly | `EVID-01` |
| `CP-02` | `STEP-02`, `STEP-03`, `CHK-01`, `CHK-02` | Claude skill, configured MCP, and tool flows are verified end to end through the shared engine | `EVID-01`, `EVID-02` |

## Execution Risks

| Risk ID | Risk | Impact | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| `ER-01` | Disabled skills are lost because vault metadata is incomplete or malformed | Re-enable and restore become unreliable | Persist deterministic vault metadata and ignore malformed entries safely during discovery | Discovery cannot reconstruct disabled-skill state after restart |
| `ER-02` | Claude settings-backed toggles drift across global and project layers | The wrong live configuration is mutated | Keep layer-specific planning explicit and verify both global and project tool flows in tests | A plan targets a settings file outside the selected layer |

## Stop Conditions / Fallback

| Stop ID | Related refs | Trigger | Immediate action | Safe fallback state |
| --- | --- | --- | --- | --- |
| `STOP-01` | `REQ-02`, `REQ-03`, `FM-01`, `FM-02` | Claude requires a provider-specific mutation path outside the shared engine contract | Stop and preserve Claude as read-only | Keep the FT-001 discovery surface and FT-002 shared engine without real Claude apply support |

## Ready For Acceptance

FT-003 is exhausted when Claude discovery is normalized and filterable, project skills remain discoverable through the vault flow, configured MCPs and tools toggle through the shared engine with correct layer handling, and `npm test` plus `npm run build` pass for `tools/agentscope`.
