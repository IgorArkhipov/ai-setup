---
title: "Protocol: FT-014 MCP Structured Contract Parity"
doc_kind: process
doc_function: protocol
purpose: "Lifecycle protocol for aligning the AgentScope MCP structured responses with the original Phase 3 contract."
derived_from:
  - ../../prd/PRD-003-persistent-discovery-snapshots-and-secondary-surfaces.md
  - ../FT-008/feature.md
  - ../../flows/agent-process-operations.md
  - ../../flows/workflows.md
status: active
audience: humans_and_agents
protocol_version: "0.1"
current_phase: local_acceptance
current_gate: H2
---

# Protocol: `FT-014 MCP Structured Contract Parity`

## Source Interpretation

Source used:

- Current persistent user goal: implement all remaining features from `tmp/Agentscope Implementation Plan.md` one by one using memory-bank and protocol workflow.
- Phase 3 of `tmp/Agentscope Implementation Plan.md`, especially exact request/response shapes for inventory, listing, single-item planning/apply, bulk planning/apply, backup listing, restore, and doctor.
- Current MCP implementation in `tools/agentscope/src/mcp/*`, which exposes the correct tool names but returns slimmer structured payloads.

Repository adaptation:

- Add missing documented fields without removing current fields.
- Keep the MCP layer as a thin adapter over existing discovery, mutation, backup, restore, and doctor helpers.
- Do not change provider write behavior.

## Metadata

- Protocol version: 0.1
- Owner: Igor Arkhipov
- Work area: `/Users/igor.arkhipov/Documents/Work/Ruby/thinknetica/ai-setup`, feature `FT-014`, tool `tools/agentscope`
- Created: 2026-06-20
- Last updated: 2026-06-20
- Status: active
- Current phase: local_acceptance
- Current gate: H2

## Goal

Make AgentScope MCP structured tool responses match the original Phase 3 contract closely enough that agents can reason about selections, blocked items, counts, fingerprints, backups, and confirmation failures without provider-specific guessing.

## Scope

In scope:

- Add request filters for inventory summary and list/backup limits.
- Add `totalMatched`, counts, `matchedItems`, `actionableItems`, `blockedItems`, `perItemPlans`, `backupIds`, and `totalBackups` fields.
- Add `applyMode`, full selected `item`, `blocked`, and `warnings` fields for single-item plan/apply responses.
- Add documented planned-operation aliases and a canonical bulk `planFingerprint` payload.
- Add `reasonCode` and `currentPlanFingerprint` aliases for blocked bulk apply responses.
- Require explicit restore confirmation and add provider-scoped doctor output.
- Update tests and docs.

Out of scope:

- Renaming MCP tools.
- Removing existing structured fields.
- Changing provider discovery or mutation semantics.
- Adding a remote MCP server or HTTP daemon.
- Reading or using `.env*` files.

## Operating Constraints

- Do not read or use `.env*`.
- Keep tool responses deterministic.
- Preserve existing MCP callers by adding fields instead of deleting fields.
- One commit per feature slice after verification.

## Human Gates

### H1: Approve scoped execution

Approval record:

- Approver: Igor Arkhipov
- Date: 2026-06-20
- Scope approved: Continue implementing remaining original-plan features one by one with memory-bank/protocol workflow.
- Conditions: No real provider config mutation in tests; no `.env*` access; one commit per feature slice.

### H2: Commit and push point

Required before:

- Creating and pushing the FT-014 feature-slice commit.
- Treating external CI as acceptance evidence.

Required evidence before H2:

- Focused MCP tests pass.
- `cd tools/agentscope && npm run build`
- `cd tools/agentscope && npm test`
- `cd tools/agentscope && npm run coverage`
- `cd tools/agentscope && npm run lint`
- `git diff --check`
- Focused review findings are resolved.

Approval record:

- Approver: Igor Arkhipov
- Date: 2026-06-20
- Scope approved: Commit and push FT-014 after local verification and resolved subagent review.
- Conditions: No release, publication, or real provider configuration mutation.

## Hard Stop Conditions

Stop and report if:

- any step requires reading, printing, copying, or deriving values from `.env*`;
- contract alignment requires removing legacy response fields;
- MCP responses start shelling out instead of using direct helper calls;
- verification cannot prove bulk apply still fails closed on fingerprint mismatch.

## Execution Record

| Time | Actor | Event | Evidence |
| --- | --- | --- | --- |
| 2026-06-20 | master Codex agent | Created FT-014 protocol and feature package from the remaining MCP contract gap | `memory-bank/features/FT-014/` |
| 2026-06-20 | Nash api-contract subagent | Audited Phase 3 MCP contract gaps before implementation and identified restore, fingerprint, blocked, operation, read/list/backup, single/bulk, and doctor gaps | subagent `019ee5b3-e886-70b1-97c2-697bec80f307` |
| 2026-06-20 | master Codex agent | Added MCP contract tests and additive response/request implementation for FT-014 | `tools/agentscope/test/mcp-server.test.ts`, `tools/agentscope/src/mcp/*` |
| 2026-06-20 | James api-contract subagent | Reviewed initial implementation and reported unresolved doctor, reason-code, restore-status, and affected-path findings | subagent `019ee5bb-49bc-7030-9297-60d7d47faf68` |
| 2026-06-20 | Huygens api-contract subagent | Re-reviewed follow-up fixes and found public noop, apply-time blocked aggregation, scoped doctor error, and missing-selection shape gaps | subagent `019ee5c1-8433-7411-832b-5f2772ebac44` |
| 2026-06-20 | master Codex agent | Addressed re-review findings and verified focused/full local checks | `npx vitest run test/mcp-server.test.ts`, `npm run build`, `npm run lint`, `npm test`, `npm run coverage`, `git diff --check` |
| 2026-06-20 | McClintock api-contract subagent | Final contract re-review passed with no findings, residual risks, or testing gaps | subagent `019ee5cb-cdce-7a20-b83c-f3231e559554` |
