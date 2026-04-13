---
title: "PRD-001: Local Discovery And Safe Mutation Foundation"
doc_kind: prd
doc_function: canonical
purpose: "Records the product problem, users, goals, scope, and success metrics for the first delivered AgentScope foundation initiative across discovery, guarded mutation, and the initial writable Claude provider."
derived_from:
  - ../domain/problem.md
status: active
audience: humans_and_agents
must_not_define:
  - implementation_sequence
  - architecture_decision
  - feature_level_verify_contract
---

# PRD-001: Local Discovery And Safe Mutation Foundation

## Problem

AgentScope needed a single product initiative that turned fragmented local AI-agent configuration into one trustworthy operator workflow. Before this initiative, users had to inspect provider-specific files by hand, reason about incompatible config formats, and make risky manual edits without a safe revert path. Relative to the broader product context in [`../domain/problem.md`](../domain/problem.md), this initiative narrows the work to the first shippable foundation: unified cross-provider discovery, guarded local mutation, and one end-to-end writable provider integration that proves the product is operational rather than only infrastructural.

## Users And Jobs

| User / Segment | Job To Be Done | Current Pain |
| --- | --- | --- |
| `developer-operator` | Inspect local Claude Code, Codex, and Cursor configuration from one command surface and understand drift or parse failures quickly | State is fragmented across multiple roots and file formats, so inspection is manual and error-prone |
| `developer-operator` | Enable or disable a supported local configuration item without manually editing provider-managed files | Manual edits are risky, hard to review, and difficult to undo safely |
| `coding-agent` | Use one deterministic local automation surface to inspect and manage supported agent configuration during repository work | Provider-specific config shapes and safety rules are inconsistent, so automation cannot rely on one stable contract |

## Goals

- `G-01` Deliver one normalized inventory flow for Claude Code, Codex, and Cursor with deterministic item IDs, stable ordering, and provider-scoped warnings.
- `G-02` Deliver one guarded local mutation workflow with dry-run-first semantics, explicit apply, persistent backup state, audit history, and deterministic restore behavior.
- `G-03` Prove the shared discovery and mutation model against one real writable provider so the product is usable in day-to-day workflows rather than remaining only a framework.

## Non-Goals

- `NG-01` Build a dashboard, stdio MCP surface, cloud control plane, or any other secondary control path in this initiative.
- `NG-02` Add installation or uninstallation lifecycle management for tools, skills, plugins, or MCP servers.
- `NG-03` Expand writable support beyond the grounded Claude surface already verified by the downstream features.

## Product Scope

This initiative defines the first delivered AgentScope foundation at the capability level.

### In Scope

- Provide a CLI-first inventory surface for supported local provider state across Claude Code, Codex, and Cursor.
- Normalize discovered skills, configured MCP servers, and provider-managed tools or extensions into one shared item model.
- Preserve partial-failure visibility through provider-scoped warnings instead of hiding healthy results.
- Provide guarded dry-run, apply, and restore workflows for supported configuration changes.
- Persist AgentScope-owned lock, backup, audit, and vault state under the app-state root.
- Validate one real writable provider integration for Claude project skills, configured MCP approvals, and supported Claude tools.

### Out Of Scope

- Writable support for Codex or Cursor.
- Provider discovery or mutation outside the documented and fixture-verified roots.
- Bulk multi-item mutation, remote orchestration, or hidden fallback scanning of undocumented provider state.

## UX / Business Rules

- `BR-01` The current product surface is CLI-first; every supported user flow in this initiative must be available through the documented CLI commands.
- `BR-02` Discovery is non-destructive. Provider read or parse failures become explicit warnings instead of implicit omission.
- `BR-03` State-changing flows are dry-run by default and require explicit apply before any provider-managed write occurs.
- `BR-04` Real writes must execute only through the shared guarded mutation engine with locking, fingerprint checks, backup persistence, and rollback or restore semantics.
- `BR-05` The initiative may prove write support with Claude, but it must not imply writable parity for Codex or Cursor.

## Success Metrics

| Metric ID | Metric | Baseline | Target | Measurement method |
| --- | --- | --- | --- | --- |
| `MET-01` | Cross-provider inventory is available from one command surface | Users inspect provider files manually and per-provider | `agentscope list` returns a normalized inventory for Claude, Codex, and Cursor with stable ordering and stable item IDs | Fixture-backed command and provider tests plus direct CLI checks |
| `MET-02` | Verified local configuration changes are reversible | Users edit provider files directly and must recover by hand | Supported toggles are dry-run first and real writes produce backups, audit entries, and restore coverage | `toggle --apply` and `restore` tests plus persisted backup and audit artifacts |
| `MET-03` | At least one real provider is validated end to end for the writable path | Shared mutation semantics exist without a proven real-provider integration | Claude project skills, configured MCPs, and supported tools are discoverable and writable through the shipped CLI | Automated Claude discovery, toggle, restore, and build verification |

## Risks And Open Questions

- `RISK-01` Product trust drops if the shared normalized model hides provider-specific failures or drifts from the fixture-verified roots.
- `RISK-02` Product trust drops if guarded apply or restore leaves provider-managed state partially mutated after a failure.
- `RISK-03` The initiative may be misread as “all providers are writable” unless Claude-only writable scope stays explicit in downstream docs.
- `OQ-01` Whether broader writable provider coverage should remain incremental feature work under this PRD or be split into a future PRD once Codex or Cursor write support becomes product-meaningful.

## Downstream Features

| Feature | Why it exists | Status |
| --- | --- | --- |
| `FT-001` | Establish the trusted multi-provider discovery foundation, config/path resolution, and deterministic CLI discovery surface | `done` |
| `FT-002` | Add the shared guarded mutation engine, dry-run/apply workflow, backup state, audit history, and restore semantics | `done` |
| `FT-003` | Validate the first real writable provider integration with Claude across discovery, toggle, apply, restore, and vault-backed skill flows | `done` |
