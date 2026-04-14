---
title: "PRD-003: Persistent Discovery Snapshots And Secondary Surfaces"
doc_kind: prd
doc_function: canonical
purpose: "Records the product problem, users, goals, scope, and success metrics for adding persistent discovery snapshots as the foundation for future non-mutation presentation surfaces."
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

AgentScope can now discover and safely mutate its verified provider slices, but every inventory view is still ephemeral. A user can run `agentscope list`, yet there is no project-scoped persisted record of what was discovered at that moment, what warnings were present, or how many available versus active items existed per provider. That gap blocks two things at once: operators cannot capture a reusable point-in-time inventory for later inspection, and future secondary control surfaces such as a dashboard or local MCP server would have to invent their own persistence contract instead of building on one stable artifact.

Relative to [`../domain/problem.md`](../domain/problem.md), this initiative expands AgentScope's CLI-first surface carefully: it introduces persisted discovery snapshots first, then allows later presentation layers to reuse the same headless discovery and snapshot contract without weakening the current guarded mutation path.

## Users And Jobs

| User / Segment | Job To Be Done | Current Pain |
| --- | --- | --- |
| `developer-operator` | Capture the current normalized AgentScope inventory for one project and keep a recent history under the app-state root | Discovery output disappears when the terminal closes and cannot be reused later without rerunning discovery |
| `coding-agent` | Consume one validated on-disk inventory artifact instead of scraping ad-hoc terminal output | There is no persisted contract for later automation surfaces to load safely |

## Goals

- `G-01` Persist a validated, project-scoped discovery snapshot that records the same normalized inventory and warnings AgentScope already exposes through the CLI.
- `G-02` Establish a stable snapshot contract that later local presentation surfaces can reuse without creating a second discovery or mutation implementation path.
- `G-03` Keep the initiative narrow: snapshot persistence first, then follow-on thin surfaces over the same headless core.

## Non-Goals

- `NG-01` Introduce a second mutation path, staged apply workflow, or any bypass around the guarded mutation engine.
- `NG-02` Add remote orchestration, hosted state, or a cloud dashboard.
- `NG-03` Add snapshot diffing, rollback-to-snapshot, or historical analytics in the first delivery slice.

## Product Scope

This initiative defines the next product layer after the verified writable-provider expansion finished.

### In Scope

- Add project-scoped persisted discovery snapshots under the AgentScope app-state root.
- Keep snapshot content aligned with the normalized discovery model and provider-scoped warning contract.
- Reuse the snapshot contract later for new local presentation surfaces without redefining discovery semantics.

### Out Of Scope

- Replacing `list` with snapshot-only reads.
- Mutating provider-managed files as part of snapshot capture.
- A remote API, hosted control plane, or provider installation workflows.

## UX / Business Rules

- `BR-01` Snapshot capture must reuse the same discovery flow and root-override inputs as the existing CLI instead of inventing provider-specific traversal logic.
- `BR-02` Snapshot files must live only under the AgentScope app-state root and remain project-scoped so different repositories do not overwrite one another.
- `BR-03` Provider-scoped warnings must remain visible in both live discovery and persisted snapshots; warnings are not a reason to skip persistence silently.
- `BR-04` Later dashboard or MCP-facing surfaces must behave as thin presentation layers over the same discovery and snapshot contracts, not as competing implementations.

## Success Metrics

| Metric ID | Metric | Baseline | Target | Measurement method |
| --- | --- | --- | --- | --- |
| `MET-01` | Project-scoped discovery snapshots are persisted successfully | `list` output is transient only | `agentscope snapshot` writes a validated latest snapshot plus bounded history for the selected project root | Snapshot command, schema, and path tests plus direct CLI verification |
| `MET-02` | Secondary surfaces can rely on one stable persisted inventory contract | Future dashboard or MCP work would need to invent its own storage shape | Snapshot schema, storage paths, and summary semantics are versioned and reusable by downstream features | Core snapshot tests and downstream feature references |

## Risks And Open Questions

- `RISK-01` Product trust drops if snapshot content drifts from `list` semantics and later surfaces show different inventory from the same discovery state.
- `RISK-02` Snapshot history becomes unreliable if malformed stored files are handled implicitly instead of being validated explicitly on read.
- `RISK-03` Scope creep pulls dashboard or MCP work into the first snapshot slice and weakens the small-feature delivery boundary.
- `OQ-01` Should dashboard and MCP-facing follow-ons ship only after the standalone `snapshot` contract is proven first? Default answer for this PRD: yes, unless a later feature package demonstrates a blocking dependency that must be raised explicitly.

## Downstream Features

| Feature | Why it exists | Status |
| --- | --- | --- |
| `FT-006` | Add the persisted discovery snapshot command, schema, and bounded history contract | `done` |
