---
title: "FT-006: Implementation Plan"
doc_kind: feature
doc_function: derived
purpose: "Archived execution plan for FT-006. Records the grounded snapshot touchpoints, resolved execution decisions, and final verification without redefining the canonical feature contract."
derived_from:
  - feature.md
status: archived
audience: humans_and_agents
must_not_define:
  - ft_006_scope
  - ft_006_architecture
  - ft_006_acceptance_criteria
  - ft_006_blocker_state
---

# Implementation Plan

## Goal Of This Plan

Add the first persisted discovery snapshot slice to AgentScope by introducing a validated snapshot schema, project-scoped latest plus history storage, a `snapshot` CLI command, and fixture-backed verification without changing provider discovery behavior or the guarded mutation contract.

## Current State / Reference Points

| Path / module | Current role | Why relevant | Reuse / mirror |
| --- | --- | --- | --- |
| `feature.md` | Canonical FT-006 scope and verification contract | The plan must not redefine snapshot scope, acceptance, or evidence | All execution traces back to `REQ-*`, `SC-*`, and `CHK-*` here |
| `../../tools/agentscope/src/cli.ts` | Registers current CLI commands through `runHandled(...)` and shared override flags | `snapshot` must follow the same command registration, error handling, and override conventions | Mirror the existing `list`, `toggle`, and `restore` wiring pattern |
| `../../tools/agentscope/src/commands/list.ts` | Current discovery-only command flow with config loading, provider set, and human or JSON output | `snapshot` should reuse the same config and discovery entry path instead of inventing another one | Mirror the `definedOverrides(...)`, `loadConfig(...)`, and `runDiscovery(...)` pattern |
| `../../tools/agentscope/src/core/discovery.ts` | Runs cross-provider discovery and owns normalized item and warning ordering | Snapshot content and inventory summaries must derive from the same normalized discovery result | Reuse the sorted discovery result and colocate any shared summary helper here if that avoids drift |
| `../../tools/agentscope/src/core/models.ts` | Owns the normalized discovery item and warning types | Snapshot schema must embed these contracts without redefining them inconsistently | Reuse these types in the snapshot schema or derivative snapshot types |
| `../../tools/agentscope/src/core/paths.ts` | Resolves project, app-state, and Cursor roots | FT-006 needs project-scoped snapshot path helpers under `appStateRoot` | Extend this module rather than hard-coding snapshot paths inside the command |
| `../../tools/agentscope/src/core/output.ts` | Owns deterministic human and JSON renderers for `list` | Snapshot output must stay line-oriented, deterministic, and separate from storage logic | Keep snapshot rendering in the presentation layer, either here or in a sibling renderer module |
| `../../tools/agentscope/test/cli.test.ts` | Exercises command routing and top-level CLI errors | The new command must prove routing, exit behavior, and option handling here | Mirror the direct `runCli(...)` pattern already used for `list`, `toggle`, and `restore` |
| `../../tools/agentscope/test/list.test.ts` | Provides the current runtime fixture option pattern for discovery commands | Snapshot command tests can reuse the same runtime roots and override shape | Mirror the `runtimeOptions(...)` helper shape for snapshot tests |
| `../../tools/agentscope/test/paths.test.ts` | Locks path helper behavior | Project-scoped snapshot key and storage path derivation belongs here | Extend the existing path-focused assertions |
| `../../tools/agentscopev1/dist/core/snapshots.js` and `../../tools/agentscopev1/dist/commands/snapshot.js` | Fallback reference from the alternative MVP for snapshot ids, project-scoped paths, retention default, and human output | FT-006 may need a behavioral cross-check if the current repository leaves snapshot details underspecified | Consult only for grounded path and payload behavior after current-source inspection; do not reverse-engineer old architecture wholesale |
| `../../tools/agentscope/README.md` | Documents the shipped CLI surface and runtime behavior | The new command must be documented once it exists | Keep the command list and runtime notes aligned with the shipped implementation |

## Test Strategy

| Test surface | Canonical refs | Existing coverage | Planned automated coverage | Required local suites / commands | Required CI suites / jobs | Manual-only gap / justification | Manual-only approval ref |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Snapshot schema, validation, and inventory summary | `REQ-02`, `REQ-03`, `REQ-05`, `SC-01`, `SC-03`, `CHK-01` | No current snapshot module exists | Add `test/snapshot.test.ts` for payload build, schema validation, latest-read, history-list, and malformed-file rejection | `npm run lint`, `npm test`, `npm run coverage`, `npm run build` | `lint`, `agentscope` | none | `none` |
| Project-scoped snapshot path derivation and retention behavior | `REQ-02`, `REQ-06`, `SC-02`, `CHK-01` | `test/paths.test.ts` covers only project, app-state, and Cursor roots | Add path tests for project snapshot keys and latest/history locations, plus snapshot tests for retention pruning | `npm run lint`, `npm test`, `npm run coverage`, `npm run build` | `lint`, `agentscope` | none | `none` |
| Snapshot command routing and rendering | `REQ-01`, `REQ-04`, `REQ-06`, `SC-01`, `CHK-01` | CLI routing exists for `providers`, `doctor`, `list`, `toggle`, and `restore` only | Add command-level coverage in `cli.test.ts`, plus renderer assertions in `output.test.ts` or a sibling snapshot-output suite | `npm run lint`, `npm test`, `npm run coverage`, `npm run build` | `lint`, `agentscope` | none | `none` |
| Shipped docs and built CLI verification | `REQ-01`, `REQ-04`, `CHK-02` | README documents the current command set only | Update README and run the built `snapshot` command once against fixture discovery roots with a temp app-state root after `npm run build` | `npm run lint`, `npm test`, `npm run coverage`, `npm run build`, `node dist/cli.js snapshot --project-root test/fixtures/runtime/project --app-state-root <temp-app-state-root> --cursor-root test/fixtures/runtime/cursor/User` | `lint`, `agentscope` | none | `none` |

## Open Questions / Ambiguities

| Open Question ID | Question | Why unresolved | Blocks | Default action / escalation owner |
| --- | --- | --- | --- | --- |
| `OQ-01` | Should the inventory summary helper live in `core/discovery.ts` or stay inside `core/snapshots.ts` | FT-006 had to avoid a second counting implementation, but the current code had no shared inventory-summary helper initially | `STEP-01`, `STEP-02` | Resolved in `STEP-01`: the summary helper now lives in `src/core/discovery.ts` and is reused by snapshot persistence |
| `OQ-02` | What should happen when history pruning encounters a malformed stored snapshot file | FT-006 required validated reads, but the write-path behavior for stale malformed history was not encoded initially | `STEP-01`, `STEP-03` | Resolved in `STEP-01`: the command now fails explicitly before writing and preserves existing malformed history files for inspection |

## Environment Contract

| Area | Contract | Used by | Failure symptom |
| --- | --- | --- | --- |
| setup | Work from `tools/agentscope` with committed runtime fixtures for discovery inputs and temp directories or fixture app-state roots only for snapshot outputs | `STEP-01`, `STEP-02`, `STEP-03` | Tests or direct checks depend on live home-directory provider state |
| test | `npm run lint`, `npm test`, `npm run coverage`, and `npm run build` are the required local verification commands for this CLI contract change | `CHK-01`, `CHK-02` | Snapshot behavior changes without the full package baseline staying green |
| access / network / secrets | No network, live provider accounts, or `.env` files are required; snapshot writes stay under `appStateRoot` only | all steps | The implementation depends on machine-local state outside fixture or sandbox roots |

## Preconditions

| Precondition ID | Canonical ref | Required state | Used by steps | Blocks start |
| --- | --- | --- | --- | --- |
| `PRE-01` | `ASM-01`, `CON-01`, `CON-02` | FT-001 and FT-002 remain the active owners of normalized discovery and app-state-root discipline | `STEP-01`, `STEP-02`, `STEP-03` | yes |
| `PRE-02` | `CON-03`, `CON-04`, `CON-05` | FT-006 keeps snapshot persistence separate from provider adapters and guarded mutation code | `STEP-01`, `STEP-02` | yes |

## Workstreams

| Workstream | Implements | Result | Owner | Dependencies |
| --- | --- | --- | --- | --- |
| `WS-01` | `REQ-02`, `REQ-03`, `REQ-05` | Core snapshot schema, validation, summary derivation, and project-scoped paths exist with direct tests | agent | `PRE-01`, `PRE-02`, `OQ-01`, `OQ-02` |
| `WS-02` | `REQ-01`, `REQ-04` | The `snapshot` command is wired into the CLI with deterministic human and JSON output | agent | `WS-01` |
| `WS-03` | `REQ-06` | Snapshot tests, README updates, and built-CLI verification are complete and aligned with the shipped contract | agent | `WS-02` |

## Approval Gates

| Approval Gate ID | Trigger | Applies to | Why approval is required | Approver / evidence |
| --- | --- | --- | --- | --- |
| `AG-01` | none | none | FT-006 stays inside repository code, fixtures, and app-state-root writes under controlled test paths | none |

## Work Sequence

| Step ID | Actor | Implements | Goal | Touchpoints | Artifact | Verifies | Evidence IDs | Check command / procedure | Blocked by | Needs approval | Escalate if |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `STEP-01` | agent | `REQ-02`, `REQ-03`, `REQ-05` | Resolve `OQ-01` and `OQ-02`, then add snapshot types, schema validation, summary derivation, read and write helpers, and project-scoped path helpers | `src/core/discovery.ts`, `src/core/models.ts`, `src/core/paths.ts`, `src/core/snapshots.ts`, `test/paths.test.ts`, `test/snapshot.test.ts` | Core snapshot persistence contract and recorded OQ decisions in code plus tests | `CHK-01` | `EVID-01` | `npm test` | `PRE-01`, `PRE-02`, `OQ-01`, `OQ-02` | `none` | Reusing normalized discovery requires a second divergent counting path or malformed-history handling weakens validation guarantees |
| `STEP-02` | agent | `REQ-01`, `REQ-04` | Add the `snapshot` command and deterministic human or JSON rendering using the existing CLI conventions | `src/commands/snapshot.ts`, `src/core/output.ts` or sibling renderer, `src/cli.ts`, `test/cli.test.ts`, `test/output.test.ts` | Shipped snapshot command contract | `CHK-01` | `EVID-01` | `npm test` | `STEP-01` | `none` | The command requires provider-specific behavior outside the shared discovery path or output logic leaks into storage helpers |
| `STEP-03` | agent | `REQ-06` | Finalize tests, README updates, and built-command verification for the shipped snapshot slice | `test/snapshot.test.ts`, `README.md`, `../../memory-bank/features/FT-006/README.md`, `../../memory-bank/features/README.md` | Verified FT-006 implementation and aligned command docs | `CHK-01`, `CHK-02` | `EVID-01`, `EVID-02` | `npm run lint && npm run coverage && npm run build` plus `node dist/cli.js snapshot --project-root test/fixtures/runtime/project --app-state-root <temp-app-state-root> --cursor-root test/fixtures/runtime/cursor/User` | `STEP-02` | `none` | The built CLI cannot capture a snapshot against fixture roots or documentation diverges from the actual command surface |

## Parallelizable Work

- `PAR-01` Path-helper tests can move alongside snapshot schema tests once the project-scoped storage contract is fixed.
- `PAR-02` Renderer assertions should wait until the snapshot payload shape is stable because human and JSON output depend on the final schema.

## Checkpoints

| Checkpoint ID | Refs | Condition | Evidence IDs |
| --- | --- | --- | --- |
| `CP-01` | `STEP-01`, `CHK-01` | Snapshot payloads can be written, reloaded, and validated with project-scoped latest plus history paths and explicit malformed-file failures | `EVID-01` |
| `CP-02` | `STEP-02`, `STEP-03`, `CHK-01`, `CHK-02` | The CLI exposes `snapshot`, the renderers are deterministic, and the shipped README plus built command align with the implemented contract | `EVID-01`, `EVID-02` |

## Execution Risks

| Risk ID | Risk | Impact | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| `ER-01` | Snapshot inventory counts drift from `list` because the feature introduces a second counting implementation | Future dashboard or MCP surfaces would trust inconsistent inventory state | Reuse normalized discovery output directly and lock summary semantics through unit tests | Snapshot counts disagree with the same discovery input |
| `ER-02` | Project-scoped snapshot directories collide across different repositories | One project's latest or history overwrites another's state | Derive snapshot directories from a stable project key grounded in the absolute project root | Two different roots resolve to the same snapshot path in tests |
| `ER-03` | Malformed existing history breaks pruning after a new snapshot is written | Snapshot history becomes partially updated or silently corrupted | Validate before pruning and fail fast before mutating history when malformed files are encountered | A malformed history fixture produces partial writes or silent skips |

## Stop Conditions / Fallback

| Stop ID | Related refs | Trigger | Immediate action | Safe fallback state |
| --- | --- | --- | --- | --- |
| `STOP-01` | `CON-01`, `CON-05`, `REQ-04` | Snapshot support requires a second discovery path or writes outside `appStateRoot` to function | Stop and preserve the current CLI surface without `snapshot` | Keep AgentScope limited to `providers`, `doctor`, `list`, `toggle`, and `restore` |

## Ready For Acceptance

FT-006 is complete. AgentScope now ships a persisted `snapshot` command with validated latest plus history storage, deterministic human and JSON output, and project-scoped snapshot paths under `appStateRoot`. The execution decisions from `STEP-01` were finalized as planned: the inventory summary helper lives in `src/core/discovery.ts`, and malformed existing history causes the command to fail before writing new snapshot files.

Final local verification on 2026-04-13 passed:

- `npm run lint`
- `npm test`
- `npm run coverage`
- `npm run build`
- `node dist/cli.js snapshot --project-root test/fixtures/runtime/project --app-state-root <temp-app-state-root> --cursor-root test/fixtures/runtime/cursor/User`
