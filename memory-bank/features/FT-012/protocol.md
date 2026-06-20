---
title: "Protocol: FT-012 Terminal Dashboard And CLI Filter Parity"
doc_kind: process
doc_function: protocol
purpose: "Lifecycle protocol for creating, reviewing, implementing, and verifying the FT-012 dashboard parity feature."
derived_from:
  - ../../prd/PRD-003-persistent-discovery-snapshots-and-secondary-surfaces.md
  - ../../flows/agent-process-operations.md
  - ../../flows/workflows.md
status: active
audience: humans_and_agents
protocol_version: "0.1"
current_phase: commit_push
current_gate: H2
---

# Protocol: `FT-012 Terminal Dashboard And CLI Filter Parity`

## Source Interpretation

Source used:

- Current user goal on 2026-06-20: implement all remaining features from `tmp/Agentscope Implementation Plan.md` one by one using the memory-bank and protocol workflow with subagent delegation.
- `tmp/Agentscope Implementation Plan.md`, which still names `agentscope dashboard`, dashboard state, filters, details, dry-run preview, staged apply, and post-apply snapshot refresh as expected product capabilities.
- `PRD-003`, which deferred dashboard/TUI work until a later feature package provided mature scope. This user request reopens that deferred scope.
- Current AgentScope implementation, which already has headless discovery, toggle, restore, snapshot, and MCP adapter contracts.

Repository adaptation:

- `FT-012` owns only the dashboard and CLI filter parity slice.
- The dashboard must be a thin local terminal surface over existing headless contracts; it must not introduce a second discovery, mutation, backup, restore, or snapshot implementation.
- This slice may use subagents for audit and review, but source edits remain governed by this protocol and the feature package.
- Bootstrap deviation: the initial protocol, feature document, and implementation plan were drafted together because the active goal already authorized protocol-based continuation. They are not treated as accepted until review findings are recorded and resolved.

## Metadata

- Protocol version: 0.1
- Owner: Igor Arkhipov
- Work area: `/Users/igor.arkhipov/Documents/Work/Ruby/thinknetica/ai-setup`, feature `FT-012`, tool `tools/agentscope`
- Created: 2026-06-20
- Last updated: 2026-06-20
- Status: active
- Current phase: commit_push
- Current gate: H2

## Goal

Restore the original plan's missing local dashboard capability and command-filter parity without weakening AgentScope's safety model.

Target state:

- `agentscope dashboard` exists and renders a deterministic terminal dashboard for discovery inventory.
- Dashboard state supports provider, layer, kind, category, search, selected item, staged changes, confirmation, and post-apply refresh.
- Details reuse provider toggle planning for previews and existing mutation execution for writes.
- Successful dashboard apply writes a fresh discovery snapshot through the existing snapshot writer.
- `agentscope list` supports the original plan's kind and category filters.
- Tests, README, memory-bank docs, and CI agree on the shipped behavior.

## Scope

In scope:

- Add a dashboard command and dashboard state/rendering modules under `tools/agentscope/src/`.
- Add deterministic terminal dashboard output suitable for tests and CLI users.
- Add staged dashboard planning and apply through existing provider `planToggle` and mutation engine paths.
- Save a fresh snapshot after successful dashboard apply.
- Add `list --kind` and `list --category` filters to close the original command-surface gap.
- Update README and governed docs.
- Use subagent audit/review checkpoints.

Out of scope:

- Remote dashboard, web UI, hosted service, or provider UI automation.
- New provider write semantics.
- Reading or using `.env*` files.
- Direct mutation of real provider roots during tests.
- Replacing the MCP control plane or existing CLI commands.
- Adding dashboard-only persistence outside the existing snapshot and mutation-state roots.

## Current Facts / Baseline

Verified facts:

- `agentscope dashboard` is not registered in `tools/agentscope/src/cli.ts`; evidence: CLI help output and source inspection on 2026-06-20.
- `tools/agentscope/src/ui/` does not exist; evidence: source tree inspection on 2026-06-20.
- `agentscope list` currently filters only by provider and layer; evidence: `tools/agentscope/src/commands/list.ts`.
- Existing writes route through provider `planToggle` plus `executeTogglePlan`; evidence: `tools/agentscope/src/commands/toggle.ts` and `tools/agentscope/src/mcp/helpers.ts`.
- Snapshot writes are available through `writeDiscoverySnapshot`; evidence: `tools/agentscope/src/core/snapshots.ts`.

Unchecked hypotheses:

- A deterministic terminal dashboard can satisfy the local dashboard workflow without introducing React/Ink dependencies.
- The existing single-item mutation path is sufficient for exact staged dashboard apply, while the state model can stage multiple exact entries.

## Operating Constraints

- Do not read or use `.env*`.
- Use fixture-backed and temporary-root tests only.
- Use existing discovery, mutation, backup, restore, and snapshot helpers.
- Keep dashboard output deterministic for CI and local review.
- One commit per feature slice after verification.

## Human Gates

### H1: Approve scoped execution

Required before:

- Editing `tools/agentscope`, `memory-bank/prd`, or `memory-bank/features/FT-012`.
- Spawning implementation or review subagents.

Approval record:

- Approver: Igor Arkhipov
- Date: 2026-06-20
- Scope approved: Continue the active goal to implement remaining original-plan features one by one, following memory-bank and protocol workflow with subagent delegation.
- Conditions: Do not read or use `.env*`; keep one feature slice per commit; preserve existing safety contracts.

### H2: Commit and push point

Required before:

- Creating and pushing the FT-012 feature-slice commit.
- Treating external CI as acceptance evidence.

Required evidence before H2:

- Targeted dashboard, list, and CLI tests pass.
- `cd tools/agentscope && npm run build`
- `cd tools/agentscope && npm test`
- `cd tools/agentscope && npm run coverage`
- `cd tools/agentscope && npm run lint`
- `git diff --check`
- Focused review findings are resolved.

Approval record:

- Approver: Igor Arkhipov
- Date: 2026-06-20
- Scope approved: Commit and push FT-012 after local verification and resolved review findings.
- Conditions: No release, publication, or real provider configuration mutation.

## Hard Stop Conditions

Stop and report if:

- any step requires reading, printing, copying, or deriving values from `.env*`;
- tests or dashboard execution would mutate real provider configuration;
- dashboard code bypasses the existing mutation engine;
- post-apply snapshot would be written outside AgentScope app-state roots;
- unrelated files appear in the staged diff;
- verification cannot prove the feature's safety contract.

## Execution Record

| Time | Actor | Event | Evidence |
| --- | --- | --- | --- |
| 2026-06-20 | master Codex agent | Created FT-012 protocol, feature package, and implementation plan from the active goal and original plan gap audit | `memory-bank/features/FT-012/` |
| 2026-06-20 | explorer subagent | Started remaining-plan gap audit for AgentScope | subagent `019ee593-8dbe-7481-9c4a-add8b6321b3b` |
| 2026-06-20 | reviewer subagent | Reported protocol-first, H2 evidence, PRD-003, and canonical frontend alignment findings | subagent `019ee597-16d2-7df2-930f-80eccdc842b7` |
| 2026-06-20 | master Codex agent | Addressed H1/H2 gate state and documented the bootstrap deviation before final verification | `protocol.md` |
| 2026-06-20 | project-standards subagent | Reported PRD, README, warning filtering, approval-gate, and repeated-stage findings | subagent `019ee59e-1c02-7b60-9320-4e51378b4538` |
| 2026-06-20 | master Codex agent | Resolved standards findings, including PRD/README/frontend alignment, warning filtering, repeated-stage CLI coverage, and `AG-001` approval traceability | code and memory-bank diff |
| 2026-06-20 | TypeScript reviewer subagent | Reported stale JSON selected state after confirmed dashboard apply | subagent `019ee5a3-d6bc-7863-b2ed-6be0c3d2d7bf` |
| 2026-06-20 | master Codex agent | Resolved stale JSON selected-state finding with refreshed selected/preview values and regression coverage | `tools/agentscope/src/commands/dashboard.ts`, `tools/agentscope/test/dashboard.test.ts` |
| 2026-06-20 | master Codex agent | Ran focused FT-012 tests | `npx vitest run test/dashboard-state.test.ts test/dashboard.test.ts test/list.test.ts test/cli.test.ts`: passed, 4 files / 37 tests |
| 2026-06-20 | master Codex agent | Ran dashboard apply verification | `npx vitest run test/dashboard.test.ts test/toggle.test.ts test/snapshot.test.ts`: passed, 3 files / 26 tests |
| 2026-06-20 | master Codex agent | Ran full local verification | `npm run build`: passed; `npm test`: passed, 25 files / 224 tests; `npm run coverage`: passed; `npm run lint`: passed with existing Biome schema-version info; `git diff --check`: passed |
