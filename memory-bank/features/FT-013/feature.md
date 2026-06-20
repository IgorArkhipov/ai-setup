---
title: "FT-013: Toggle Target State Command Parity"
doc_kind: feature
doc_function: canonical
purpose: "Canonical feature document for adding the original-plan toggle positional selector and explicit enable/disable target-state flags."
derived_from:
  - ../../domain/problem.md
  - ../../prd/PRD-001-local-discovery-and-safe-mutation-foundation.md
  - ../FT-002/feature.md
  - protocol.md
status: active
delivery_status: done
audience: humans_and_agents
must_not_define:
  - implementation_sequence
---

# FT-013: Toggle Target State Command Parity

## What

### Problem

The original AgentScope plan specifies `agentscope toggle <provider> <kind> <id> --layer <layer> [--enable|--disable] [--apply]`. The current implementation is safe but narrower: it requires selector flags and always flips the discovered state. That leaves shell users without the documented positional command form and prevents explicit idempotent "enable this" or "disable this" requests through the CLI.

### Outcome

| Metric ID | Metric | Baseline | Target | Measurement method |
| --- | --- | --- | --- | --- |
| `MET-01` | Positional toggle selector works | only selector flags work | positional and flag selectors both route to the same safe toggle path | CLI tests |
| `MET-02` | Explicit target state works | toggle always flips current state | `--enable` targets `true`, `--disable` targets `false`, no flag keeps flip behavior | toggle tests |
| `MET-03` | Target conflicts fail closed | no target conflict surface exists | `--enable --disable` returns deterministic non-zero output with no writes | toggle and CLI tests |

### Scope

- `REQ-01` Add a positional toggle selector form: `toggle <provider> <kind> <id> --layer <layer>`.
- `REQ-02` Preserve the existing flag selector form: `toggle --provider <id> --kind <kind> --id <id> --layer <layer>`.
- `REQ-03` Add `--enable` and `--disable` target-state flags that set `targetEnabled` explicitly.
- `REQ-04` Preserve current flip behavior when neither target-state flag is supplied.
- `REQ-05` Reject `--enable` and `--disable` together in human and JSON output with no mutation.
- `REQ-06` Update README and governed docs for the new toggle command contract.

### Non-Scope

- `NS-01` No new provider mutation semantics.
- `NS-02` No bulk CLI toggles.
- `NS-03` No MCP request/response shape changes.
- `NS-04` No real provider-root mutation during tests.
- `NS-05` No `.env*` reads or fixtures.

### Constraints / Assumptions

- `CON-01` Existing provider `planToggle` implementations already accept explicit target state.
- `CON-02` The command remains dry-run by default.
- `CON-03` Apply continues to use `executeTogglePlan` with existing backup, audit, lock, and fingerprint checks.

## How

### Solution

Extend the CLI parser to accept positional selector arguments while still accepting selector flags. Extend `runToggle` to resolve target state from `targetEnabled`, `enable`, or `disable`; fall back to flip behavior when no target state is specified.

### Change Surface

| Surface | Type | Why it changes |
| --- | --- | --- |
| `tools/agentscope/src/cli.ts` | code | Register positional selector and target flags |
| `tools/agentscope/src/commands/toggle.ts` | code | Resolve explicit target state and validation errors |
| `tools/agentscope/test/toggle.test.ts` | tests | Prove explicit enable/disable and conflict behavior |
| `tools/agentscope/test/cli.test.ts` | tests | Prove positional command routing |
| `tools/agentscope/README.md` | docs | Document both selector forms and target flags |
| `memory-bank/features/FT-013/*` | docs | Governed workflow and evidence |

### Contracts

| Contract ID | Input / Output | Producer / Consumer | Notes |
| --- | --- | --- | --- |
| `CTR-01` | Positional selector | CLI parser / `runToggle` | Positional values are defaults overridden by explicit selector flags if both are supplied |
| `CTR-02` | Target state | CLI flags / provider plans | `--enable` means `targetEnabled: true`; `--disable` means `targetEnabled: false` |
| `CTR-03` | Conflict output | `runToggle` / shell and JSON callers | Conflicting target flags return deterministic failed status |

### Failure Modes

- `FM-01` Positional parsing breaks existing flag-based toggle scripts.
- `FM-02` Explicit target flags still flip instead of honoring the requested state.
- `FM-03` Conflicting target flags accidentally write provider-managed state.

## Verify

### Exit Criteria

- `EC-01` Positional and flag selector forms both work.
- `EC-02` `--enable`, `--disable`, and default flip behavior are covered.
- `EC-03` conflicting target flags fail closed with no writes.
- `EC-04` README and memory-bank docs describe the supported contract.
- `EC-05` Local tests, coverage, build, lint, diff check, and external CI pass.

### Acceptance Scenarios

- `SC-01` A user runs `agentscope toggle claude skill <id> --layer project` and sees the same dry-run safety output as the flag selector form.
- `SC-02` A user runs `--disable` against an enabled item and the plan target is disabled.
- `SC-03` A user runs `--enable` against a disabled item and the plan target is enabled.
- `SC-04` A user supplies both `--enable` and `--disable`; the command fails with no writes.

### Checks

| Check ID | Covers | How to check | Expected result | Evidence path |
| --- | --- | --- | --- | --- |
| `CHK-01` | `EC-01`, `EC-02`, `EC-03`, `SC-01` through `SC-04` | `cd tools/agentscope && npx vitest run test/toggle.test.ts test/cli.test.ts` | toggle parity tests pass | terminal output |
| `CHK-02` | `EC-05` | `cd tools/agentscope && npm run build && npm test && npm run coverage && npm run lint`; `git diff --check` | all commands pass | terminal output |
| `CHK-03` | `EC-05` | GitHub Actions CI on pushed `main` | all jobs pass | CI URL |

### Evidence

- `EVID-01` Focused toggle and CLI test output.
- `EVID-02` Full local verification bundle.
- `EVID-03` External CI run URL after push.
