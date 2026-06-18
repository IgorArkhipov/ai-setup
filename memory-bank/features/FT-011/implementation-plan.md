---
title: "FT-011: Implementation Plan"
doc_kind: feature
doc_function: derived
purpose: "Execution plan for FT-011. Records concrete steps for capability matrix drift and compatibility reporting."
derived_from:
  - feature.md
status: archived
audience: humans_and_agents
must_not_define:
  - ft_011_scope
  - ft_011_architecture
  - ft_011_acceptance_criteria
  - ft_011_blocker_state
---

# Provider Drift And Compatibility Reporting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make modern provider surface capability drift visible through the matrix, providers command, CLI doctor, and MCP doctor.

**Derived design summary:** Per `feature.md`, extend the capability matrix and route validation issues through existing doctor surfaces. No provider mutation path changes.

**Tech Stack:** TypeScript, Node.js 25.9+, Vitest, Biome.

---

## Discovery Context

### Current State

- `DISC-01` `tools/agentscope/test/fixtures/capability-matrix.json` tracks only `skills`, `configuredMcps`, and `tools`.
- `DISC-02` `tools/agentscope/src/providers/registry.ts` validates the matrix by throwing from `loadCapabilityMatrix`, so callers cannot return structured matrix issues.
- `DISC-03` `tools/agentscope/src/commands/providers.ts` renders only the three legacy matrix fields.
- `DISC-04` `tools/agentscope/src/commands/doctor.ts` and `tools/agentscope/src/mcp/helpers.ts` already have non-throwing fixture validation branches that can be mirrored for matrix drift.
- `DISC-05` `tools/agentscope/README.md` and `memory-bank/domain/problem.md` already describe the current support boundary, but FT-011 must make the matrix/doctor reporting boundary explicit.

### Reference Patterns

- `REF-01` `validateProviderFixtures` returns a report containing checked files and issue objects; `validateCapabilityMatrix` should follow that shape instead of adding another exception-only path.
- `REF-02` `runDoctor` renders deterministic section headers followed by `- issue` lines for fixture and provider failures.
- `REF-03` `runDoctorStructured` returns `status: "failed"` with typed issue arrays for machine clients.
- `REF-04` `providers` output is stable, provider-ordered, and line-oriented for testable CLI output.

### Execution Environment

- `ENV-01` Work from `tools/agentscope` for npm commands.
- `ENV-02` Do not read or use `.env*` files.
- `ENV-03` Do not read from or mutate real Claude Code, Codex, or Cursor provider roots during FT-011 tests; use committed fixtures and copied temporary fixture trees only.
- `ENV-04` External CI, push, PR, merge, release, and publication are outside the approved scope.

### Open Questions

- `OQ-01` Should FT-011 automate local-example or provider-changelog drift? Resolved for this slice: no. FT-011 records and validates the current committed matrix/support boundary; future provider changes are later matrix updates or feature slices.

## Preconditions

- `PRE-01` `FT-009` and `FT-010` are locally completed so modern surfaces and agent-file toggles exist to report.
- `PRE-02` Human gate `H1` in `protocol.md` approves local implementation under memory-bank workflow, no real provider config mutation, no `.env*`, and one commit per feature slice.
- `PRE-03` The current branch may be `main`; unrelated dirty files must remain untouched.
- `PRE-04` Source changes must use TDD: RED tests before production code edits.

## Work Sequence

- [x] `STEP-01` (`REQ-01`, `REQ-02`) Write RED tests for modern capability fields and stale matrix validation in `test/provider-capabilities.test.ts`; verify failure with `CHK-01`.
- [x] `STEP-02` (`REQ-01`, `REQ-02`) Extend the matrix fixture, provider capability types, and non-throwing validation report in `test/fixtures/capability-matrix.json` and `src/providers/registry.ts`; verify with `CHK-01`.
- [x] `STEP-03` (`REQ-03`, `REQ-04`) Write RED tests for CLI and MCP doctor matrix drift output in `test/doctor.test.ts` and `test/mcp-server.test.ts`; verify failure with `CHK-01`.
- [x] `STEP-04` (`REQ-03`, `REQ-04`) Route matrix validation failures through `src/commands/doctor.ts` and `src/mcp/helpers.ts`; verify with `CHK-01`.
- [x] `STEP-05` (`REQ-05`) Render modern capability fields in `src/commands/providers.ts` and update README/memory-bank docs; verify with `CHK-01`, `CHK-04`, and `CHK-06`.
- [x] `STEP-06` (all) Run focused review and full verification, close docs, and create one local feature-slice commit.

## Checks And Evidence

| Check ID | Command / procedure | Verifies | Evidence ID | Result |
| --- | --- | --- | --- | --- |
| `CHK-01` | `cd tools/agentscope && npx vitest run test/provider-capabilities.test.ts test/doctor.test.ts test/mcp-server.test.ts` | `SC-01` through `SC-04` | `EVID-01` to `EVID-04` | passed, 18 tests |
| `CHK-02` | `cd tools/agentscope && npm run build` | TypeScript and generated package output | `EVID-05` | passed |
| `CHK-03` | `cd tools/agentscope && npm test` | full regression | `EVID-05` | passed, 23 files / 191 tests |
| `CHK-04` | `cd tools/agentscope && npm run lint` | formatting/lint | `EVID-05` | passed with existing Biome schema-version info |
| `CHK-05` | `git diff --check` | patch integrity | `EVID-05` | passed |
| `CHK-06` | document review plus final diff inspection | `SC-05` | `EVID-06` | passed after addressing document and code review findings |

## Test Strategy

- RED tests must run before production code changes.
- Missing capability fields should produce validation issues, not process-level throws.
- Command output should be deterministic and MCP output structured.
- Providers output should expose every capability field in stable order for every provider.
- External CI is not available without push/PR approval; record local-only exception at closure.

## Approval Gates

- `AG-01` Local implementation and commit point are covered by `protocol.md` H1/H2 after local evidence is collected.
- `AG-02` External CI, push, PR, merge, release, publication, or direct provider-root mutation would require a new H3 approval and is not part of this plan.

## Stop Conditions

- `STOP-01` Stop and report if a test requires reading `.env*` or real provider roots.
- `STOP-02` Stop and report if FT-011 requires provider-native writes, plugin installation, hook execution, or provider UI automation.
