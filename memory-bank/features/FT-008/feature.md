---
title: "FT-008: Local MCP Control Plane"
doc_kind: feature
doc_function: canonical
purpose: "Canonical feature document for exposing AgentScope discovery, toggle planning, apply, restore, and doctor capabilities through a local stdio MCP server."
derived_from:
  - ../../domain/problem.md
  - ../../flows/workflows.md
  - ../../flows/feature-flow.md
  - ../../features/FT-007/feature.md
status: active
delivery_status: in_progress
audience: humans_and_agents
must_not_define:
  - implementation_sequence
---

# FT-008: Local MCP Control Plane

## What

### Problem

AgentScope can already discover local agent skills, configured MCPs, tools, snapshots, reversible toggles, backups, and restores through the CLI. Natural-language agent clients still need to shell out to the CLI or parse human-readable output to use those capabilities. That makes safety-sensitive workflows harder to reason about, especially bulk enable or disable operations where the agent should first inspect inventory, explain blocked items, present a reviewed plan, and only then apply changes.

The next backlog item in `tmp/Agentscope Implementation Plan.md` is the Phase 3 local MCP control plane. Tasks 14-18 are already represented in the current code through snapshot, restore, vault, and provider toggle support, so this feature implements Tasks 19-23: define the MCP tool surface, add `agentscope mcp`, expose read-only tools, expose safe mutation tools, and document client setup.

### Outcome

| Metric ID | Metric | Baseline | Target | Measurement method |
| --- | --- | --- | --- | --- |
| `MET-01` | Agent clients can inspect AgentScope inventory without parsing CLI text | Only CLI commands exist | `agentscope mcp` exposes structured read-only inventory, list, and doctor tools | MCP integration tests list tools and call read-only tools against fixtures |
| `MET-02` | Agent clients can plan and apply reversible item toggles safely | Single-item CLI toggle exists; bulk MCP planning does not | MCP exposes separate single and bulk plan/apply tools, explicit confirmation, blocked-item explanations, and backup IDs | MCP tests cover single-item plan/apply and bulk plan/apply against fixture sandboxes |
| `MET-03` | Bulk mutation plans cannot be replayed against drifted state | No bulk MCP plan fingerprint exists | Bulk apply requires a reviewed `sha256:` plan fingerprint and aborts without writes on mismatch | Fingerprint mismatch test returns a blocked result |
| `MET-04` | Real client setup is documented | README does not describe AgentScope as an MCP endpoint | README includes Claude Code, Codex, and Cursor configuration snippets plus natural-language workflow examples | Documentation review and build/test verification |

### Scope

- `REQ-01` Add an `agentscope mcp` command that runs a local stdio MCP server without changing existing CLI command behavior.
- `REQ-02` Expose stable MCP tools named `agentscope_get_inventory_summary`, `agentscope_list_items`, `agentscope_plan_toggle_item`, `agentscope_apply_toggle_item`, `agentscope_plan_toggle_items`, `agentscope_apply_toggle_items`, `agentscope_list_backups`, `agentscope_restore_backup`, and `agentscope_run_doctor`.
- `REQ-03` Use structured schemas and responses for provider, kind, category, layer, item id, warnings, planned operations, backup ids, blocked items, and doctor output.
- `REQ-04` Reuse existing headless AgentScope discovery, provider, mutation, backup, restore, and doctor logic instead of shelling out to the CLI or duplicating provider behavior.
- `REQ-05` Keep mutation tools explicit and safe: read/list tools do not write, plan tools do not write, apply tools require confirmation, and bulk apply requires a matching plan fingerprint.
- `REQ-06` Support single-item and bulk selectors across Claude, Codex, and Cursor for skills and configured MCPs, while preserving unsupported plugin/tool lifecycle boundaries.
- `REQ-07` Expose recent backup listing and restore-by-backup-id through the same allowlisted restore path as the CLI.
- `REQ-08` Document local client setup and natural-language workflows for Claude Code, Codex, and Cursor.

### Non-Scope

- `NS-01` HTTP transport, remote service mode, multi-user auth, daemonization, or hosted MCP.
- `NS-02` Automatic self-installation of the AgentScope MCP registration into Claude, Codex, Cursor, or any provider config.
- `NS-03` Plugin/tool install, uninstall, or lifecycle support beyond existing read-only inventory.
- `NS-04` Weakening backup, lock, audit, fingerprint, or provider mutability checks for MCP callers.
- `NS-05` Allowing the MCP server to silently disable the active `agentscope` control plane from the same session without a future explicit safety story.

### Constraints / Assumptions

- `ASM-01` The existing CLI core already owns discovery, mutation, restore, and doctor semantics; MCP is an adapter layer.
- `ASM-02` A local stdio MCP server is sufficient for the first control-plane slice and matches Claude Code, Codex, and Cursor local client integration patterns.
- `CON-01` Do not read or use `.env*` files.
- `CON-02` Mutating MCP tools must be idempotent where possible and must fail closed when selection, mutability, or fingerprint state is ambiguous.
- `CON-03` Bulk selection must default to blocked/no-op for empty selections unless the caller explicitly opts into an empty no-op result.
- `CON-04` Bulk apply must include a `maxItems` guard so agents cannot accidentally mutate a broad machine-wide set without acknowledging blast radius.
- `DEC-01` Use the official MCP TypeScript SDK unless implementation discovers that it conflicts with the current Node/TypeScript setup.

## How

### Solution

Add a small MCP adapter layer under `tools/agentscope/src/mcp/`. The server registers the stable tool surface and maps each tool to existing AgentScope modules. Read-only tools call discovery and doctor helpers directly. Single-item mutation tools resolve the current item, plan through the provider adapter, and either return the plan or apply it through the mutation engine. Bulk tools resolve a selector into matched, actionable, and blocked items, derive per-item plans, compute a canonical `sha256:` fingerprint for reviewed plans, and require the same fingerprint before applying.

### Change Surface

| Surface | Type | Why it changes |
| --- | --- | --- |
| `tools/agentscope/package.json` / lockfile | package metadata | Add the MCP SDK dependency and expose the server through the existing CLI |
| `tools/agentscope/src/cli.ts` | code | Register the `mcp` command |
| `tools/agentscope/src/mcp/*` | code | New MCP schemas, tool handlers, server bootstrap, selector helpers, and fingerprint helpers |
| `tools/agentscope/src/core/*` | code | Small reusable exports may be added for backup listing, operation serialization, doctor data, or selector planning |
| `tools/agentscope/test/*mcp*` | tests | Verify tool listing, read-only calls, single mutation flow, bulk fingerprint flow, restore, and drift blocking |
| `tools/agentscope/README.md` | docs | Document MCP setup snippets and natural-language workflows |
| `memory-bank/features/FT-008/*` | docs | Record protocol, canonical scope, plan, and execution evidence |

### Flow

1. A client starts `agentscope mcp` as a local stdio server.
2. The server registers read-only, plan, apply, backup, restore, and doctor tools.
3. A client calls an inventory or list tool to inspect current machine state.
4. For one item, the client calls the single-item plan tool, reviews operations, and may call the single-item apply tool with confirmation.
5. For bulk items, the client calls the bulk plan tool, reviews matched/actionable/blocked items and the `planFingerprint`, then calls bulk apply with confirmation, the fingerprint, and `maxItems`.
6. Apply re-resolves current state. Bulk apply recomputes the fingerprint and refuses to write if it differs.
7. Restore calls list backups first when needed, then restores one backup by id through the existing mutation engine.

### Contracts

| Contract ID | Input / Output | Producer / Consumer | Notes |
| --- | --- | --- | --- |
| `CTR-01` | MCP tool names and schemas | MCP server / clients | Names are stable for the first local control-plane release |
| `CTR-02` | Common selector | MCP clients / read and bulk tools | Optional `providers`, `kinds`, `categories`, `layers`, `enabled`, and `ids` filters |
| `CTR-03` | Single item identity | MCP clients / single plan and apply tools | Requires `provider`, `kind`, `id`, `layer`, and `targetEnabled` |
| `CTR-04` | Mutation response | MCP tools / clients | Includes status, operations, affected paths, backup ids, warnings, and blocked reasons |
| `CTR-05` | Bulk plan fingerprint | bulk plan / bulk apply | `sha256:` over canonical JSON containing project root, selector, target state, exact matched/actionable/blocked sets, and operation digests |
| `CTR-06` | Backup summary | mutation state / backup tools | Includes backup id, created time, item count, providers, layers, paths, and restorable flag |

### Failure Modes

- `FM-01` The MCP tool layer shells out to CLI commands and diverges from headless module behavior.
- `FM-02` A bulk apply uses a stale reviewed plan after items changed on disk.
- `FM-03` A broad bulk selector applies too many changes because it lacks confirmation or item-count guards.
- `FM-04` Unsupported plugin/tool lifecycle items are presented as actionable.
- `FM-05` A restore or apply bypasses existing lock, backup, fingerprint, or audit behavior.
- `FM-06` The server logs to stdout and corrupts the MCP JSON-RPC channel.

### ADR Dependencies

None.

## Verify

### Exit Criteria

- `EC-01` `agentscope mcp` starts a stdio MCP server and existing CLI commands still behave as before.
- `EC-02` MCP clients can list the exact stable tool set and call read-only inventory, item-list, and doctor tools with structured responses.
- `EC-03` Single-item plan/apply tools reuse existing provider planning and mutation engine behavior, returning backup ids and affected paths for applied changes.
- `EC-04` Bulk plan/apply tools separate matched, actionable, and blocked items; compute stable fingerprints; and block writes on fingerprint mismatch.
- `EC-05` Backup listing and restore tools expose existing backup state and restore through the same safe path as the CLI.
- `EC-06` README documents local MCP setup and example natural-language workflows for Claude Code, Codex, and Cursor.

### Traceability matrix

| Requirement ID | Design refs | Acceptance refs | Checks | Evidence IDs |
| --- | --- | --- | --- | --- |
| `REQ-01` | `ASM-02`, `CTR-01`, `FM-06` | `EC-01`, `SC-01` | `CHK-01`, `CHK-04` | `EVID-01`, `EVID-04` |
| `REQ-02` | `CTR-01` | `EC-02`, `SC-02` | `CHK-01` | `EVID-01` |
| `REQ-03` | `CTR-02`, `CTR-03`, `CTR-04`, `CTR-06` | `EC-02`, `SC-03` | `CHK-01`, `CHK-02` | `EVID-01`, `EVID-02` |
| `REQ-04` | `ASM-01`, `FM-01`, `FM-05` | `EC-03`, `EC-05`, `SC-04` | `CHK-02` | `EVID-02` |
| `REQ-05` | `CON-02`, `CON-03`, `CON-04`, `CTR-05`, `FM-02`, `FM-03` | `EC-03`, `EC-04`, `SC-05`, `NEG-01`, `NEG-02` | `CHK-02`, `CHK-03` | `EVID-02`, `EVID-03` |
| `REQ-06` | `CTR-02`, `FM-04` | `EC-04`, `SC-06` | `CHK-03` | `EVID-03` |
| `REQ-07` | `CTR-06`, `FM-05` | `EC-05`, `SC-07` | `CHK-02` | `EVID-02` |
| `REQ-08` | `ASM-02` | `EC-06`, `SC-08` | `CHK-04` | `EVID-04` |

### Acceptance Scenarios

- `SC-01` A user runs `node dist/cli.js mcp` and an MCP client can initialize, list tools, and call tools over stdio.
- `SC-02` `agentscope_get_inventory_summary`, `agentscope_list_items`, and `agentscope_run_doctor` return structured project root, inventory, items, warnings, and provider statuses from fixture roots.
- `SC-03` Tool responses use stable selector, operation, blocked-item, warning, and backup fields rather than human-only prose.
- `SC-04` A client plans and applies one fixture-backed item toggle and receives `status`, `backupId`, and affected path summaries.
- `SC-05` A client plans a bulk selector, reviews `planFingerprint`, applies with the same fingerprint, and receives per-item results.
- `SC-06` Bulk planning reports unsupported, read-only, already-in-desired-state, or conflicting items as blocked instead of actionable.
- `SC-07` A client lists recent backups and restores one backup by id.
- `SC-08` README examples show Claude Code, Codex, Cursor snippets and natural-language workflows such as list inventory, disable one skill, disable global skills, and restore backup.

### Negative / Edge Scenarios

- `NEG-01` Bulk apply with a mismatched fingerprint returns `status: blocked` and does not write.
- `NEG-02` Bulk apply without confirmation, without fingerprint, or above `maxItems` returns blocked.
- `NEG-03` Empty bulk selection blocks unless `allowEmptySelection` is true.
- `NEG-04` Single-item apply blocks if the selected item is missing, conflicting, unsupported, read-only, or already drifted.
- `NEG-05` Attempts to read `.env*` paths remain forbidden.

### Checks

| Check ID | Covers | How to check | Expected result | Evidence path |
| --- | --- | --- | --- | --- |
| `CHK-01` | `EC-01`, `EC-02`, `SC-01`, `SC-02`, `SC-03` | `cd tools/agentscope && npx vitest run test/mcp-server.test.ts` | MCP server lists and calls the stable tool set with structured responses | Vitest output |
| `CHK-02` | `EC-03`, `EC-05`, `SC-04`, `SC-07`, `NEG-04` | MCP integration tests plan/apply one item and restore a backup in a disposable fixture state | Applied result includes backup id; restore returns restored | Vitest output |
| `CHK-03` | `EC-04`, `SC-05`, `SC-06`, `NEG-01`, `NEG-02`, `NEG-03` | MCP integration tests bulk plan, apply, max item guard, empty selection, and fingerprint mismatch | Correct plan/apply/blocked statuses; no writes on mismatch | Vitest output |
| `CHK-04` | `EC-06`, `SC-08` | `cd tools/agentscope && npm run build && npm test && npm run lint` | Build, test, and Biome checks pass | Terminal output |

### Test matrix

| Check ID | Evidence IDs | Evidence path |
| --- | --- | --- |
| `CHK-01` | `EVID-01` | MCP server/list/call test output |
| `CHK-02` | `EVID-02` | MCP single mutation and restore test output |
| `CHK-03` | `EVID-03` | MCP bulk fingerprint test output |
| `CHK-04` | `EVID-04` | Build/test/lint output |

### Evidence

- `EVID-01` MCP tool registration and read-only call verification.
- `EVID-02` MCP single-item mutation and restore verification.
- `EVID-03` MCP bulk selector, fingerprint, and drift-block verification.
- `EVID-04` Full local build, test, lint, and documentation verification.

### Evidence contract

| Evidence ID | Artifact | Producer | Path contract | Reused by checks |
| --- | --- | --- | --- | --- |
| `EVID-01` | Vitest MCP read-only output | test runner | terminal output from `test/mcp-server.test.ts` | `CHK-01` |
| `EVID-02` | Vitest MCP mutation/restore output | test runner | terminal output from `test/mcp-server.test.ts` | `CHK-02` |
| `EVID-03` | Vitest MCP bulk fingerprint output | test runner | terminal output from `test/mcp-server.test.ts` | `CHK-03` |
| `EVID-04` | Build/test/lint output | local verifier | terminal output | `CHK-04` |
