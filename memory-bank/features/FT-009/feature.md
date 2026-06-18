---
title: "FT-009: Modern Provider Surface Inventory"
doc_kind: feature
doc_function: canonical
purpose: "Canonical feature document for adding first-class read-only discovery of modern provider configuration surfaces across Claude Code, Codex, and Cursor."
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

# FT-009: Modern Provider Surface Inventory

## What

### Problem

AgentScope's normalized inventory currently focuses on skills, configured MCP servers, Claude tools, and a small unsupported plugin/extension boundary. Modern Claude Code, Codex, and Cursor installations also use agent files, hooks, plugin manifests or enabled-plugin declarations, settings/config files, permissions, and sandbox controls. Users and MCP clients need those surfaces to be visible before they can make safe operational decisions.

FT-009 is the first delivery slice of `PRD-004`. It broadens discovery and shared schemas, but keeps new surfaces read-only.

### Outcome

| Metric ID | Metric | Baseline | Target | Measurement method |
| --- | --- | --- | --- | --- |
| `MET-01` | Modern item kinds are modeled consistently | `skill`, `mcp`, and `plugin` only | Shared model, MCP schemas, summaries, snapshots, and tests accept `agent`, `hook`, and `setting` inventory kinds | TypeScript build and schema tests |
| `MET-02` | Provider-specific modern surfaces are discoverable | Agent, hook, setting, plugin manifest, and plugin config surfaces are absent or warning-only | Claude, Codex, and Cursor fixture roots produce typed read-only items for documented modern surfaces | Provider discovery tests |
| `MET-03` | New surfaces cannot be mutated accidentally | Unknown kinds fall through to provider-specific unsupported paths | Toggle planning returns blocked/read-only outcomes for FT-009 surfaces | Mutation or MCP blocked-plan tests |
| `MET-04` | User-facing docs explain the new boundary | README still describes narrow supported slices | README and memory-bank docs separate writable, read-only discovered, and unsupported surfaces | Documentation review and lint |

### Scope

- `REQ-01` Expand the normalized item taxonomy to include read-only modern surface kinds and categories needed for agents, hooks, provider settings/config files, plugin manifests, and plugin config declarations.
- `REQ-02` Discover Claude Code agent files, hook settings, provider settings/config files, and documented plugin enabled-state or manifest surfaces from fixture-backed roots.
- `REQ-03` Discover Codex agent files, hook files or inline hook config, provider config files, and plugin manifest/config surfaces from fixture-backed roots.
- `REQ-04` Discover Cursor agent files, hook files, permission/sandbox/config files, and local plugin manifests from fixture-backed roots.
- `REQ-05` Preserve safe mutation behavior by blocking toggle plans for newly discovered FT-009 surfaces.
- `REQ-06` Update MCP schemas, snapshot validation, output summaries, README, and capability matrix language so new surfaces are stable and understandable.
- `REQ-07` Record provider-source evidence and local-example boundaries in the protocol and implementation plan.

### Non-Scope

- `NS-01` No write support for hooks, settings, plugin manifests, plugin enablement, agent files, permissions, sandbox files, or cloud environment files.
- `NS-02` No real provider configuration mutation or direct edits to installed Claude, Codex, or Cursor files.
- `NS-03` No `.env*` reads, even when provider docs support env-file references.
- `NS-04` No automatic provider migration or self-installation.
- `NS-05` No dashboard, TUI, marketplace, remote cloud, or enterprise policy management.

### Constraints / Assumptions

- `ASM-01` Provider docs and changelogs reviewed on 2026-06-18 are the best current source of truth for documented file locations and semantics.
- `ASM-02` Local example shape snapshots are evidence of installed files, but not proof of durable provider API.
- `CON-01` FT-009 discovery must be non-destructive and must not read `.env*`.
- `CON-02` New surfaces are read-only by default and must return blocked mutation plans.
- `CON-03` Existing `DiscoveryItem` sorting, summary, snapshot, and MCP response patterns should be reused where possible.
- `DEC-01` Cursor compatibility agent paths are represented conservatively to avoid confusing cross-provider duplicates unless tests and docs make the ownership clear.

## How

### Solution

Extend AgentScope's normalized inventory model with read-only modern configuration surfaces and add provider discovery helpers that translate documented files and directories into stable `DiscoveryItem` records. Each provider keeps existing writable slices unchanged. New items are marked read-only and blocked from mutation planning, while docs describe which surfaces are merely discovered versus writable.

### Change Surface

| Surface | Type | Why it changes |
| --- | --- | --- |
| `tools/agentscope/src/core/models.ts` | code | Add new item kinds/categories and stable ordering |
| `tools/agentscope/src/core/discovery.ts` | code | Summaries must include the expanded taxonomy |
| `tools/agentscope/src/core/snapshots.ts` | code | Snapshot validation must accept new taxonomy values |
| `tools/agentscope/src/mcp/schemas.ts` | code | MCP selectors and responses must accept new taxonomy values |
| `tools/agentscope/src/providers/claude.ts` | code | Add read-only discovery for Claude modern surfaces |
| `tools/agentscope/src/providers/codex.ts` | code | Add read-only discovery for Codex modern surfaces |
| `tools/agentscope/src/providers/cursor.ts` | code | Add read-only discovery for Cursor modern surfaces |
| `tools/agentscope/test/*` and fixtures | tests | Add fixture coverage and blocked mutation assertions |
| `tools/agentscope/README.md` | docs | Update provider capability matrix and examples |
| `memory-bank/domain/problem.md` and `PROJECT.md` | docs | Update current product boundary after implementation is verified |
| `memory-bank/features/FT-009/*` | docs | Record protocol, canonical scope, plan, and evidence |

### Flow

1. Discovery starts from the same provider roots and project root that existing AgentScope commands use.
2. Each provider discovers existing writable slices exactly as before.
3. Each provider also scans documented modern surface locations that are present in the configured root.
4. Files and manifest entries become stable read-only `DiscoveryItem` records with provider, kind, category, layer, source path, state path, and mutation status.
5. CLI, MCP, and snapshots expose the same taxonomy and sorting.
6. Toggle planning for FT-009 surfaces returns blocked/read-only status.

### Contracts

| Contract ID | Input / Output | Producer / Consumer | Notes |
| --- | --- | --- | --- |
| `CTR-01` | Expanded `DiscoveryKind` and `DiscoveryCategory` unions | core models / providers, MCP, snapshots, CLI | Must stay synchronized across TypeScript and Zod schemas |
| `CTR-02` | Read-only modern surface item | provider discovery / CLI, MCP, snapshots | Must include stable id, display name, provider, layer, kind, category, enabled state, and read-only mutability |
| `CTR-03` | Blocked mutation plan for FT-009 surfaces | provider adapters / CLI and MCP plan tools | No write operations are generated for new surfaces |
| `CTR-04` | Provider capability documentation | README / users and agent clients | Must distinguish writable, read-only discovered, and unsupported |

### Failure Modes

- `FM-01` New enum values are added in core models but not MCP schemas or snapshot validation, causing structured clients to reject inventory.
- `FM-02` Discovery reads `.env*` because a provider supports env-file references.
- `FM-03` Plugin cache internals are misrepresented as stable user configuration.
- `FM-04` Cursor compatibility paths create duplicate or misleading agent records.
- `FM-05` New item kinds become accidentally writable through generic toggle paths.
- `FM-06` Provider docs drift after implementation; capability docs need a future drift-report slice.

### ADR Dependencies

None.

## Verify

### Exit Criteria

- `EC-01` Core models, MCP schemas, and snapshot validation accept the expanded read-only taxonomy.
- `EC-02` Claude, Codex, and Cursor fixture discovery produce modern surface items with stable ids, layers, categories, paths, and read-only mutability.
- `EC-03` Toggle planning for modern surfaces returns blocked/read-only behavior and produces no write operations.
- `EC-04` README and memory-bank docs describe the new discovery boundary and do not claim unsupported write behavior.
- `EC-05` Full local build, test, lint, and whitespace checks pass.

### Traceability matrix

| Requirement ID | Design refs | Acceptance refs | Checks | Evidence IDs |
| --- | --- | --- | --- | --- |
| `REQ-01` | `CTR-01`, `FM-01` | `EC-01`, `SC-01` | `CHK-01`, `CHK-03` | `EVID-01`, `EVID-03` |
| `REQ-02` | `CTR-02`, `FM-02`, `FM-03` | `EC-02`, `SC-02` | `CHK-01` | `EVID-01` |
| `REQ-03` | `CTR-02`, `FM-02`, `FM-03` | `EC-02`, `SC-03` | `CHK-01` | `EVID-01` |
| `REQ-04` | `CTR-02`, `FM-02`, `FM-04` | `EC-02`, `SC-04` | `CHK-01` | `EVID-01` |
| `REQ-05` | `CTR-03`, `FM-05` | `EC-03`, `NEG-01` | `CHK-02` | `EVID-02` |
| `REQ-06` | `CTR-01`, `CTR-04`, `FM-01` | `EC-01`, `EC-04`, `SC-05` | `CHK-03`, `CHK-04` | `EVID-03`, `EVID-04` |
| `REQ-07` | `ASM-01`, `ASM-02` | `EC-04` | `CHK-04` | `EVID-04` |

### Acceptance Scenarios

- `SC-01` A structured client can request inventory summaries and item lists containing `agent`, `hook`, `setting`, and documented plugin-manifest categories without schema rejection.
- `SC-02` Claude fixture roots containing settings hooks, agents, and plugin enabled-state data produce stable read-only inventory.
- `SC-03` Codex fixture roots containing agents, hooks, config, and plugin declarations produce stable read-only inventory.
- `SC-04` Cursor fixture roots containing agents, hooks, permissions/sandbox/config files, and local plugin manifests produce stable read-only inventory.
- `SC-05` README capability tables make clear which new surfaces are read-only discovered rather than writable.

### Negative / Edge Scenarios

- `NEG-01` A caller attempting to plan a toggle for a modern surface receives a blocked result with no planned write operations.
- `NEG-02` A provider config references `.env*`; discovery does not read that file.
- `NEG-03` A malformed hook or plugin manifest produces a provider-scoped warning and does not prevent unrelated provider inventory.

### Checks

| Check ID | Covers | How to check | Expected result | Evidence path |
| --- | --- | --- | --- | --- |
| `CHK-01` | `EC-02`, `SC-02`, `SC-03`, `SC-04`, `NEG-02`, `NEG-03` | `cd tools/agentscope && npx vitest run test/provider-discovery.test.ts` | Provider fixtures include modern read-only surfaces and scoped warnings | Vitest output |
| `CHK-02` | `EC-03`, `NEG-01` | `cd tools/agentscope && npx vitest run test/mcp-server.test.ts test/provider-discovery.test.ts` | Toggle planning blocks new read-only surfaces | Vitest output |
| `CHK-03` | `EC-01`, `SC-01` | `cd tools/agentscope && npx vitest run test/mcp-server.test.ts` and `npm run build` | MCP schemas and TypeScript build accept expanded taxonomy | Terminal output |
| `CHK-04` | `EC-04`, `EC-05`, `SC-05` | `cd tools/agentscope && npm test && npm run lint`; `git diff --check` | Full test and lint suites pass; docs are updated | Terminal output |

### Test matrix

| Check ID | Evidence IDs | Evidence path |
| --- | --- | --- |
| `CHK-01` | `EVID-01` | Provider discovery test output |
| `CHK-02` | `EVID-02` | Blocked toggle/MCP test output |
| `CHK-03` | `EVID-03` | MCP schema and build output |
| `CHK-04` | `EVID-04` | Full build/test/lint and docs review output |

### Evidence

- `EVID-01` Provider discovery fixture test output for modern surfaces.
- `EVID-02` Blocked toggle planning output for modern surfaces.
- `EVID-03` MCP schema and TypeScript build output.
- `EVID-04` Full local verification and documentation review output.

### Evidence contract

| Evidence ID | Artifact | Producer | Path contract | Reused by checks |
| --- | --- | --- | --- | --- |
| `EVID-01` | Vitest provider discovery output | test runner | terminal output from `test/provider-discovery.test.ts` | `CHK-01` |
| `EVID-02` | Vitest blocked toggle output | test runner | terminal output from provider or MCP tests | `CHK-02` |
| `EVID-03` | MCP schema and TypeScript build output | test runner / build | terminal output | `CHK-03` |
| `EVID-04` | Full verification output and docs review note | local verifier | terminal output and updated docs | `CHK-04` |

### Closure Evidence

Accepted for local closure on 2026-06-18. FT-009 added read-only inventory for modern provider surfaces, kept new surfaces blocked from mutation planning, and updated the user-facing and memory-bank documentation boundaries.

Verification evidence:

- `cd tools/agentscope && npx vitest run test/provider-discovery.test.ts test/codex-provider.test.ts test/toggle.test.ts test/mcp-server.test.ts` passed: 4 files, 55 tests.
- `cd tools/agentscope && npx vitest run test/cli.test.ts` passed: 1 file, 12 tests.
- `cd tools/agentscope && npm run build` passed.
- `cd tools/agentscope && npm test` passed: 23 files, 181 tests.
- `cd tools/agentscope && npm run lint` passed with existing Biome schema-version info only.
- `git diff --check` passed.
- Focused code re-review found no remaining blockers after the first review findings were fixed.
