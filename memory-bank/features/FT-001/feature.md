---
title: "FT-001: Trusted Multi-Provider Discovery Foundation"
doc_kind: feature
doc_function: canonical
purpose: "Canonical feature document for the first AgentScope discovery slice: normalized cross-provider inventory, config/path resolution, and warning-preserving CLI discovery commands."
derived_from:
  - ../../domain/problem.md
  - ../../prd/PRD-001-local-discovery-and-safe-mutation-foundation.md
  - ../../use-cases/UC-001-cross-provider-discovery.md
status: active
delivery_status: done
audience: humans_and_agents
must_not_define:
  - implementation_sequence
---

# FT-001: Trusted Multi-Provider Discovery Foundation

## What

### Problem

AgentScope could not yet show one dependable, read-only inventory across Claude Code, Codex, and Cursor. Without a normalized discovery surface, users could not tell what local AI-agent configuration existed, and later safe-mutation work had no trustworthy selection model to build on.

### Outcome

| Metric ID | Metric | Baseline | Target | Measurement method |
| --- | --- | --- | --- | --- |
| `MET-01` | Supported providers discoverable through one CLI surface | No unified inventory | Claude, Codex, and Cursor visible through shared discovery and capability output | Automated provider-discovery and CLI tests |

### Scope

- `REQ-01` Lock a committed provider capability baseline and fixture contract for Claude Code, Codex, and Cursor.
- `REQ-02` Add shared config loading and path resolution with deterministic precedence for defaults, user config, project config, and CLI overrides.
- `REQ-03` Normalize discovery output into one shared item model and warning model with stable ordering and stable IDs.
- `REQ-04` Discover supported skills, configured MCPs, and tools across the verified provider roots in scope for this feature.
- `REQ-05` Ship `providers`, `doctor`, and `list` command behavior that preserves healthy-provider results when another provider slice is broken.

### Non-Scope

- `NS-01` Any guarded mutation, backup, restore, lock, or audit workflow.
- `NS-02` Dashboard, snapshot, MCP-server, or provider install or uninstall flows.
- `NS-03` Discovery outside the provider roots explicitly verified by this feature.

### Constraints / Assumptions

- `ASM-01` Discovery remains read-only even when later features add writable flows.
- `CON-01` Provider-specific discovery semantics stay in `src/providers/*`; shared orchestration, config, and output stay in `src/core/*`.
- `CON-02` Fixture-backed automated coverage is the canonical verification surface for provider discovery.

## How

### Solution

Introduce one shared discovery core in `tools/agentscope` for config loading, path resolution, normalization, sorting, and output formatting, while each provider module owns its own file-shape parsing and item extraction. The CLI surface stays thin and emits deterministic provider capability summaries, doctor output, and list output using the same underlying registry.

### Change Surface

| Surface | Type | Why it changes |
| --- | --- | --- |
| `tools/agentscope/src/core/*` | code | Shared config, path, discovery, and output contracts live here |
| `tools/agentscope/src/providers/*` | code | Each supported provider needs grounded discovery logic and capability metadata |
| `tools/agentscope/src/commands/*` | code | `providers`, `doctor`, and `list` expose the shared discovery surface |
| `tools/agentscope/test/fixtures/**` | test data | Provider fixtures lock file shapes and capability expectations |
| `tools/agentscope/test/*.test.ts` | tests | Discovery, config, path, and CLI behavior are verified here |
| `tools/agentscope/README.md` | doc | The shipped provider capability matrix and command surface are documented here |

### Flow

1. Resolve config and provider roots for the current project scope.
2. Ask each supported provider module to inspect its grounded discovery surfaces and normalize items and warnings.
3. Sort and render the results through deterministic CLI output and JSON output.

### Contracts

| Contract ID | Input / Output | Producer / Consumer | Notes |
| --- | --- | --- | --- |
| `CTR-01` | Normalized discovery item shape | provider modules / shared discovery and CLI output | Each item exposes provider, kind, category, layer, id, displayName, enabled, mutability, sourcePath, and statePath |
| `CTR-02` | Provider warning shape | provider modules / CLI output | Warnings are provider-scoped, machine-readable, and do not hide healthy results |
| `CTR-03` | Config precedence | config loader / all commands | Precedence is defaults `<` user config `<` project config `<` CLI flags |

### Failure Modes

- `FM-01` A malformed or unreadable provider file hides healthy results from another provider.
- `FM-02` Discovery IDs or ordering drift between runs over stable inputs.
- `FM-03` Fixture assumptions and shipped provider behavior diverge silently.

## Verify

### Exit Criteria

- `EC-01` AgentScope can inspect Claude Code, Codex, and Cursor through one normalized discovery contract.
- `EC-02` `providers`, `doctor`, and `list` produce deterministic output and preserve provider-scoped warnings.

### Traceability matrix

| Requirement ID | Design refs | Acceptance refs | Checks | Evidence IDs |
| --- | --- | --- | --- | --- |
| `REQ-01` | `CON-02`, `CTR-02` | `EC-01`, `SC-02` | `CHK-01` | `EVID-01` |
| `REQ-02` | `CON-01`, `CTR-03` | `EC-01`, `SC-01` | `CHK-01` | `EVID-01` |
| `REQ-03` | `CTR-01`, `CTR-02`, `FM-02` | `EC-01`, `SC-01` | `CHK-01` | `EVID-01` |
| `REQ-04` | `CTR-01`, `FM-01` | `EC-01`, `SC-01`, `SC-02` | `CHK-01` | `EVID-01` |
| `REQ-05` | `CTR-02`, `FM-01`, `FM-03` | `EC-02`, `SC-02`, `SC-03` | `CHK-01`, `CHK-02` | `EVID-01`, `EVID-02` |

### Acceptance Scenarios

- `SC-01` A user runs discovery and receives normalized items for healthy provider slices in deterministic order.
- `SC-02` A malformed or unreadable provider slice produces a provider-scoped warning while healthy providers remain visible.
- `SC-03` A required discovery assumption failure makes `doctor` exit non-zero instead of reporting a false healthy state.

### Checks

| Check ID | Covers | How to check | Expected result | Evidence path |
| --- | --- | --- | --- | --- |
| `CHK-01` | `EC-01`, `SC-01`, `SC-02` | Run `npm test` in `tools/agentscope` with the provider discovery, config, path, list, and doctor suites | Discovery and CLI tests pass against the committed fixture baseline | `../../tools/agentscope/test/` |
| `CHK-02` | `EC-02`, `SC-03` | Run `npm run build` in `tools/agentscope` after the feature test suite is green | The package builds cleanly on the documented runtime baseline | `../../tools/agentscope/package.json` |

### Test matrix

| Check ID | Evidence IDs | Evidence path |
| --- | --- | --- |
| `CHK-01` | `EVID-01` | `../../tools/agentscope/test/` |
| `CHK-02` | `EVID-02` | `implementation-plan.md#ready-for-acceptance` |

### Evidence

- `EVID-01` Fixture-backed provider discovery, config, path, and CLI test coverage in `tools/agentscope/test/`.
- `EVID-02` Archived execution summary and final verification record in [`implementation-plan.md`](implementation-plan.md).

### Evidence contract

| Evidence ID | Artifact | Producer | Path contract | Reused by checks |
| --- | --- | --- | --- | --- |
| `EVID-01` | Automated discovery and CLI test suite | Vitest | `../../tools/agentscope/test/` | `CHK-01` |
| `EVID-02` | Archived implementation summary and verification outcome | implementation plan | `implementation-plan.md#ready-for-acceptance` | `CHK-02` |
