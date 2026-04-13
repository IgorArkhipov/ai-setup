---
title: "UC-002: Safe Toggle And Restore"
doc_kind: use_case
doc_function: canonical
purpose: "Captures the stable project-level scenario where a user dry-runs, applies, and restores supported configuration changes without leaving provider-managed state partially mutated."
derived_from:
  - ../domain/problem.md
status: active
audience: humans_and_agents
must_not_define:
  - implementation_sequence
  - architecture_decision
  - feature_level_test_matrix
---

# UC-002: Safe Toggle And Restore

## Goal

Let the user preview a supported configuration change, apply it through guarded mutation semantics, and restore the prior state later when needed.

## Primary Actor

Developer or operator using AgentScope to manage supported local agent configuration.

## Trigger

The actor wants to enable or disable one supported item, or recover a previous configuration state through a recorded backup.

## Preconditions

- The selected item is discoverable through AgentScope.
- The change surface is supported for guarded mutation, or AgentScope can explain why it is blocked.
- AgentScope can use its managed state root for locks, backups, audit data, and vault metadata when needed.

## Main Flow

1. The actor runs `agentscope toggle` for one supported item and receives a dry-run plan before any live write occurs.
2. The actor applies the change explicitly, and AgentScope acquires its advisory lock, verifies fingerprints, persists backup data, and performs the mutation atomically.
3. If the actor later needs the prior state, they run `agentscope restore <backup-id>`, and AgentScope restores the recorded state through the same guarded workflow.

## Alternate Flows / Exceptions

- `ALT-01` The requested target state already matches current state; AgentScope returns an explicit `no-op` result and performs no writes.
- `EX-01` The selection is read-only, unsupported, unknown, or ambiguous; AgentScope blocks the apply path and explains the reason.
- `EX-02` Fingerprint drift, lock contention, or invalid backup data prevents safe execution; AgentScope exits non-zero without leaving live state partially mutated.
- `EX-03` Restore fails after mutation begins; AgentScope rolls already-restored targets back to a safe state and reports the failure explicitly.

## Postconditions

- On success, the selected live configuration reflects the requested state and can be tied to a backup and audit entry.
- On restore success, the original recorded state is recovered.
- On failure, provider-managed state remains untouched or is rolled back to a safe pre-operation state.

## Business Rules

- `BR-01` Dry-run is strictly read-only for provider-managed state.
- `BR-02` No live mutation occurs without backup persistence, advisory locking, and source-state validation.
- `BR-03` Failed apply or restore paths must not leave provider-managed files partially updated.

## Traceability

| Upstream / Downstream | References |
| --- | --- |
| PRD | `none` |
| Features | `FT-002`, `FT-003` |
| ADR | `none` |
