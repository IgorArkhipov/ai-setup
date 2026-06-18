---
title: "FT-011: Provider Drift And Compatibility Reporting"
doc_kind: feature
doc_function: canonical
purpose: "Canonical feature document for reporting provider capability drift and compatibility gaps across AgentScope docs, fixtures, CLI, and MCP doctor output."
derived_from:
  - ../../domain/problem.md
  - ../../prd/PRD-004-modern-provider-configuration-surfaces.md
  - ../../flows/workflows.md
  - ../../flows/feature-flow.md
  - protocol.md
status: active
delivery_status: done
audience: humans_and_agents
must_not_define:
  - implementation_sequence
---

# FT-011: Provider Drift And Compatibility Reporting

## What

### Problem

AgentScope now discovers modern provider surfaces and can safely vault agent files, but the committed capability matrix previously recorded only skills, configured MCPs, and tools. That created a drift path: `providers`, `doctor`, MCP doctor output, README, and memory-bank docs could disagree about whether agents, hooks, settings, plugin configs, plugin manifests, and extensions are verified writable, read-only, unsupported, or still needing verification.

### Scope

- `REQ-01` Extend the capability matrix contract with explicit modern surface fields for `agents`, `hooks`, `providerSettings`, `pluginConfigs`, `pluginManifests`, and `extensions`.
- `REQ-02` Validate that every tracked provider declares every capability field with a known status.
- `REQ-03` Make CLI doctor report capability-matrix validation failures as deterministic user-facing output.
- `REQ-04` Make MCP doctor return structured capability-matrix issues for agent clients.
- `REQ-05` Update `providers` output and README/memory-bank docs so modern surface support is visible without reading source code.

### Non-Scope

- `NS-01` No new provider mutation support.
- `NS-02` No provider-native compatibility path deduplication.
- `NS-03` No direct reads from real provider roots during tests.
- `NS-04` No `.env*` reads or fixtures.
- `NS-05` No external CI, push, PR, merge, release, or publication.
- `NS-06` No automated local-example or provider-changelog drift revalidation in this slice; future provider changes are handled by later matrix updates or feature slices.

### Constraints / Assumptions

- `CON-01` Capability statuses remain the existing status enum: `verified`, `read-only`, `unsupported`, or `needs-verification`.
- `CON-02` Doctor failure output must stay deterministic for shell users and structured MCP clients.
- `DEC-01` FT-011 records the current AgentScope support boundary; future provider changelog changes belong to later matrix updates or feature slices.

## How

### Solution

Promote modern provider surfaces into the capability matrix schema and rendering path. Reuse the existing fixture-root validation flow, but split capability-matrix validation into a report that `doctor` and MCP doctor can return cleanly.

### Change Surface

| Surface | Type | Why it changes |
| --- | --- | --- |
| `tools/agentscope/test/fixtures/capability-matrix.json` | fixture | Add modern surface statuses |
| `tools/agentscope/src/providers/registry.ts` | code | Validate and type modern capability fields |
| `tools/agentscope/src/commands/providers.ts` | code | Render modern capability fields |
| `tools/agentscope/src/commands/doctor.ts` | code | Report matrix validation failures |
| `tools/agentscope/src/mcp/helpers.ts` | code | Return structured matrix validation failures |
| `tools/agentscope/test/provider-capabilities.test.ts` | tests | Prove schema and drift validation |
| `tools/agentscope/test/doctor.test.ts` | tests | Prove command/provider output |
| `tools/agentscope/test/mcp-server.test.ts` | tests | Prove MCP doctor structure |
| `tools/agentscope/README.md` and memory-bank docs | docs | Explain the support boundary |

### Contracts

| Contract ID | Input / Output | Producer / Consumer | Notes |
| --- | --- | --- | --- |
| `CTR-01` | Complete provider capability row | `capability-matrix.json` / `registry.ts` | Missing or unknown fields are validation issues |
| `CTR-02` | CLI doctor matrix failure | `runDoctor` / shell users | Non-zero exit with `capability matrix validation failed` |
| `CTR-03` | MCP doctor matrix failure | `runDoctorStructured` / MCP clients | `status: "failed"` plus `capabilityMatrixIssues` |
| `CTR-04` | Providers rendering | `renderProviders` / users | Stable modern surface lines per provider |

### Failure Modes

- `FM-01` A stale matrix omits a modern surface field and doctor still returns OK.
- `FM-02` CLI and MCP doctor use different issue names or status shapes.
- `FM-03` Provider rendering hides read-only or unsupported modern surfaces.
- `FM-04` Capability matrix docs overclaim provider-native write support.

## Verify

### Acceptance Scenarios

| Scenario ID | Requirement refs | Given | When | Then | Evidence |
| --- | --- | --- | --- | --- | --- |
| `SC-01` | `REQ-01`, `REQ-02` | The committed capability matrix is loaded | Registry validation runs | Every provider has all modern fields and known statuses | `EVID-01` |
| `SC-02` | `REQ-03` | A copied matrix omits a modern field | CLI doctor runs | Doctor exits non-zero and names the missing field | `EVID-02` |
| `SC-03` | `REQ-04` | A copied matrix omits a modern field | MCP doctor runs | MCP response includes `capabilityMatrixIssues` | `EVID-03` |
| `SC-04` | `REQ-05` | A user runs `agentscope providers` | Providers output renders | Modern surface statuses are visible in stable order | `EVID-04` |
| `SC-05` | `REQ-05` | A maintainer reads README and memory-bank docs | Docs are inspected | The support boundary and drift-reporting scope are visible without reading source code | `EVID-06` |

### Checks

| Check ID | Command / procedure | Covers |
| --- | --- | --- |
| `CHK-01` | `cd tools/agentscope && npx vitest run test/provider-capabilities.test.ts test/doctor.test.ts test/mcp-server.test.ts` | FT-011 behavior |
| `CHK-02` | `cd tools/agentscope && npm run build` | TypeScript |
| `CHK-03` | `cd tools/agentscope && npm test` | full regression |
| `CHK-04` | `cd tools/agentscope && npm run lint` | formatting/lint |
| `CHK-05` | `git diff --check` | patch integrity |
| `CHK-06` | Focused document review and final diff inspection | docs and support-boundary traceability |

### Evidence Contract

| Evidence ID | Carrier |
| --- | --- |
| `EVID-01` | capability test output |
| `EVID-02` | doctor command test output |
| `EVID-03` | MCP doctor test output |
| `EVID-04` | providers output test and docs |
| `EVID-05` | full local verification bundle plus external CI exception |
| `EVID-06` | FT-011 document review, README updates, and final diff |

### Exit Criteria

- Modern capability fields are present and validated for every provider.
- CLI and MCP doctor report stale matrix drift without throwing.
- Providers output renders modern statuses.
- Full local verification passes and focused review has no unresolved findings.
