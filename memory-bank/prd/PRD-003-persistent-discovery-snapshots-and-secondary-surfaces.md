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

The remaining initiative-level problem is secondary surface reuse. Local presentation or agent-facing layers should build on the FT-006 snapshot foundation and the existing headless discovery, mutation, backup, restore, and doctor contracts instead of inventing another persistence or mutation path. The downstream path first routed secondary control through the local MCP control plane, and FT-012 now revives the original local terminal dashboard after the active goal supplied distinct users, workflows, and acceptance criteria.

Relative to [`../domain/problem.md`](../domain/problem.md), this initiative expands AgentScope's CLI-first surface carefully: it introduces persisted discovery snapshots first, then allows later local presentation or agent-facing layers to reuse the same headless discovery, snapshot, and guarded mutation contracts without weakening the current safety path.

## Users And Jobs

| User / Segment | Job To Be Done | Current Pain |
| --- | --- | --- |
| `developer-operator` | Capture the current normalized AgentScope inventory for one project and keep a recent history under the app-state root | Discovery output disappears when the terminal closes and cannot be reused later without rerunning discovery |
| `coding-agent` | Consume one validated on-disk inventory artifact instead of scraping ad-hoc terminal output | There is no persisted contract for later automation surfaces to load safely |
| `terminal-operator` | Inspect inventory, filter it, select one item, preview an exact reversible change, and optionally apply a confirmed staged change from the terminal | Separate `list` and `toggle` calls do not provide one deterministic local inspection surface |
| `workflow-runner-agent` | Produce human-readable dashboard evidence while still using the same headless mutation and snapshot contracts as automation tools | MCP responses are structured for agents, but feature-slice execution records also need deterministic terminal evidence |

## Goals

- `G-01` Persist a validated, project-scoped discovery snapshot that records the same normalized inventory and warnings AgentScope already exposes through the CLI.
- `G-02` Establish a stable snapshot contract that later local presentation surfaces can reuse without creating a second discovery or mutation implementation path.
- `G-03` Keep the initiative narrow: snapshot persistence first, then follow-on thin surfaces over the same headless core.
- `G-04` Route secondary surfaces through thin adapters over the shared headless core: MCP for agent-facing workflows and the terminal dashboard for local inspection and staged exact-item apply.

## Non-Goals

- `NG-01` Introduce a second mutation path or any bypass around the guarded mutation engine; staged apply is allowed only when it delegates to the same guarded mutation path.
- `NG-02` Add remote orchestration, hosted state, or a cloud dashboard.
- `NG-03` Add snapshot diffing, rollback-to-snapshot, or historical analytics in the first delivery slice.
- `NG-04` Add a hosted, browser, desktop, remote API, or provider UI automation surface.

## Product Scope

This initiative defines the next product layer after the verified writable-provider expansion finished.

### In Scope

- Add project-scoped persisted discovery snapshots under the AgentScope app-state root.
- Keep snapshot content aligned with the normalized discovery model and provider-scoped warning contract.
- Reuse the snapshot contract later for new local presentation surfaces without redefining discovery semantics.
- Expose the first local secondary control surface as an MCP adapter over the existing headless discovery, mutation, backup, restore, and doctor contracts.
- Expose a deterministic local terminal dashboard over the same discovery, mutation, backup, restore, and snapshot contracts once distinct dashboard users and workflows are defined by FT-012.

### Out Of Scope

- Replacing `list` with snapshot-only reads.
- Mutating provider-managed files as part of snapshot capture.
- A remote API, hosted control plane, or provider installation workflows.
- Implementing an Ink/React interactive TUI, hosted dashboard, or provider UI automation before a separate feature package defines additional users, workflows, and acceptance criteria beyond FT-012.

## UX / Business Rules

- `BR-01` Snapshot capture must reuse the same discovery flow and root-override inputs as the existing CLI instead of inventing provider-specific traversal logic.
- `BR-02` Snapshot files must live only under the AgentScope app-state root and remain project-scoped so different repositories do not overwrite one another.
- `BR-03` Provider-scoped warnings must remain visible in both live discovery and persisted snapshots; warnings are not a reason to skip persistence silently.
- `BR-04` Dashboard and MCP-facing surfaces must behave as thin presentation layers over the same discovery, snapshot, and guarded mutation contracts, not as competing implementations.
- `BR-05` The local MCP control plane is the accepted first secondary surface for this initiative. FT-012 is the accepted terminal dashboard delivery slice after product need was re-established; richer Ink/React TUI work remains out of scope until a later feature justifies it.

## Success Metrics

| Metric ID | Metric | Baseline | Target | Measurement method |
| --- | --- | --- | --- | --- |
| `MET-01` | Project-scoped discovery snapshots are persisted successfully | `list` output is transient only | `agentscope snapshot` writes a validated latest snapshot plus bounded history for the selected project root | Snapshot command, schema, and path tests plus direct CLI verification |
| `MET-02` | Secondary surfaces can rely on one stable persisted inventory contract | Future dashboard or MCP work would need to invent its own storage shape | Snapshot schema, storage paths, and summary semantics are versioned and reused by downstream features such as the local MCP control plane | Core snapshot tests and downstream feature references |

## Risks And Open Questions

- `RISK-01` Product trust drops if snapshot content drifts from `list` semantics and later surfaces show different inventory from the same discovery state.
- `RISK-02` Snapshot history becomes unreliable if malformed stored files are handled implicitly instead of being validated explicitly on read.
- `RISK-03` Scope creep pulls dashboard or MCP work into the first snapshot slice and weakens the small-feature delivery boundary.
- `RISK-04` A stale implementation plan or backlog reference could imply that a richer Ink/React TUI must ship even when the accepted FT-012 terminal dashboard satisfies the local workflow.
- `OQ-01` Should an Ink/React interactive TUI be revived as a separate feature package? Default answer for this PRD: no, until a future request provides target users, workflows, and acceptance criteria that are not already covered by CLI, MCP, and the FT-012 terminal dashboard.

## Downstream Features

| Feature | Why it exists | Status |
| --- | --- | --- |
| `FT-006` | Add the persisted discovery snapshot command, schema, and bounded history contract | `done` |
| `FT-008` | Add the local MCP control plane as the first secondary surface over existing headless AgentScope contracts | `done` |
| `FT-012` | Revive the original plan's local dashboard and CLI filter parity as a thin terminal surface over existing discovery, mutation, and snapshot contracts after the user re-established dashboard parity as a goal | `done` |
