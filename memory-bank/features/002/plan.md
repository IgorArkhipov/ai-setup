---
status: ready
---

# Safe And Reversible Configuration Changes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a shared guarded mutation engine to `tools/agentscope` plus `toggle` and `restore` CLI commands that can dry-run, safely apply, and later restore provider-backed config changes without partial writes.

**Architecture:** Keep command entrypoints thin and move the new behavior into focused `src/core` modules: one for mutation plan/types, one for low-level file/store operations and fingerprints, one for persisted AgentScope state, one for advisory locking, one for shared engine orchestration, and one for deterministic command output. Extend the provider contract so current Claude, Codex, and Cursor providers can explicitly block mutation without adding new writable coverage, while tests inject a fake writable provider to exercise the happy apply and restore paths that the spec requires. Persist all lock, backup, and audit data under `appStateRoot`, use Node built-ins for the shared engine including `node:crypto` and `node:sqlite`, and pin the supported Node runtime in `tools/agentscope/package.json` so SQLite-backed mutations run on a documented baseline.

**Tech Stack:** TypeScript, Node.js built-ins, `cac`, `vitest`, `node:crypto`, `node:sqlite`

---

## Orchestration And Dependencies

**Recommended pattern:** single agent, strictly sequential across Tasks 1-7.

**Why this order works:**
- Tasks 1-4 define the provider contract, mutation vocabulary, low-level IO, backup layout, and engine semantics that both commands depend on.
- Task 5 depends on the toggle-planning contract and shared engine already being stable.
- Task 6 depends on persisted backups and restore helpers already working.
- Task 7 should run only after both commands and the shared engine are in place so the acceptance criteria can be verified end-to-end.

## Grounding

Current project state in `tools/agentscope`:
- `src/cli.ts` currently wires only `providers`, `doctor`, and `list`.
- `src/core/config.ts` already resolves `appStateRoot`, but no code currently writes any AgentScope-managed state there.
- `src/core/discovery.ts` exposes a discovery-only `ProviderModule` contract with no toggle-planning hook.
- `src/core/output.ts` renders discovery output only.
- `src/providers/claude.ts`, `src/providers/codex.ts`, and `src/providers/cursor.ts` normalize discovered items and mutability, but they do not yet plan or apply changes.
- The existing tests cover CLI parsing, config/path helpers, provider discovery, list rendering, doctor behavior, and provider capability fixtures.
- There is no backup manifest schema, no audit log, no advisory lock, no fingerprint check, no atomic mutation helper, and no restore flow yet.

Grounding conclusions:
- The feature fits the existing thin-command plus focused-core architecture well; no new top-level subsystem is needed.
- `appStateRoot` already exists in config, so backups, lock files, and audit logs should live there instead of introducing another state root.
- Real provider-specific write coverage is explicitly out of scope for this feature, so happy-path apply and restore coverage should come from a fake writable provider in tests, not from making Claude, Codex, or Cursor writable yet.
- The current `test` suite already uses temp sandboxes and direct command helpers, but mostly through inline per-file helpers, so this plan intentionally introduces a shared `test/support/` directory to avoid duplicating mutation sandbox setup across many new tests.
- The current local runtime can import `node:sqlite`, but `tools/agentscope/package.json` does not yet document a minimum Node version, so the plan should pin that requirement before relying on SQLite-backed mutations.

## Planned File Structure

**Create:**
- `tools/agentscope/src/core/mutation-models.ts`
- `tools/agentscope/src/core/mutation-io.ts`
- `tools/agentscope/src/core/mutation-lock.ts`
- `tools/agentscope/src/core/mutation-state.ts`
- `tools/agentscope/src/core/mutation-engine.ts`
- `tools/agentscope/src/core/mutation-output.ts`
- `tools/agentscope/src/commands/toggle.ts`
- `tools/agentscope/src/commands/restore.ts`
- `tools/agentscope/test/fake-toggle-provider.test.ts`
- `tools/agentscope/test/mutation-io.test.ts`
- `tools/agentscope/test/mutation-state.test.ts`
- `tools/agentscope/test/mutation-engine.test.ts`
- `tools/agentscope/test/mutation-output.test.ts`
- `tools/agentscope/test/toggle.test.ts`
- `tools/agentscope/test/restore.test.ts`
- `tools/agentscope/test/support/mutation-sandbox.ts`
- `tools/agentscope/test/support/fake-toggle-provider.ts`

**Modify:**
- `tools/agentscope/src/cli.ts`
- `tools/agentscope/src/core/discovery.ts`
- `tools/agentscope/src/providers/claude.ts`
- `tools/agentscope/src/providers/codex.ts`
- `tools/agentscope/src/providers/cursor.ts`
- `tools/agentscope/test/cli.test.ts`
- `tools/agentscope/package.json`
- `tools/agentscope/README.md`

## Task 1: Define The Mutation Vocabulary And Toggle-Planning Contract

**Files:**
- Create: `tools/agentscope/src/core/mutation-models.ts`
- Modify: `tools/agentscope/src/core/discovery.ts`
- Modify: `tools/agentscope/src/providers/claude.ts`
- Modify: `tools/agentscope/src/providers/codex.ts`
- Modify: `tools/agentscope/src/providers/cursor.ts`
- Create: `tools/agentscope/test/support/fake-toggle-provider.ts`
- Create: `tools/agentscope/test/fake-toggle-provider.test.ts`

- [ ] **Step 1: Define the shared mutation operation vocabulary**

Create `src/core/mutation-models.ts` with explicit unions and interfaces for:
- `createFile`
- `replaceJsonValue`
- `updateJsonObjectEntry`
- `removeJsonObjectEntry`
- `renamePath`
- `deletePath`
- `replaceSqliteItemTableValue`

Also define the shared plan and result models the rest of the feature will use:
- one selected item identity
- one target enabled state
- affected paths or stores
- per-target source fingerprint data
- dry-run, blocked, no-op, applied, restored, and failed statuses
- backup manifest and audit entry shapes

For `replaceSqliteItemTableValue`, keep the engine provider-agnostic by storing the database path, table name, key column, key value, and value column in the operation itself. For this feature's fake writable provider and shared-engine tests, use one concrete schema so the operation is grounded: `CREATE TABLE items (key TEXT PRIMARY KEY, value BLOB NOT NULL)`.

- [ ] **Step 2: Extend the provider contract for toggle planning**

Update `src/core/discovery.ts` so `ProviderModule` still supports discovery, but may also expose a `planToggle(...)` hook that receives:
- the selected discovered item
- the desired target enabled state
- resolved config and home/project roots

The returned toggle plan must embed the source fingerprints captured when the plan is built, so apply can later compare the current live state against those exact expected values before writing.

Keep discovery and planning separate. `runDiscovery(...)` should stay discovery-only.

- [ ] **Step 3: Make the current providers explicitly block writes**

Add `planToggle(...)` implementations to `claude.ts`, `codex.ts`, and `cursor.ts` that do not create real plans yet. Instead, they must return deterministic blocked decisions for currently `read-only` or `unsupported` items, so `toggle` does not have to guess what to do when production providers cannot write yet.

Use the item's existing mutability and provider-native identity to build the blocking reason, for example:
- `read-only`: discovered successfully, but this feature does not add provider-specific write coverage yet
- `unsupported`: the provider lifecycle itself is not writable in the current architecture

- [ ] **Step 4: Add a fake writable provider for tests**

Create `test/support/fake-toggle-provider.ts` with one provider module used only by tests. It must be able to:
- discover fixture-backed writable items
- produce dry-run plans for text, JSON, rename/delete, and SQLite-backed mutations
- produce a no-op plan when the requested target state already matches the current state

This fake provider is how the shared engine and commands will prove the apply and restore happy path without violating the scope limit on real providers. Keep it grounded to the current provider model by reusing an existing `ProviderId` instead of introducing a fourth provider type; tests should inject `[fakeToggleProvider]` directly where needed, so `ProviderId`, `DiscoveryProvider`, `providerOrder`, and the capability matrix stay unchanged in this feature.
Its SQLite-backed fixture should use the same `items(key, value)` schema defined above so fingerprinting, apply, rollback, and restore all target one known contract.

- [ ] **Step 5: Add a dedicated fake-provider test**

Create `test/fake-toggle-provider.test.ts` with a focused test that imports `fakeToggleProvider`, asserts its exported `id` stays within the existing provider union, and verifies that the helper can produce at least one writable plan shape for the later engine and command tests.

- [ ] **Step 6: Verify the contract layer**

Run:
- `npm test -- test/fake-toggle-provider.test.ts test/provider-discovery.test.ts test/cli.test.ts`
- `npm run build`

Expected:
- PASS
- existing discovery behavior stays unchanged
- the new provider hook compiles without requiring real write support yet
- the fake test provider is imported and exercised explicitly instead of only being staged as an unverified helper

- [ ] **Step 7: Commit**

```bash
git add tools/agentscope/src/core/mutation-models.ts tools/agentscope/src/core/discovery.ts tools/agentscope/src/providers/claude.ts tools/agentscope/src/providers/codex.ts tools/agentscope/src/providers/cursor.ts tools/agentscope/test/support/fake-toggle-provider.ts tools/agentscope/test/fake-toggle-provider.test.ts
git commit -m "feat: add mutation planning contract"
```

## Task 2: Implement Low-Level Mutation IO And Fingerprinting

**Files:**
- Create: `tools/agentscope/src/core/mutation-io.ts`
- Create: `tools/agentscope/test/mutation-io.test.ts`
- Create: `tools/agentscope/test/support/mutation-sandbox.ts`
- Modify: `tools/agentscope/package.json`

- [ ] **Step 1: Write failing IO tests for every supported operation**

Create `test/mutation-io.test.ts` and `test/support/mutation-sandbox.ts`.

The tests must cover:
- creating a missing text file
- replacing one JSON value by path
- updating one JSON object entry
- removing one JSON object entry
- renaming a path
- deleting a path
- replacing one SQLite item-table value
- computing stable fingerprints before and after mutation
- preserving byte-for-byte equality when backing up and restoring non-UTF-8 content

Generate temporary files and SQLite databases inside the sandbox helper instead of committing binary fixtures.

- [ ] **Step 2: Implement fingerprint helpers**

In `src/core/mutation-io.ts`, add helpers that capture the current source fingerprint for every affected path or store target before apply. Use SHA-256 over the exact bytes for filesystem targets. For SQLite item-table targets, fingerprint the exact value bytes that the operation will replace, plus the database path and item key metadata needed to detect drift.

- [ ] **Step 3: Pin the supported Node runtime for built-in SQLite**

Modify `tools/agentscope/package.json` to document the minimum Node version required by this feature so `node:sqlite` is part of the supported runtime contract for `agentscope`. Pin `engines.node` to `>=25.9.0`, which matches the grounded local runtime for this repo where `node:sqlite` imports successfully without extra flags, and use that verified baseline instead of expanding compatibility work to earlier runtimes in this feature. Before writing the full SQLite helper, prove the toolchain type-checks `import { DatabaseSync } from "node:sqlite"` under this baseline; if it does not, bump `@types/node` in the same task before continuing.

- [ ] **Step 4: Implement filesystem mutation helpers**

Still in `src/core/mutation-io.ts`, implement pure low-level helpers for:
- reading original file bytes
- creating parent directories when needed
- writing temp files next to their live targets
- renaming the temp file into place
- renaming live paths
- deleting live paths only after backup snapshotting succeeds

Keep these helpers ignorant of audit and lock concerns. They should only know how to snapshot and mutate one target safely.

- [ ] **Step 5: Implement JSON and SQLite mutation helpers**

Use deterministic JSON parsing and serialization for the JSON operations in this feature. For `replaceSqliteItemTableValue`, use `node:sqlite` and one narrow helper that updates a single item-table value inside a transaction, so the engine can treat the SQLite store as one atomic target.

- [ ] **Step 6: Verify the low-level mutation layer**

Run: `npm test -- test/mutation-io.test.ts`

Expected:
- PASS
- every supported operation can be applied in isolation
- binary and SQLite-backed inputs round-trip without byte drift

- [ ] **Step 7: Commit**

```bash
git add tools/agentscope/src/core/mutation-io.ts tools/agentscope/test/mutation-io.test.ts tools/agentscope/test/support/mutation-sandbox.ts tools/agentscope/package.json
git commit -m "feat: add mutation io primitives"
```

## Task 3: Implement Persistent Backups, Audit Logging, And Advisory Locking

**Files:**
- Create: `tools/agentscope/src/core/mutation-lock.ts`
- Create: `tools/agentscope/src/core/mutation-state.ts`
- Create: `tools/agentscope/test/mutation-state.test.ts`
- Modify: `tools/agentscope/test/support/mutation-sandbox.ts`

- [ ] **Step 1: Write failing state-layer tests**

Create `test/mutation-state.test.ts` covering:
- state directories created under `appStateRoot`
- one backup manifest persisted under a unique backup ID
- backup payload blobs stored separately from the manifest
- append-only audit log entries
- manifest reload across a fresh process boundary
- invalid or incomplete manifest rejection during restore lookup
- advisory lock acquisition success and lock-contention failure

- [ ] **Step 2: Define the AgentScope state layout**

In `src/core/mutation-state.ts`, use this layout under `appStateRoot`:
- `locks/mutation.lock`
- `backups/<backup-id>/manifest.json`
- `backups/<backup-id>/blobs/<entry-id>.bin`
- `audit/log.jsonl`

The manifest must include:
- `backupId`
- `createdAt`
- the selected item identity when known
- the affected paths or stores
- the original content inline when tiny, or a blob reference when stored out of line

Inject the clock and backup-ID generator so tests can assert deterministic output.

- [ ] **Step 3: Implement advisory locking**

In `src/core/mutation-lock.ts`, acquire the mutation lock through one exclusive lock-file flow under `appStateRoot`. Store the owning PID and timestamp in the lock file. If the lock already exists, check whether the recorded PID is still alive; reclaim stale locks from dead processes, but return a blocked failure when a live owner still holds the lock. Always release the lock in `finally`.

- [ ] **Step 4: Implement backup and audit persistence**

Back in `src/core/mutation-state.ts`, add helpers to:
- persist a backup manifest and payload blobs before mutation
- load and validate a backup manifest by ID
- append JSON lines to the audit log for apply, restore, and post-start failures

The audit entry for failed apply attempts must only be written when the failure happens after the guarded flow has actually started.

- [ ] **Step 5: Verify persistence and locking**

Run: `npm test -- test/mutation-state.test.ts`

Expected:
- PASS
- persisted backups survive a fresh reload
- lock contention fails cleanly without partial state
- audit entries append in a stable JSONL shape

- [ ] **Step 6: Commit**

```bash
git add tools/agentscope/src/core/mutation-lock.ts tools/agentscope/src/core/mutation-state.ts tools/agentscope/test/mutation-state.test.ts tools/agentscope/test/support/mutation-sandbox.ts
git commit -m "feat: add mutation state persistence"
```

## Task 4: Build The Shared Mutation Engine And Deterministic Output Layer

**Files:**
- Create: `tools/agentscope/src/core/mutation-engine.ts`
- Create: `tools/agentscope/src/core/mutation-output.ts`
- Create: `tools/agentscope/test/mutation-engine.test.ts`
- Create: `tools/agentscope/test/mutation-output.test.ts`
- Modify: `tools/agentscope/test/support/fake-toggle-provider.ts`

- [ ] **Step 1: Write failing engine tests first**

Create `test/mutation-engine.test.ts` with fake-provider plans covering:
- dry-run success with planned operations and affected targets
- explicit `no-op` when the requested target state already matches current state
- blocked apply for fingerprint drift
- blocked apply for lock contention
- successful apply with backup creation and returned backup ID
- failed apply after the audit flow starts
- successful restore from a saved backup
- failed restore for missing or invalid backup manifests

- [ ] **Step 2: Implement the dry-run and no-op flow**

In `src/core/mutation-engine.ts`, add one shared entrypoint that accepts a toggle plan and returns:
- `blocked` when the provider could not produce a writable plan
- `no-op` when the plan contains zero operations because current state already matches the target state
- `dry-run` when the plan is valid but `--apply` is not requested

Dry-run must never create a backup entry or audit entry. `no-op` must propagate as exit code `0` and must also create no backup or audit entry.

- [ ] **Step 3: Implement the guarded apply flow**

Still in `src/core/mutation-engine.ts`, implement apply in this order:
1. acquire the advisory lock
2. re-fingerprint every live target and compare it against the source fingerprints embedded in the plan by `planToggle(...)`
3. persist the backup manifest and blobs
4. append the apply audit entry
5. execute the planned operations through the low-level mutation helpers
6. if any operation fails after mutations begin, walk the already-completed operations in reverse order and restore their original state from the backup blobs created in step 3 by calling the raw `mutation-io` primitives directly, not the user-facing `restore` command flow; if rollback itself fails, record both failures in the audit trail and surface both in command output
7. if rollback succeeds, delete the just-created backup manifest and its blobs before returning failure, so later `restore` runs do not try to restore an apply that was already undone; failed-apply audit entries for this path should omit `backupId` and record cleanup metadata instead, so the audit log never points at a deleted backup
8. return the backup ID and affected targets

If any step fails after the guarded flow begins, append a failed-apply audit entry and leave live provider state fully rolled back or untouched.

- [ ] **Step 4: Implement the shared restore flow**

Use the same engine file to restore one backup by ID through the same lock and IO layers. Restore must:
- validate the manifest shape
- reacquire the advisory lock
- capture an ephemeral rollback snapshot of the current live target state before mutating restore targets, so a failed multi-target restore can reverse any already-restored targets and avoid mixed live state
- delete paths that were created by apply when the manifest says they did not exist before the mutation
- recreate deleted paths when the backup says they originally existed
- restore renamed targets back to their original locations
- restore original blobs for text, binary, and SQLite-backed targets
- if restore fails after mutating any targets, walk the already-restored targets in reverse order and reapply the rollback snapshot through the raw `mutation-io` primitives so restore does not leave provider-managed state partially restored
- append a restore audit entry

Successful restore must leave the backup manifest and blobs in place; backup cleanup belongs to a later retention feature, not to restore itself.

- [ ] **Step 5: Add deterministic renderers for toggle and restore**

Create `src/core/mutation-output.ts` and `test/mutation-output.test.ts`.

Renderers must produce deterministic human and JSON output that include:
- status
- selected item identity or backup ID
- target enabled state for toggle
- planned or restored operations
- affected paths or stores
- backup ID on successful apply
- one explicit line stating that no writes were performed for dry run

- [ ] **Step 6: Verify the shared engine**

Run:
- `npm test -- test/mutation-engine.test.ts test/mutation-output.test.ts`
- `npm run build`

Expected:
- PASS
- dry run stays read-only
- apply returns a backup ID only on success
- restore uses the persisted backup manifest instead of reconstructing guesses

- [ ] **Step 7: Commit**

```bash
git add tools/agentscope/src/core/mutation-engine.ts tools/agentscope/src/core/mutation-output.ts tools/agentscope/test/mutation-engine.test.ts tools/agentscope/test/mutation-output.test.ts tools/agentscope/test/support/fake-toggle-provider.ts
git commit -m "feat: add shared mutation engine"
```

## Task 5: Add The `toggle` Command

**Files:**
- Create: `tools/agentscope/src/commands/toggle.ts`
- Create: `tools/agentscope/test/toggle.test.ts`
- Modify: `tools/agentscope/src/cli.ts`
- Modify: `tools/agentscope/test/cli.test.ts`

- [ ] **Step 1: Write failing toggle command tests**

Create `test/toggle.test.ts` and extend `test/cli.test.ts`.

Cover:
- missing required selector flags
- unknown selection
- ambiguous selection
- blocked `read-only` or `unsupported` production selection
- dry-run success through the fake writable provider injected through the command helper
- explicit `no-op` with exit code `0` and no backup or audit entries
- `--apply` success returning a backup ID
- deterministic JSON output when `--json` is used

- [ ] **Step 2: Implement selection resolution**

In `src/commands/toggle.ts`, resolve exactly one discovered item by:
- `provider`
- `kind`
- `id`
- `layer`

Treat `id` as the authoritative selector because the current normalized item IDs already encode the category slice such as `skill`, `configured-mcp`, or `tool`. `provider`, `kind`, and `layer` remain required by the CLI contract, but if those fields plus the supplied `id` still resolve to zero or multiple items, return a blocked non-zero result with a deterministic reason and no writes.

- [ ] **Step 3: Implement dry-run and apply command behavior**

Still in `src/commands/toggle.ts`, implement `runToggle(options & { providers?: ProviderModule[] })` so the CLI path uses the default provider list, while tests can inject `[fakeToggleProvider]` without touching the production registry. Inside that helper, compute the target enabled state as the inverse of the currently discovered item, call the provider's `planToggle(...)` hook, and route the result through the shared engine:
- without `--apply`: dry run only
- with `--apply`: guarded apply path

All blocked states should return one shared non-zero exit code. Put the machine-readable blocking reason in the command output payload instead of inventing separate exit codes for unknown, ambiguous, `read-only`, `unsupported`, fingerprint-drift, or lock-contention cases.
If the resolved provider does not expose `planToggle(...)`, return the same blocked `unsupported` result instead of attempting any write logic.

Support:
- `--provider <id>`
- `--kind <kind>`
- `--id <id>`
- `--layer <layer>`
- `--apply`
- `--json`
- `--project-root <path>`
- `--app-state-root <path>`
- `--cursor-root <path>`

- [ ] **Step 4: Wire the command into the CLI**

Update `src/cli.ts` so `toggle` is registered next to `providers`, `doctor`, `list`, and shares the same handled-error path.

- [ ] **Step 5: Verify `toggle`**

Run:
- `npm test -- test/toggle.test.ts test/cli.test.ts`
- `npm run build`
- `HOME="$PWD/test/fixtures/runtime/home" node dist/cli.js toggle --provider claude --kind skill --id claude:project:skill:example-claude-skill --layer project --project-root "$PWD/test/fixtures/runtime/project" --cursor-root "$PWD/test/fixtures/runtime/cursor/User" --app-state-root "$PWD/test/fixtures/runtime/app-state"`

Expected:
- tests PASS
- build succeeds
- the manual CLI call exits non-zero with a clear blocked reason because real Claude items are still read-only in this feature

- [ ] **Step 6: Commit**

```bash
git add tools/agentscope/src/commands/toggle.ts tools/agentscope/src/cli.ts tools/agentscope/test/toggle.test.ts tools/agentscope/test/cli.test.ts
git commit -m "feat: add toggle command"
```

## Task 6: Add The `restore` Command

**Files:**
- Create: `tools/agentscope/src/commands/restore.ts`
- Create: `tools/agentscope/test/restore.test.ts`
- Modify: `tools/agentscope/src/cli.ts`
- Modify: `tools/agentscope/test/cli.test.ts`

- [ ] **Step 1: Write failing restore command tests**

Create `test/restore.test.ts` covering:
- restoring one valid backup ID
- missing backup ID
- malformed backup ID
- missing backup manifest
- invalid backup manifest
- advisory lock contention during restore
- deterministic JSON output when `--json` is used

- [ ] **Step 2: Implement the restore command**

In `src/commands/restore.ts`, load one backup by ID through the shared engine and return deterministic output with:
- the backup ID
- the restored paths or stores
- final status `restored` or `failed`

Support:
- `agentscope restore <backup-id>`
- optional `--json`
- `--project-root <path>`
- `--app-state-root <path>`
- `--cursor-root <path>`

- [ ] **Step 3: Wire `restore` into the CLI**

Update `src/cli.ts` so `restore` shares the same handled-command flow and non-zero behavior as the other subcommands, and extend `test/cli.test.ts` so CLI registration and routing for `restore` are covered alongside the existing invalid-usage checks.

- [ ] **Step 4: Verify `restore`**

Run:
- `npm test -- test/restore.test.ts test/cli.test.ts`
- `npm run build`

Expected:
- PASS
- restore succeeds for a saved backup from the fake writable provider path
- restore exits non-zero for missing, malformed, or unsafe backup input

- [ ] **Step 5: Commit**

```bash
git add tools/agentscope/src/commands/restore.ts tools/agentscope/src/cli.ts tools/agentscope/test/restore.test.ts tools/agentscope/test/cli.test.ts
git commit -m "feat: add restore command"
```

## Task 7: Document The Feature And Run Final Acceptance Verification

**Files:**
- Modify: `tools/agentscope/README.md`
- Modify: `tools/agentscope/test/toggle.test.ts`
- Modify: `tools/agentscope/test/restore.test.ts`
- Modify: `tools/agentscope/test/mutation-engine.test.ts`
- Modify: `tools/agentscope/test/mutation-io.test.ts`
- Modify: `tools/agentscope/test/mutation-state.test.ts`

- [ ] **Step 1: Map the acceptance criteria to committed tests**

Confirm the final suite directly covers:
- the full supported mutation vocabulary
- dry-run output and no-write guarantees
- guarded apply success with lock, backup, and audit persistence
- fingerprint drift failure without live-state mutation
- lock-contention failure for both apply and restore
- successful restore from a persisted backup
- byte-for-byte equality for non-UTF-8 and SQLite-backed snapshots
- blocked `read-only`, `unsupported`, unknown, and ambiguous selections
- backups surviving across separate command invocations
- no new writable provider coverage for Claude, Codex, or Cursor

- [ ] **Step 2: Fill any remaining coverage gaps**

If one acceptance criterion is only implied, add the smallest focused assertion to the existing mutation tests instead of creating redundant files.

- [ ] **Step 3: Update the README**

Refresh `tools/agentscope/README.md` so it documents:
- `toggle`
- `restore`
- dry-run versus `--apply`
- backup and audit persistence under `appStateRoot`
- the minimum supported Node runtime for SQLite-backed mutations
- the fact that the shared engine is ready, but real provider-specific write planning still arrives in later features

- [ ] **Step 4: Run the full verification suite**

Run:
- `npm test`
- `npm run build`

Expected:
- PASS
- the full mutation, toggle, restore, discovery, and CLI suites all pass together
- `dist/` regenerates cleanly from `src/`

- [ ] **Step 5: Commit**

```bash
git add tools/agentscope/README.md tools/agentscope/src tools/agentscope/test
git commit -m "test: verify safe mutation engine acceptance criteria"
```

## Spec Coverage Check

- Requirement 1, shared mutation operation vocabulary: Tasks 1, 2, 4
- Requirement 2, dry-run toggle behavior: Tasks 4, 5, 7
- Requirement 3, safe apply workflow: Tasks 2, 3, 4, 5
- Requirement 4, backup and audit persistence: Tasks 3, 4, 6, 7
- Requirement 5, restore behavior: Tasks 3, 4, 6, 7
- Requirement 6, command contract: Tasks 5, 6, 7
- States, error handling, and invariants: Tasks 3, 4, 5, 6, 7
- Acceptance criteria 1-10: Tasks 2, 3, 4, 5, 6, 7

## Grounding Review

- `src/core/config.ts` already resolves `appStateRoot`, so using it as the sole state root for locks, backups, and audit logs fits the current architecture.
- `src/cli.ts` already centralizes subcommand wiring and handled error reporting, so adding `toggle` and `restore` there is the correct incremental extension.
- `src/providers/*.ts` already own provider-specific discovery semantics, so adding a narrow optional `planToggle(...)` hook there is more grounded than inventing a second provider registry just for mutations.
- The current test suite already uses inline sandbox and command-helper patterns, so introducing shared helpers in `test/support/mutation-sandbox.ts` and `test/support/fake-toggle-provider.ts` is a focused extension rather than a structural mismatch.
- No existing `appStateRoot` directory layout is committed yet, so introducing `locks/`, `backups/`, and `audit/` does not conflict with an established persisted-state schema.

0 issues, the plan is ready for implementation. Re-run grounding if the codebase changes before implementation starts.
