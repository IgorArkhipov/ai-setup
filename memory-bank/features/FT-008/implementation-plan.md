---
title: "FT-008: Implementation Plan"
doc_kind: feature
doc_function: derived
purpose: "Execution plan for FT-008. Records discovery context, steps, risks, and test strategy without redefining canonical MCP control-plane facts."
derived_from:
  - feature.md
status: active
audience: humans_and_agents
must_not_define:
  - ft_008_scope
  - ft_008_architecture
  - ft_008_acceptance_criteria
  - ft_008_blocker_state
---

# Implementation Plan

## Goal Of This Plan

Implement the local AgentScope MCP control plane described in `feature.md`: an `agentscope mcp` stdio server with structured read-only, plan, apply, backup, restore, doctor, bulk selector, and fingerprint behavior, backed by existing AgentScope core modules and covered by fixture-based tests.

## Current State / Reference Points

| Path / module | Current role | Why relevant | Reuse / mirror |
| --- | --- | --- | --- |
| `tools/agentscope/src/cli.ts` | Registers `providers`, `doctor`, `snapshot`, `list`, `toggle`, and `restore` commands | `mcp` must be added without breaking existing CLI routing | Mirror existing `handleCommand` behavior where possible; avoid stdout logging from server runtime |
| `tools/agentscope/src/core/discovery.ts` | Provider orchestration, stable item sorting, inventory summary derivation | MCP read-only tools should call this directly | Reuse `runDiscovery`, `buildDiscoveryInventorySummary`, `sortDiscoveryItems`, and `sortDiscoveryWarnings` |
| `tools/agentscope/src/core/models.ts` | Discovery item, warning, provider/kind/category/layer types | MCP schemas and responses use these exact vocabularies | Export or reuse stable type unions |
| `tools/agentscope/src/core/mutation-models.ts` | Toggle plan, selected identity, operations, restore result types | MCP plan/apply tools should serialize these safely | Reuse `toSelectedItemIdentity`, operation and target types |
| `tools/agentscope/src/core/mutation-engine.ts` | Applies toggle plans and restores backups with lock, backups, rollback, and audit | MCP apply and restore must not bypass this | Reuse `executeTogglePlan` and `restoreBackupById` |
| `tools/agentscope/src/core/mutation-state.ts` | Persists and loads backup manifests and audit logs | MCP backup listing needs a small safe reader | Add/read backup summary helper without changing manifest format |
| `tools/agentscope/src/commands/toggle.ts` | Existing single-item CLI selection flow | MCP single-item tools need the same selection and provider planning semantics | Extract or mirror small selection helper in MCP layer |
| `tools/agentscope/test/fixtures/runtime/` | Fixture-backed provider state | MCP tests must not touch real home directory config | Use existing runtime fixtures and disposable app-state roots |
| `tmp/Agentscope Implementation Plan.md` | Backlog source for Tasks 19-23 | Defines exact tool names and fingerprint contract | Treat as source context, not as governed SSoT |

## Test Strategy

| Test surface | Canonical refs | Existing coverage | Planned automated coverage | Required local suites / commands | Required CI suites / jobs | Manual-only gap / justification | Manual-only approval ref |
| --- | --- | --- | --- | --- | --- | --- | --- |
| MCP server bootstrap and tool registry | `REQ-01`, `REQ-02`, `SC-01`, `SC-02`, `CHK-01` | none | Start built or source server through SDK client transport; list exact tool names | `npx vitest run test/mcp-server.test.ts`; `npm run build` | existing AgentScope test job | none | `none` |
| Read-only tool responses | `REQ-03`, `REQ-04`, `SC-02`, `SC-03`, `CHK-01` | CLI list/doctor/snapshot tests | Call inventory summary, list items, and doctor tools against fixtures | `npx vitest run test/mcp-server.test.ts` | existing AgentScope test job | none | `none` |
| Single-item mutation and restore | `REQ-04`, `REQ-05`, `REQ-07`, `SC-04`, `SC-07`, `NEG-04`, `CHK-02` | CLI toggle and restore tests | Plan/apply one fixture item, assert backup id, list backups, restore backup | `npx vitest run test/mcp-server.test.ts` | existing AgentScope test job | none | `none` |
| Bulk selector and fingerprint safety | `REQ-05`, `REQ-06`, `SC-05`, `SC-06`, `NEG-01`, `NEG-02`, `NEG-03`, `CHK-03` | none | Plan disabled/enabled selectors, compute fingerprint, block empty/missing confirmation/mismatch/max-items cases | `npx vitest run test/mcp-server.test.ts` | existing AgentScope test job | none | `none` |
| Documentation and full project health | `REQ-08`, `SC-08`, `CHK-04` | README exists | README snippets and workflows updated; full build/test/lint run | `npm run build`, `npm test`, `npm run lint` from `tools/agentscope` | existing CI | Manual review of client snippets is acceptable because clients differ by version | `AG-01` |

## Open Questions / Ambiguities

| Open Question ID | Question | Why unresolved | Blocks | Default action / escalation owner |
| --- | --- | --- | --- | --- |
| `OQ-01` | Does the current MCP TypeScript SDK import path match the installed package version? | The package was not installed before this feature | `STEP-02` | Use Context7/current package docs and install the official SDK; if build fails due SDK shape, adapt before proceeding |
| `OQ-02` | How should self-targeted AgentScope MCP disable attempts be detected reliably across clients? | The app does not currently know which provider launched the server | full self-management support | For this slice, block obvious `agentscope` MCP item ids and document full active-session detection as future work |

## Environment Contract

| Area | Contract | Used by | Failure symptom |
| --- | --- | --- | --- |
| setup | Work from repo root; install dependencies only under `tools/agentscope`; use Node 25.9+ and the existing TypeScript/Vitest stack | all steps | build or tests fail before MCP code runs |
| test | Fixture sandboxes only; no tests read or write real home-directory provider config | `STEP-04` through `STEP-07` | tests create or mutate files outside temp/runtime fixture roots |
| access / network / secrets | No secrets are needed; no `.env*` files may be read; package install may use npm registry | `STEP-01`, `STEP-02` | dependency install or tests require credentials |
| MCP transport | Server logs to stderr only; stdout is reserved for MCP JSON-RPC traffic | `STEP-02`, `STEP-04` | client test cannot initialize or list tools |

## Preconditions

| Precondition ID | Canonical ref | Required state | Used by steps | Blocks start |
| --- | --- | --- | --- | --- |
| `PRE-01` | `CON-01`, `NEG-05` | `.env*` files are not read or used | all steps | yes |
| `PRE-02` | `ASM-01`, `REQ-04` | Existing discovery and mutation modules remain the source of behavior | `STEP-03` through `STEP-07` | yes |
| `PRE-03` | `DEC-01`, `OQ-01` | MCP SDK setup is proven by build or replaced with an equivalent local transport decision | `STEP-02` | yes |
| `PRE-04` | `CON-02`, `CON-04` | Apply operations keep confirmation, lock, backup, audit, and max-item guards | `STEP-05`, `STEP-06` | yes |

## Workstreams

| Workstream | Implements | Result | Owner | Dependencies |
| --- | --- | --- | --- | --- |
| `WS-01` | `REQ-01`, `REQ-02`, `REQ-03` | MCP SDK dependency, server entrypoint, tool registry, CLI `mcp` command | agent | `PRE-03` |
| `WS-02` | `REQ-03`, `REQ-04` | Shared MCP response serializers, selector filtering, operation summaries, backup summaries | agent | `WS-01`, `PRE-02` |
| `WS-03` | `REQ-05`, `REQ-06` | Single and bulk plan/apply tools with fingerprint and blocked-item behavior | agent | `WS-02`, `PRE-04` |
| `WS-04` | `REQ-07` | Backup listing and restore tool | agent | `WS-02` |
| `WS-05` | `REQ-08` | README setup snippets and natural-language workflow examples | agent | `WS-01`, `WS-03`, `WS-04` |

## Approval Gates

| Approval Gate ID | Trigger | Applies to | Why approval is required | Approver / evidence |
| --- | --- | --- | --- | --- |
| `AG-01` | README claims a client-specific config path or JSON/TOML shape not covered by automated tests | `STEP-08` | Incorrect setup snippets can mislead users into editing provider configs | Human or reviewer checks docs; final verification records docs changed |
| `AG-02` | Any implementation attempts automatic MCP registration into provider configs | all steps | Auto-registration is out of scope and may alter user tools unexpectedly | Human must explicitly approve; default is stop |
| `AG-03` | Any implementation attempts to bypass existing backup/lock/audit/fingerprint behavior | `STEP-05`, `STEP-06`, `STEP-07` | This weakens the safety model | Stop and redesign through `feature.md` |

## Work Sequence

| Step ID | Actor | Implements | Goal | Touchpoints | Artifact | Verifies | Evidence IDs | Check command / procedure | Blocked by | Needs approval | Escalate if |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `STEP-01` | agent | `REQ-01`, `DEC-01` | Add MCP SDK dependency and verify TypeScript import shape | `tools/agentscope/package.json`, lockfile | Dependency installed and buildable | `CHK-04` | `EVID-04` | `npm run build` after minimal import compiles | `PRE-03`, `OQ-01` | `none` | package install requires secrets |
| `STEP-02` | agent | `REQ-01`, `REQ-02`, `CTR-01` | Add `agentscope mcp` server entrypoint and stable tool registration | `src/cli.ts`, `src/mcp/server.ts`, `src/mcp/tools.ts`, `src/mcp/schemas.ts` | Server starts and lists tools | `CHK-01` | `EVID-01` | MCP client integration test lists exact tool names | `STEP-01` | `none` | stdout logging corrupts transport |
| `STEP-03` | agent | `REQ-03`, `REQ-04`, `CTR-02`, `CTR-03`, `CTR-04` | Add selectors, serializers, operation summaries, and warning/blocked response helpers | `src/mcp/helpers.ts`, `src/mcp/schemas.ts`, core exports if needed | Structured helper layer | `CHK-01`, `CHK-02` | `EVID-01`, `EVID-02` | MCP read/list/plan tests inspect response shape | `STEP-02` | `none` | helper duplicates provider logic |
| `STEP-04` | agent | `REQ-02`, `REQ-03`, `REQ-04` | Implement inventory summary, list items, and doctor tools | `src/mcp/tools.ts`, `src/commands/doctor.ts` if structured helper extraction is needed | Read-only tools return fixture state | `CHK-01` | `EVID-01` | MCP tests call read-only tools | `STEP-03` | `none` | tool needs to read `.env*` |
| `STEP-05` | agent | `REQ-05`, `REQ-06`, `CTR-04` | Implement single-item plan/apply tools with confirmation and re-resolve-on-apply semantics | `src/mcp/tools.ts`, `src/mcp/helpers.ts` | Single item mutation tools | `CHK-02` | `EVID-02` | MCP tests plan/apply one fixture item | `STEP-04` | `none` | apply would bypass mutation engine |
| `STEP-06` | agent | `REQ-05`, `REQ-06`, `CTR-05` | Implement bulk selector planning, canonical fingerprinting, and bulk apply guards | `src/mcp/tools.ts`, `src/mcp/helpers.ts`, tests | Bulk mutation tools | `CHK-03` | `EVID-03` | MCP tests cover plan, apply, mismatch, maxItems, empty selection | `STEP-05` | `none` | fingerprint cannot be made deterministic |
| `STEP-07` | agent | `REQ-07`, `CTR-06` | Implement backup listing and restore tools | `src/mcp/tools.ts`, `src/core/mutation-state.ts` | Backup summaries and restore responses | `CHK-02` | `EVID-02` | MCP tests list and restore backup | `STEP-05` | `none` | restore would bypass existing allowlist |
| `STEP-08` | agent | `REQ-08` | Update README with client setup snippets and natural-language workflows | `tools/agentscope/README.md` | Documentation updated | `CHK-04` | `EVID-04` | `npm run lint` and manual doc review | `STEP-02`, `STEP-07` | `AG-01` | docs describe unsupported self-install |
| `STEP-09` | agent | `REQ-01` through `REQ-08` | Run full verification and update feature/protocol execution evidence | `tools/agentscope`, `memory-bank/features/FT-008/*`, `homeworks/hw-5/task-1/*` | Execution evidence complete | `CHK-01` through `CHK-04` | `EVID-01` through `EVID-04` | `npm run build`, `npm test`, `npm run lint`, protocol evidence review | `STEP-08` | `none` | any check fails |

## Parallelizable Work

- `PAR-01` README drafting can proceed after tool names are fixed, but final examples must wait until tests prove the response shapes.
- `PAR-02` Bulk fingerprint helpers and backup summary helpers can be developed independently if they avoid editing the same files.
- `PAR-03` Do not parallelize broad edits to `src/mcp/tools.ts` unless helper modules are split first.

## Checkpoints

| Checkpoint ID | Refs | Condition | Evidence IDs |
| --- | --- | --- | --- |
| `CP-01` | `STEP-01`, `STEP-02`, `CHK-01` | MCP server starts and lists the stable tool surface | `EVID-01` |
| `CP-02` | `STEP-04`, `CHK-01` | Read-only tools return structured fixture state | `EVID-01` |
| `CP-03` | `STEP-05`, `STEP-07`, `CHK-02` | Single-item plan/apply/restore round trip passes | `EVID-02` |
| `CP-04` | `STEP-06`, `CHK-03` | Bulk plan/apply fingerprint and blocked-state behavior pass | `EVID-03` |
| `CP-05` | `STEP-08`, `STEP-09`, `CHK-04` | Docs, build, tests, and lint are green | `EVID-04` |

## Execution Risks

| Risk ID | Risk | Impact | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| `ER-01` | MCP SDK version differs from examples | Build failure or incorrect registration | Use current docs and adapt import paths in `STEP-01` | TypeScript cannot find SDK exports |
| `ER-02` | Bulk fingerprint includes presentation-only fields | Reviewed plans mismatch unnecessarily | Keep canonical payload machine-only and sorted | same plan changes after timestamp/display changes |
| `ER-03` | Tests become flaky by using real provider roots | Unsafe local mutation or non-determinism | Use fixture sandboxes and temp app-state roots only | test path points into real home |
| `ER-04` | MCP tool layer grows into a duplicate CLI | Divergent behavior | Extract small reusable helpers and delegate writes to mutation engine | tool directly edits provider files |

## Stop Conditions / Fallback

| Stop ID | Related refs | Trigger | Immediate action | Safe fallback state |
| --- | --- | --- | --- | --- |
| `STOP-01` | `CON-01`, `NEG-05` | Any code path needs `.env*` input | Stop before reading; record blocked state | No file read, no mutation |
| `STOP-02` | `AG-02`, `NS-02` | Implementation attempts automatic MCP self-install | Stop and ask human | No provider config changed |
| `STOP-03` | `CON-02`, `FM-05`, `AG-03` | Apply bypasses mutation engine safety | Stop and redesign | No writes, feature remains in progress |
| `STOP-04` | `OQ-01` | MCP SDK cannot compile under current toolchain | Replace with a smaller compatible MCP transport only after documenting the decision | Docs and code paused before server command |
| `STOP-05` | `NEG-01` | Bulk apply fingerprint mismatch | Return blocked result and write nothing | Caller must re-run plan |

## Ready For Acceptance

FT-008 is ready for acceptance when:

- `agentscope mcp` starts through the CLI without breaking existing commands.
- The exact stable MCP tool set is registered.
- Read-only tools return structured inventory, list, and doctor responses.
- Single-item plan/apply tools return planned/applied/blocked/no-op states and use existing mutation safety.
- Bulk plan/apply tools return matched, actionable, blocked, per-item plans/results, and enforce `planFingerprint`, confirmation, empty-selection, and `maxItems` guards.
- Backup list and restore tools use existing backup manifests and restore logic.
- README documents local client setup and natural-language workflows.
- `cd tools/agentscope && npm run build`, `npm test`, and `npm run lint` pass locally.

## Execution Summary

Status: implemented locally and ready for human acceptance. `feature.md` remains `delivery_status: in_progress` and this plan remains `status: active` until the human owner accepts the run and decides whether H2 commit/push follow-up is needed.

| Evidence | Result | Notes |
| --- | --- | --- |
| `npm install @modelcontextprotocol/sdk zod` | applied | Added MCP SDK and Zod dependency entries under `tools/agentscope` |
| `agentscope mcp` | implemented | CLI starts local stdio MCP server |
| MCP tool surface | implemented | 9 tools registered: inventory summary, list items, single plan/apply, bulk plan/apply, list backups, restore backup, doctor |
| `npx vitest run test/mcp-server.test.ts` | passed | 1 file, 5 tests covering tool listing, read-only calls, single apply/restore, bulk fingerprint flow, and blocker cases |
| `npm run build` | passed | `tsc -p tsconfig.json` |
| `npm test` | passed | 23 files, 162 tests |
| `npm run lint` | passed | Biome checked 199 files |
| built CLI stdio smoke | passed | `dist/cli.js mcp` listed 9 tools and included `agentscope_get_inventory_summary` |
| `.ai-setup/scripts/test-agent-workflow.sh` | passed | Lifecycle workflow runner assets validated |
| `git diff --check` | passed | No whitespace errors |
| `npm audit --audit-level=high` | passed with note | Exit 0; npm still reports one moderate `postcss` advisory |
