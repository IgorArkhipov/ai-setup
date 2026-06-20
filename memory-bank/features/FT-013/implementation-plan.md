---
title: "FT-013: Implementation Plan"
doc_kind: feature
doc_function: derived
purpose: "Execution plan for adding toggle positional selector and explicit target-state flags."
derived_from:
  - feature.md
status: archived
audience: humans_and_agents
must_not_define:
  - ft_013_scope
  - ft_013_architecture
  - ft_013_acceptance_criteria
  - ft_013_blocker_state
---

# Toggle Target State Command Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

## Goal Of This Plan

Implement FT-013 by extending `agentscope toggle` so the original positional command surface and explicit `--enable` / `--disable` flags work while the existing guarded mutation path stays authoritative.

## Current State / Reference Points

| Path / module | Current role | Why relevant |
| --- | --- | --- |
| `tmp/Agentscope Implementation Plan.md` | Source gap ledger | Names the target toggle command surface |
| `tools/agentscope/src/cli.ts` | CLI command registration | Must add positional selector and target flags |
| `tools/agentscope/src/commands/toggle.ts` | Toggle command implementation | Must resolve target state explicitly |
| `tools/agentscope/src/core/mutation-engine.ts` | Guarded write path | Must remain the only apply path |
| `tools/agentscope/test/toggle.test.ts` | Toggle behavior tests | Add target-state and conflict coverage |
| `tools/agentscope/test/cli.test.ts` | CLI routing tests | Add positional command coverage |

## Approval Gates

| Gate ID | Maps to protocol gate | Required before | Approval source | Evidence required before use |
| --- | --- | --- | --- | --- |
| `AG-001` | `H2` | committing, pushing, and treating CI as acceptance evidence | user standing approval for feature-slice commit/push after local verification | focused tests, build, full tests, coverage, lint, diff check, and resolved review findings |

## Work Sequence

| Step ID | Actor | Implements | Goal | Touchpoints | Verifies |
| --- | --- | --- | --- | --- | --- |
| `STEP-01` | agent | `REQ-01`, `REQ-05` | Add RED tests for positional selector and conflicting target flags | `test/cli.test.ts`, `test/toggle.test.ts` | `CHK-01` |
| `STEP-02` | agent | `REQ-03`, `REQ-04`, `REQ-05` | Add explicit target-state resolution to `runToggle` | `src/commands/toggle.ts` | `CHK-01` |
| `STEP-03` | agent | `REQ-01`, `REQ-02`, `REQ-03` | Wire positional selector and target flags in CLI | `src/cli.ts` | `CHK-01` |
| `STEP-04` | agent | `REQ-06` | Update README and memory-bank indexes | `README.md`, `FT-013/*`, indexes, `PRD-001` | `CHK-02` |
| `STEP-05` | reviewer subagent | all | Review spec and code quality | current diff | `CHK-02` |
| `STEP-06` | agent | all | Full local verification, commit, push, and CI watch | package, git, CI | `CHK-02`, `CHK-03` |

## Test Strategy

| Test surface | Planned coverage | Required command |
| --- | --- | --- |
| toggle target state | default flip, explicit enable, explicit disable, conflict output | `npx vitest run test/toggle.test.ts` |
| CLI routing | positional selector, flag selector compatibility, target flags | `npx vitest run test/cli.test.ts` |
| regression | build, full tests, coverage, lint, diff check | package scripts and `git diff --check` |

## Stop Conditions

| Stop ID | Trigger | Immediate action |
| --- | --- | --- |
| `STOP-01` | `.env*` access is needed | stop and report |
| `STOP-02` | explicit target state needs a new provider write path | stop and redesign |
| `STOP-03` | flag selector compatibility breaks | fix before commit |

## Ready For Acceptance

- Focused toggle and CLI tests pass.
- Full local verification passes.
- Review findings are resolved.
- CI must be monitored after push; if it fails, reopen the feature and address the failing check before continuing to the next slice.

## Checks And Evidence

| Check ID | Command / procedure | Result |
| --- | --- | --- |
| `CHK-01` | `cd tools/agentscope && npx vitest run test/toggle.test.ts test/cli.test.ts` | passed, 2 files / 30 tests |
| `CHK-02a` | `cd tools/agentscope && npm run build` | passed |
| `CHK-02b` | `cd tools/agentscope && npm test` | passed, 25 files / 228 tests |
| `CHK-02c` | `cd tools/agentscope && npm run coverage` | passed, statements 84%, branches 73.57%, functions 94.18%, lines 84.01% |
| `CHK-02d` | `cd tools/agentscope && npm run lint` | passed with existing Biome schema-version info |
| `CHK-02e` | `git diff --check` | passed |
| `CHK-02f` | TypeScript code-quality review subagent | approved with no actionable findings |
