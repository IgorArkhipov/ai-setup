---
title: "FT-006: Persistent Discovery Snapshot Command"
doc_kind: feature
doc_function: canonical
purpose: "Canonical feature document for adding the first persisted discovery snapshot slice to AgentScope, including a project-scoped latest snapshot, bounded history, and validated snapshot schema."
derived_from:
  - ../../domain/problem.md
  - ../../prd/PRD-003-persistent-discovery-snapshots-and-secondary-surfaces.md
  - ../FT-001/feature.md
  - ../FT-002/feature.md
status: active
delivery_status: done
audience: humans_and_agents
must_not_define:
  - implementation_sequence
---

# FT-006: Persistent Discovery Snapshot Command

## What

### Problem

AgentScope's discovery and guarded mutation contracts are now stable, but the CLI still exposes inventory only as transient terminal output. Users cannot persist a point-in-time normalized inventory for one project, and future secondary surfaces would have to invent their own on-disk contract instead of reusing one validated artifact. The next smallest slice is to capture the existing discovery result into a project-scoped snapshot under the app-state root without changing provider behavior or mutation semantics.

### Outcome

| Metric ID | Metric | Baseline | Target | Measurement method |
| --- | --- | --- | --- | --- |
| `MET-01` | Snapshot capture becomes a first-class CLI capability | Inventory exists only in the current `list` invocation | `agentscope snapshot` persists a validated latest snapshot plus bounded history for the selected project root | Automated snapshot, CLI, and path verification plus a built CLI check |

### Scope

- `REQ-01` Add a `snapshot` CLI command that reuses the existing project, app-state, and Cursor root overrides and supports both human-readable and JSON output.
- `REQ-02` Persist a versioned discovery snapshot under a project-scoped location inside `appStateRoot`, with both `latest.json` and bounded history entries using a default retention of 20 snapshots per project in this slice.
- `REQ-03` Record the normalized discovery items, provider-scoped warnings, captured timestamp, stable snapshot id, project root, and aggregate provider inventory summary in the persisted payload, including deterministic per-provider available, active, and warning counts plus kind, category, and layer breakdowns.
- `REQ-04` Keep snapshot capture non-destructive with respect to provider-managed files and preserve the current discovery warning behavior: warnings may produce a non-zero exit result, but they must not prevent snapshot persistence.
- `REQ-05` Provide validated core helpers to read the latest snapshot and enumerate history so later features can reuse the stored contract instead of reparsing JSON ad hoc.
- `REQ-06` Verify snapshot schema validation, storage-path derivation, history pruning, command routing, and rendered output through automated tests.

### Non-Scope

- `NS-01` Interactive dashboard or TUI work.
- `NS-02` Local stdio MCP server work.
- `NS-03` Snapshot diffing, rollback-to-snapshot, or historical analytics.
- `NS-04` Any change to provider discovery semantics, writable coverage, backup, audit, or restore behavior.

### Constraints / Assumptions

- `ASM-01` FT-001 remains the owner of the normalized discovery item and warning contracts, while FT-002 remains the owner of app-state-root conventions and guarded write discipline.
- `CON-01` The `snapshot` command must delegate to the same discovery flow that powers `list`; it must not create a second provider traversal or normalization path.
- `CON-02` Snapshot storage must stay project-scoped under the AgentScope app-state root so different repositories do not overwrite one another.
- `CON-03` Snapshot payloads must start at `version: 1` and unrecognized or malformed versions must be rejected on read so downstream surfaces do not treat invalid stored files as trusted input.
- `CON-04` Bounded history pruning must preserve the newly written snapshot, keep the latest pointer aligned with the most recent persisted payload, and retain the newest 20 snapshots per project by default in this slice.
- `CON-05` The snapshot `inventory` summary must be derived from the same normalized discovery items and warnings that power `list`, not from a second counting implementation.
- `CON-06` Presentation logic for snapshot output must stay in the command or renderer layer rather than leaking into provider adapters or low-level storage helpers.

## How

### Solution

Add a small snapshot subsystem that transforms the existing normalized discovery result into a versioned persisted artifact, stores that artifact under a project-scoped directory inside `appStateRoot`, and exposes it through a new `snapshot` command. Reuse current discovery, path-resolution, and CLI patterns so the feature adds persistence without changing provider behavior or the guarded mutation boundary.

### Change Surface

| Surface | Type | Why it changes |
| --- | --- | --- |
| `tools/agentscope/src/cli.ts` | code | Register the new `snapshot` command and route CLI flags through the existing command conventions |
| `tools/agentscope/src/commands/snapshot.ts` | code | Own the snapshot command flow, exit behavior, and renderer selection |
| `tools/agentscope/src/core/snapshots.ts` | code | Define the snapshot schema, validation, write, latest-read, and history-list helpers |
| `tools/agentscope/src/core/paths.ts` | code | Add project-scoped snapshot path helpers under `appStateRoot` |
| `tools/agentscope/src/core/output.ts` or sibling snapshot renderer | code | Keep human-readable and JSON snapshot rendering deterministic |
| `tools/agentscope/test/cli.test.ts` | tests | Command routing and flag handling must cover the new surface |
| `tools/agentscope/test/paths.test.ts` | tests | Snapshot storage path derivation must stay stable |
| `tools/agentscope/test/output.test.ts` | tests | Snapshot rendering must stay deterministic |
| `tools/agentscope/test/snapshot.test.ts` | tests | Snapshot schema validation, persistence, history pruning, and read helpers belong here |
| `tools/agentscope/README.md` | doc | The command surface must document the new snapshot workflow |

### Flow

1. The user runs `agentscope snapshot` with the same root overrides supported by the existing CLI.
2. AgentScope runs the existing discovery flow, builds a versioned snapshot payload from the normalized items and warnings, and writes it to project-scoped latest and history files under `appStateRoot`.
3. The command renders the saved snapshot in human-readable or JSON form and reports warnings consistently with the persisted payload.

### Contracts

| Contract ID | Input / Output | Producer / Consumer | Notes |
| --- | --- | --- | --- |
| `CTR-01` | Discovery snapshot payload with `version`, `id`, `capturedAt`, `projectRoot`, `items`, `warnings`, and `inventory` | Snapshot core / future secondary surfaces | `inventory` includes deterministic per-provider available, active, and warning counts plus kind, category, and layer breakdowns derived from the normalized discovery result |
| `CTR-02` | Project-scoped snapshot storage paths for `latest.json` and `history/<snapshot-id>.json` | Path helpers / snapshot core and CLI | Different project roots must resolve to different snapshot directories |
| `CTR-03` | Snapshot command exit behavior | Snapshot command / CLI callers | Discovery warnings may produce a non-zero result, but persistence still succeeds |

### Failure Modes

- `FM-01` Snapshot payload content diverges from `list` semantics and later consumers observe a different inventory from the same discovery state.
- `FM-02` Snapshot storage paths collide across projects and later writes overwrite another repository's history.
- `FM-03` Malformed stored snapshot files are accepted silently instead of being rejected explicitly on read.
- `FM-04` History pruning deletes the newest snapshot or leaves `latest.json` inconsistent with the most recent history entry.

## Verify

### Exit Criteria

- `EC-01` AgentScope can persist and reload a validated discovery snapshot for one project without touching provider-managed files.
- `EC-02` Snapshot schema, storage-path derivation, history pruning, and command output are fixture-backed and deterministic.

### Traceability matrix

| Requirement ID | Design refs | Acceptance refs | Checks | Evidence IDs |
| --- | --- | --- | --- | --- |
| `REQ-01` | `ASM-01`, `CON-01`, `CON-06`, `CTR-03` | `EC-01`, `SC-01` | `CHK-01` | `EVID-01` |
| `REQ-02` | `ASM-01`, `CON-02`, `CON-04`, `CTR-02`, `FM-02`, `FM-04` | `EC-01`, `SC-01`, `SC-02` | `CHK-01` | `EVID-01` |
| `REQ-03` | `CON-01`, `CON-03`, `CON-05`, `CTR-01`, `FM-01`, `FM-03` | `EC-01`, `SC-01`, `SC-03`, `NEG-01` | `CHK-01` | `EVID-01` |
| `REQ-04` | `ASM-01`, `CON-01`, `CTR-03`, `FM-01` | `EC-01`, `SC-01` | `CHK-01`, `CHK-02` | `EVID-01`, `EVID-02` |
| `REQ-05` | `CON-02`, `CON-03`, `CTR-01`, `CTR-02`, `FM-03` | `EC-01`, `SC-03`, `NEG-01` | `CHK-01` | `EVID-01` |
| `REQ-06` | `CON-03`, `CON-04`, `CON-05`, `CON-06`, `FM-02`, `FM-03`, `FM-04` | `EC-02`, `SC-02`, `SC-03`, `NEG-01` | `CHK-01`, `CHK-02` | `EVID-01`, `EVID-02` |

### Acceptance Scenarios

- `SC-01` A user runs `agentscope snapshot` against fixture or sandbox roots and receives a saved latest snapshot plus a matching history entry for the selected project.
- `SC-02` A user captures more than the retained number of snapshots for one project, and AgentScope keeps the newest bounded history while leaving `latest.json` aligned to the most recent snapshot.
- `SC-03` A later caller loads the latest snapshot or history through the core helpers, and malformed stored payloads are rejected explicitly instead of being treated as valid state.

### Negative / Edge Scenarios

- `NEG-01` A malformed stored snapshot file is encountered during latest-load or history-list validation, and AgentScope fails explicitly instead of silently accepting, skipping, or rewriting the invalid payload.

### Checks

| Check ID | Covers | How to check | Expected result | Evidence path |
| --- | --- | --- | --- | --- |
| `CHK-01` | `EC-01`, `EC-02`, `SC-01`, `SC-02`, `SC-03` | Run `npm test` in `tools/agentscope` with snapshot, CLI, path, and output coverage | Snapshot persistence, validation, routing, and rendering pass deterministically | `../../tools/agentscope/test/` |
| `CHK-02` | `EC-01`, `REQ-04` | Run `npm run build` in `tools/agentscope` and execute the built `snapshot` command once against fixture roots | The shipped CLI builds and the new command reports persisted snapshot details without touching provider-managed files | `implementation-plan.md#ready-for-acceptance` |

### Test matrix

| Check ID | Evidence IDs | Evidence path |
| --- | --- | --- |
| `CHK-01` | `EVID-01` | `../../tools/agentscope/test/` |
| `CHK-02` | `EVID-02` | `implementation-plan.md#ready-for-acceptance` |

### Evidence

- `EVID-01` Automated snapshot command, schema, path, and rendering coverage in `tools/agentscope/test/`.
- `EVID-02` Final execution summary and built CLI verification record in [`implementation-plan.md`](implementation-plan.md).

### Evidence contract

| Evidence ID | Artifact | Producer | Path contract | Reused by checks |
| --- | --- | --- | --- | --- |
| `EVID-01` | Automated snapshot and command test suite | Vitest | `../../tools/agentscope/test/` | `CHK-01` |
| `EVID-02` | Execution summary and final built-command verification outcome | implementation plan | `implementation-plan.md#ready-for-acceptance` | `CHK-02` |
