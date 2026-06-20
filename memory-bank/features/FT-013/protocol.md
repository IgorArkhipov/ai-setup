---
title: "Protocol: FT-013 Toggle Target State Command Parity"
doc_kind: process
doc_function: protocol
purpose: "Lifecycle protocol for implementing the original-plan toggle positional selector and explicit enable/disable flags."
derived_from:
  - ../../prd/PRD-001-local-discovery-and-safe-mutation-foundation.md
  - ../../flows/agent-process-operations.md
  - ../../flows/workflows.md
status: active
audience: humans_and_agents
protocol_version: "0.1"
current_phase: done
current_gate: H2
---

# Protocol: `FT-013 Toggle Target State Command Parity`

## Source Interpretation

Source used:

- Current persistent user goal: implement all remaining features from `tmp/Agentscope Implementation Plan.md` one by one using memory-bank and protocol workflow.
- `tmp/Agentscope Implementation Plan.md`, which names `agentscope toggle <provider> <kind> <id> --layer <layer> [--enable|--disable] [--apply]`.
- Current implementation, where `toggle` accepts `--provider`, `--kind`, `--id`, and `--layer`, and always plans `targetEnabled: !selected.enabled`.

Repository adaptation:

- Preserve backward compatibility for the existing flag-based selector.
- Add the original positional selector form as an additional command surface.
- Add explicit `--enable` and `--disable` target-state controls without bypassing discovery, provider planning, or the guarded mutation engine.

## Metadata

- Protocol version: 0.1
- Owner: Igor Arkhipov
- Work area: `/Users/igor.arkhipov/Documents/Work/Ruby/thinknetica/ai-setup`, feature `FT-013`, tool `tools/agentscope`
- Created: 2026-06-20
- Last updated: 2026-06-20
- Status: active
- Current phase: done
- Current gate: H2

## Goal

Close the original-plan toggle command parity gap while preserving the existing dry-run-first and guarded apply safety model.

Target state:

- `agentscope toggle <provider> <kind> <id> --layer <layer>` works.
- Existing `agentscope toggle --provider <id> --kind <kind> --id <id> --layer <layer>` still works.
- `--enable` plans/applies `targetEnabled: true`.
- `--disable` plans/applies `targetEnabled: false`.
- Supplying both `--enable` and `--disable` fails deterministically with no writes.
- Omitting both target flags keeps the current flip behavior for backward compatibility.

## Scope

In scope:

- Toggle command parser compatibility.
- Toggle command target-state resolution.
- Human and JSON validation errors for conflicting target flags.
- Tests and docs for positional selectors and explicit target state.

Out of scope:

- New provider write support.
- Bulk toggle in the CLI.
- Changing MCP plan/apply contracts.
- Changing restore, backup, lock, or audit semantics.
- Reading or using `.env*` files.

## Current Facts / Baseline

Verified facts:

- `tools/agentscope/src/cli.ts` registers `toggle` without positional selector arguments.
- `tools/agentscope/src/commands/toggle.ts` requires selector flags and plans `targetEnabled: !selected.enabled`.
- Provider planning and mutation execution already accept an explicit `targetEnabled` boolean.

## Operating Constraints

- Do not read or use `.env*`.
- Keep dry-run as the default.
- Keep all writes routed through provider `planToggle` and `executeTogglePlan`.
- Preserve existing tests and command behavior unless explicitly extended by this feature.
- One commit per feature slice after verification.

## Human Gates

### H1: Approve scoped execution

Approval record:

- Approver: Igor Arkhipov
- Date: 2026-06-20
- Scope approved: Continue implementing remaining original-plan features one by one with memory-bank/protocol workflow.
- Conditions: No real provider config mutation in tests; no `.env*` access; one commit per feature slice.

### H2: Commit and push point

Required before:

- Creating and pushing the FT-013 feature-slice commit.
- Treating external CI as acceptance evidence.

Required evidence before H2:

- Focused toggle and CLI tests pass.
- `cd tools/agentscope && npm run build`
- `cd tools/agentscope && npm test`
- `cd tools/agentscope && npm run coverage`
- `cd tools/agentscope && npm run lint`
- `git diff --check`
- Focused review findings are resolved.

Approval record:

- Approver: Igor Arkhipov
- Date: 2026-06-20
- Scope approved: Commit and push FT-013 after local verification and resolved review findings.
- Conditions: No release, publication, or real provider configuration mutation.

## Hard Stop Conditions

Stop and report if:

- any step requires reading, printing, copying, or deriving values from `.env*`;
- explicit target state would require provider-specific writes outside existing plans;
- positional parsing breaks existing flag-based toggle workflows;
- verification cannot prove dry-run remains the default.

## Execution Record

| Time | Actor | Event | Evidence |
| --- | --- | --- | --- |
| 2026-06-20 | master Codex agent | Created FT-013 protocol and feature package from the remaining original-plan toggle command gap | `memory-bank/features/FT-013/` |
| 2026-06-20 | master Codex agent | Added positional toggle selector, `--enable` / `--disable`, conflict validation, README updates, and tests | `tools/agentscope/src/cli.ts`, `tools/agentscope/src/commands/toggle.ts`, `tools/agentscope/test/cli.test.ts`, `tools/agentscope/test/toggle.test.ts` |
| 2026-06-20 | TypeScript reviewer subagent | Reviewed FT-013 diff and approved with no actionable findings | subagent `019ee5ad-58c4-7471-b738-ec07cd6fed37` |
| 2026-06-20 | master Codex agent | Ran focused FT-013 tests | `npx vitest run test/toggle.test.ts test/cli.test.ts`: passed, 2 files / 30 tests |
| 2026-06-20 | master Codex agent | Ran full local verification | `npm run build`: passed; `npm test`: passed, 25 files / 228 tests; `npm run coverage`: passed; `npm run lint`: passed with existing Biome schema-version info; `git diff --check`: passed |
| 2026-06-20 | master Codex agent | Committed and pushed the FT-013 feature slice | `1e4131d feat: add explicit agentscope toggle targets` on `main` |
| 2026-06-20 | GitHub Actions | Accepted FT-013 after push | CI run `27875862068` passed |
