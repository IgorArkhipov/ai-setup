---
title: "Protocol: FT-015 Zed Provider Support"
doc_kind: process
doc_function: protocol
purpose: "Lifecycle protocol for extending AgentScope with first-class Zed provider support."
derived_from:
  - ../../prd/PRD-004-modern-provider-configuration-surfaces.md
  - ../../flows/agent-process-operations.md
  - ../../flows/workflows.md
status: active
audience: humans_and_agents
protocol_version: "0.1"
current_phase: done
current_gate: H2
---

# Protocol: `FT-015 Zed Provider Support`

## Source Interpretation

Source used:

- Current user goal: extend the AgentScope plan/specification/implementation with Zed support.
- Official Zed docs checked on 2026-06-20 for Skills, Instructions, Agent Settings, and MCP.
- Existing PRD-004 modern provider surface initiative.
- Existing provider adapters for Claude Code, Codex, and Cursor.

Repository adaptation:

- Zed becomes a new provider id rather than a compatibility mode of another provider.
- Zed Skills are reusable `SKILL.md` folders and should be modeled as `kind: skill`.
- Zed `AGENTS.md` files are instructions and should be modeled as read-only provider settings, not skills.
- Zed `context_servers` entries are configured MCPs and can use the existing JSON object-entry mutation path.

## Metadata

- Protocol version: 0.1
- Owner: Igor Arkhipov
- Work area: `/Users/igor.arkhipov/Documents/Work/Ruby/thinknetica/ai-setup`, feature `FT-015`, tool `tools/agentscope`
- Created: 2026-06-20
- Last updated: 2026-06-20
- Status: active
- Current phase: done
- Current gate: H2

## Goal

Add Zed as a first-class AgentScope provider with verified discovery and safe toggles for Zed skills and configured MCP servers, while keeping Zed instructions and general settings read-only.

## Scope

In scope:

- Add Zed to provider ids, capability matrix, provider ordering, MCP schemas, CLI/MCP provider defaults, README, and PRD-004.
- Discover Zed global and project `.agents/skills/*/SKILL.md`.
- Toggle Zed skills through AgentScope path-vault operations.
- Discover Zed `context_servers` entries in global and project settings JSON.
- Toggle selected Zed `context_servers` entries through AgentScope JSON-payload vault operations.
- Discover Zed instruction/settings files as read-only inventory.

Out of scope:

- Zed extension lifecycle mutation.
- Zed instruction, profile, model, account, or general settings mutation.
- Real local Zed configuration mutation.
- `.env*` reads or fixtures.

## Human Gates

### H1: Approve scoped execution

Approval record:

- Approver: Igor Arkhipov
- Date: 2026-06-20
- Scope approved: Extend the AgentScope plan/specification/implementation with Zed support.
- Conditions: Preserve memory-bank workflow, no `.env*` access, one feature slice per commit.

### H2: Commit and push point

Required before:

- Creating and pushing the FT-015 feature-slice commit.
- Treating external CI as acceptance evidence.

Required evidence before H2:

- Focused Zed tests pass.
- MCP/CLI tests pass.
- Full local build, test, coverage, lint, and `git diff --check` pass.
- Review findings are resolved.

Approval record:

- Approver: Igor Arkhipov
- Date: 2026-06-20
- Scope approved: Commit and push FT-015 after local verification and resolved review findings.
- Conditions: No release, publication, or real provider configuration mutation.

## Hard Stop Conditions

Stop and report if:

- any step requires reading, printing, copying, or deriving values from `.env*`;
- Zed support requires undocumented mutation of instruction, profile, account, model, extension, or provider-owned cache state;
- a restore path would overwrite a live `context_servers` entry;
- the diff includes unrelated files.

## Execution Record

| Time | Actor | Event | Evidence |
| --- | --- | --- | --- |
| 2026-06-20 | master Codex agent | Verified official Zed docs for Skills, Instructions, Agent Settings, and MCP custom server configuration | Zed docs: Skills, Instructions, Agent Settings, MCP |
| 2026-06-20 | master Codex agent | Created FT-015 feature package and updated PRD-004 downstream scope | `memory-bank/features/FT-015/`, `memory-bank/prd/PRD-004-modern-provider-configuration-surfaces.md` |
| 2026-06-20 | master Codex agent | Added Zed provider implementation, fixtures, README updates, and focused tests | `tools/agentscope/src/providers/zed.ts`, `tools/agentscope/test/fixtures/zed/`, `tools/agentscope/test/*` |
| 2026-06-20 | Ohm api-contract subagent | Reviewed initial Zed implementation and found snapshot compatibility, JSONC mutation, instruction precedence, and docs-status findings | subagent `019ee5ee-5a04-74f3-9518-8e9ce9613b88` |
| 2026-06-20 | master Codex agent | Addressed review findings with legacy snapshot normalization, strict-JSON Zed write gating, instruction-precedence coverage, and docs-status correction | `tools/agentscope/src/core/snapshots.ts`, `tools/agentscope/src/providers/zed.ts`, `tools/agentscope/test/*`, `memory-bank/prd/PRD-004-modern-provider-configuration-surfaces.md` |
| 2026-06-20 | Averroes api-contract subagent | Found a bulk MCP compatibility risk where omitted provider selectors would newly include Zed writable items | subagent `019ee5f6-df99-7831-b0ef-8a7caa3477fd` |
| 2026-06-20 | master Codex agent | Resolved bulk MCP compatibility by normalizing omitted bulk mutation provider selectors to the legacy writable set and requiring explicit Zed provider selection | `tools/agentscope/src/mcp/helpers.ts`, `tools/agentscope/test/mcp-server.test.ts`, `tools/agentscope/README.md` |
| 2026-06-20 | Averroes api-contract subagent | Re-reviewed the bulk MCP compatibility fix and reported no remaining findings | subagent `019ee5f6-df99-7831-b0ef-8a7caa3477fd` |
| 2026-06-20 | master Codex agent | Verified local gates before feature-slice commit | `CHK-01` 4 files / 82 tests; `CHK-02` 2 files / 28 tests; build pass; lint pass with Biome schema info only; `git diff --check` pass; full tests 25 files / 240 tests; coverage pass |
| 2026-06-20 | master Codex agent | Committed and pushed the FT-015 feature slice | `cdfce2b feat: add agentscope zed provider` on `main` |
| 2026-06-20 | GitHub Actions | Accepted the pushed FT-015 feature slice | CI run `27878041589` passed on `cdfce2b` |
