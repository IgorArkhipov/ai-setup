---
title: "FT-002: Safe And Reversible Configuration Changes"
doc_kind: feature
doc_function: canonical
purpose: "Canonical feature document for the shared AgentScope mutation engine: dry-run planning, guarded apply, persistent backup and audit state, and restore semantics."
derived_from:
  - ../../domain/problem.md
  - ../../use-cases/UC-002-safe-toggle-and-restore.md
  - ../FT-001/feature.md
status: active
delivery_status: done
audience: humans_and_agents
must_not_define:
  - implementation_sequence
---

# FT-002: Safe And Reversible Configuration Changes

## What

### Problem

After discovery existed, AgentScope still could not help users make changes safely. Manual edits to provider-managed configuration were risky, hard to review, and difficult to undo, so the product still lacked a trustworthy control path for local configuration changes.

### Outcome

| Metric ID | Metric | Baseline | Target | Measurement method |
| --- | --- | --- | --- | --- |
| `MET-01` | Safe guarded mutation workflow available in AgentScope | Discovery only; no shared write path | `toggle` and `restore` dry-run, apply, backup, audit, and restore flows implemented generically | Automated mutation-engine and CLI tests plus package build |

### Scope

- `REQ-01` Define a provider-agnostic mutation-plan vocabulary for filesystem, JSON, and SQLite-backed changes.
- `REQ-02` Ship dry-run `toggle` behavior that prints planned operations and performs no provider-managed writes.
- `REQ-03` Ship one guarded apply workflow with advisory locking, fingerprint checks, persistent backups, atomic writes, and failure rollback.
- `REQ-04` Persist enough backup and audit metadata to support later restore across process restarts.
- `REQ-05` Ship deterministic `toggle` and `restore` CLI contracts, including structured JSON output for validation failures.

### Non-Scope

- `NS-01` Expanding writable support for a concrete provider; provider-specific write planning is deferred to later features.
- `NS-02` Dashboard, snapshot, or MCP-server flows.
- `NS-03` Bulk mutation across multiple selected items in one command.
- `NS-04` Install or uninstall workflows for tools, skills, plugins, or MCP servers.

### Constraints / Assumptions

- `ASM-01` The normalized discovery and selection model from FT-001 remains the upstream selection surface for writable actions.
- `CON-01` Shared mutation semantics belong in `src/core/*`; provider modules may plan operations but must not own safety guarantees.
- `CON-02` Dry-run and explicit `no-op` paths must stay read-only for provider-managed state.
- `CTR-01` Guarded apply and restore share one engine contract for lock, backup, audit, and rollback semantics.

## How

### Solution

Add one provider-neutral mutation engine under `tools/agentscope/src/core` that accepts structured provider plans, validates the current live state, persists backup and audit state under `appStateRoot`, and executes atomic writes or restores through one deterministic output layer. Keep provider integrations blocked unless they can produce verified writable plans safely.

### Change Surface

| Surface | Type | Why it changes |
| --- | --- | --- |
| `tools/agentscope/src/core/mutation-*` | code | Shared mutation vocabulary, IO, locking, engine, state, and output live here |
| `tools/agentscope/src/commands/toggle.ts` | code | User-facing dry-run and apply contract |
| `tools/agentscope/src/commands/restore.ts` | code | User-facing restore contract |
| `tools/agentscope/src/providers/*` | code | Providers expose writable planning hooks or explicit blocking results |
| `tools/agentscope/test/*` | tests | Mutation engine, CLI contract, and restore semantics are verified here |
| `tools/agentscope/package.json` | config | The runtime contract is pinned for SQLite-backed mutation support |

### Flow

1. A provider resolves one selected item and returns a structured toggle plan or an explicit blocked result.
2. AgentScope prints the dry-run plan by default; on `--apply`, it acquires the advisory lock, validates fingerprints, persists backup state, and executes the plan atomically.
3. If a prior backup is selected later, AgentScope restores the saved state through the same guarded workflow and reports the outcome deterministically.

### Contracts

| Contract ID | Input / Output | Producer / Consumer | Notes |
| --- | --- | --- | --- |
| `CTR-01` | Structured mutation plan and result model | provider modules / mutation engine and CLI output | The engine remains provider-agnostic |
| `CTR-02` | Backup manifest and audit-log shapes | mutation engine / restore flow and operators | Metadata must survive process restarts until explicit cleanup |
| `CTR-03` | Deterministic `toggle` and `restore` JSON output | command layer / callers | Success, blocked, no-op, and validation-failure results remain machine-readable |

### Failure Modes

- `FM-01` Live provider state is partially mutated after a failed apply or restore.
- `FM-02` Fingerprint drift allows AgentScope to overwrite concurrent user changes.
- `FM-03` Backup data is insufficient to restore the original state of every affected target.

## Verify

### Exit Criteria

- `EC-01` AgentScope can dry-run, apply, and restore supported structured mutation plans safely.
- `EC-02` Failed apply or restore paths leave live provider-managed state untouched or rolled back to a safe state.

### Traceability matrix

| Requirement ID | Design refs | Acceptance refs | Checks | Evidence IDs |
| --- | --- | --- | --- | --- |
| `REQ-01` | `ASM-01`, `CON-01`, `CTR-01` | `EC-01`, `SC-01` | `CHK-01` | `EVID-01` |
| `REQ-02` | `CON-02`, `CTR-03` | `EC-01`, `SC-01`, `SC-02` | `CHK-01` | `EVID-01` |
| `REQ-03` | `CTR-01`, `CTR-02`, `FM-01`, `FM-02` | `EC-01`, `EC-02`, `SC-03` | `CHK-01` | `EVID-01` |
| `REQ-04` | `CTR-02`, `FM-03` | `EC-01`, `SC-03` | `CHK-01` | `EVID-01` |
| `REQ-05` | `CTR-03`, `FM-01`, `FM-02` | `EC-01`, `SC-02`, `SC-03` | `CHK-01`, `CHK-02` | `EVID-01`, `EVID-02` |

### Acceptance Scenarios

- `SC-01` A user dry-runs a supported toggle request and sees the selected item, planned operations, and affected paths with no writes performed.
- `SC-02` A blocked, ambiguous, read-only, unsupported, or `no-op` selection produces a deterministic non-mutating result.
- `SC-03` A user applies a supported change successfully, receives a backup ID, and can restore the original state later through `restore`.

### Checks

| Check ID | Covers | How to check | Expected result | Evidence path |
| --- | --- | --- | --- | --- |
| `CHK-01` | `EC-01`, `EC-02`, `SC-01`, `SC-02`, `SC-03` | Run `npm test` in `tools/agentscope` with mutation-engine, toggle, restore, and supporting core suites | Shared guarded mutation behavior is covered and passes locally | `../../tools/agentscope/test/` |
| `CHK-02` | `EC-01`, `SC-03` | Run `npm run build` in `tools/agentscope` after the mutation suites are green | The package builds on the documented Node runtime baseline | `implementation-plan.md#ready-for-acceptance` |

### Test matrix

| Check ID | Evidence IDs | Evidence path |
| --- | --- | --- |
| `CHK-01` | `EVID-01` | `../../tools/agentscope/test/` |
| `CHK-02` | `EVID-02` | `implementation-plan.md#ready-for-acceptance` |

### Evidence

- `EVID-01` Automated guarded-mutation, CLI, and restore coverage in `tools/agentscope/test/`.
- `EVID-02` Archived execution summary and final verification record in [`implementation-plan.md`](implementation-plan.md).

### Evidence contract

| Evidence ID | Artifact | Producer | Path contract | Reused by checks |
| --- | --- | --- | --- | --- |
| `EVID-01` | Automated mutation-engine and command test suite | Vitest | `../../tools/agentscope/test/` | `CHK-01` |
| `EVID-02` | Archived implementation summary and verification outcome | implementation plan | `implementation-plan.md#ready-for-acceptance` | `CHK-02` |
