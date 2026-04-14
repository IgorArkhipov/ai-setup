---
title: "FT-004: Verified Codex Skill And Configured MCP Toggles"
doc_kind: feature
doc_function: canonical
purpose: "Canonical feature document for the next writable provider slice in AgentScope: Codex skill and configured-MCP discovery, toggle planning, apply, restore, and disabled-state rediscovery."
derived_from:
  - ../../domain/problem.md
  - ../../prd/PRD-002-incremental-writable-provider-expansion.md
  - ../../use-cases/UC-001-cross-provider-discovery.md
  - ../../use-cases/UC-002-safe-toggle-and-restore.md
  - ../FT-001/feature.md
  - ../FT-002/feature.md
  - ../FT-003/feature.md
status: active
delivery_status: done
audience: humans_and_agents
must_not_define:
  - implementation_sequence
---

# FT-004: Verified Codex Skill And Configured MCP Toggles

## What

### Problem

After Claude proved the shared mutation model end to end, Codex still remained discovery-only. Users could see Codex skills and configured MCP servers in AgentScope, but they still had to edit `~/.codex/config.toml` and Codex skill roots manually to make changes. That left a visible product inconsistency and forced automation back into provider-specific manual behavior.

### Outcome

| Metric ID | Metric | Baseline | Target | Measurement method |
| --- | --- | --- | --- | --- |
| `MET-01` | Codex becomes the second verified writable provider for its supported slice | Codex items are visible but blocked as read-only | Global and project Codex skills plus global configured MCPs can be dry-run, applied, rediscovered, and restored through AgentScope | Automated Codex provider, toggle, restore, and build verification |

### Scope

- `REQ-01` Discover live and disabled Codex skills with stable item IDs across the global and project skill roots.
- `REQ-02` Discover live and disabled Codex configured MCP entries from `~/.codex/config.toml` plus AgentScope-managed vault state.
- `REQ-03` Add reversible Codex skill toggle planning for the supported global and project skill roots.
- `REQ-04` Add reversible Codex configured-MCP toggle planning for `~/.codex/config.toml` that preserves the exact targeted TOML section for later restore.
- `REQ-05` Keep Codex plugins visible but explicitly unsupported for guarded mutation.
- `REQ-06` Verify end-to-end dry-run, apply, rediscover, and restore flows for the supported Codex writable slice, including malformed or conflicting vault-state handling.

### Non-Scope

- `NS-01` Cursor writable support.
- `NS-02` Codex plugin toggles, installation, or removal.
- `NS-03` Snapshot, dashboard, or MCP-server work.
- `NS-04` Codex writable coverage outside the verified global `config.toml` and global or project skill roots.

### Constraints / Assumptions

- `ASM-01` FT-001 remains the owner of normalized discovery contracts, FT-002 remains the owner of guarded mutation semantics, and FT-003 remains the nearest reference for a verified writable provider slice.
- `CON-01` Codex-specific parsing, disabled-state discovery, and toggle planning stay in [`../../tools/agentscope/src/providers/codex.ts`](../../tools/agentscope/src/providers/codex.ts).
- `CON-02` The shared mutation engine, command surface, backup format, and restore workflow must be reused rather than replaced with a Codex-specific execution path.
- `CON-03` Disabled Codex items that AgentScope can restore later must remain discoverable by the same stable item ID they used while enabled.

## How

### Solution

Extend the Codex provider from discovery-only to a grounded writable slice by reusing the existing guarded mutation engine, adding Codex-aware vault-backed disabled-state discovery, and planning skill plus configured-MCP toggles as ordinary filesystem operations. Preserve unsupported Codex plugins as visible but blocked so the capability matrix stays explicit instead of optimistic.

### Change Surface

| Surface | Type | Why it changes |
| --- | --- | --- |
| `tools/agentscope/src/providers/codex.ts` | code | Codex discovery and writable planning are grounded here |
| `tools/agentscope/src/core/mutation-vault.ts` | code | Shared vault metadata may need to grow beyond Claude so Codex disabled-state discovery stays explicit and reusable |
| `tools/agentscope/test/provider-discovery.test.ts` | tests | Codex live and disabled discovery coverage must expand |
| `tools/agentscope/test/codex-config.test.ts` | tests | Codex `config.toml` parser rules must stay locked |
| `tools/agentscope/test/codex-provider.test.ts` | tests | Real Codex end-to-end skill and configured-MCP behavior is verified here |
| `tools/agentscope/test/toggle.test.ts` | tests | Command-level dry-run and blocked-output behavior must cover real Codex items |
| `tools/agentscope/test/restore.test.ts` | tests | Codex apply and restore behavior must be verified end to end |
| `tools/agentscope/test/support/*` | tests | A Codex sandbox fixture helper is needed for disposable runtime verification |
| `tools/agentscope/README.md` | doc | The provider capability matrix and supported Codex writable slice must be updated |

### Flow

1. AgentScope discovers Codex skills and configured MCPs from live roots first, then merges in disabled Codex entries from AgentScope-managed vault state when no live copy exists.
2. For a supported Codex item, the provider returns a dry-run toggle plan that moves a skill directory or moves one `config.toml` MCP section between live config and vault-managed state.
3. The shared mutation engine applies the plan safely, and later `restore` can recover the original state while rediscovery still reports the correct enabled or disabled item.

### Contracts

| Contract ID | Input / Output | Producer / Consumer | Notes |
| --- | --- | --- | --- |
| `CTR-01` | Codex disabled-skill and disabled-MCP discovery shape | Codex provider / shared discovery and commands | Disabled Codex items remain discoverable by the same stable item ID used while enabled |
| `CTR-02` | Codex configured-MCP vault payload | Codex provider / shared mutation engine and later Codex rediscovery | The exact targeted `[mcp_servers.*]` section is preserved for re-enable and restore |
| `CTR-03` | Codex plugin toggle behavior | Codex provider / `toggle` command | Plugins remain visible but return explicit unsupported decisions |

### Failure Modes

- `FM-01` A disabled Codex skill or configured MCP disappears from discovery and cannot be re-enabled by stable ID.
- `FM-02` Codex `config.toml` section removal or re-append corrupts unrelated config content or loses the original targeted section bytes.
- `FM-03` Conflicting live and vaulted Codex state is handled implicitly instead of surfacing an explicit warning or blocked result.

## Verify

### Exit Criteria

- `EC-01` Codex is the second provider with verified discovery, dry-run, apply, rediscover, and restore coverage for the supported writable slice.
- `EC-02` Unsupported Codex plugins and malformed or conflicting Codex vault state stay explicit and safe instead of being guessed through.

### Traceability matrix

| Requirement ID | Design refs | Acceptance refs | Checks | Evidence IDs |
| --- | --- | --- | --- | --- |
| `REQ-01` | `ASM-01`, `CON-01`, `CON-03`, `CTR-01`, `FM-01` | `EC-01`, `SC-01`, `SC-02` | `CHK-01` | `EVID-01` |
| `REQ-02` | `CON-01`, `CTR-01`, `CTR-02`, `FM-01`, `FM-03` | `EC-01`, `SC-01`, `SC-03` | `CHK-01` | `EVID-01` |
| `REQ-03` | `CON-01`, `CON-02`, `CTR-01` | `EC-01`, `SC-02` | `CHK-01` | `EVID-01` |
| `REQ-04` | `CON-01`, `CON-02`, `CTR-02`, `FM-02` | `EC-01`, `SC-03` | `CHK-01`, `CHK-02` | `EVID-01`, `EVID-02` |
| `REQ-05` | `CTR-03` | `EC-02`, `SC-04` | `CHK-01` | `EVID-01` |
| `REQ-06` | `CON-02`, `FM-01`, `FM-02`, `FM-03` | `EC-01`, `EC-02`, `SC-02`, `SC-03`, `SC-04` | `CHK-01`, `CHK-02` | `EVID-01`, `EVID-02` |

### Acceptance Scenarios

- `SC-01` A user lists Codex items after one or more disables and still sees the same skill and configured-MCP IDs with correct enabled state.
- `SC-02` A user disables and later re-enables a Codex skill from either the global or project skill root, and restore can recover the earlier state.
- `SC-03` A user disables and later re-enables a Codex configured MCP, and the original `config.toml` section is recovered through re-enable or restore.
- `SC-04` A user targets a Codex plugin or a malformed or conflicting disabled Codex entry, and AgentScope blocks or warns explicitly instead of guessing.

### Checks

| Check ID | Covers | How to check | Expected result | Evidence path |
| --- | --- | --- | --- | --- |
| `CHK-01` | `EC-01`, `EC-02`, `SC-01`, `SC-02`, `SC-03`, `SC-04` | Run `npm test` in `tools/agentscope` with Codex provider, toggle, restore, and supporting core suites | Codex writable discovery and mutation behavior is fixture-backed and passes locally | `../../tools/agentscope/test/` |
| `CHK-02` | `EC-01`, `SC-02`, `SC-03` | Run `npm run build` in `tools/agentscope` after the Codex suites are green | The package builds cleanly with the shipped Codex writable slice | `implementation-plan.md#ready-for-acceptance` |

### Test matrix

| Check ID | Evidence IDs | Evidence path |
| --- | --- | --- |
| `CHK-01` | `EVID-01` | `../../tools/agentscope/test/` |
| `CHK-02` | `EVID-02` | `implementation-plan.md#ready-for-acceptance` |

### Evidence

- `EVID-01` Automated Codex discovery, toggle, restore, and parser coverage in `tools/agentscope/test/`.
- `EVID-02` Execution summary and final verification record in [`implementation-plan.md`](implementation-plan.md).

### Evidence contract

| Evidence ID | Artifact | Producer | Path contract | Reused by checks |
| --- | --- | --- | --- | --- |
| `EVID-01` | Automated Codex provider and command test suite | Vitest | `../../tools/agentscope/test/` | `CHK-01` |
| `EVID-02` | Execution summary and verification outcome | implementation plan | `implementation-plan.md#ready-for-acceptance` | `CHK-02` |
