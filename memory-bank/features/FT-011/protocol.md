---
title: "Protocol: FT-011 Provider Drift And Compatibility Reporting"
doc_kind: process
doc_function: protocol
purpose: "Lifecycle protocol for creating, grooming, and executing the FT-011 provider drift and compatibility reporting feature."
derived_from:
  - ../../prd/PRD-004-modern-provider-configuration-surfaces.md
  - ../../flows/workflows.md
  - ../../flows/feature-flow.md
status: active
audience: humans_and_agents
protocol_version: "0.1"
current_phase: done
current_gate: H2
---

# Protocol: `FT-011 Provider Drift And Compatibility Reporting`

## Source Interpretation

Source used:

- `PRD-004`, especially `G-02`, `G-03`, `MET-03`, `MET-04`, and downstream `FT-011`.
- Completed `FT-009` read-only modern surface discovery.
- Completed `FT-010` verified AgentScope-managed agent file toggles.
- Current `tools/agentscope/test/fixtures/capability-matrix.json`, `doctor`, `providers`, and MCP doctor behavior.

Repository adaptation:

- FT-011 reports capability and fixture drift; it does not add new hooks, plugin, settings, permission, sandbox, or provider-native agent writes.
- The first drift carrier is the committed capability matrix, because it previously named only skills, MCPs, and tools after modern surface support existed.
- External provider docs and changelogs remain the source of truth for future compatibility changes, but this slice records the current AgentScope support boundary rather than re-researching providers.

## Goal

Make AgentScope's provider capability reporting explicit enough that stale matrix fields, missing modern-surface statuses, and doctor/MCP doctor validation failures are visible to users and agent clients.

Target state:

- `capability-matrix.json` includes modern surface statuses for agents, hooks, provider settings, plugin configs, plugin manifests, and extensions.
- `agentscope providers` renders those modern surface statuses in a stable order.
- `agentscope doctor` reports capability-matrix validation failures as command output instead of throwing.
- `agentscope_run_doctor` returns structured capability-matrix issues for MCP clients.
- Memory-bank docs and README describe the drift-reporting boundary.
- The feature is committed as one local feature-slice commit after local verification; push/PR/CI requires separate approval.

## Scope

In scope:

- Extend the capability matrix schema and committed fixture matrix for modern provider surfaces.
- Add validation that every provider has every required capability field.
- Add command and MCP doctor output for capability-matrix validation failures.
- Update provider rendering and docs.
- Use TDD and subagent review.

Out of scope:

- Re-querying every provider changelog during implementation.
- Provider-native compatibility path deduplication.
- New mutation support.
- External CI, push, PR, merge, release, or publication.

## State

- Status: done
- Current phase: done
- Current gate: H2
- Current actor: master Codex agent
- Next action: local feature-slice commit.
- Open loops:
  - External CI is not run because push/PR approval is out of scope.
- Rollback mode: source-only revert for repository edits; no live provider or external state mutation is allowed.

## Human Gates

### H1: Approve scoped execution

Approval record:

- Approver: Igor Arkhipov
- Date: 2026-06-18
- Scope approved: Continue the memory-bank workflow and implement suggested provider-surface features when possible.
- Conditions: Do not modify real provider configuration directly; do not read or use `.env*`; use one commit per feature slice.

### H2: Commit point / production go-no-go

Required before:

- Creating the local FT-011 feature-slice commit.

Required evidence:

- Targeted FT-011 tests.
- `cd tools/agentscope && npm run build`
- `cd tools/agentscope && npm test`
- `cd tools/agentscope && npm run lint`
- `git diff --check`
- Focused review with no unresolved findings.
- External CI exception recorded because no push or PR is approved.

### H3: Destructive or irreversible action

Required before any external or irreversible operation. No H3 action is in scope.

## Execution Record

| Time | Actor | Event | Evidence |
| --- | --- | --- | --- |
| 2026-06-18 | master Codex agent | Created FT-011 protocol, feature, implementation plan, and README from PRD-004 downstream feature intent | `memory-bank/features/FT-011/` |
| 2026-06-18 | document review subagent | Reviewed FT-011 docs and found plan-shape, REQ-05 acceptance, and local-example drift traceability gaps | document review findings addressed in `feature.md`, `implementation-plan.md`, `PRD-004`, and README |
| 2026-06-18 | master Codex agent | Added RED tests for modern matrix fields, stale matrix doctor output, MCP structured issues, and provider rendering | `test/provider-capabilities.test.ts`, `test/doctor.test.ts`, `test/mcp-server.test.ts` |
| 2026-06-18 | master Codex agent | Implemented capability-matrix validation report, modern capability rendering, CLI doctor output, and MCP doctor structured issues | `src/providers/registry.ts`, `src/commands/providers.ts`, `src/commands/doctor.ts`, `src/mcp/helpers.ts` |
| 2026-06-18 | spec and code review subagents | Resolved tools/extensions label ambiguity, partial capability typing, and stale protocol state findings | focused re-review passed; code-quality review approved with minor findings addressed |
| 2026-06-18 | master Codex agent | Ran local verification bundle before closure | `npx vitest run test/provider-capabilities.test.ts test/doctor.test.ts test/mcp-server.test.ts` passed 18 tests; `npm run build` passed; `npm test` passed 23 files / 191 tests; `npm run lint` passed with existing Biome schema-version info; `git diff --check` passed |
