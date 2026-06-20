---
title: "FT-012: Terminal Dashboard And CLI Filter Parity"
doc_kind: feature
doc_function: canonical
purpose: "Canonical feature document for restoring the original AgentScope dashboard command and closing CLI filter gaps while reusing existing headless safety contracts."
derived_from:
  - ../../domain/problem.md
  - ../../prd/PRD-003-persistent-discovery-snapshots-and-secondary-surfaces.md
  - ../../flows/workflows.md
  - ../../flows/feature-flow.md
  - protocol.md
status: active
delivery_status: done
audience: humans_and_agents
must_not_define:
  - implementation_sequence
---

# FT-012: Terminal Dashboard And CLI Filter Parity

## What

### Problem

The original AgentScope implementation plan still includes `agentscope dashboard`, dashboard state, filtering, details, dry-run preview, staged apply, and post-apply snapshot refresh. The current implementation is otherwise strong as a headless CLI and MCP control plane, but it lacks that local dashboard surface and two CLI filters from the plan command surface: `--kind` and `--category`.

`PRD-003` intentionally deferred dashboard/TUI work until a future request re-established the product need. The active goal reopens the gap and asks to implement all remaining original-plan features one by one.

### Users And Workflows

| User / Segment | Workflow | Why CLI and MCP alone are not enough |
| --- | --- | --- |
| `terminal-operator` | Inspect provider inventory, filter by provider/layer/kind/category/search, select one item, and preview the exact reversible change from one terminal command | `list` and `toggle` require manual command hopping and do not show inventory, selection details, and the planned mutation together |
| `workflow-runner-agent` | Produce deterministic dashboard output during an automated feature slice, stage exact item changes, require confirmation for writes, and save a fresh snapshot after successful apply | MCP tools are agent-facing, but the local execution record needs a human-readable terminal artifact that uses the same safety path |

### Outcome

| Metric ID | Metric | Baseline | Target | Measurement method |
| --- | --- | --- | --- | --- |
| `MET-01` | Dashboard command exists | `agentscope dashboard` is unknown | CLI help and tests show `dashboard` is registered and renders inventory | CLI tests |
| `MET-02` | Dashboard can inspect filtered inventory | Users must combine `list` and `toggle` manually | Dashboard supports provider, layer, kind, category, search, and selected item views | Dashboard tests |
| `MET-03` | Dashboard previews and applies safely | No dashboard state or staged apply exists | Staged dashboard changes use existing provider planning, mutation engine, backups, audit, and snapshot refresh | Dashboard apply tests |
| `MET-04` | CLI command-surface gap is closed | `list` filters only provider/layer | `list --kind` and `list --category` filter human and JSON output | List and CLI tests |

### Scope

- `REQ-01` Add an `agentscope dashboard` command that renders deterministic terminal dashboard output over current discovery inventory.
- `REQ-02` Add dashboard state support for provider, layer, kind, category, search query, selected item, staged changes, confirmation, and refresh/apply status.
- `REQ-03` Add a dashboard details pane that shows selected item paths, mutability, enabled state, and dry-run toggle preview or blocked reason using provider planning.
- `REQ-04` Add dashboard staged apply that executes through the existing mutation engine and writes a fresh snapshot after successful apply.
- `REQ-05` Add `agentscope list --kind` and `agentscope list --category` filters with validation and matching warnings behavior.
- `REQ-06` Update README and governed docs so users understand dashboard scope and know it is a thin local terminal surface, not a second mutation engine.

### Non-Scope

- `NS-01` No remote, hosted, browser, or web dashboard.
- `NS-02` No provider UI automation.
- `NS-03` No new provider mutation semantics.
- `NS-04` No real provider-root mutation during tests.
- `NS-05` No `.env*` reads, fixtures, or derived values.
- `NS-06` No replacement of the MCP control plane or existing CLI commands.

### Constraints / Assumptions

- `ASM-01` A deterministic terminal dashboard is the correct first restored dashboard capability for this CLI-first codebase.
- `CON-01` Dashboard apply must call existing provider planning and `executeTogglePlan`; dashboard code must not write provider files directly.
- `CON-02` Post-apply refresh must use `writeDiscoverySnapshot` under the configured app-state root.
- `CON-03` Filters must reuse the same item taxonomy as core models and MCP schemas.
- `DEC-01` React/Ink is not introduced in this slice unless deterministic terminal rendering cannot satisfy the acceptance scenarios.

## How

### Solution

Add a dashboard command implemented as a deterministic terminal surface. It reuses current discovery, provider planning, mutation execution, and snapshot helpers. State logic lives in `tools/agentscope/src/ui/state.ts`; command orchestration lives in `tools/agentscope/src/commands/dashboard.ts`; rendering lives under `tools/agentscope/src/ui/`.

### Change Surface

| Surface | Type | Why it changes |
| --- | --- | --- |
| `tools/agentscope/src/cli.ts` | code | Register `dashboard` and list filter flags |
| `tools/agentscope/src/commands/dashboard.ts` | code | Command orchestration for dashboard render, stage, apply, snapshot refresh |
| `tools/agentscope/src/ui/state.ts` | code | Dashboard state, reducers, filtering, staging |
| `tools/agentscope/src/ui/render.ts` | code | Deterministic terminal dashboard sections |
| `tools/agentscope/src/commands/list.ts` | code | Add kind/category filters |
| `tools/agentscope/test/dashboard-state.test.ts` | tests | State and filtering coverage |
| `tools/agentscope/test/dashboard.test.ts` | tests | Dashboard command render/apply coverage |
| `tools/agentscope/test/list.test.ts`, `test/cli.test.ts` | tests | CLI filter and command routing coverage |
| `tools/agentscope/README.md` | docs | Document dashboard command and scope |
| `memory-bank/domain/frontend.md` | docs | Canonical command-surface update for the terminal dashboard |
| `memory-bank/features/FT-012/*` | docs | Governed workflow, scope, plan, evidence |

### Contracts

| Contract ID | Input / Output | Producer / Consumer | Notes |
| --- | --- | --- | --- |
| `CTR-01` | Dashboard filters | CLI / dashboard state | Provider, layer, kind, category, search, selected id |
| `CTR-02` | Dashboard staged change | CLI or state reducer / command apply path | Provider, kind, layer, id, target enabled |
| `CTR-03` | Dashboard plan preview | provider `planToggle` / renderer | Planned, blocked, or no-op with operation summaries |
| `CTR-04` | Post-apply snapshot | dashboard command / snapshot storage | Same schema and paths as `agentscope snapshot` |
| `CTR-05` | List filters | CLI / `runList` | Invalid kind/category/layer returns deterministic failure |

### Failure Modes

- `FM-01` Dashboard filters use a different taxonomy from list/MCP and hide valid items.
- `FM-02` Dashboard apply bypasses mutation fingerprints, backups, or audit logging.
- `FM-03` Dashboard snapshot refresh writes stale state or writes outside app-state.
- `FM-04` Staged apply silently skips blocked items instead of reporting them.
- `FM-05` New list filters drop provider warnings incorrectly.

### ADR Dependencies

None.

## Verify

### Exit Criteria

- `EC-01` `agentscope dashboard` is registered and renders deterministic inventory, item list, details, preview, staged, and warning sections.
- `EC-02` Dashboard state supports filters, search, selection, staging, and stale staged-state clearing.
- `EC-03` Dashboard apply uses existing mutation execution and writes a fresh snapshot after success.
- `EC-04` `list --kind` and `list --category` filter JSON and human output and reject invalid values.
- `EC-05` README and memory-bank docs describe the dashboard support boundary.
- `EC-06` Local tests, coverage, build, lint, diff check, and external CI pass.

### Acceptance Scenarios

- `SC-01` A user runs `agentscope dashboard` against fixture roots and sees a provider/layer/category summary, a filtered item list, selected-item details, and toggle preview.
- `SC-02` A user filters dashboard or list output by provider, layer, kind, category, and search; unrelated items are omitted and relevant warnings remain visible.
- `SC-03` A user stages a reversible item in dashboard mode without apply; output shows planned operations and no writes occur.
- `SC-04` A user stages and applies a reversible item with confirmation; existing mutation state records the backup/audit behavior and a fresh snapshot is written.
- `SC-05` A user selects a read-only or unsupported surface; dashboard shows a blocked preview and apply does not write.

### Negative / Edge Scenarios

- `NEG-01` Invalid list or dashboard filter values return deterministic non-zero errors.
- `NEG-02` Dashboard apply without confirmation is blocked.
- `NEG-03` Empty dashboard filters render an explicit empty state instead of failing.
- `NEG-04` Staged apply with only blocked or no-op items does not write a snapshot.

### Checks

| Check ID | Covers | How to check | Expected result | Evidence path |
| --- | --- | --- | --- | --- |
| `CHK-01` | `EC-01`, `EC-02`, `SC-01`, `SC-02`, `SC-05`, `NEG-03` | `cd tools/agentscope && npx vitest run test/dashboard-state.test.ts test/dashboard.test.ts` | Dashboard render/state tests pass | terminal output |
| `CHK-02` | `EC-03`, `SC-03`, `SC-04`, `NEG-02`, `NEG-04` | `cd tools/agentscope && npx vitest run test/dashboard.test.ts test/toggle.test.ts test/snapshot.test.ts` | Dashboard apply uses existing mutation and snapshot behavior | terminal output |
| `CHK-03` | `EC-04`, `NEG-01` | `cd tools/agentscope && npx vitest run test/list.test.ts test/cli.test.ts` | List filters and command routing tests pass | terminal output |
| `CHK-04` | `EC-05`, `EC-06` | review README, PRD-003, `memory-bank/domain/frontend.md`, FT-012 docs; run `cd tools/agentscope && npm run build && npm test && npm run coverage && npm run lint`; `git diff --check` | docs align and all commands pass | terminal output and diff review |
| `CHK-05` | `EC-06` | GitHub Actions CI on pushed `main` | all jobs pass | CI URL |

### Traceability Matrix

| Requirement ID | Design refs | Acceptance refs | Checks | Evidence IDs |
| --- | --- | --- | --- | --- |
| `REQ-01` | `ASM-01`, `CTR-01`, `FM-01` | `EC-01`, `SC-01` | `CHK-01`, `CHK-04` | `EVID-01`, `EVID-04` |
| `REQ-02` | `CTR-01`, `CTR-02`, `FM-01` | `EC-02`, `SC-02`, `NEG-03` | `CHK-01` | `EVID-01` |
| `REQ-03` | `CTR-03`, `FM-04` | `EC-01`, `SC-01`, `SC-05` | `CHK-01` | `EVID-01` |
| `REQ-04` | `CON-01`, `CON-02`, `CTR-04`, `FM-02`, `FM-03` | `EC-03`, `SC-03`, `SC-04`, `NEG-02`, `NEG-04` | `CHK-02`, `CHK-04` | `EVID-02`, `EVID-04` |
| `REQ-05` | `CON-03`, `CTR-05`, `FM-05` | `EC-04`, `SC-02`, `NEG-01` | `CHK-03` | `EVID-03` |
| `REQ-06` | `ASM-01`, `DEC-01` | `EC-05` | `CHK-04` | `EVID-04` |

### Test Matrix

| Check ID | Evidence IDs | Evidence path |
| --- | --- | --- |
| `CHK-01` | `EVID-01` | dashboard test output |
| `CHK-02` | `EVID-02` | dashboard apply test output |
| `CHK-03` | `EVID-03` | list/CLI filter test output |
| `CHK-04` | `EVID-04` | full local verification output |
| `CHK-05` | `EVID-05` | GitHub Actions run URL |

### Evidence

- `EVID-01` Dashboard state/render test output.
- `EVID-02` Dashboard staged apply and snapshot test output.
- `EVID-03` List filter and CLI routing test output.
- `EVID-04` Full local verification bundle and documentation review output.
- `EVID-05` External CI run URL after push.

### Evidence Contract

| Evidence ID | Artifact | Producer | Path contract | Reused by checks |
| --- | --- | --- | --- | --- |
| `EVID-01` | Vitest dashboard output | test runner | terminal output | `CHK-01` |
| `EVID-02` | Vitest dashboard apply output | test runner | terminal output | `CHK-02` |
| `EVID-03` | Vitest list/CLI output | test runner | terminal output | `CHK-03` |
| `EVID-04` | Build/test/coverage/lint/diff output | local verifier | terminal output and docs diff | `CHK-04` |
| `EVID-05` | CI run URL | GitHub Actions | workflow URL | `CHK-05` |
