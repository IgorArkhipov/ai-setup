---
title: "FT-014: MCP Structured Contract Parity"
doc_kind: feature
doc_function: canonical
purpose: "Canonical feature document for aligning AgentScope MCP structured responses with the original Phase 3 contract while preserving compatibility."
derived_from:
  - ../../domain/problem.md
  - ../../prd/PRD-003-persistent-discovery-snapshots-and-secondary-surfaces.md
  - ../FT-008/feature.md
  - protocol.md
status: active
delivery_status: done
audience: humans_and_agents
must_not_define:
  - implementation_sequence
---

# FT-014: MCP Structured Contract Parity

## What

### Problem

The local AgentScope MCP server exposes the planned tool names, but several structured responses are slimmer than the original Phase 3 contract. Agent clients can still use the tools, but they must infer counts, blocked reasons, selected item details, and fingerprint mismatch state from inconsistent field names.

### Outcome

| Metric ID | Metric | Baseline | Target | Measurement method |
| --- | --- | --- | --- | --- |
| `MET-01` | MCP list responses expose counts and limits | callers infer from `items.length` | `totalMatched` and limit handling are explicit | MCP tests |
| `MET-02` | MCP single-item mutation responses expose review shape | responses lack `applyMode`, full `item`, and `blocked` shape | plan/apply responses include documented review fields | MCP tests |
| `MET-03` | MCP bulk responses expose documented sets and counts | responses use legacy `matched`, `actionable`, and `blocked` only | additive documented aliases are present | MCP tests |
| `MET-04` | MCP failure responses are machine-actionable | fingerprint mismatch returns only `reason` | blocked responses include `reasonCode` and current fingerprint where relevant | MCP tests |
| `MET-05` | MCP mutating restore is explicitly confirmed | restore can be called with only a backup id | restore blocks until confirmation is present | MCP tests |
| `MET-06` | MCP doctor is provider-scoped | doctor exposes only top-level fixture/discovery details | doctor includes provider-level status entries | MCP tests |

### Scope

- `REQ-01` Add optional inventory/list request filtering and list limits where documented.
- `REQ-02` Add `totalMatched` to list-item responses.
- `REQ-03` Add `applyMode`, full item details, `blocked`, and `warnings` to single-item plan/apply responses.
- `REQ-04` Add documented bulk aliases: counts, `matchedItems`, `actionableItems`, `blockedItems`, and `perItemPlans`.
- `REQ-05` Add `backupIds` and count aliases to bulk apply responses.
- `REQ-06` Add `totalBackups` and optional limit support to backup listing.
- `REQ-07` Add `reasonCode` aliases to blocked responses and `currentPlanFingerprint` on fingerprint mismatch.
- `REQ-08` Normalize planned operation payloads with documented aliases while retaining legacy internal fields.
- `REQ-09` Make bulk `planFingerprint` use the documented canonical payload ingredients: schema version, tool name, project root, normalized selector, sorted identity sets, blocked reason codes, and operation digests.
- `REQ-10` Require explicit restore confirmation and return `restoredPaths` plus warnings.
- `REQ-11` Add provider-scoped doctor request/response fields.
- `REQ-12` Update README and governed docs for the stabilized MCP response contract.

### Non-Scope

- `NS-01` No tool renames.
- `NS-02` No removal of legacy structured fields.
- `NS-03` No new provider write support.
- `NS-04` No remote transport or daemon.
- `NS-05` No `.env*` reads or fixtures.

### Constraints / Assumptions

- `CON-01` Additive fields are safe for existing MCP clients.
- `CON-02` Existing direct helper calls remain the only MCP implementation path.
- `CON-03` Bulk apply fingerprint mismatch must remain no-write and no-partial-execution.

## How

### Solution

Extend `tools/agentscope/src/mcp/schemas.ts` and `helpers.ts` to accept the documented optional request fields and return additive structured aliases. Keep existing legacy fields so tests and clients using the previous shipped shape continue to work.

### Change Surface

| Surface | Type | Why it changes |
| --- | --- | --- |
| `tools/agentscope/src/mcp/schemas.ts` | code | Add optional filter/limit and restore confirmation schema fields |
| `tools/agentscope/src/mcp/helpers.ts` | code | Add documented response fields and aliases |
| `tools/agentscope/src/mcp/tools.ts` | code | Pass new request arguments to helpers |
| `tools/agentscope/test/mcp-server.test.ts` | tests | Verify request and response contract parity |
| `tools/agentscope/README.md` | docs | Describe structured response contract boundary |
| `memory-bank/features/FT-014/*` | docs | Governed workflow and evidence |

## Verify

### Exit Criteria

- `EC-01` MCP read/list responses include documented counts and limits.
- `EC-02` single-item plan/apply responses include documented review fields.
- `EC-03` bulk plan/apply responses include documented counts and item-set aliases.
- `EC-04` blocked responses include stable `reasonCode`, and fingerprint mismatches include `currentPlanFingerprint`.
- `EC-05` restore blocks without explicit confirmation and reports restored paths after confirmed restore.
- `EC-06` doctor includes provider-scoped status entries.
- `EC-07` local verification and external CI pass.

### Checks

| Check ID | Covers | How to check | Expected result |
| --- | --- | --- | --- |
| `CHK-01` | `EC-01` through `EC-06` | `cd tools/agentscope && npx vitest run test/mcp-server.test.ts` | MCP contract tests pass |
| `CHK-02` | `EC-07` | `cd tools/agentscope && npm run build && npm test && npm run coverage && npm run lint`; `git diff --check` | all commands pass |
| `CHK-03` | `EC-07` | GitHub Actions CI on pushed `main` | all jobs pass |
