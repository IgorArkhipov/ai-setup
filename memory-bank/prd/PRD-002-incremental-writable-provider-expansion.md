---
title: "PRD-002: Incremental Writable Provider Expansion"
doc_kind: prd
doc_function: canonical
purpose: "Records the product problem, users, goals, scope, and success metrics for expanding AgentScope's verified writable surface beyond Claude one provider at a time."
derived_from:
  - ../domain/problem.md
  - PRD-001-local-discovery-and-safe-mutation-foundation.md
status: active
audience: humans_and_agents
must_not_define:
  - implementation_sequence
  - architecture_decision
  - feature_level_verify_contract
---

# PRD-002: Incremental Writable Provider Expansion

## Problem

AgentScope's foundation is now proven for discovery, guarded mutation, and one real writable provider. The remaining gap is product consistency: Codex and Cursor are still read-only, so users cannot safely manage the local agent surfaces they already see in discovery. Relative to [`../domain/problem.md`](../domain/problem.md), this initiative narrows the next product step to incremental writable-provider expansion without broadening AgentScope into a dashboard, remote control plane, or installation manager.

## Users And Jobs

| User / Segment | Job To Be Done | Current Pain |
| --- | --- | --- |
| `developer-operator` | Disable or re-enable supported Codex or Cursor configuration from the same safe workflow already proven for Claude | Discovery shows the items, but the product still requires manual provider-specific edits to change them |
| `coding-agent` | Use one deterministic local automation surface to manage more than one provider safely | Only Claude is writable, so automation must branch back to provider-specific manual steps for Codex or Cursor |

## Goals

- `G-01` Expand AgentScope's verified writable surface beyond Claude while preserving the same dry-run, backup, audit, and restore guarantees from the shared mutation engine.
- `G-02` Ship provider-specific writable slices incrementally so each provider's grounded file semantics, failure modes, and restore behavior remain explicit.
- `G-03` Keep unsupported provider-managed surfaces visible in discovery without implying writable parity where the implementation is still intentionally blocked.

## Non-Goals

- `NG-01` Add snapshot history, an interactive dashboard, an MCP server, or any other secondary control surface in this initiative.
- `NG-02` Add plugin or extension install and uninstall workflows for any provider.
- `NG-03` Claim universal read-write parity across every discovered provider category before each slice is fixture-backed and end-to-end verified.

## Product Scope

This initiative defines the next expansion of AgentScope's safe local mutation contract after the initial foundation shipped.

### In Scope

- Expand verified writable coverage provider by provider using the existing shared discovery and guarded mutation core.
- Keep provider-specific writable behavior grounded in verified local file shapes and explicit live roots.
- Preserve disabled-item discoverability and stable item IDs when a provider uses AgentScope-managed vault state to disable an item safely.
- Keep unsupported provider item categories visible and explicitly blocked instead of silently hiding them.

### Out Of Scope

- Remote orchestration, hosted state, or undocumented provider roots.
- Replacing the shared mutation engine with provider-specific execution paths.
- Expanding write support to provider categories that still lack a grounded reversible workflow.

## UX / Business Rules

- `BR-01` Every new writable provider slice must reuse the existing dry-run-first CLI workflow rather than inventing a provider-specific command path.
- `BR-02` Provider-specific writable support must stay explicit in the capability matrix and docs; discovery visibility must not be mistaken for writable support.
- `BR-03` Disabled items that AgentScope can restore later must remain discoverable by stable ID wherever the provider workflow depends on vault-backed state.
- `BR-04` Unsupported provider categories remain visible but must return explicit blocked results during toggle planning and apply.

## Success Metrics

| Metric ID | Metric | Baseline | Target | Measurement method |
| --- | --- | --- | --- | --- |
| `MET-01` | Codex gains verified end-to-end writable coverage for the supported slice | Codex items are discovery-only | AgentScope can dry-run, apply, rediscover, and restore supported Codex items through fixture-backed sandboxes | Provider, toggle, restore, and build verification |
| `MET-02` | Writable-provider expansion remains incremental and explicit | One writable provider exists; unsupported categories are easy to over-assume | Each new provider slice updates the capability matrix and keeps unsupported categories explicitly blocked | README and automated command coverage |

## Risks And Open Questions

- `RISK-01` Product trust drops if provider-specific writable support reuses the shared mutation engine incorrectly and corrupts provider-managed files.
- `RISK-02` Product trust drops if disabled provider items disappear from discovery after they move into AgentScope-managed vault state.
- `RISK-03` Users may assume writable parity across all categories of a provider if unsupported categories stay visible but are not documented clearly.
- `OQ-01` Whether Cursor writable support should stay a follow-up feature under this initiative after Codex, or whether new product constraints discovered during Codex work require a narrower follow-on PRD.

## Downstream Features

| Feature | Why it exists | Status |
| --- | --- | --- |
| `FT-004` | Add verified Codex skill and configured-MCP toggles through the shared guarded mutation workflow while keeping plugins unsupported | `done` |
| `FT-005` | Add the next verified writable provider slice after Codex using the same incremental safety contract | `planned` |
