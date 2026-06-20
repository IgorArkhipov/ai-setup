---
title: "FT-015: Implementation Plan"
doc_kind: feature
doc_function: derived
purpose: "Execution plan for adding Zed provider support without redefining canonical FT-015 scope."
derived_from:
  - feature.md
status: archived
audience: humans_and_agents
must_not_define:
  - ft_015_scope
  - ft_015_architecture
  - ft_015_acceptance_criteria
  - ft_015_blocker_state
---

# Zed Provider Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

## Goal Of This Plan

Implement FT-015 by adding Zed provider discovery and safe toggles for Zed skills and `context_servers`, while keeping Zed instructions and general settings read-only.

## Discovery Context

| Path / module | Current role | Why relevant |
| --- | --- | --- |
| `tools/agentscope/src/providers/registry.ts` | provider ids, capability matrix validation, fixture validation | must add `zed` and Zed fixture checks |
| `tools/agentscope/src/core/models.ts` | provider ordering and normalized item model | must include Zed in summaries and sorting |
| `tools/agentscope/src/core/mutation-vault.ts` | validates providers allowed in vault entries | must admit Zed skill and configured MCP vault records |
| `tools/agentscope/src/providers/codex.ts` | file-vault skill pattern and text-payload MCP pattern | reference for safe Zed skill and MCP planning |
| `tools/agentscope/src/providers/cursor.ts` | JSON configured MCP and fixture-root patterns | reference for settings JSON discovery |
| `tools/agentscope/src/mcp/schemas.ts` | MCP provider enum | must accept `zed` selectors |
| `tools/agentscope/test/provider-discovery.test.ts` | provider discovery tests | add Zed discovery and read-only boundary coverage |
| `tools/agentscope/test/toggle.test.ts` | mutation tests | add Zed skill and `context_servers` toggle coverage |

## Work Sequence

| Step ID | Actor | Implements | Goal | Touchpoints | Verifies |
| --- | --- | --- | --- | --- | --- |
| `STEP-01` | agent | `REQ-01`, `REQ-07` | Add governed FT-015 docs and update PRD-004/feature registry | `memory-bank/prd`, `memory-bank/features` | docs review |
| `STEP-02` | agent | `REQ-01` | Add `zed` to provider ids, ordering, vault validation, MCP schemas, and default provider arrays | core, commands, MCP | `CHK-01`, `CHK-02` |
| `STEP-03` | agent | `REQ-02`, `REQ-06` | Add Zed skill, settings, and instruction discovery | `src/providers/zed.ts`, fixtures | `CHK-01` |
| `STEP-04` | agent | `REQ-03`, `REQ-05` | Add Zed skill and configured MCP toggle planning | `src/providers/zed.ts`, `test/toggle.test.ts` | `CHK-01` |
| `STEP-05` | reviewer subagent | all | Review feature slice for scope, safety, and maintainability | current diff | review findings resolved |
| `STEP-06` | agent | all | Run focused and full local verification | package scripts | `CHK-01`, `CHK-02`, `CHK-03` |
| `STEP-07` | agent | all | Commit, push, and watch CI | git, GitHub Actions | `CHK-04` |

## Approval Gates

| Gate ID | Required before | Approval source | Evidence required before use |
| --- | --- | --- | --- |
| `AG-001` | committing, pushing, and treating CI as acceptance evidence | user standing approval for feature-slice commit/push after local verification | focused tests, full local verification, docs updated, and review findings resolved |

## Stop Conditions

| Stop ID | Trigger | Immediate action |
| --- | --- | --- |
| `STOP-01` | `.env*` access is needed | stop and report |
| `STOP-02` | Zed support requires mutating instructions, profiles, models, account, or extension state | block that surface and keep it read-only |
| `STOP-03` | `context_servers` restore could overwrite a live server with the same id | fail closed before writing |
| `STOP-04` | external provider docs contradict the fixture model | update `feature.md` first before changing code |

## Checks And Evidence

| Check ID | Command / procedure | Result |
| --- | --- | --- |
| `CHK-01` | `cd tools/agentscope && npx vitest run test/provider-capabilities.test.ts test/provider-discovery.test.ts test/toggle.test.ts test/list.test.ts` | pass: 4 files, 82 tests |
| `CHK-02` | `cd tools/agentscope && npx vitest run test/mcp-server.test.ts test/cli.test.ts` | pass: 2 files, 28 tests |
| `CHK-03` | `cd tools/agentscope && npm run build && npm test && npm run coverage && npm run lint`; `git diff --check` | pass: build, lint, diff check; full tests 25 files / 240 tests; coverage 82.77% statements, 73.03% branches, 93.37% functions, 82.67% lines |
| `CHK-04` | GitHub Actions CI on pushed `main` | pass: run `27878041589` passed on `cdfce2b` |
