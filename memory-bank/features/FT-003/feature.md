---
title: "FT-003: First End-To-End Provider Validation With Claude"
doc_kind: feature
doc_function: canonical
purpose: "Canonical feature document for the first fully validated writable provider in AgentScope: Claude discovery, toggle planning, apply, restore, and vault-backed skill disable and enable flows."
derived_from:
  - ../../domain/problem.md
  - ../../use-cases/UC-001-cross-provider-discovery.md
  - ../../use-cases/UC-002-safe-toggle-and-restore.md
  - ../FT-001/feature.md
  - ../FT-002/feature.md
status: active
delivery_status: done
audience: humans_and_agents
must_not_define:
  - implementation_sequence
---

# FT-003: First End-To-End Provider Validation With Claude

## What

### Problem

AgentScope's discovery and mutation abstractions were still unproven until they worked against one real provider that users rely on. Without an end-to-end provider integration, the product remained mostly infrastructure and could not yet show real operational value in day-to-day workflows.

### Outcome

| Metric ID | Metric | Baseline | Target | Measurement method |
| --- | --- | --- | --- | --- |
| `MET-01` | First real writable provider validated end to end | Shared engine exists but no provider can use it safely | Claude project skills, configured MCPs, and global plus project tools are discoverable and writable through AgentScope | Automated Claude discovery, toggle, restore, and build verification |

### Scope

- `REQ-01` Verify Claude root resolution and normalized discovery for project skills, configured MCPs, and global plus project tools.
- `REQ-02` Add vault-backed skill disable and enable semantics that keep disabled skills discoverable with stable IDs.
- `REQ-03` Add Claude toggle planning for configured MCPs and tools through grounded settings-JSON mutations that respect layer boundaries.
- `REQ-04` Verify end-to-end discover, plan, apply, restore, and rediscover flows for the supported Claude writable surface.
- `REQ-05` Harden the Claude integration with explicit blocking and validation for invalid CLI input, malformed vault entries, and unsupported internal categories.

### Non-Scope

- `NS-01` Writable toggle support for Codex or Cursor.
- `NS-02` Dashboard, snapshot, or MCP-server changes.
- `NS-03` Claude discovery or mutation outside the grounded roots verified by this feature.

### Constraints / Assumptions

- `ASM-01` FT-001 remains the upstream owner of normalized discovery contracts, and FT-002 remains the upstream owner of guarded mutation semantics.
- `CON-01` Claude-specific parsing and toggle planning stay in `src/providers/claude.ts`.
- `CON-02` Vault-backed skill disable and enable must remain reversible across process restarts.
- `CTR-01` Claude toggle plans respect layer boundaries and use the generic mutation engine without Claude-specific branching inside the core.

## How

### Solution

Ground the Claude provider as the first real writable integration by extending its discovery surface, adding provider-neutral vault metadata for skill toggles, and planning Claude settings-backed MCP and tool mutations through the existing shared mutation vocabulary. Reuse the guarded mutation engine from FT-002 for apply and restore so the Claude feature proves the generic safety model rather than inventing a provider-specific execution path.

### Change Surface

| Surface | Type | Why it changes |
| --- | --- | --- |
| `tools/agentscope/src/providers/claude.ts` | code | Claude discovery, normalization, and toggle planning are grounded here |
| `tools/agentscope/src/core/mutation-vault.ts` | code | Vault metadata and disabled-skill recovery support the skill toggle flow |
| `tools/agentscope/src/commands/list.ts` | code | Claude acceptance requires provider and layer filtering plus validation |
| `tools/agentscope/test/fixtures/claude/**` | test data | The Claude discovery and toggle contract is locked in committed fixtures |
| `tools/agentscope/test/*claude*` | tests | Claude discovery, list, toggle, restore, and vault behavior are verified here |
| `tools/agentscope/README.md` | doc | The provider capability matrix and supported Claude writable surface are documented here |

### Flow

1. AgentScope discovers Claude items across the supported project and global roots with stable IDs, enabled state, mutability, and state paths.
2. For a writable Claude item, the provider returns a dry-run toggle plan that uses either vault-backed path operations or grounded settings-JSON mutations.
3. The shared mutation engine applies the plan safely, and later `restore` can recover the original state while discovery continues to reflect the correct enabled or disabled status.

### Contracts

| Contract ID | Input / Output | Producer / Consumer | Notes |
| --- | --- | --- | --- |
| `CTR-01` | Claude normalized item shape | Claude provider / shared discovery and commands | Claude items reuse the FT-001 discovery contract |
| `CTR-02` | Vault metadata for disabled skills | vault helper / Claude discovery and restore | Disabled skills remain discoverable and reversible across restarts |
| `CTR-03` | Claude settings-JSON mutation plans | Claude provider / shared mutation engine | Configured MCP and tool toggles are expressed through generic JSON operations |

### Failure Modes

- `FM-01` Disabled Claude skills disappear from discovery and cannot be re-enabled by stable ID.
- `FM-02` Claude settings-backed toggles mutate the wrong layer or wrong key.
- `FM-03` Malformed vault metadata or invalid CLI layer input produces implicit or misleading behavior instead of explicit blocking.

## Verify

### Exit Criteria

- `EC-01` Claude is the first provider with verified discovery, dry-run, apply, and restore coverage for the supported writable surface.
- `EC-02` Claude discovery and toggle behavior stays explicit and safe when inputs, vault metadata, or CLI filters are invalid.

### Traceability matrix

| Requirement ID | Design refs | Acceptance refs | Checks | Evidence IDs |
| --- | --- | --- | --- | --- |
| `REQ-01` | `ASM-01`, `CON-01`, `CTR-01` | `EC-01`, `SC-01` | `CHK-01` | `EVID-01` |
| `REQ-02` | `CON-02`, `CTR-02`, `FM-01` | `EC-01`, `SC-02` | `CHK-01` | `EVID-01` |
| `REQ-03` | `CTR-03`, `FM-02` | `EC-01`, `SC-03` | `CHK-01` | `EVID-01` |
| `REQ-04` | `CTR-02`, `CTR-03`, `FM-01`, `FM-02` | `EC-01`, `SC-02`, `SC-03` | `CHK-01`, `CHK-02` | `EVID-01`, `EVID-02` |
| `REQ-05` | `CON-01`, `FM-03` | `EC-02`, `SC-04` | `CHK-01` | `EVID-01` |

### Acceptance Scenarios

- `SC-01` A user lists Claude items across supported layers and sees normalized skills, configured MCPs, and tools with stable IDs and correct mutability.
- `SC-02` A user disables and later re-enables a supported Claude skill through the vault flow, and discovery reflects the same stable item ID across the cycle.
- `SC-03` A user toggles a supported Claude configured MCP or tool, receives a backup ID, and can restore the original state later.
- `SC-04` Invalid CLI layer input, malformed vault metadata, or unsupported internal toggle categories are rejected explicitly rather than silently ignored.

### Checks

| Check ID | Covers | How to check | Expected result | Evidence path |
| --- | --- | --- | --- | --- |
| `CHK-01` | `EC-01`, `EC-02`, `SC-01`, `SC-02`, `SC-03`, `SC-04` | Run `npm test` in `tools/agentscope` with Claude discovery, list, toggle, restore, and vault suites | Claude is verified as the first real writable provider and hardened behavior stays covered | `../../tools/agentscope/test/` |
| `CHK-02` | `EC-01`, `SC-02`, `SC-03` | Run `npm run build` in `tools/agentscope` after the Claude suites are green | The package builds cleanly with the shipped Claude integration | `implementation-plan.md#ready-for-acceptance` |

### Test matrix

| Check ID | Evidence IDs | Evidence path |
| --- | --- | --- |
| `CHK-01` | `EVID-01` | `../../tools/agentscope/test/` |
| `CHK-02` | `EVID-02` | `implementation-plan.md#ready-for-acceptance` |

### Evidence

- `EVID-01` Automated Claude discovery, list, toggle, restore, and vault coverage in `tools/agentscope/test/`.
- `EVID-02` Archived execution summary and final verification record in [`implementation-plan.md`](implementation-plan.md).

### Evidence contract

| Evidence ID | Artifact | Producer | Path contract | Reused by checks |
| --- | --- | --- | --- | --- |
| `EVID-01` | Automated Claude provider and command test suite | Vitest | `../../tools/agentscope/test/` | `CHK-01` |
| `EVID-02` | Archived implementation summary and verification outcome | implementation plan | `implementation-plan.md#ready-for-acceptance` | `CHK-02` |
