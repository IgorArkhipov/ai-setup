---
title: "FT-005: Implementation Plan"
doc_kind: feature
doc_function: derived
purpose: "Execution plan for FT-005. Records the grounded Cursor write-support steps, risks, and verification strategy without redefining canonical feature facts."
derived_from:
  - feature.md
status: archived
audience: humans_and_agents
must_not_define:
  - ft_005_scope
  - ft_005_architecture
  - ft_005_acceptance_criteria
  - ft_005_blocker_state
---

# Implementation Plan

## Goal Of This Plan

Make Cursor the third verified writable provider in AgentScope by adding reversible global skill and configured-MCP toggles, workspace disabled-server reconciliation, disabled-state rediscovery, and end-to-end restore coverage without weakening the shared guarded mutation contract.

## Current State / Reference Points

| Path / module | Current role | Why relevant | Reuse / mirror |
| --- | --- | --- | --- |
| `feature.md` | Canonical FT-005 scope and verification contract | The plan must not redefine Cursor scope or acceptance | All execution traces back to `REQ-*`, `NEG-*`, `SC-*`, and `CHK-*` here |
| `../../tools/agentscope/src/providers/cursor.ts` | Cursor discovery-only provider | This is the main implementation target for Cursor parsing, disabled-state discovery, workspace reconciliation, and writable planning | Keep Cursor-specific parsing and toggle planning localized here |
| `../../tools/agentscope/src/core/mutation-vault.ts` | Shared vault descriptor and metadata helper, currently limited to Claude and Codex | Cursor disabled skills and disabled configured MCPs need the same persisted metadata contract | Extend the shared helper only as far as FT-005 requires |
| `../../tools/agentscope/src/core/mutation-io.ts` and `../../tools/agentscope/src/core/mutation-models.ts` | Shared file and SQLite mutation primitives | Cursor configured-MCP reconciliation depends on safe writes to both `mcp.json` and the workspace `ItemTable` key when present | Reuse the existing `replaceSqliteItemTableValue` mutation path instead of inventing Cursor-specific execution |
| `../../tools/agentscope/src/providers/codex.ts` | Most recent verified writable provider slice | FT-005 should mirror its provider-local planning plus shared-engine reuse pattern | Reuse `blockedDecision(...)`, `plannedDecision(...)`, and vault-entry patterns instead of creating a second execution flow |
| `../../tools/agentscope/test/provider-discovery.test.ts` | Cross-provider discovery coverage | Cursor disabled skills, disabled MCP rediscovery, trailing-comma parsing, and malformed workspace-state warnings belong here | Extend the existing Cursor cases rather than creating a separate provider-only suite first |
| `../../tools/agentscope/test/toggle.test.ts` and `../../tools/agentscope/test/restore.test.ts` | Command-level mutation and restore coverage | Real Cursor dry-run, apply, and restore flows must be verified here | Mirror the existing Claude and Codex acceptance pattern |
| `../../tools/agentscope/test/provider-capabilities.test.ts`, `../../tools/agentscope/test/doctor.test.ts`, and `../../tools/agentscope/src/providers/registry.ts` | Fixture baseline and provider capability reporting | FT-005 changes Cursor from read-only to verified for the supported slice and may broaden fixture validation for `mcp.json` parsing | Keep fixture validation and provider summaries aligned with the shipped Cursor surface |
| `../../tools/agentscope/test/fixtures/cursor/*` | Provider baseline fixtures | Cursor discovery and fixture validation rely on these committed shapes | Add only the minimum baseline fixture changes needed for discovery and parser coverage |
| `../../tools/agentscope/test/support/codex-sandbox.ts` and `../../tools/agentscope/test/support/claude-sandbox.ts` | Disposable runtime sandboxes for real writable providers | FT-005 needs the same style of helper for Cursor | Mirror the helper shape so command tests stay consistent |
| `../../tools/agentscope/test/fixtures/runtime/home/.cursor/mcp.json` and `../../tools/agentscope/test/fixtures/runtime/cursor/User/` | Current runtime Cursor fixtures | They prove live discovery today but do not yet include workspace disabled-server state or a writable Cursor sandbox | Expand these fixtures only as needed for deterministic Cursor apply and restore coverage |
| `../../tools/agentscopev1/dist/providers/cursor.js` | Prior alternative-MVP Cursor behavior | It shows the earlier verified Cursor slice, including workspace disabled-server reconciliation and supported skill plus MCP toggles | Reuse grounded behavior, not the old architecture wholesale |

## Test Strategy

| Test surface | Canonical refs | Existing coverage | Planned automated coverage | Required local suites / commands | Required CI suites / jobs | Manual-only gap / justification | Manual-only approval ref |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Cursor discovery and disabled-state rediscovery | `REQ-01`, `REQ-02`, `REQ-03`, `NEG-01`, `NEG-03`, `SC-01`, `SC-04`, `CHK-01` | Cursor live discovery and malformed-file warnings only | Add disabled skill and disabled configured-MCP rediscovery, trailing-comma `mcp.json` parsing, malformed workspace-state warnings, and conflicting live-vs-vault handling | `npm test` | Repository `agentscope` job | none | `none` |
| Cursor dry-run planning and explicit blocking | `REQ-04`, `REQ-05`, `REQ-06`, `NEG-02`, `SC-02`, `SC-03`, `SC-04`, `CHK-01` | Cursor returns blocked read-only decisions only | Add real Cursor dry-run planning for global skills and configured MCPs plus explicit extension blocking and workspace-state reconciliation cases | `npm test` | Repository `agentscope` job | none | `none` |
| Cursor apply, restore, and shipped capability reporting | `REQ-05`, `REQ-07`, `NEG-01`, `NEG-02`, `SC-02`, `SC-03`, `CHK-01`, `CHK-02` | Existing shared engine plus Claude and Codex real-provider coverage; Cursor capability matrix still read-only | Add a Cursor sandbox helper, end-to-end apply and restore coverage, capability-matrix updates, provider-report verification, and README updates | `npm test`, `npm run build` | Repository `agentscope` job | none | `none` |

## Open Questions / Ambiguities

| Open Question ID | Question | Why unresolved | Blocks | Default action / escalation owner |
| --- | --- | --- | --- | --- |
| `OQ-01` | Should Cursor disabled configured MCPs reuse shared `json-payload` vault entries or keep a Cursor-only payload file format | The current vault helper only covers Claude and Codex, while the alternative MVP stored Cursor MCP entries in provider-local JSON files | `STEP-01`, `STEP-02` | Extend the shared vault helper and use `json-payload` unless doing so weakens existing Claude or Codex invariants |
| `OQ-02` | How much Cursor workspace state should FT-005 mutate | The current alternative MVP touched only `cursor/disabledMcpServers`, but Cursor stores more data in workspace SQLite state | `STEP-02`, `STEP-03` | Keep FT-005 limited to the documented disabled-server list key and block on malformed state instead of expanding the contract |

## Environment Contract

| Area | Contract | Used by | Failure symptom |
| --- | --- | --- | --- |
| setup | Work from `tools/agentscope` with committed fixtures plus disposable Cursor sandboxes only | `STEP-01`, `STEP-02`, `STEP-03` | Tests mutate real `~/.cursor` or live workspace state |
| test | `npm test` and `npm run build` are the canonical local verification commands | `CHK-01`, `CHK-02` | Cursor writable behavior changes without deterministic proof |
| access / network / secrets | No live Cursor state, network access, or `.env` data is required | all steps | The feature depends on machine-local state outside the sandbox roots |

## Preconditions

| Precondition ID | Canonical ref | Required state | Used by steps | Blocks start |
| --- | --- | --- | --- | --- |
| `PRE-01` | `ASM-01`, `CON-02`, `CON-03`, `CON-04` | FT-001 through FT-004 remain the active owners of normalized discovery, guarded mutation, previous writable-provider patterns, and optional-state handling | `STEP-01`, `STEP-02`, `STEP-03` | yes |
| `PRE-02` | `REQ-05`, `CTR-03` | The existing shared mutation primitives for SQLite item replacement stay available and are not weakened during FT-005 | `STEP-02`, `STEP-03` | yes |

## Workstreams

| Workstream | Implements | Result | Owner | Dependencies |
| --- | --- | --- | --- | --- |
| `WS-01` | `REQ-01`, `REQ-02`, `REQ-03` | Cursor disabled-state discovery plus any required shared vault and parser support | agent | `PRE-01`, `OQ-01` |
| `WS-02` | `REQ-04`, `REQ-05`, `REQ-06` | Cursor skill and configured-MCP toggle planning with explicit extension blocking and optional workspace-state reconciliation | agent | `WS-01`, `PRE-02`, `OQ-02` |
| `WS-03` | `REQ-07` | Real Cursor sandbox coverage, capability-matrix updates, and shipped docs aligned with the verified writable slice | agent | `WS-02` |

## Approval Gates

| Approval Gate ID | Trigger | Applies to | Why approval is required | Approver / evidence |
| --- | --- | --- | --- | --- |
| `AG-01` | none | none | FT-005 stays inside repository code, fixtures, and disposable sandboxes | none |

## Work Sequence

| Step ID | Actor | Implements | Goal | Touchpoints | Artifact | Verifies | Evidence IDs | Check command / procedure | Blocked by | Needs approval | Escalate if |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `STEP-01` | agent | `REQ-01`, `REQ-02`, `REQ-03` | Extend the shared vault helper only as needed and add Cursor disabled-state discovery, trailing-comma parsing, workspace-state reads, and related warning paths | `src/core/mutation-vault.ts`, `src/providers/cursor.ts`, `test/provider-discovery.test.ts`, `test/provider-capabilities.test.ts`, `src/providers/registry.ts`, `test/fixtures/cursor/*` | Cursor live plus disabled discovery contract | `CHK-01` | `EVID-01` | `npm test` | `PRE-01`, `OQ-01` | `none` | Shared vault metadata must change in a way that weakens Claude or Codex guarantees |
| `STEP-02` | agent | `REQ-04`, `REQ-05`, `REQ-06` | Implement Cursor skill and configured-MCP planning plus explicit extension blocking and optional workspace disabled-server reconciliation | `src/providers/cursor.ts`, `test/toggle.test.ts`, `test/fixtures/runtime/home/.cursor/*`, `test/fixtures/runtime/cursor/User/*` | Real Cursor dry-run planning contract | `CHK-01` | `EVID-01` | `npm test` | `STEP-01`, `PRE-02`, `OQ-02` | `none` | Cursor writes require a provider-specific execution path outside the shared engine or wider workspace-state mutation than FT-005 allows |
| `STEP-03` | agent | `REQ-07` | Add Cursor sandboxed apply and restore coverage, update provider capability reporting, and align shipped docs | `test/support/*`, `test/restore.test.ts`, `test/doctor.test.ts`, `test/fixtures/capability-matrix.json`, `README.md` | Verified Cursor writable slice and updated provider contract | `CHK-01`, `CHK-02` | `EVID-01`, `EVID-02` | `npm test && npm run build` | `STEP-02` | `none` | The Cursor sandbox cannot prove apply and restore safely with committed fixture shapes |

## Parallelizable Work

- `PAR-01` Cursor parser tests and disabled-state discovery assertions can move alongside vault-helper updates once the shared payload decision is fixed.
- `PAR-02` Provider capability-matrix and doctor-report updates should wait until Cursor dry-run planning is stable because they encode the shipped writable surface.

## Checkpoints

| Checkpoint ID | Refs | Condition | Evidence IDs |
| --- | --- | --- | --- |
| `CP-01` | `STEP-01`, `CHK-01` | Cursor live and disabled items rediscover through one stable item model without hiding malformed or conflicting state | `EVID-01` |
| `CP-02` | `STEP-02`, `STEP-03`, `CHK-01`, `CHK-02` | Cursor skill and configured-MCP dry-run, apply, rediscover, and restore behavior are fixture-backed, capability reporting is updated, and shipped docs match the supported slice | `EVID-01`, `EVID-02` |

## Execution Risks

| Risk ID | Risk | Impact | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| `ER-01` | Cursor `mcp.json` parsing accepts trailing commas during discovery but writes back an incomplete or incorrect server map | Re-enable or restore becomes unsafe and unrelated MCPs drift | Lock the parser and rewrite behavior with fixture-backed discovery, dry-run, apply, and restore tests on trailing-comma input | Cursor MCP tests show dropped keys or changed targeted state |
| `ER-02` | Workspace disabled-server reconciliation clears or rewrites the wrong SQLite value | Cursor still treats the MCP as disabled or unrelated workspace state is corrupted | Limit FT-005 to the single `ItemTable` key and verify both present and absent workspace-db cases through sandboxes | SQLite-backed tests show stale or mis-targeted disabled state |
| `ER-03` | Disabled Cursor items conflict with live copies and discovery guesses instead of surfacing explicit issues | Users lose trust in rediscovery and safe re-enable flows | Treat conflicting live plus vaulted state and malformed workspace values as warnings or blocked planning input, never as implicit preference | Discovery returns duplicate or misleading Cursor enabled state |

## Stop Conditions / Fallback

| Stop ID | Related refs | Trigger | Immediate action | Safe fallback state |
| --- | --- | --- | --- | --- |
| `STOP-01` | `REQ-05`, `CON-02`, `OQ-02` | Cursor requires a new execution path outside the shared mutation engine or broader undocumented workspace-state writes to be safe | Stop and preserve Cursor as discovery-only | Keep the pre-FT-005 Cursor read-only behavior intact |

## Ready For Acceptance

FT-005 is complete. Cursor global skills and configured MCPs now rediscover across live and disabled states, supported Cursor toggles route through the shared guarded mutation workflow, optional workspace disabled-server reconciliation is proven through fixtures and sandboxes, and unsupported extensions stay explicit. Final local verification on 2026-04-13 passed:

- `npm run lint`
- `npm test`
- `npm run coverage`
- `npm run build`
