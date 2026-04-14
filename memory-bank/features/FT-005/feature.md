---
title: "FT-005: Verified Cursor Skill And Configured MCP Toggles"
doc_kind: feature
doc_function: canonical
purpose: "Canonical feature document for the next writable provider slice in AgentScope: Cursor global skill and configured-MCP discovery, toggle planning, apply, restore, and disabled-state rediscovery."
derived_from:
  - ../../domain/problem.md
  - ../../prd/PRD-002-incremental-writable-provider-expansion.md
  - ../../use-cases/UC-001-cross-provider-discovery.md
  - ../../use-cases/UC-002-safe-toggle-and-restore.md
  - ../FT-001/feature.md
  - ../FT-002/feature.md
  - ../FT-003/feature.md
  - ../FT-004/feature.md
status: active
delivery_status: done
audience: humans_and_agents
must_not_define:
  - implementation_sequence
---

# FT-005: Verified Cursor Skill And Configured MCP Toggles

## What

### Problem

After Claude and Codex proved the shared mutation model across two providers, Cursor still remains discovery-only in the current package. Users can inspect Cursor global skills, configured MCP servers, and extension inventory, but they still have to edit `~/.cursor/mcp.json`, manage the global `skills-cursor` tree, and reconcile any workspace disabled-server state manually. That leaves the last provider from the alternative MVP outside the safe toggle and restore workflow.

### Outcome

| Metric ID | Metric | Baseline | Target | Measurement method |
| --- | --- | --- | --- | --- |
| `MET-01` | Cursor becomes the third verified writable provider for its supported slice | Cursor items are visible but blocked as read-only | Cursor global skills and configured MCPs can be dry-run, applied, rediscovered, and restored through AgentScope, while extensions remain visible but unsupported | Automated Cursor provider, toggle, restore, and build verification |

### Scope

- `REQ-01` Discover live and disabled Cursor skills with stable item IDs across the global `~/.cursor/skills-cursor` root and AgentScope-managed vault state.
- `REQ-02` Discover Cursor configured MCPs from `~/.cursor/mcp.json`, reconcile observed workspace disabled-server state when available, and merge in AgentScope-managed disabled entries when no live copy exists.
- `REQ-03` Accept the observed Cursor `mcp.json` JSON-with-trailing-commas shape during discovery and toggle planning instead of failing a valid local file that AgentScope is expected to manage.
- `REQ-04` Add reversible Cursor skill toggle planning for the supported global skill root.
- `REQ-05` Add reversible Cursor configured-MCP toggle planning for `~/.cursor/mcp.json` that preserves the disabled entry in AgentScope-managed vault state and clears stale workspace disabled-server state when needed.
- `REQ-06` Keep Cursor extensions visible but explicitly unsupported for guarded mutation.
- `REQ-07` Verify end-to-end dry-run, apply, rediscover, and restore flows for the supported Cursor writable slice, including malformed workspace state and conflicting live or vaulted disabled state handling.

### Non-Scope

- `NS-01` Cursor extension install, uninstall, enable, or disable flows.
- `NS-02` Project-layer Cursor writable support beyond the observed global skill and MCP roots.
- `NS-03` Dashboard, snapshot, or MCP-server work from the alternative MVP.
- `NS-04` Writable support for undocumented Cursor roots or workspace state outside the currently observed disabled-server list.

### Constraints / Assumptions

- `ASM-01` FT-001 remains the owner of normalized discovery contracts, FT-002 remains the owner of guarded mutation semantics, and FT-003 plus FT-004 remain the reference patterns for verified provider-local planning through the shared engine.
- `CON-01` Cursor-specific parsing, workspace-state reconciliation, disabled-state discovery, and toggle planning stay in [`../../tools/agentscope/src/providers/cursor.ts`](../../tools/agentscope/src/providers/cursor.ts).
- `CON-02` The shared mutation engine, backup format, audit log, lock discipline, and restore workflow must be reused rather than replaced with Cursor-specific execution paths.
- `CON-03` Disabled Cursor items that AgentScope can restore later must remain discoverable by the same stable item ID they used while enabled.
- `CON-04` Cursor workspace disabled-server state is optional context: if the current workspace database is absent, discovery and toggle planning must still succeed safely against `mcp.json` alone.

## How

### Solution

Extend the Cursor provider from discovery-only to a grounded writable slice by reusing the shared guarded mutation engine, adding Cursor-aware vault-backed disabled discovery, and planning global skill plus configured-MCP toggles as ordinary filesystem and SQLite operations. Reconcile Cursor's observed disabled-server workspace state whenever it would otherwise leave an enabled or vaulted MCP entry inconsistent. Preserve extensions as visible but blocked so the capability matrix stays explicit instead of optimistic.

### Change Surface

| Surface | Type | Why it changes |
| --- | --- | --- |
| `tools/agentscope/src/providers/cursor.ts` | code | Cursor discovery and writable planning are grounded here |
| `tools/agentscope/src/core/mutation-vault.ts` | code | Shared vault metadata must expand to cover Cursor disabled skills and configured MCP payloads |
| `tools/agentscope/test/provider-discovery.test.ts` | tests | Cursor live and disabled discovery coverage must expand |
| `tools/agentscope/test/toggle.test.ts` | tests | Command-level dry-run and blocked-output behavior must cover real Cursor items |
| `tools/agentscope/test/restore.test.ts` | tests | Cursor apply and restore behavior must be verified end to end |
| `tools/agentscope/test/doctor.test.ts` | tests | Provider reporting must reflect Cursor's verified writable slice once it ships |
| `tools/agentscope/test/provider-capabilities.test.ts` | tests | The fixture baseline and capability matrix must stay aligned with shipped Cursor support |
| `tools/agentscope/test/support/*` | tests | A Cursor sandbox fixture helper is needed for disposable runtime verification |
| `tools/agentscope/test/fixtures/*` | tests | Cursor provider baseline and runtime fixtures must grow to cover trailing-comma parsing, workspace state, and disabled-MCP reconciliation |
| `tools/agentscope/test/fixtures/capability-matrix.json` | tests | Provider capability reporting must move Cursor skills and configured MCPs from read-only to verified |
| `tools/agentscope/README.md` | doc | The provider capability matrix and supported Cursor writable slice must be updated |

### Flow

1. AgentScope discovers Cursor global skills and configured MCPs from live roots first, then merges in disabled Cursor entries from AgentScope-managed vault state when no live copy exists.
2. For a supported Cursor item, the provider returns a dry-run toggle plan that moves a skill directory or moves one `mcp.json` server entry between live config and vault-managed state while reconciling the current workspace disabled-server list when needed.
3. The shared mutation engine applies the plan safely, and later `restore` can recover the original state while rediscovery still reports the correct enabled or disabled item.

### Contracts

| Contract ID | Input / Output | Producer / Consumer | Notes |
| --- | --- | --- | --- |
| `CTR-01` | Cursor disabled-skill and disabled-MCP discovery shape | Cursor provider / shared discovery and commands | Disabled Cursor items remain discoverable by the same stable item ID used while enabled |
| `CTR-02` | Cursor configured-MCP vault payload | Cursor provider / shared mutation engine and later Cursor rediscovery | The disabled `mcp.json` server entry is preserved for re-enable and restore |
| `CTR-03` | Cursor workspace disabled-server reconciliation | Cursor provider / shared mutation engine | AgentScope clears stale workspace disabled state when it would contradict the current enabled or vaulted MCP state |
| `CTR-04` | Cursor extension toggle behavior | Cursor provider / `toggle` command | Extensions remain visible but return explicit unsupported decisions |

### Failure Modes

- `FM-01` A disabled Cursor skill or configured MCP disappears from discovery and cannot be re-enabled by stable ID.
- `FM-02` Cursor `mcp.json` toggle planning misreads the observed file shape or rewrites the wrong server entry.
- `FM-03` Cursor workspace disabled-server state remains stale after apply or restore and leaves the visible MCP state inconsistent with the planned result.
- `FM-04` Conflicting live and vaulted Cursor state or malformed workspace state is handled implicitly instead of surfacing an explicit warning or blocked result.
- `FM-05` Cursor `mcp.json` parsing accepts the observed trailing-comma shape during discovery but later loses or corrupts unrelated server content during toggle planning or apply.

## Verify

### Exit Criteria

- `EC-01` Cursor is the third provider with verified discovery, dry-run, apply, rediscover, and restore coverage for the supported writable slice.
- `EC-02` Unsupported Cursor extensions and malformed or conflicting Cursor disabled state stay explicit and safe instead of being guessed through.

### Traceability matrix

| Requirement ID | Design refs | Acceptance refs | Checks | Evidence IDs |
| --- | --- | --- | --- | --- |
| `REQ-01` | `ASM-01`, `CON-01`, `CON-03`, `CTR-01`, `FM-01` | `EC-01`, `SC-01`, `SC-02` | `CHK-01` | `EVID-01` |
| `REQ-02` | `CON-01`, `CON-03`, `CON-04`, `CTR-01`, `CTR-02`, `CTR-03`, `FM-01`, `FM-03`, `FM-04` | `EC-01`, `SC-01`, `SC-03`, `SC-04`, `NEG-02`, `NEG-03` | `CHK-01` | `EVID-01` |
| `REQ-03` | `CON-01`, `CTR-02`, `FM-02`, `FM-05` | `EC-01`, `SC-03`, `NEG-01` | `CHK-01` | `EVID-01` |
| `REQ-04` | `CON-01`, `CON-02`, `CTR-01` | `EC-01`, `SC-02` | `CHK-01` | `EVID-01` |
| `REQ-05` | `CON-01`, `CON-02`, `CTR-02`, `CTR-03`, `FM-02`, `FM-03` | `EC-01`, `SC-03` | `CHK-01`, `CHK-02` | `EVID-01`, `EVID-02` |
| `REQ-06` | `CTR-04` | `EC-02`, `SC-04` | `CHK-01` | `EVID-01` |
| `REQ-07` | `CON-02`, `FM-01`, `FM-02`, `FM-03`, `FM-04`, `FM-05` | `EC-01`, `EC-02`, `SC-02`, `SC-03`, `SC-04`, `NEG-01`, `NEG-02`, `NEG-03` | `CHK-01`, `CHK-02` | `EVID-01`, `EVID-02` |

### Acceptance Scenarios

- `SC-01` A user lists Cursor items after one or more disables and still sees the same skill and configured-MCP IDs with correct enabled state.
- `SC-02` A user disables and later re-enables a Cursor global skill, and restore can recover the earlier state.
- `SC-03` A user disables and later re-enables a Cursor configured MCP, and AgentScope reconciles `mcp.json`, any vaulted disabled entry, and the current workspace disabled-server state safely.
- `SC-04` A user targets a Cursor extension or a malformed or conflicting Cursor disabled-state input, and AgentScope blocks or warns explicitly instead of guessing.

### Negative / Edge Scenarios

- `NEG-01` A Cursor `mcp.json` file uses the observed trailing-comma JSON shape, and AgentScope can still discover and toggle the targeted MCP without rejecting the file or dropping unrelated server entries.
- `NEG-02` No current Cursor workspace database exists for the selected project, and AgentScope still plans and applies a safe configured-MCP toggle against `mcp.json` alone.
- `NEG-03` Cursor workspace disabled-server state is malformed or a live Cursor item conflicts with its vaulted disabled copy, and AgentScope warns or blocks explicitly instead of guessing.

### Checks

| Check ID | Covers | How to check | Expected result | Evidence path |
| --- | --- | --- | --- | --- |
| `CHK-01` | `EC-01`, `EC-02`, `SC-01`, `SC-02`, `SC-03`, `SC-04` | Run `npm test` in `tools/agentscope` with Cursor provider, toggle, restore, and supporting core suites | Cursor writable discovery and mutation behavior is fixture-backed and passes locally | `../../tools/agentscope/test/` |
| `CHK-02` | `EC-01`, `SC-02`, `SC-03` | Run `npm run build` in `tools/agentscope` after the Cursor suites are green | The package builds cleanly with the shipped Cursor writable slice | `implementation-plan.md#ready-for-acceptance` |

### Test matrix

| Check ID | Evidence IDs | Evidence path |
| --- | --- | --- |
| `CHK-01` | `EVID-01` | `../../tools/agentscope/test/` |
| `CHK-02` | `EVID-02` | `implementation-plan.md#ready-for-acceptance` |

### Evidence

- `EVID-01` Automated Cursor discovery, toggle, restore, and supporting coverage in `tools/agentscope/test/`.
- `EVID-02` Execution summary and final verification record in [`implementation-plan.md`](implementation-plan.md).

### Evidence contract

| Evidence ID | Artifact | Producer | Path contract | Reused by checks |
| --- | --- | --- | --- | --- |
| `EVID-01` | Automated Cursor provider and command test suite | Vitest | `../../tools/agentscope/test/` | `CHK-01` |
| `EVID-02` | Execution summary and verification outcome | implementation plan | `implementation-plan.md#ready-for-acceptance` | `CHK-02` |
