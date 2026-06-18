---
title: "FT-009: Implementation Plan"
doc_kind: feature
doc_function: derived
purpose: "Execution plan for FT-009. Records discovery context, steps, risks, and test strategy without redefining canonical modern provider surface facts."
derived_from:
  - feature.md
status: archived
audience: humans_and_agents
must_not_define:
  - ft_009_scope
  - ft_009_architecture
  - ft_009_acceptance_criteria
  - ft_009_blocker_state
---

# Modern Provider Surface Inventory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add read-only discovery of modern provider configuration surfaces across Claude Code, Codex, and Cursor.

**Derived design summary:** Per `feature.md`, extend the existing `DiscoveryItem` taxonomy and provider discovery modules without creating a separate inventory path. New provider helpers convert documented files and manifests into read-only items, while existing mutation planning continues to block unsupported surfaces.

**Tech Stack:** TypeScript, Node.js 25.9+, Vitest, Zod MCP schemas, Biome.

---

## Goal Of This Plan

Implement the FT-009 read-only inventory slice described in `feature.md`: expanded taxonomy plus provider-specific discovery for agents, hooks, settings/config files, and documented plugin manifest/config surfaces, with fixture-backed tests and documentation updates.

## Current State / Reference Points

| Path / module | Current role | Why relevant | Reuse / mirror |
| --- | --- | --- | --- |
| `tools/agentscope/src/core/models.ts` | Owns `DiscoveryKind`, `DiscoveryCategory`, `DiscoveryItem`, ordering, and summary types | New surface kinds and categories must be defined here first | Extend the existing unions and ordering arrays |
| `tools/agentscope/src/core/discovery.ts` | Orchestrates providers and builds inventory summaries | New kinds/categories must appear in summaries and stable sorting | Reuse `emptyKindSummary`, `emptyCategorySummary`, and `sortDiscoveryItems` patterns |
| `tools/agentscope/src/core/snapshots.ts` | Validates persisted discovery snapshots | New taxonomy must not break snapshot read/write validation | Reuse existing enum-based validation with expanded lists |
| `tools/agentscope/src/mcp/schemas.ts` | Zod schemas for MCP selectors and responses | MCP clients must accept new item values | Mirror `models.ts` enum updates |
| `tools/agentscope/src/providers/claude.ts` | Claude discovery and safe mutation planning | First provider-specific modern surface implementation | Add read-only helpers near existing skill/MCP/tool discovery |
| `tools/agentscope/src/providers/codex.ts` | Codex discovery and safe mutation planning | Codex has config, hooks, plugins, and custom agents docs | Add read-only helpers without changing existing writable skill/MCP behavior |
| `tools/agentscope/src/providers/cursor.ts` | Cursor discovery, SQLite disabled-server reconciliation, extension warning behavior | Cursor has hooks, permissions, sandbox, plugins, agents, and compatibility paths | Add read-only helpers conservatively and keep `.env*` ignored |
| `tools/agentscope/test/provider-discovery.test.ts` | Cross-provider fixture discovery coverage | Best place to prove inventory behavior | Add failing tests first for modern surfaces |
| `tools/agentscope/test/mcp-server.test.ts` | MCP structured output and selector coverage | Ensures schema and MCP list responses handle new taxonomy | Add focused schema/list assertions |
| `tools/agentscope/test/fixtures/runtime/` | Existing fixture roots for providers | Avoids real provider config | Add representative modern provider files here |
| `tools/agentscope/README.md` | User-facing command and capability docs | Must describe the new read-only boundary | Update capability matrix and surface notes |

## Test Strategy

| Test surface | Canonical refs | Existing coverage | Planned automated coverage | Required local suites / commands | Required CI suites / jobs | Manual-only gap / justification | Manual-only approval ref |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Expanded taxonomy | `REQ-01`, `SC-01`, `EC-01` | Existing tests cover old enum values indirectly | Tests assert summaries and MCP schemas accept `agent`, `hook`, `setting`, `plugin-config`, and `plugin-manifest` categories | `npx vitest run test/provider-discovery.test.ts test/mcp-server.test.ts`; `npm run build` | existing AgentScope test job | none | `none` |
| Claude modern surface discovery | `REQ-02`, `SC-02`, `NEG-02`, `NEG-03` | Claude skills/MCP/tools only | Fixture contains `.claude/agents`, hooks in settings, settings files, and plugin enabled-state/manifest examples | `npx vitest run test/provider-discovery.test.ts` | existing AgentScope test job | none | `none` |
| Codex modern surface discovery | `REQ-03`, `SC-03`, `NEG-02`, `NEG-03` | Codex skills/global MCP/plugins unsupported only | Fixture contains `.codex/agents`, hooks/config, and plugin declarations | `npx vitest run test/provider-discovery.test.ts` | existing AgentScope test job | none | `none` |
| Cursor modern surface discovery | `REQ-04`, `SC-04`, `NEG-02`, `NEG-03` | Cursor skills/global MCP/extensions unsupported only | Fixture contains `.cursor/agents`, hooks, permissions/sandbox/config, and local plugin manifest | `npx vitest run test/provider-discovery.test.ts` | existing AgentScope test job | none | `none` |
| Mutation boundary | `REQ-05`, `NEG-01`, `EC-03` | Unsupported plugin/tool toggle tests exist for older kinds | Add blocked-plan assertion for at least one new modern surface per provider or shared path | `npx vitest run test/provider-discovery.test.ts test/mcp-server.test.ts` | existing AgentScope test job | none | `none` |
| Documentation and project health | `REQ-06`, `REQ-07`, `EC-04`, `EC-05` | README describes old matrix | README and memory-bank updates plus full build/test/lint | `npm run build`, `npm test`, `npm run lint`, `git diff --check` | existing CI | Official docs drift may need future review; this run records sources and date | `AG-01` |

## Open Questions / Ambiguities

| Open Question ID | Question | Why unresolved | Blocks | Default action / escalation owner |
| --- | --- | --- | --- | --- |
| `OQ-01` | Should Cursor report `.claude/agents/` and `.codex/agents/` compatibility paths as Cursor items? | Cursor docs support these paths, but duplicate ownership may confuse provider-specific inventory | detailed Cursor implementation | First slice reports Cursor-owned `.cursor/agents` and records compatibility paths as future FT-011 drift/compatibility work unless tests show an obvious local need |
| `OQ-02` | Should plugin cache internals be itemized? | Local examples include caches, but cache storage may be provider-owned implementation detail | plugin implementation | Only report documented manifests/config entries and enabled-plugin declarations |
| `OQ-03` | Should provider settings be one item per file or one item per section? | Different providers expose different settings structures | taxonomy details | Use one item per documented settings/config file, plus one hook item per event/group when hooks are present |

## Environment Contract

| Area | Contract | Used by | Failure symptom |
| --- | --- | --- |
| setup | Work from repo root; run commands from `tools/agentscope` for Node tasks | all steps | tests or build cannot locate package metadata |
| test | Fixture sandboxes only; no tests read or write real provider roots | `STEP-01` through `STEP-09` | tests depend on local user config or mutate home directories |
| access / network / secrets | No secrets are needed; `.env*` files must not be read or copied | all steps | provider discovery attempts to parse an env file |
| docs | Official provider docs and changelogs are cited by URL/date in governed docs | docs steps | source claims are unsupported or stale |

## Preconditions

| Precondition ID | Canonical ref | Required state | Used by steps | Blocks start |
| --- | --- | --- | --- | --- |
| `PRE-01` | `CON-01`, `NEG-02` | `.env*` files are not read or used | all steps | yes |
| `PRE-02` | `REQ-01`, `CTR-01` | New taxonomy is introduced in tests before production code | `STEP-01`, `STEP-02` | yes |
| `PRE-03` | `CON-02`, `REQ-05` | New items remain read-only and blocked from mutation planning | `STEP-06` through `STEP-09` | yes |
| `PRE-04` | `ASM-01`, `ASM-02` | Provider docs and local examples are recorded as evidence | docs and implementation | no |

## Workstreams

| Workstream | Implements | Result | Owner | Dependencies |
| --- | --- | --- | --- | --- |
| `WS-01` | `REQ-01`, `REQ-06` | Expanded taxonomy and schema support | agent | `PRE-02` |
| `WS-02` | `REQ-02`, `REQ-05` | Claude read-only modern surface discovery | agent | `WS-01` |
| `WS-03` | `REQ-03`, `REQ-05` | Codex read-only modern surface discovery | agent | `WS-01` |
| `WS-04` | `REQ-04`, `REQ-05` | Cursor read-only modern surface discovery | agent | `WS-01` |
| `WS-05` | `REQ-06`, `REQ-07` | README, domain, project, protocol evidence updates | agent | `WS-01` through `WS-04` |

## Approval Gates

| Approval Gate ID | Trigger | Applies to | Why approval is required | Approver / evidence |
| --- | --- | --- | --- | --- |
| `AG-01` | Documentation claims a provider surface is writable or stable beyond current evidence | `STEP-10` through `STEP-12` | Misstated provider support can lead users to unsafe manual edits | Human owner or reviewer accepts source evidence |
| `AG-02` | Implementation attempts real provider mutation or automatic provider config edits | all steps | Real local app configuration is outside this feature | Stop and ask human |
| `AG-03` | Any step needs `.env*` content | all steps | Repository policy forbids reading or using `.env*` | Stop; no fallback reads allowed |

## Work Sequence

| Step ID | Actor | Implements | Goal | Touchpoints | Artifact | Verifies | Evidence IDs | Check command / procedure | Blocked by | Needs approval | Escalate if |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `STEP-01` | agent | `REQ-01`, `REQ-06` | Write failing taxonomy and MCP schema tests | `test/provider-discovery.test.ts`, `test/mcp-server.test.ts` | RED tests | `CHK-03` | `EVID-03` | `npx vitest run test/provider-discovery.test.ts test/mcp-server.test.ts` | `PRE-01`, `PRE-02` | `none` | tests require real provider roots |
| `STEP-02` | agent | `REQ-01`, `REQ-06` | Implement minimal taxonomy and schema support | `src/core/models.ts`, `src/core/discovery.ts`, `src/core/snapshots.ts`, `src/mcp/schemas.ts` | expanded enums and summaries | `CHK-03` | `EVID-03` | `npx vitest run test/provider-discovery.test.ts test/mcp-server.test.ts` | `STEP-01` | `none` | core and MCP taxonomy diverge |
| `STEP-03` | agent | `REQ-02` | Write failing Claude fixture discovery tests | `test/fixtures/runtime`, `test/provider-discovery.test.ts` | RED Claude tests | `CHK-01` | `EVID-01` | `npx vitest run test/provider-discovery.test.ts` | `STEP-02` | `none` | fixtures need `.env*` content |
| `STEP-04` | agent | `REQ-03` | Write failing Codex fixture discovery tests | `test/fixtures/runtime`, `test/provider-discovery.test.ts` | RED Codex tests | `CHK-01` | `EVID-01` | `npx vitest run test/provider-discovery.test.ts` | `STEP-02` | `none` | fixtures need `.env*` content |
| `STEP-05` | agent | `REQ-04` | Write failing Cursor fixture discovery tests | `test/fixtures/runtime`, `test/provider-discovery.test.ts` | RED Cursor tests | `CHK-01` | `EVID-01` | `npx vitest run test/provider-discovery.test.ts` | `STEP-02` | `none` | compatibility paths confuse ownership |
| `STEP-06` | agent | `REQ-02`, `REQ-05` | Implement Claude read-only modern discovery | `src/providers/claude.ts` | Claude modern items | `CHK-01`, `CHK-02` | `EVID-01`, `EVID-02` | `npx vitest run test/provider-discovery.test.ts` | `STEP-03`, `PRE-03` | `none` | implementation needs real config mutation |
| `STEP-07` | agent | `REQ-03`, `REQ-05` | Implement Codex read-only modern discovery | `src/providers/codex.ts` | Codex modern items | `CHK-01`, `CHK-02` | `EVID-01`, `EVID-02` | `npx vitest run test/provider-discovery.test.ts` | `STEP-04`, `PRE-03` | `none` | implementation needs real config mutation |
| `STEP-08` | agent | `REQ-04`, `REQ-05` | Implement Cursor read-only modern discovery | `src/providers/cursor.ts` | Cursor modern items | `CHK-01`, `CHK-02` | `EVID-01`, `EVID-02` | `npx vitest run test/provider-discovery.test.ts` | `STEP-05`, `PRE-03` | `none` | implementation needs real config mutation |
| `STEP-09` | agent | `REQ-05` | Add blocked mutation/MCP coverage for modern surfaces | `test/mcp-server.test.ts`, providers as needed | blocked read-only plans | `CHK-02` | `EVID-02` | `npx vitest run test/mcp-server.test.ts test/provider-discovery.test.ts` | `STEP-06` through `STEP-08` | `none` | a generic path would write unsupported surfaces |
| `STEP-10` | agent | `REQ-06`, `REQ-07` | Update user-facing and memory-bank docs | `README.md`, `PROJECT.md`, `domain/problem.md`, `FT-009/*` | documented boundary | `CHK-04` | `EVID-04` | documentation review | `STEP-09` | `AG-01` if write claims are added | docs overclaim support |
| `STEP-11` | agent | `REQ-01` through `REQ-07` | Run full verification | `tools/agentscope`, repo root | verification output | `CHK-01` through `CHK-04` | `EVID-01` through `EVID-04` | build, test, lint, `git diff --check` | `STEP-10` | `none` | any check fails |
| `STEP-12` | agent | `REQ-07` | Record protocol and plan evidence | `protocol.md`, `implementation-plan.md`, `feature.md` | execution evidence | `CHK-04` | `EVID-04` | doc review | `STEP-11` | `none` | evidence cannot prove acceptance |
| `STEP-13` | agent | feature slice | Commit one local feature slice | git index | local commit | `CHK-04` | `EVID-04` | `git status --short --branch` | `STEP-12` | `H2` | unrelated files would be staged |

### Task 1: Taxonomy And Schema TDD

**Files:**
- Modify: `tools/agentscope/test/provider-discovery.test.ts`
- Modify: `tools/agentscope/test/mcp-server.test.ts`
- Modify after RED: `tools/agentscope/src/core/models.ts`
- Modify after RED: `tools/agentscope/src/core/discovery.ts`
- Modify after RED: `tools/agentscope/src/core/snapshots.ts`
- Modify after RED: `tools/agentscope/src/mcp/schemas.ts`

- [ ] **Step 1: Write the failing taxonomy tests**

Add tests that expect the expanded taxonomy to be accepted by summaries and MCP schemas:

```ts
expect(summary.byKind).toMatchObject({
  agent: expect.any(Object),
  hook: expect.any(Object),
  setting: expect.any(Object),
});
expect(summary.byCategory).toMatchObject({
  agent: expect.any(Object),
  hook: expect.any(Object),
  "provider-setting": expect.any(Object),
  "plugin-config": expect.any(Object),
  "plugin-manifest": expect.any(Object),
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd tools/agentscope && npx vitest run test/provider-discovery.test.ts test/mcp-server.test.ts`

Expected: FAIL because the current taxonomy only knows `skill`, `mcp`, and `plugin`.

- [ ] **Step 3: Implement minimal taxonomy support**

Add `agent`, `hook`, and `setting` kinds plus `agent`, `hook`, `provider-setting`, `plugin-config`, and `plugin-manifest` categories to core model ordering, empty summaries, snapshot validation, and MCP schemas.

- [ ] **Step 4: Run test to verify taxonomy passes**

Run: `cd tools/agentscope && npx vitest run test/provider-discovery.test.ts test/mcp-server.test.ts`

Expected: PASS for taxonomy assertions or fail only on provider-specific tests not yet implemented.

### Task 2: Provider Fixture And Discovery TDD

**Files:**
- Modify: `tools/agentscope/test/fixtures/runtime/`
- Modify: `tools/agentscope/test/provider-discovery.test.ts`
- Modify after RED: `tools/agentscope/src/providers/claude.ts`
- Modify after RED: `tools/agentscope/src/providers/codex.ts`
- Modify after RED: `tools/agentscope/src/providers/cursor.ts`

- [ ] **Step 1: Add fixture files and failing discovery tests**

Add fixture roots that represent:

- Claude `.claude/agents/*.md`, settings hooks, `enabledPlugins`, and plugin manifest entries.
- Codex `.codex/agents/*`, hooks config, `config.toml`, and plugin declarations.
- Cursor `.cursor/agents/*.md`, `.cursor/hooks.json`, `.cursor/permissions.json`, `.cursor/sandbox.json`, `.cursor/cli.json`, and `~/.cursor/plugins/local/<plugin>/.cursor-plugin/plugin.json`.

Tests should assert stable read-only items by provider, layer, kind, category, and source path.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd tools/agentscope && npx vitest run test/provider-discovery.test.ts`

Expected: FAIL because provider modules do not emit the new items.

- [ ] **Step 3: Implement minimal provider discovery**

Add read-only helper functions in each provider that:

- skip `.env*` references;
- parse only JSON/TOML/markdown frontmatter needed for metadata;
- create stable ids using provider, layer, surface kind, and normalized relative path or event name;
- set read-only mutability/blocking semantics.

- [ ] **Step 4: Run provider discovery tests**

Run: `cd tools/agentscope && npx vitest run test/provider-discovery.test.ts`

Expected: PASS for modern provider surface inventory.

### Task 3: Mutation Boundary And MCP Coverage

**Files:**
- Modify: `tools/agentscope/test/mcp-server.test.ts`
- Modify as needed: `tools/agentscope/src/mcp/tools.ts`
- Modify as needed: `tools/agentscope/src/mcp/helpers.ts`
- Modify as needed: provider `planToggle` functions

- [ ] **Step 1: Write failing blocked-toggle tests**

Add assertions that planning a toggle for one discovered agent/hook/setting item returns a blocked/read-only result with no write operations.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd tools/agentscope && npx vitest run test/mcp-server.test.ts test/provider-discovery.test.ts`

Expected: FAIL if the new kind is rejected by schema or not blocked with a clear read-only reason.

- [ ] **Step 3: Implement minimal blocked behavior**

Ensure MCP selectors accept the new kinds and provider toggle planning returns a clear blocked result for FT-009 surfaces without writes.

- [ ] **Step 4: Run targeted tests**

Run: `cd tools/agentscope && npx vitest run test/mcp-server.test.ts test/provider-discovery.test.ts`

Expected: PASS.

### Task 4: Documentation And Full Verification

**Files:**
- Modify: `tools/agentscope/README.md`
- Modify: `PROJECT.md`
- Modify: `memory-bank/domain/problem.md`
- Modify: `memory-bank/features/FT-009/feature.md`
- Modify: `memory-bank/features/FT-009/implementation-plan.md`
- Modify: `memory-bank/features/FT-009/protocol.md`

- [ ] **Step 1: Update user-facing docs**

Document:

- writable existing surfaces;
- FT-009 read-only discovered surfaces;
- unsupported or future surfaces;
- provider source notes and `.env*` exclusion.

- [ ] **Step 2: Run full verification**

Run:

```bash
(cd tools/agentscope && npm run build)
(cd tools/agentscope && npm test)
(cd tools/agentscope && npm run lint)
git diff --check
```

Expected: all commands pass.

- [ ] **Step 3: Update execution evidence**

Record verification outputs, review results, and any accepted manual gaps in `protocol.md` and this plan.

- [ ] **Step 4: Commit one feature slice**

After H2 approval is satisfied, run:

```bash
git add memory-bank/prd/README.md memory-bank/prd/PRD-004-modern-provider-configuration-surfaces.md memory-bank/features/README.md memory-bank/features/FT-009 tools/agentscope PROJECT.md memory-bank/domain/problem.md
git commit -m "feat: discover modern provider surfaces"
```

Expected: one local commit for FT-009 only, excluding unrelated homework changes.

## Parallelizable Work

- `PAR-01` Document review can run while the main agent prepares test context.
- `PAR-02` Claude, Codex, and Cursor discovery can be delegated only if write sets are separated by provider module and fixture files.
- `PAR-03` Do not parallelize edits to shared taxonomy files or MCP schemas.

## Checkpoints

| Checkpoint ID | Refs | Condition | Evidence IDs |
| --- | --- | --- |
| `CP-01` | `STEP-01`, `STEP-02`, `CHK-03` | Expanded taxonomy is accepted by build and schemas | `EVID-03` |
| `CP-02` | `STEP-03` through `STEP-08`, `CHK-01` | Provider fixture discovery emits modern read-only surfaces | `EVID-01` |
| `CP-03` | `STEP-09`, `CHK-02` | Mutation planning blocks modern surfaces | `EVID-02` |
| `CP-04` | `STEP-10` through `STEP-12`, `CHK-04` | Docs, build, test, lint, and diff checks are green | `EVID-04` |

## Execution Risks

| Risk ID | Risk | Impact | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| `ER-01` | Enum drift between core model and MCP schema | Clients reject valid inventory | Update tests first and keep lists near shared source definitions where possible | MCP tests fail |
| `ER-02` | Provider helper reads or follows `.env*` references | Policy violation | Treat env file references as opaque string metadata and do not open them | file path matches `.env*` |
| `ER-03` | New discovery code is too provider-specific and duplicated | Maintenance burden | Add small local helpers only when repetition becomes error-prone | repeated path/id/mutability logic |
| `ER-04` | Docs overclaim write support | Unsafe user behavior | Mark new surfaces read-only until FT-010 proves mutability | review finding |

## Stop Conditions / Fallback

| Stop ID | Related refs | Trigger | Immediate action | Safe fallback state |
| --- | --- | --- | --- | --- |
| `STOP-01` | `CON-01`, `NEG-02`, `AG-03` | Any step needs `.env*` input | Stop and redesign to treat the value as opaque | No file read, no mutation |
| `STOP-02` | `NS-01`, `AG-02` | Implementation tries to write modern provider surfaces | Stop and move write behavior to FT-010 planning | FT-009 remains read-only |
| `STOP-03` | `FM-01` | Taxonomy cannot be synchronized across core/MCP/snapshot | Stop and add a small shared enum helper or ADR | No partial schema release |
| `STOP-04` | `OQ-01` | Cursor compatibility paths confuse inventory ownership | Defer compatibility paths to FT-011 and document the choice | Cursor-owned paths still covered |

## Ready For Acceptance

FT-009 is ready for acceptance when:

- Core taxonomy, MCP schemas, and snapshot validation accept the new read-only surface values.
- Claude, Codex, and Cursor fixture-backed tests discover modern provider surfaces.
- Modern surface toggle planning is blocked with no writes.
- README and memory-bank docs describe the new boundary accurately.
- `cd tools/agentscope && npm run build`, `npm test`, and `npm run lint` pass locally.
- `git diff --check` passes.
- A review checkpoint has no unresolved blocking findings.

## Execution Summary

Status: accepted for local closure on 2026-06-18 and archived as the FT-009 execution record.

| Evidence | Result | Notes |
| --- | --- | --- |
| RED targeted tests | passed as failing first | `npx vitest run test/provider-discovery.test.ts test/mcp-server.test.ts` failed before implementation because taxonomy, provider discovery, Codex plugin config identity, and MCP schemas were missing |
| modern surface discovery | implemented | Added `agent`, `hook`, `setting`, `provider-setting`, `plugin-config`, and `plugin-manifest` inventory support; provider surfaces remain read-only |
| `npx vitest run test/provider-discovery.test.ts test/mcp-server.test.ts` | passed | 2 files, 29 tests |
| `npm run build` | passed | `tsc -p tsconfig.json` |
| `npm test` | passed | 23 files, 179 tests |
| `npm run lint` | passed | Existing Biome schema-version info only |
| `git diff --check` | passed | No whitespace errors |
| code review | findings fixed | Added regression coverage for documented Codex hooks, declared agent names, plugin config declarations, nested provider policy tables, and unreadable optional files |
| review-fix targeted tests | passed | 4 files, 55 tests |
| CLI route tests | passed | 1 file, 12 tests |
| post-review `npm test` | passed | 23 files, 181 tests |
| focused code re-review | passed | No findings; previous blockers resolved |
