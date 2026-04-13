---
title: "FT-002 Legacy Spec"
doc_kind: feature
doc_function: archive
purpose: "Archived pre-migration spec for FT-002. Retained for detailed historical design only; use `feature.md` for the active canonical feature contract."
derived_from:
  - feature.md
status: archived
audience: humans_and_agents
---

# Spec: Safe And Reversible Configuration Changes

Archived migration note: this file is retained only as pre-migration detail. The active canonical owner is [`feature.md`](./feature.md).

Brief: [Feature 002 legacy brief](./brief.md)

## Scope

In scope:
- Build the shared AgentScope mutation engine in `tools/agentscope/` for dry-run, apply, and restore flows.
- Add CLI entrypoints for `toggle` and `restore`.
- Define the structured mutation-plan vocabulary that provider integrations can hand to the shared engine.
- Enforce safe-apply guardrails: advisory locking, fingerprint checks, persistent backups, audit logging, and atomic writes.
- Support reversible writes for text-backed config files and binary-safe stores.

Out of scope:
- Expanding writable support for specific providers; Claude, Codex, and Cursor provider-specific toggle planning belongs to later features.
- Snapshot storage, staged dashboard apply, or MCP-server exposure.
- Bulk mutation flows across many selections in one command.
- Install or uninstall workflows for plugins, tools, skills, or MCP servers.
- Vault-style hidden backup flows for skill or configured-MCP removal.

Affected modules:
- `tools/agentscope/src/core`
- `tools/agentscope/src/commands`
- `tools/agentscope/test`

## Requirements

### 1. Shared mutation operation vocabulary

The core mutation layer must represent provider-requested changes as structured operations instead of ad hoc file writes.

The supported operation vocabulary in this feature must include:
- `createFile`
- `replaceJsonValue`
- `updateJsonObjectEntry`
- `removeJsonObjectEntry`
- `renamePath`
- `deletePath`
- `replaceSqliteItemTableValue`

Each planned toggle must include enough structured data for the shared engine to:
- identify the selected item being changed
- describe the target enabled state
- list the affected paths
- print the planned operations before apply
- verify the current source fingerprint before writing
- create a reversible backup record before mutating live files

Provider modules may decide whether an item is writable and may produce a toggle plan, but the shared engine owns execution semantics.

### 2. Dry-run toggle behavior

`agentscope toggle ...` without `--apply` must be a provider-state dry run.

Dry-run output must include:
- the selected item identity
- the target enabled or disabled state
- the planned file or store operations
- the affected paths
- one explicit status line stating that no writes were performed

Dry run must not:
- modify provider-managed files or stores
- create a backup entry
- append an audit-log entry

If the selected item is `read-only` or `unsupported`, the command must refuse to apply, explain why, and perform no writes.

### 3. Safe apply workflow

`agentscope toggle ... --apply` must route through one shared guarded workflow.

Before mutating live provider state, the engine must:
- acquire the AgentScope advisory lock
- verify that the current file or store fingerprint still matches the fingerprint captured when the plan was built
- create a persistent backup entry for every affected path or store value

During write, the engine must:
- apply the planned operations through atomic write behavior
- preserve binary data exactly when backing up or restoring non-UTF-8 content
- abort the mutation if any guard check fails

After a successful write, the engine must:
- append an audit-log entry describing the completed mutation

If a guarded apply fails after the shared engine has started the guarded workflow, it must return a structured failure, append a `failed-apply` audit entry, and leave live provider-managed state fully rolled back or untouched.

The engine must never leave live provider-managed files partially updated after a failed apply attempt.

### 4. Backup and audit persistence

Every successful apply must create a persistent backup entry under the AgentScope-managed state root.

Each backup entry must capture enough metadata to support later restore, including:
- a unique backup ID
- creation time
- the selected item identity when known
- the affected paths or stores
- the original content or a reference to the saved original content

Backup entries must remain restorable across process restarts until they are explicitly removed by a later retention or cleanup mechanism.

AgentScope must also keep an append-only audit trail for:
- successful apply completions
- restore requests
- failed guarded apply attempts when a failure occurs after the guarded workflow has started, including setup failures after lock acquisition and fingerprint recheck

Backup storage must be safe for:
- regular UTF-8 config files
- renamed or deleted filesystem paths
- binary-safe content such as SQLite-backed provider state

For binary files or store payload snapshots, backup and restore must preserve byte-for-byte equality.
Restore must reject invalid blob references instead of reading arbitrary paths from a backup manifest, and SQLite-backed mutation plans must validate identifiers before executing dynamic SQL.

### 5. Restore behavior

`agentscope restore <backup-id>` must restore the prior state through the same shared safety layer.

Restore must:
- validate that the backup manifest entry exists and includes `backupId`, `createdAt`, the affected paths or stores, and the saved original content or a pointer to it
- reacquire the advisory lock before mutating live files
- restore the saved content or paths atomically
- roll back any already-restored targets to their pre-restore live state if restore fails mid-flight
- append a restore audit-log entry

Restore output must include:
- the backup ID
- the paths or stores restored
- one explicit final status value: `restored` or `failed`

### 6. Command contract

This feature must add two user-facing commands:
- `agentscope toggle`
- `agentscope restore`

`toggle` must support:
- dry-run mode by default
- an explicit `--apply` path for real writes
- selector fields `provider`, `kind`, `id`, and `layer` to identify one discovered item and its scope

`restore` must support:
- restoring one prior backup by ID

Both commands must emit deterministic output. Command output must include status, the selected item or backup ID, the planned or restored operations, and the affected paths or stores. When `--json` is requested, they must also emit deterministic structured output for early validation failures such as missing selectors or a missing backup ID.

## States and error handling

This feature has no interactive loading state.

Dry-run success state:
- a supported selection resolves to a toggle plan
- planned operations and affected paths are shown
- no provider-managed files or stores are written

Apply success state:
- the advisory lock is acquired
- fingerprint checks pass
- backups and audit records are persisted
- live files are updated atomically
- a backup ID is returned for later restore

Restore success state:
- the backup entry is valid
- the advisory lock is acquired
- the original state is restored atomically
- the restored paths are reported

No-op state:
- `toggle` may resolve to no operations because the requested target state already matches the current state
- the command prints an explicit `no-op` status
- no provider-managed files are written
- no backup or audit entry is created
- the command exits `0`

Blocked state:
- the selection is unknown, ambiguous, `read-only`, or `unsupported`
- a required fingerprint no longer matches
- the advisory lock cannot be acquired
- the backup entry is missing or invalid
- the command exits non-zero and does not partially mutate live provider state

Fatal-error state:
- CLI usage is invalid, including missing required arguments, unknown flags, or unsupported combinations
- the command exits non-zero without partial results
- when `--json` is requested, the command still emits structured failed output

Condition handling by command:
- `toggle` without `--apply`: plan-only; never writes; exits `0` for a dry-run plan or explicit `no-op`, and exits non-zero when the selection is blocked or no valid writable plan can be produced.
- `toggle --apply`: exits non-zero if any guard check fails before write or if atomic mutation cannot complete safely.
- `restore`: exits non-zero when the backup ID is missing, malformed, unreadable, or cannot be restored safely.

## Invariants

- Dry run is strictly read-only for provider-managed state and creates no backup or audit entries.
- Apply and restore both pass through the same shared mutation engine.
- No live mutation occurs without a prior backup record and advisory lock.
- Fingerprint drift blocks apply instead of guessing over concurrent user changes.
- Failed mutation attempts do not leave provider-managed files partially written.
- Backups are sufficient to restore the previous state of every affected path or store value in scope.
- The engine is provider-agnostic; provider modules describe planned operations, and the core enforces safety.

## Implementation constraints

- Keep command entrypoints thin; mutation logic belongs in `src/core`.
- Keep provider-specific mutability and planning rules out of this feature except for the interfaces needed to plug providers into the engine later.
- Do not add dashboard workflows, snapshot history, or MCP server code in this feature.
- Do not add bulk selection apply flows in this feature.
- Do not expand install or uninstall lifecycle support.

## Acceptance criteria

1. Unit coverage proves that the shared mutation engine can plan and execute the supported operation vocabulary, including JSON-backed and binary-safe store mutations.
2. `agentscope toggle` without `--apply` prints the command status, selected item, planned operations, and affected paths, and it creates no backups or audit entries.
3. `agentscope toggle --apply` acquires the advisory lock, persists a backup, records the mutation in the audit log, and returns a backup ID on success.
4. If the current file or store fingerprint drifts between planning and apply, the mutation aborts and leaves live provider state unchanged.
5. If the advisory lock cannot be acquired, apply and restore both exit non-zero without mutating live provider state.
6. `agentscope restore <backup-id>` restores the pre-apply state for every affected path or store value and records the restore in the audit log.
7. Restore and backup handling preserve byte-for-byte equality for non-UTF-8 content, including SQLite-backed provider-state snapshots.
8. A `read-only`, `unsupported`, unknown, or ambiguous selection cannot be applied and produces a non-zero failure that includes the blocking reason.
9. Backups remain available for restore across separate command invocations until an explicit cleanup mechanism removes them.
10. This feature does not require new writable provider coverage for Claude, Codex, or Cursor beyond shared interfaces and test fixtures.
