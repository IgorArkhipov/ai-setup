---
title: "FT-014: Implementation Plan"
doc_kind: feature
doc_function: derived
purpose: "Execution plan for additive AgentScope MCP structured contract parity."
derived_from:
  - feature.md
status: active
audience: humans_and_agents
must_not_define:
  - ft_014_scope
  - ft_014_architecture
  - ft_014_acceptance_criteria
  - ft_014_blocker_state
---

# MCP Structured Contract Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

## Goal Of This Plan

Implement FT-014 by adding documented MCP request/response fields while preserving existing tool names and legacy response fields.

## Work Sequence

| Step ID | Actor | Implements | Goal | Touchpoints | Verifies |
| --- | --- | --- | --- | --- | --- |
| `STEP-01` | agent | `REQ-01` through `REQ-11` | Add RED MCP tests for documented fields, aliases, restore confirmation, and doctor scoping | `test/mcp-server.test.ts` | `CHK-01` |
| `STEP-02` | agent | `REQ-01`, `REQ-02`, `REQ-06` | Add request filters/limits and list/backup counts | `src/mcp/schemas.ts`, `src/mcp/helpers.ts`, `src/mcp/tools.ts` | `CHK-01` |
| `STEP-03` | agent | `REQ-03`, `REQ-04`, `REQ-05`, `REQ-07`, `REQ-08`, `REQ-09`, `REQ-10`, `REQ-11` | Add single/bulk response aliases, canonical fingerprint payload, restore confirmation, doctor scoping, and blocked reason codes | `src/mcp/helpers.ts`, `src/mcp/tools.ts` | `CHK-01` |
| `STEP-04` | agent | `REQ-12` | Update README and memory-bank indexes | `README.md`, `FT-014/*`, indexes, `PRD-003` | `CHK-02` |
| `STEP-05` | reviewer subagent | all | Review MCP contract and TypeScript quality | current diff | `CHK-02` |
| `STEP-06` | agent | all | Full local verification, commit, push, and CI watch | package, git, CI | `CHK-02`, `CHK-03` |

## Approval Gates

| Gate ID | Maps to protocol gate | Required before | Approval source | Evidence required before use |
| --- | --- | --- | --- | --- |
| `AG-001` | `H2` | committing, pushing, and treating CI as acceptance evidence | user standing approval for feature-slice commit/push after local verification | focused tests, build, full tests, coverage, lint, diff check, and resolved review findings |

## Test Strategy

| Test surface | Planned coverage | Required command |
| --- | --- | --- |
| MCP structured contract | counts, aliases, blocked reason codes, limits, fingerprint mismatch | `npx vitest run test/mcp-server.test.ts` |
| regression | build, full tests, coverage, lint, diff check | package scripts and `git diff --check` |

## Stop Conditions

| Stop ID | Trigger | Immediate action |
| --- | --- | --- |
| `STOP-01` | `.env*` access is needed | stop and report |
| `STOP-02` | contract parity requires deleting legacy fields | stop and redesign |
| `STOP-03` | bulk fingerprint mismatch can write or partially apply | stop and fix before commit |

## Ready For Acceptance

- Focused MCP tests pass.
- Full local verification passes.
- Review findings are resolved.
- CI is green after push.

## Execution Evidence

| Check | Result | Evidence |
| --- | --- | --- |
| Focused MCP contract tests | pass | `cd tools/agentscope && rtk npx vitest run test/mcp-server.test.ts` -> 11 tests passed |
| Build | pass | `cd tools/agentscope && rtk npm run build` |
| Lint | pass | `cd tools/agentscope && rtk npm run lint` (Biome schema-version info only) |
| Full tests | pass | `cd tools/agentscope && rtk npm test` -> 25 files, 232 tests passed |
| Coverage | pass | `cd tools/agentscope && rtk npm run coverage` -> 25 files, 232 tests passed |
| Whitespace | pass | `rtk git diff --check` |
| Contract review | pass | McClintock api-contract subagent reported no findings, residual risks, or testing gaps |
