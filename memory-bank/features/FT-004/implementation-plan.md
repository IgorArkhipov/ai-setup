---
title: "FT-004: Implementation Plan"
doc_kind: feature
doc_function: derived
purpose: "Archived execution plan for FT-004. Records the grounded Codex write-support steps, risks, and final verification without redefining canonical feature facts."
derived_from:
  - feature.md
status: archived
audience: humans_and_agents
must_not_define:
  - ft_004_scope
  - ft_004_architecture
  - ft_004_acceptance_criteria
  - ft_004_blocker_state
---

# Implementation Plan

## Goal Of This Plan

Make Codex the second verified writable provider in AgentScope by adding reversible skill and configured-MCP toggles, disabled-state rediscovery, and end-to-end restore coverage without weakening the shared guarded mutation contract.

## Current State / Reference Points

| Path / module | Current role | Why relevant | Reuse / mirror |
| --- | --- | --- | --- |
| `feature.md` | Canonical FT-004 scope and verification contract | The plan must not redefine Codex scope or acceptance | All execution traces back to `REQ-*`, `SC-*`, and `CHK-*` here |
| `../../tools/agentscope/src/providers/codex.ts` | Codex discovery-only provider | This is the main implementation target for disabled-state discovery and writable planning | Keep Codex-specific parsing and toggle planning localized here |
| `../../tools/agentscope/src/core/mutation-vault.ts` | Shared vault descriptor and metadata helper, currently Claude-only | Codex disabled-state discovery may need the same vault metadata pattern | Extend shared vault metadata only as far as FT-004 requires |
| `../../tools/agentscope/src/providers/claude.ts` | First verified writable provider | FT-004 should mirror its provider-local planning plus shared-engine reuse pattern | Reuse the `blockedDecision(...)` and `plannedDecision(...)` style instead of inventing a second provider workflow |
| `../../tools/agentscope/test/provider-discovery.test.ts` | Cross-provider discovery coverage | Codex disabled-state rediscovery belongs here | Extend the existing Codex cases rather than building a separate provider suite first |
| `../../tools/agentscope/test/toggle.test.ts` and `../../tools/agentscope/test/restore.test.ts` | Command-level mutation and restore coverage | Real Codex dry-run, apply, and restore flows must be added here | Mirror the existing Claude acceptance pattern |
| `../../tools/agentscope/test/support/claude-sandbox.ts` | Disposable runtime sandbox for a real writable provider | FT-004 needs the same style of helper for Codex | Mirror the helper shape so command tests stay consistent |
| `../../tools/agentscopev1/dist/providers/codex.js` | Prior alternative-MVP reference behavior | It shows the earlier verified Codex slice and ordering of skill plus MCP support | Reuse only grounded behavior, not old architecture wholesale |

## Test Strategy

| Test surface | Canonical refs | Existing coverage | Planned automated coverage | Required local suites / commands | Required CI suites / jobs | Manual-only gap / justification | Manual-only approval ref |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Codex discovery and disabled-state rediscovery | `REQ-01`, `REQ-02`, `SC-01`, `SC-04`, `CHK-01` | Codex live discovery and parser coverage only | Add disabled skill and disabled configured-MCP rediscovery plus conflict and malformed-vault warnings | `npm test` | Repository `agentscope` job | none | `none` |
| Codex dry-run, apply, and restore flows | `REQ-03`, `REQ-04`, `REQ-06`, `SC-02`, `SC-03`, `CHK-01` | Shared engine plus Claude real-provider coverage | Add real Codex sandbox coverage for skills and configured MCPs through `toggle` and `restore` | `npm test` | Repository `agentscope` job | none | `none` |
| Package compile and capability-matrix docs | `REQ-05`, `REQ-06`, `EC-01`, `EC-02`, `CHK-02` | Existing build and README matrix | Update README and keep build verification green after Codex support lands | `npm run build` | Repository `agentscope` job | none | `none` |

## Open Questions / Ambiguities

| Open Question ID | Question | Why unresolved | Blocks | Default action / escalation owner |
| --- | --- | --- | --- | --- |
| `OQ-01` | Should Codex configured-MCP disabled entries reuse the shared vault helper or stay provider-local | Current vault metadata is Claude-only, while the old alternative MVP used provider-local files | `STEP-01`, `STEP-02` | Extend the shared vault helper only if doing so keeps Codex-specific parsing local and does not distort existing Claude semantics |

## Environment Contract

| Area | Contract | Used by | Failure symptom |
| --- | --- | --- | --- |
| setup | Work from `tools/agentscope` with committed fixtures plus disposable Codex sandboxes only | `STEP-01`, `STEP-02`, `STEP-03` | Tests mutate real `~/.codex` state or rely on non-fixture inputs |
| test | `npm test` and `npm run build` are the canonical local verification commands | `CHK-01`, `CHK-02` | Codex writable behavior changes without deterministic proof |
| access / network / secrets | No live Codex state, network access, or `.env` data is required | all steps | The feature depends on machine-local state outside the sandbox roots |

## Preconditions

| Precondition ID | Canonical ref | Required state | Used by steps | Blocks start |
| --- | --- | --- | --- | --- |
| `PRE-01` | `ASM-01`, `CON-02`, `CON-03` | FT-001 through FT-003 remain the active owners of normalized discovery, guarded mutation, and the first writable-provider pattern | `STEP-01`, `STEP-02`, `STEP-03` | yes |

## Workstreams

| Workstream | Implements | Result | Owner | Dependencies |
| --- | --- | --- | --- | --- |
| `WS-01` | `REQ-01`, `REQ-02` | Codex disabled-state discovery and any required shared vault metadata support | agent | `PRE-01`, `OQ-01` |
| `WS-02` | `REQ-03`, `REQ-04`, `REQ-05` | Codex skill and configured-MCP toggle planning with explicit plugin blocking | agent | `WS-01` |
| `WS-03` | `REQ-06` | Real Codex sandbox coverage, command verification, and README capability-matrix updates | agent | `WS-02` |

## Approval Gates

| Approval Gate ID | Trigger | Applies to | Why approval is required | Approver / evidence |
| --- | --- | --- | --- | --- |
| `AG-01` | none | none | FT-004 stays inside repository code, fixtures, and disposable sandboxes | none |

## Work Sequence

| Step ID | Actor | Implements | Goal | Touchpoints | Artifact | Verifies | Evidence IDs | Check command / procedure | Blocked by | Needs approval | Escalate if |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `STEP-01` | agent | `REQ-01`, `REQ-02` | Add the minimum shared vault support and Codex disabled-state discovery needed for stable rediscovery | `src/core/mutation-vault.ts`, `src/providers/codex.ts`, `test/mutation-vault.test.ts`, `test/provider-discovery.test.ts` | Codex live plus disabled discovery contract | `CHK-01` | `EVID-01` | `npm test` | `PRE-01`, `OQ-01` | `none` | Shared vault metadata must change in a way that weakens Claude guarantees or generic mutation semantics |
| `STEP-02` | agent | `REQ-03`, `REQ-04`, `REQ-05` | Implement Codex skill and configured-MCP planning plus explicit plugin blocking | `src/providers/codex.ts`, `test/codex-config.test.ts`, `test/toggle.test.ts` | Real Codex dry-run planning contract | `CHK-01` | `EVID-01` | `npm test` | `STEP-01` | `none` | Codex writes require a provider-specific execution path outside the shared engine |
| `STEP-03` | agent | `REQ-06` | Add Codex sandboxed apply and restore coverage and update shipped docs | `test/codex-provider.test.ts`, `test/support/*`, `test/restore.test.ts`, `README.md` | Verified Codex writable slice and updated capability matrix | `CHK-01`, `CHK-02` | `EVID-01`, `EVID-02` | `npm test && npm run build` | `STEP-02` | `none` | The Codex sandbox cannot prove apply and restore safely with committed fixture shapes |

## Parallelizable Work

- `PAR-01` Codex parser tests and disabled-state discovery assertions can move alongside vault-helper updates once the manifest shape decision is fixed.
- `PAR-02` Codex command-level apply and restore tests should not start before Codex provider planning is stable because they share the same write contract.

## Checkpoints

| Checkpoint ID | Refs | Condition | Evidence IDs |
| --- | --- | --- | --- |
| `CP-01` | `STEP-01`, `CHK-01` | Codex live and disabled items rediscover through one stable item model without hiding conflicts | `EVID-01` |
| `CP-02` | `STEP-02`, `STEP-03`, `CHK-01`, `CHK-02` | Codex skill and configured-MCP dry-run, apply, rediscover, and restore behavior are fixture-backed and documented | `EVID-01`, `EVID-02` |

## Execution Risks

| Risk ID | Risk | Impact | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| `ER-01` | Codex `config.toml` section surgery rewrites unrelated content or loses the exact disabled section bytes | Re-enable and restore become unsafe | Preserve and restore the targeted section bytes verbatim and lock that behavior in parser plus restore tests | Codex configured-MCP tests show drift or content loss |
| `ER-02` | Disabled Codex items conflict with live copies and discovery guesses instead of surfacing explicit issues | Users lose trust in rediscovery and safe re-enable flows | Treat conflicting live plus vaulted state as warnings or blocked planning input, never as implicit preference | Discovery returns duplicate or misleading enabled state |

## Stop Conditions / Fallback

| Stop ID | Related refs | Trigger | Immediate action | Safe fallback state |
| --- | --- | --- | --- | --- |
| `STOP-01` | `REQ-03`, `REQ-04`, `CON-02` | Codex requires a new execution path outside the shared mutation engine to be safe | Stop and preserve Codex as discovery-only | Keep the pre-FT-004 Codex read-only behavior intact |

## Ready For Acceptance

FT-004 is complete. Codex skills and configured MCPs are discoverable across live and disabled states, supported Codex toggles route through the shared guarded mutation workflow, unsupported plugins stay explicit, and the final local verification on 2026-04-13 passed:

- `npm run lint`
- `npm test`
- `npm run coverage`
- `npm run build`
