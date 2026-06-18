---
title: "FT-010: Verified Modern Surface Toggles"
doc_kind: feature
doc_function: canonical
purpose: "Canonical feature document for adding safe, reversible toggles for verified modern provider surfaces across Claude Code, Codex, and Cursor."
derived_from:
  - ../../domain/problem.md
  - ../../prd/PRD-004-modern-provider-configuration-surfaces.md
  - ../../flows/workflows.md
  - ../../flows/feature-flow.md
  - protocol.md
status: active
delivery_status: done
audience: humans_and_agents
must_not_define:
  - implementation_sequence
---

# FT-010: Verified Modern Surface Toggles

## What

### Problem

`FT-009` made modern provider surfaces visible, but agent files are still read-only in AgentScope even though they are normal user-controlled files in documented provider paths. Developers can inspect installed agents but cannot temporarily remove them from provider-discovered agent directories or restore them through the same safe, audited AgentScope mutation workflow used for skills and configured MCP entries.

At the same time, not every modern surface is safe to mutate. Hooks, settings, plugin manifests, plugin declarations, permissions, and sandbox files have provider-specific semantics that can affect execution policy or external installation state. AgentScope must add the first proven writable modern surface without implying that every discovered modern item is writable.

### Outcome

| Metric ID | Metric | Baseline | Target | Measurement method |
| --- | --- | --- | --- | --- |
| `MET-01` | Agent file availability toggles are possible | Agent files are discovered as read-only items | Claude Code, Codex, and Cursor agent files are discovered as `read-write` and produce reversible AgentScope file-vault plans | Provider and toggle tests |
| `MET-02` | Disabled agents remain visible | A disabled agent file would disappear from inventory | Vaulted agent files appear as disabled inventory items with source and state paths | Provider discovery tests |
| `MET-03` | Unsupported modern surfaces stay blocked | All modern surfaces are read-only from FT-009 | Hooks, settings, plugin configs, plugin manifests, permissions, and sandbox files still return blocked plans | Mutation boundary tests |
| `MET-04` | Safety model remains auditable | Existing vault admits only skills and configured MCP entries | Vault manifests support `kind: "agent"` and existing backup/audit flows still pass full tests | Build, full test, lint |

### Scope

- `REQ-01` Extend the mutation vault contract to support `agent` entries without weakening existing `skill` and `configured-mcp` validation.
- `REQ-02` Discover live Claude Code, Codex, and Cursor agent files as `read-write` items for global and project layers.
- `REQ-03` Disable a live agent file by moving that file into AgentScope's app-state vault and writing a vault manifest with original path, display name, item id, layer, provider, and payload kind.
- `REQ-04` Discover a vaulted agent file as a disabled inventory item when no live item with the same id exists.
- `REQ-05` Re-enable a vaulted agent file by restoring it to the original path and deleting the vault manifest directory.
- `REQ-06` Preserve blocked read-only mutation planning for each non-agent modern surface family present in fixtures: hooks, provider settings, plugin configs, plugin manifests, permissions files, sandbox files, and unsupported provider tools.
- `REQ-07` Update MCP compatibility and README or memory-bank documentation so callers can distinguish writable agent files from read-only modern surfaces.

### Non-Scope

- `NS-01` No hook editing, hook command enablement, hook removal, or hook installation.
- `NS-02` No provider settings, permissions, sandbox, or policy file mutation.
- `NS-03` No plugin install, uninstall, marketplace, manifest rewrite, or provider-managed plugin lifecycle mutation.
- `NS-04` No real local Claude, Codex, or Cursor configuration mutation during implementation or verification.
- `NS-05` No `.env*` reads, copies, fixtures, or derived values.
- `NS-06` No compatibility-path deduplication for providers that can read another provider's agent directory; drift reporting remains downstream work.

### Constraints / Assumptions

- `ASM-01` Provider docs reviewed on 2026-06-18 identify agent or subagent files as user-visible local configuration, while hook and plugin write semantics remain provider-specific.
- `ASM-02` Moving an agent file out of the provider agent directory is a reversible local availability operation for AgentScope's safety model; this feature does not claim a provider-native enable or disable API.
- `CON-01` The implementation must use AgentScope's existing mutation plan, source fingerprint, backup, and audit machinery rather than applying provider-specific writes directly.
- `CON-02` A toggle plan must block if the vault path already exists, the live path is missing, the vaulted payload is missing, the vault manifest is invalid, or the original path already exists during restore.
- `CON-03` Tests and implementation must not read or modify real provider roots.
- `DEC-01` Agent files are the only modern surface made writable in this feature; every other modern surface remains read-only or unsupported.

## How

### Solution

Add `agent` as a vault entry kind and reuse the existing path-vault mutation pattern already used for file-backed capabilities. Provider discovery marks live agent files as `read-write`, loads matching vaulted agent manifests as disabled items, and routes `category: "agent"` toggle planning through a file-vault planner.

The provider-specific agent parsers from `FT-009` remain the source of live display names and ids. The vault manifest preserves the selected `DiscoveryItem` identity so a disabled agent can be restored without reparsing the vaulted file.

### Change Surface

| Surface | Type | Why it changes |
| --- | --- | --- |
| `tools/agentscope/src/core/mutation-vault.ts` | code | Add `agent` as a validated vault entry kind |
| `tools/agentscope/src/providers/claude.ts` | code | Discover vaulted agents and plan Claude agent file disable/restore |
| `tools/agentscope/src/providers/codex.ts` | code | Discover vaulted agents and plan Codex agent file disable/restore |
| `tools/agentscope/src/providers/cursor.ts` | code | Discover vaulted agents and plan Cursor agent file disable/restore |
| `tools/agentscope/test/provider-discovery.test.ts` | tests | Prove live and disabled agent inventory states |
| `tools/agentscope/test/toggle.test.ts` | tests | Prove CLI-level disable and restore behavior for agent files |
| `tools/agentscope/test/mcp-server.test.ts` | tests | Prove MCP selectors and toggle planning expose the new writable boundary |
| `tools/agentscope/README.md` | docs | Explain agent files are writable while other modern surfaces remain read-only |
| `memory-bank/prd/PRD-004-modern-provider-configuration-surfaces.md` | docs | Sync downstream feature status after FT-009 and during FT-010 |
| `memory-bank/features/FT-010/*` | docs | Record feature intent, execution plan, protocol state, and evidence |

### Contracts

| Contract ID | Input / Output | Producer / Consumer | Notes |
| --- | --- | --- | --- |
| `CTR-01` | `VaultEntryKind = "skill" | "configured-mcp" | "agent"` | mutation vault / providers | Existing entries remain valid |
| `CTR-02` | Live agent inventory item | providers / CLI, MCP, snapshots | `kind: "agent"`, `category: "agent"`, `mutability: "read-write"`, `enabled: true` |
| `CTR-03` | Disabled vaulted agent inventory item | providers / CLI, MCP, snapshots | `enabled: false`, `statePath` points to vault entry, `sourcePath` points to original path |
| `CTR-04` | Agent file-vault plan | provider `planToggle` / mutation engine | Renames live file to vault payload path and creates `entry.json` |
| `CTR-05` | Agent restore plan | provider `planToggle` / mutation engine | Renames vaulted payload to original path, deletes `entry.json`, then deletes the vault directory |
| `CTR-06` | Read-only modern surface blocked decision | providers / CLI and MCP plan tools | Non-agent modern surfaces keep no-op write surface and explain read-only status |

### Failure Modes

- `FM-01` Vault validation rejects new `agent` entries, causing disabled agents to disappear or emit warnings.
- `FM-02` A live agent item remains read-only, so CLI and MCP cannot plan a toggle.
- `FM-03` Restore overwrites a newly created live agent file instead of blocking on conflict.
- `FM-04` Invalid vaulted payloads produce enabled items or write plans instead of scoped warnings or blocked decisions.
- `FM-05` Generic toggle routing accidentally makes hooks, settings, plugin manifests, or plugin configs writable.
- `FM-06` Tests mutate real provider directories rather than fixture or temp roots.

### ADR Dependencies

None.

## Verify

### Acceptance Scenarios

| Scenario ID | Requirement refs | Given | When | Then | Evidence |
| --- | --- | --- | --- | --- | --- |
| `SC-01` | `REQ-01`, `REQ-02`, `REQ-03` | A fixture Claude, Codex, or Cursor agent file exists in a provider agent directory | AgentScope plans or applies a file-vault toggle | The file is moved into an AgentScope vault and a `kind: "agent"` manifest is written | `EVID-01`, `EVID-02` |
| `SC-02` | `REQ-04` | A vaulted agent manifest and payload exist, and no matching live file exists | AgentScope discovers provider inventory | The agent appears as disabled, read-write inventory | `EVID-01` |
| `SC-03` | `REQ-05` | A disabled vaulted agent exists | AgentScope plans or applies an enable toggle | The file is restored to its original path and the vault directory is removed | `EVID-02` |
| `SC-04` | `REQ-06` | Hook, provider setting, permission, sandbox, plugin config, plugin manifest, and unsupported tool items exist in fixtures | AgentScope plans toggles for those non-agent modern surfaces | Each plan is blocked as read-only or unsupported and contains no mutation operations | `EVID-03` |
| `SC-05` | `REQ-07` | A user or MCP client reads docs or structured output | They inspect modern provider surfaces | Agent files are distinguished from other read-only modern surfaces | `EVID-04` |

### Negative / Edge Cases

| Case ID | Requirement refs | Case | Expected result |
| --- | --- | --- | --- |
| `NEG-01` | `REQ-03`, `CON-02` | Disable target already has a vault manifest or payload path | Toggle plan is blocked with `vault-conflict` |
| `NEG-02` | `REQ-05`, `CON-02` | Restore target's original path already exists | Toggle plan is blocked with `live-path-conflict` |
| `NEG-03` | `REQ-04`, `REQ-05` | Vault manifest has a non-path payload kind or missing payload | Discovery warns or restore blocks; no write plan is produced |
| `NEG-04` | `REQ-06`, `DEC-01` | Any non-agent modern surface family from `REQ-06` is selected for toggle | Toggle plan is blocked and operations are empty |

### Checks

| Check ID | Command / procedure | Covers | Required before done |
| --- | --- | --- | --- |
| `CHK-01` | `cd tools/agentscope && npx vitest run test/provider-discovery.test.ts` | Live and vaulted agent discovery plus read-only boundaries | yes |
| `CHK-02` | `cd tools/agentscope && npx vitest run test/toggle.test.ts test/mcp-server.test.ts` | CLI/MCP toggle planning and apply/restore behavior | yes |
| `CHK-03` | `cd tools/agentscope && npm run build` | TypeScript and generated `dist/` consistency | yes |
| `CHK-04` | `cd tools/agentscope && npm test` | Full AgentScope regression suite | yes |
| `CHK-05` | `cd tools/agentscope && npm run lint` | Biome formatting and linting | yes |
| `CHK-06` | `git diff --check` | Whitespace and patch integrity | yes |
| `CHK-07` | Review external CI status or record approved local-only exception | Feature-flow CI evidence expectation | yes |

### Evidence Contract

| Evidence ID | Carrier | Produced by | Notes |
| --- | --- | --- | --- |
| `EVID-01` | Provider discovery test output | `CHK-01` | Must include enabled and disabled agent cases |
| `EVID-02` | Toggle and MCP test output | `CHK-02` | Must include file-vault and restore behavior |
| `EVID-03` | Blocked modern surface assertions | `CHK-01`, `CHK-02` | Must include hook, provider-setting, permission, sandbox, plugin-config, plugin-manifest, and unsupported-tool families where fixture providers expose them |
| `EVID-04` | Updated README and memory-bank docs | doc review and `CHK-05` | Must not overclaim hooks/plugins/settings writes |
| `EVID-05` | Full local build/test/lint, `git diff --check`, and external CI exception record | `CHK-03` through `CHK-07` | Required before local commit; external CI is not run without push/PR approval |

### Traceability Matrix

| Requirement | Acceptance scenarios | Negative cases | Checks | Evidence |
| --- | --- | --- | --- | --- |
| `REQ-01` | `SC-01`, `SC-02` | `NEG-03` | `CHK-01`, `CHK-03` | `EVID-01`, `EVID-05` |
| `REQ-02` | `SC-01` | `NEG-04` | `CHK-01` | `EVID-01` |
| `REQ-03` | `SC-01` | `NEG-01` | `CHK-02` | `EVID-02` |
| `REQ-04` | `SC-02` | `NEG-03` | `CHK-01` | `EVID-01` |
| `REQ-05` | `SC-03` | `NEG-02`, `NEG-03` | `CHK-02` | `EVID-02` |
| `REQ-06` | `SC-04` | `NEG-04` | `CHK-01`, `CHK-02` | `EVID-03` |
| `REQ-07` | `SC-05` | `NEG-04` | `CHK-05` | `EVID-04`, `EVID-05` |

### Exit Criteria

- All `REQ-*` rows have automated coverage or documented evidence.
- Agent file toggles are reversible in fixture-backed CLI or MCP tests.
- Non-agent modern surfaces remain blocked.
- Full build, test, lint, and diff checks pass.
- External CI is green when available, or the local-only exception is recorded because no push or PR is approved.
- Focused review has no unresolved findings.
- `feature.md` has `delivery_status: done` and `implementation-plan.md` has `status: archived`.
