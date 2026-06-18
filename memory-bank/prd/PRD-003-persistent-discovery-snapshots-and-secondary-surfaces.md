---
title: "PRD-003: Persistent Discovery Snapshots And Secondary Surfaces"
doc_kind: prd
doc_function: canonical
purpose: "Records the product problem, users, goals, scope, and success metrics for persistent discovery snapshots and local secondary AgentScope surfaces."
derived_from:
  - ../domain/problem.md
  - ./PRD-001-local-discovery-and-safe-mutation-foundation.md
  - ./PRD-002-incremental-writable-provider-expansion.md
status: active
audience: humans_and_agents
must_not_define:
  - implementation_sequence
  - architecture_decision
  - feature_level_verify_contract
---

# PRD-003: Persistent Discovery Snapshots And Secondary Surfaces

## Problem

AgentScope originally could discover and safely mutate its verified provider slices, but every inventory view was ephemeral: a user could run `agentscope list`, yet no project-scoped persisted record captured what was discovered at that moment, what warnings were present, or how many available versus active items existed per provider. FT-006 has since closed that first gap by adding persisted discovery snapshots under the AgentScope app-state root.

The remaining initiative-level problem is secondary surface reuse. Local presentation or agent-facing layers should build on the FT-006 snapshot foundation and the existing headless discovery, mutation, backup, restore, and doctor contracts instead of inventing another persistence or mutation path. The current downstream update therefore routes the first secondary surface through the local MCP control plane, while dashboard or TUI work stays deferred until a future feature package defines distinct users, workflows, and acceptance criteria.

Relative to [`../domain/problem.md`](../domain/problem.md), this initiative expands AgentScope's CLI-first surface carefully: it introduces persisted discovery snapshots first, then allows later local presentation or agent-facing layers to reuse the same headless discovery, snapshot, and guarded mutation contracts without weakening the current safety path.

## Users And Jobs

| User / Segment | Job To Be Done | Current Pain |
| --- | --- | --- |
| `developer-operator` | Capture the current normalized AgentScope inventory for one project and keep a recent history under the app-state root | Discovery output disappears when the terminal closes and cannot be reused later without rerunning discovery |
| `coding-agent` | Consume one validated on-disk inventory artifact instead of scraping ad-hoc terminal output | There is no persisted contract for later automation surfaces to load safely |

## Goals

- `G-01` Persist a validated, project-scoped discovery snapshot that records the same normalized inventory and warnings AgentScope already exposes through the CLI.
- `G-02` Establish a stable snapshot contract that later local presentation surfaces can reuse without creating a second discovery or mutation implementation path.
- `G-03` Keep the initiative narrow: snapshot persistence first, then follow-on thin surfaces over the same headless core.
- `G-04` Route the first secondary control surface through the local MCP control plane; keep an interactive dashboard or TUI deferred until a separate feature has mature product scope.

## Non-Goals

- `NG-01` Introduce a second mutation path, staged apply workflow, or any bypass around the guarded mutation engine.
- `NG-02` Add remote orchestration, hosted state, or a cloud dashboard.
- `NG-03` Add snapshot diffing, rollback-to-snapshot, or historical analytics in the first delivery slice.
- `NG-04` Add an Ink, React, or terminal dashboard in the current secondary-surface slice.

## Product Scope

This initiative defines the next product layer after the verified writable-provider expansion finished.

### In Scope

- Add project-scoped persisted discovery snapshots under the AgentScope app-state root.
- Keep snapshot content aligned with the normalized discovery model and provider-scoped warning contract.
- Reuse the snapshot contract later for new local presentation surfaces without redefining discovery semantics.
- Expose the first local secondary control surface as an MCP adapter over the existing headless discovery, mutation, backup, restore, and doctor contracts.

### Out Of Scope

- Replacing `list` with snapshot-only reads.
- Mutating provider-managed files as part of snapshot capture.
- A remote API, hosted control plane, or provider installation workflows.
- Implementing an interactive dashboard or TUI before a separate feature package defines its users, workflows, and acceptance criteria.

## UX / Business Rules

- `BR-01` Snapshot capture must reuse the same discovery flow and root-override inputs as the existing CLI instead of inventing provider-specific traversal logic.
- `BR-02` Snapshot files must live only under the AgentScope app-state root and remain project-scoped so different repositories do not overwrite one another.
- `BR-03` Provider-scoped warnings must remain visible in both live discovery and persisted snapshots; warnings are not a reason to skip persistence silently.
- `BR-04` Dashboard and MCP-facing surfaces must behave as thin presentation layers over the same discovery, snapshot, and guarded mutation contracts, not as competing implementations.
- `BR-05` The local MCP control plane is the accepted first secondary surface for this initiative. Dashboard or TUI work remains planned only as a future separate delivery slice if product need is re-established.

## Success Metrics

| Metric ID | Metric | Baseline | Target | Measurement method |
| --- | --- | --- | --- | --- |
| `MET-01` | Project-scoped discovery snapshots are persisted successfully | `list` output is transient only | `agentscope snapshot` writes a validated latest snapshot plus bounded history for the selected project root | Snapshot command, schema, and path tests plus direct CLI verification |
| `MET-02` | Secondary surfaces can rely on one stable persisted inventory contract | Future dashboard or MCP work would need to invent its own storage shape | Snapshot schema, storage paths, and summary semantics are versioned and reused by downstream features such as the local MCP control plane | Core snapshot tests and downstream feature references |

## Risks And Open Questions

- `RISK-01` Product trust drops if snapshot content drifts from `list` semantics and later surfaces show different inventory from the same discovery state.
- `RISK-02` Snapshot history becomes unreliable if malformed stored files are handled implicitly instead of being validated explicitly on read.
- `RISK-03` Scope creep pulls dashboard or MCP work into the first snapshot slice and weakens the small-feature delivery boundary.
- `RISK-04` A stale implementation plan or backlog reference could imply that `agentscope dashboard` still belongs to the current operation after MCP has shipped locally.
- `OQ-01` Should an interactive dashboard or TUI be revived as a separate feature package? Default answer for this PRD: no, until a future request provides target users, workflows, and acceptance criteria that are not already covered by CLI and MCP surfaces.

## Downstream Features

| Feature | Why it exists | Status |
| --- | --- | --- |
| `FT-006` | Add the persisted discovery snapshot command, schema, and bounded history contract | `done` |
| `FT-008` | Add the local MCP control plane as the first secondary surface over existing headless AgentScope contracts | `in_progress` |
