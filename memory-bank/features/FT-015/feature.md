---
title: "FT-015: Zed Provider Support"
doc_kind: feature
doc_function: canonical
purpose: "Canonical feature document for adding Zed provider discovery and safe toggles to AgentScope."
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

# FT-015: Zed Provider Support

## What

### Problem

Zed now exposes AI-agent configuration surfaces that overlap with AgentScope's managed domain: reusable Skills, always-on instruction files, and MCP server configuration. AgentScope currently models Claude Code, Codex, and Cursor, so Zed users cannot inspect or safely toggle Zed skills and configured MCP entries through the same CLI, dashboard, snapshot, and MCP control plane.

### Source Evidence

Evidence checked on 2026-06-20:

- Zed Skills are folders containing `SKILL.md`; global installs live under `~/.agents/skills/`, and project-local installs live under `.agents/skills/`.
- Zed Instructions use personal `~/.config/zed/AGENTS.md` and project instruction files such as `AGENTS.md`; these are always-on context, not reusable skill packages. When several recognized project instruction files are present, AgentScope reports them all and marks only the first file in Zed precedence order active.
- Zed MCP custom servers are configured in settings JSON under the `context_servers` key.
- Zed settings can be global or project-local; project settings use `.zed/settings.json`.

### Outcome

| Metric ID | Metric | Baseline | Target | Measurement method |
| --- | --- | --- | --- | --- |
| `MET-01` | Zed appears as first-class provider | capability matrix has Claude, Codex, Cursor only | provider matrix, inventory summaries, CLI filters, and MCP schemas include `zed` | provider capability and MCP tests |
| `MET-02` | Zed skills are manageable | `.agents/skills` is invisible to AgentScope | global and project Zed skills are discovered as read-write and use file-vault toggles | provider and toggle tests |
| `MET-03` | Zed MCPs are manageable | `context_servers` is invisible to AgentScope | global/project settings `context_servers` entries are discovered as read-write configured MCPs and can be vaulted/restored | provider and toggle tests |
| `MET-04` | Zed settings and instructions are safe | instruction/settings files are not visible | Zed `AGENTS.md` and settings files are visible as read-only provider-setting inventory | provider and blocked-toggle tests |

### Scope

- `REQ-01` Add `zed` to AgentScope provider ids, ordering, capability matrix, MCP schemas, CLI/dashboard/list/snapshot/default provider sets, and docs.
- `REQ-02` Discover Zed global skills from `~/.agents/skills/*/SKILL.md` and project skills from `.agents/skills/*/SKILL.md`.
- `REQ-03` Toggle Zed skills through the existing AgentScope path-vault model.
- `REQ-04` Discover Zed configured MCP servers from `context_servers` in `~/.config/zed/settings.json`, `~/.zed/settings.json`, and project `.zed/settings.json`.
- `REQ-05` Toggle Zed configured MCP entries by vaulting the server JSON object and removing/restoring only the selected `context_servers` entry.
- `REQ-06` Discover Zed personal/project instructions and settings files as read-only provider-setting items.
- `REQ-07` Update README and governed docs with the Zed support boundary and source evidence.

### Non-Scope

- `NS-01` No Zed extension install, uninstall, marketplace, or extension-manifest mutation.
- `NS-02` No mutation of Zed instruction files or general settings beyond selected `context_servers` entries.
- `NS-03` No tool permission, profile, model, account, or hosted-agent settings mutation.
- `NS-04` No real local Zed configuration mutation during implementation or verification.
- `NS-05` No `.env*` reads, copies, fixtures, or derived values.

### Constraints / Assumptions

- `CON-01` Zed skill toggles must reuse AgentScope path-vault operations.
- `CON-02` Zed configured MCP toggles must reuse JSON object-entry mutation operations and fail closed on malformed settings or live conflicts.
- `CON-03` Zed instruction files are provider settings for inventory purposes; they are not skills and are not writable in this slice.
- `ASM-01` Supporting both `~/.config/zed/settings.json` and `~/.zed/settings.json` avoids a platform-specific blind spot while keeping each settings file independently selectable.

## How

### Solution

Add a dedicated `zedProvider` adapter. It discovers `.agents/skills`, Zed settings files, `context_servers`, and instruction files, then uses the existing mutation engine for reversible Zed skill and configured MCP toggles. Provider settings and instructions remain read-only and block toggle planning.

### Change Surface

| Surface | Type | Why it changes |
| --- | --- | --- |
| `tools/agentscope/src/providers/zed.ts` | code | New provider adapter |
| `tools/agentscope/src/providers/registry.ts` | code | Add Zed provider matrix and fixture validation |
| `tools/agentscope/src/core/models.ts` | code | Add Zed to provider order |
| `tools/agentscope/src/core/mutation-vault.ts` | code | Allow Zed vault entries |
| `tools/agentscope/src/mcp/schemas.ts` and `src/mcp/helpers.ts` | code | Accept and discover Zed through MCP |
| `tools/agentscope/src/commands/*` | code | Include Zed in CLI discovery defaults |
| `tools/agentscope/test/fixtures/` | tests | Add Zed provider and runtime fixtures |
| `tools/agentscope/test/*.test.ts` | tests | Add Zed capability, discovery, list, and toggle coverage |
| `tools/agentscope/README.md` and `memory-bank/` | docs | Document Zed support and boundaries |

## Verify

### Exit Criteria

- `EC-01` Zed is present in provider ordering, capability matrix, CLI discovery, and MCP provider schema.
- `EC-02` Zed skills are discovered and can be disabled/restored through vault-backed toggles in fixture sandboxes.
- `EC-03` Zed `context_servers` entries are discovered and can be disabled/restored through JSON payload vaults in fixture sandboxes.
- `EC-04` Zed settings and instruction files are visible as read-only inventory and toggle planning blocks them with no writes.
- `EC-05` README, PRD-004, and feature registry describe the Zed support boundary.
- `EC-06` local verification and external CI pass.

### Checks

| Check ID | Covers | How to check | Expected result |
| --- | --- | --- | --- |
| `CHK-01` | `EC-01` through `EC-04` | `cd tools/agentscope && npx vitest run test/provider-capabilities.test.ts test/provider-discovery.test.ts test/toggle.test.ts test/list.test.ts` | focused Zed tests pass |
| `CHK-02` | `EC-01`, `EC-05` | `cd tools/agentscope && npx vitest run test/mcp-server.test.ts test/cli.test.ts` | MCP and CLI contracts pass |
| `CHK-03` | `EC-06` | `cd tools/agentscope && npm run build && npm test && npm run coverage && npm run lint`; `git diff --check` | all local checks pass |
| `CHK-04` | `EC-06` | GitHub Actions CI on pushed `main` | all jobs pass |

### Acceptance Scenarios

| Scenario ID | Covers | Given | When | Then |
| --- | --- | --- | --- | --- |
| `SC-01` | `REQ-01`, `REQ-02`, `REQ-06` | fixture Zed skills, settings, and instructions exist | AgentScope lists inventory | Zed items appear with stable provider, kind, category, layer, id, source path, and mutability |
| `SC-02` | `REQ-03` | a fixture Zed skill is enabled | AgentScope applies a disable and then enable toggle | the skill folder moves into and out of the AgentScope vault with backup/audit coverage |
| `SC-03` | `REQ-04`, `REQ-05` | a fixture Zed settings file has a `context_servers.github` entry | AgentScope applies a disable and then enable toggle | only that server entry is removed/restored and the vaulted payload contains the exact server object |
| `SC-04` | `REQ-06` | a Zed instruction item is selected | AgentScope plans a disable toggle | planning is blocked as read-only with no operations |

### Evidence

| Evidence ID | Artifact | Producer | Path contract |
| --- | --- | --- | --- |
| `EVID-01` | Focused Vitest output | test runner | terminal output from `CHK-01` |
| `EVID-02` | MCP/CLI Vitest output | test runner | terminal output from `CHK-02` |
| `EVID-03` | Full local verification output | local verifier | terminal output from `CHK-03` |
| `EVID-04` | CI run | GitHub Actions | run id recorded in `protocol.md` |
