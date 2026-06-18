---
title: "FT-010: Implementation Plan"
doc_kind: feature
doc_function: derived
purpose: "Execution plan for FT-010. Records discovery context, steps, risks, and test strategy without redefining canonical safe modern surface toggle facts."
derived_from:
  - feature.md
status: archived
audience: humans_and_agents
must_not_define:
  - ft_010_scope
  - ft_010_architecture
  - ft_010_acceptance_criteria
  - ft_010_blocker_state
---

# Verified Modern Surface Toggles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add safe, reversible toggles for Claude Code, Codex, and Cursor agent files.

**Derived design summary:** Per `feature.md`, extend AgentScope's existing vault-backed path toggle model to support `agent` entries. Provider modules mark live agent files as read-write, discover vaulted disabled agents, and route agent toggle planning through file move operations with source fingerprints.

**Tech Stack:** TypeScript, Node.js 25.9+, Vitest, AgentScope mutation engine, Biome.

---

## Goal Of This Plan

Implement the FT-010 slice described in `feature.md`: verified file-vault toggles for agent files across Claude Code, Codex, and Cursor, while preserving read-only behavior for other modern provider surfaces.

## Discovery Context

| Path / module | Current role | Why relevant | Reuse / mirror |
| --- | --- | --- | --- |
| `tools/agentscope/src/core/mutation-vault.ts` | Owns vault manifests and validates vault entry kind | Must admit `agent` manifests for disabled agent inventory and restore planning | Extend `VaultEntryKind`, `sliceRoot`, and validation messages |
| `tools/agentscope/src/core/mutation-models.ts` | Defines mutation plans, operations, selected item identity, and toggle results | Agent toggles should reuse existing operation and fingerprint contracts | No new operation type expected |
| `tools/agentscope/src/core/mutation-io.ts` | Applies rename, create, delete, backup, rollback, and fingerprint behavior | Agent toggles rely on existing path mutation behavior | No production change expected unless tests expose a gap |
| `tools/agentscope/src/providers/claude.ts` | Discovers Claude agents and plans skills/MCP/tools toggles | Needs live/vaulted agent discovery and agent plan routing | Mirror Claude project skill vault flow with file path payloads |
| `tools/agentscope/src/providers/codex.ts` | Discovers Codex agents and plans skills/MCP toggles | Needs live/vaulted agent discovery and agent plan routing | Mirror Codex skill vault flow with global/project layers |
| `tools/agentscope/src/providers/cursor.ts` | Discovers Cursor agents and plans global skill/MCP toggles | Needs live/vaulted agent discovery and agent plan routing | Use file-backed agent vaults for both global and project layers |
| `tools/agentscope/test/provider-discovery.test.ts` | Cross-provider fixture discovery coverage | Best place to prove live and disabled agent inventory states | Add failing tests before code |
| `tools/agentscope/test/toggle.test.ts` | CLI-level toggle apply/dry-run coverage | Best place to prove disable and restore file moves end to end | Add failing tests before code |
| `tools/agentscope/test/mcp-server.test.ts` | MCP list and mutation planning coverage | Ensures agent selectors and blocked modern surfaces behave for clients | Add focused plan assertions if CLI coverage is not enough |
| `tools/agentscope/README.md` | User-facing capability matrix | Must describe agent files as writable and other modern surfaces as read-only | Update after tests pass |

## Test Strategy

| Test surface | Canonical refs | Existing coverage | Planned automated coverage | Required local suites / commands | Required CI suites / jobs | Manual-only gap / justification | Manual-only approval ref |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Vault contract | `REQ-01`, `CTR-01`, `FM-01` | Vault accepts skills and configured MCP entries | Unit or provider tests load `kind: "agent"` manifests and reject invalid payloads | `npx vitest run test/provider-discovery.test.ts` | existing AgentScope test job | none | `none` |
| Live agent mutability | `REQ-02`, `CTR-02` | Agent files discovered read-only | Tests assert live Claude, Codex, and Cursor agent items are read-write | `npx vitest run test/provider-discovery.test.ts` | existing AgentScope test job | none | `none` |
| File-vault toggle | `REQ-03`, `CTR-04`, `NEG-01` | Skills can be vaulted; agents cannot | CLI or provider tests apply the file-vault toggle and assert live file moved, manifest written, conflict blocks | `npx vitest run test/toggle.test.ts` | existing AgentScope test job | none | `none` |
| Disabled discovery | `REQ-04`, `CTR-03`, `NEG-03` | Skills and some MCP entries discover vaulted disabled state | Tests assert vaulted agent items appear disabled and invalid vaults warn or are skipped | `npx vitest run test/provider-discovery.test.ts` | existing AgentScope test job | none | `none` |
| Restore toggle | `REQ-05`, `CTR-05`, `NEG-02`, `NEG-03` | Skills restore from vault; agents cannot | CLI or provider tests apply restore and assert original file restored, vault dir removed, live conflict blocks | `npx vitest run test/toggle.test.ts` | existing AgentScope test job | none | `none` |
| Read-only boundary | `REQ-06`, `DEC-01`, `FM-05` | FT-009 surfaces are blocked | Tests assert each fixture-backed non-agent modern surface family still blocks with empty operations | `npx vitest run test/provider-discovery.test.ts test/mcp-server.test.ts` | existing AgentScope test job | none | `none` |
| Documentation and health | `REQ-07` | README says modern surfaces are read-only after FT-009 | README and memory-bank status synced, then full local build/test/lint plus external CI exception record | `npm run build`, `npm test`, `npm run lint`, `git diff --check` | not run without push/PR approval | external CI is outside approved local feature-slice workflow; record local-only exception in protocol | `H2` |

## Open Questions / Ambiguities

| Open Question ID | Question | Why unresolved | Blocks | Default action / escalation owner |
| --- | --- | --- | --- | --- |
| `OQ-01` | Should duplicate declared agent names in different files be disambiguated? | FT-009 chose declared agent names as stable ids, and provider behavior may require uniqueness | no | Preserve FT-009 identity behavior; record any collision concern for FT-011 drift reporting |
| `OQ-02` | Should Cursor compatibility paths for `.claude/agents` and `.codex/agents` be writable as Cursor items? | Compatibility ownership can duplicate another provider's inventory | no | FT-010 only mutates Cursor-owned `.cursor/agents` paths |
| `OQ-03` | Should hooks become writable through file vaulting or JSON/TOML editing? | Hook semantics include command lists, events, matchers, and provider execution policy | yes for hooks only | Leave hooks read-only and defer to a separate feature with provider-specific docs and tests |

## Preconditions

| Precondition ID | Canonical ref | Required state | Used by steps | Blocks start |
| --- | --- | --- | --- | --- |
| `PRE-01` | `CON-03`, `NS-05` | No `.env*` files are read or used | all steps | yes |
| `PRE-02` | `REQ-01` through `REQ-05` | Production code for FT-010 has not changed before RED tests are written and observed failing | `STEP-01` through `STEP-06` | yes |
| `PRE-03` | `REQ-06` | Non-agent modern surfaces remain in scope for blocked-boundary verification | `STEP-07` | yes |
| `PRE-04` | protocol `H2` | Unrelated dirty homework file is not staged | `STEP-12` | yes |

## Workstreams

| Workstream | Implements | Result | Owner | Dependencies |
| --- | --- | --- | --- | --- |
| `WS-01` | `REQ-01` | Vault contract accepts agent entries | agent | `PRE-01`, `PRE-02` |
| `WS-02` | `REQ-02`, `REQ-04` | Providers discover live and vaulted agent files | agent | `WS-01` |
| `WS-03` | `REQ-03`, `REQ-05` | Providers plan/apply disable and restore toggles | agent | `WS-01`, `WS-02` |
| `WS-04` | `REQ-06` | Non-agent modern surfaces remain blocked | agent | `WS-03` |
| `WS-05` | `REQ-07` | README and governed docs reflect the new boundary | agent | `WS-01` through `WS-04` |

## Approval Gates

| Approval Gate ID | Trigger | Applies to | Why approval is required | Approver / evidence |
| --- | --- | --- | --- | --- |
| `AG-01` | Implementation would mutate real provider config during tests | all steps | User allowed temp copies and fixtures, not direct real config mutation | Stop; ask human |
| `AG-02` | Implementation would make hooks, settings, permissions, sandbox, or plugin surfaces writable | `STEP-09`, docs | These surfaces are outside this feature's verified write contract | Stop; create a new feature or ask human |
| `AG-03` | Local commit after green verification | `STEP-12` | One commit per feature slice | Existing H2 approval in `protocol.md` |

## Work Sequence

| Step ID | Actor | Implements | Goal | Touchpoints | Artifact | Verifies | Evidence IDs | Check command / procedure | Blocked by | Needs approval | Escalate if |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `STEP-01` | agent | `REQ-01` | Write failing vault contract and disabled-agent discovery tests | `test/provider-discovery.test.ts` | RED tests | `CHK-01` | `EVID-01` | `npx vitest run test/provider-discovery.test.ts` | `PRE-01`, `PRE-02` | `none` | tests require real provider roots |
| `STEP-02` | agent | `REQ-01` | Implement minimal vault contract support for `agent` | `src/core/mutation-vault.ts` | agent vault kind | `CHK-01`, `CHK-03` | `EVID-01`, `EVID-05` | targeted test then build | `STEP-01` | `none` | existing vault entries break |
| `STEP-03` | agent | `REQ-02`, `REQ-04` | Write failing live and vaulted agent discovery assertions for all providers | `test/provider-discovery.test.ts` | RED provider tests | `CHK-01` | `EVID-01` | `npx vitest run test/provider-discovery.test.ts` | `STEP-02`, `PRE-02` | `none` | fixture needs `.env*` |
| `STEP-04` | agent | `REQ-02`, `REQ-04` | Implement live read-write and vaulted disabled agent discovery | `src/providers/claude.ts`, `src/providers/codex.ts`, `src/providers/cursor.ts` | provider discovery changes | `CHK-01` | `EVID-01` | `npx vitest run test/provider-discovery.test.ts` | `STEP-03` | `none` | duplicate ids cause unsafe plans |
| `STEP-05` | agent | `REQ-03`, `REQ-05` | Write failing disable and restore toggle tests | `test/toggle.test.ts`, `test/mcp-server.test.ts` | RED toggle tests | `CHK-02` | `EVID-02` | `npx vitest run test/toggle.test.ts test/mcp-server.test.ts` | `STEP-04` | `none` | tests would touch real provider roots |
| `STEP-06` | agent | `REQ-03`, `REQ-05` | Implement provider agent toggle planning | `src/providers/claude.ts`, `src/providers/codex.ts`, `src/providers/cursor.ts` | planned rename/create/delete operations | `CHK-02` | `EVID-02` | targeted toggle tests | `STEP-05` | `none` | restore can overwrite live files |
| `STEP-07` | agent | `REQ-06` | Add or update blocked read-only modern surface tests for each fixture-backed family | `test/provider-discovery.test.ts`, `test/mcp-server.test.ts` | blocked boundary assertions | `CHK-01`, `CHK-02` | `EVID-03` | targeted tests | `STEP-06`, `PRE-03` | `none` | a non-agent modern item becomes writable |
| `STEP-08` | agent | `REQ-07` | Update README and memory-bank status language | `README.md`, `PRD-004`, `FT-010/*`, `features/README.md` | documented boundary | `CHK-05` | `EVID-04`, `EVID-05` | doc review and lint | `STEP-07` | `AG-02` if write claims expand | docs overclaim support |
| `STEP-09` | reviewer subagent | all | Run focused code review | current diff | review findings | `CHK-01` through `CHK-06` | `EVID-05` | reviewer report | `STEP-08` | `none` | findings remain open |
| `STEP-10` | agent | all | Run full local verification and record external CI exception | `tools/agentscope`, repo root, protocol | verification output | `CHK-01` through `CHK-07` | `EVID-05` | build, test, lint, `git diff --check`, protocol evidence | `STEP-09` | `none` | any check fails |
| `STEP-11` | agent | all | Record execution evidence and close docs | `protocol.md`, `implementation-plan.md`, `feature.md` | archived execution record | `CHK-05`, `CHK-06` | `EVID-04`, `EVID-05` | doc review and diff check | `STEP-10` | `none` | evidence cannot prove acceptance |
| `STEP-12` | agent | feature slice | Commit one local feature slice | git index | local commit | `CHK-06`, `CHK-07` | `EVID-05` | `git status --short --branch` | `STEP-11`, `PRE-04` | `AG-03` | unrelated files would be staged |

### Task 1: Vault Contract And Discovery TDD

**Files:**
- Modify: `tools/agentscope/test/provider-discovery.test.ts`
- Modify after RED: `tools/agentscope/src/core/mutation-vault.ts`
- Modify after RED: `tools/agentscope/src/providers/claude.ts`
- Modify after RED: `tools/agentscope/src/providers/codex.ts`
- Modify after RED: `tools/agentscope/src/providers/cursor.ts`

- [ ] **Step 1: Write failing discovery tests**

Add tests that create `agent` vault entries through `vaultDescriptor({ kind: "agent" })`, expect the TypeScript compile to accept the call, and assert disabled agent inventory for each provider:

```ts
expect(disabledAgent).toMatchObject({
  kind: "agent",
  category: "agent",
  enabled: false,
  mutability: "read-write",
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd tools/agentscope && npx vitest run test/provider-discovery.test.ts`

Expected: FAIL because `VaultEntryKind` does not include `agent` and providers do not load vaulted agent entries.

- [ ] **Step 3: Implement minimal discovery support**

Add `agent` to `VaultEntryKind` validation and provider vault loading. Live agent items become `mutability: "read-write"`. Vaulted agent entries become disabled read-write items when no live item has the same id.

- [ ] **Step 4: Run provider discovery tests**

Run: `cd tools/agentscope && npx vitest run test/provider-discovery.test.ts`

Expected: PASS for live and vaulted agent discovery.

### Task 2: Agent Toggle TDD

**Files:**
- Modify: `tools/agentscope/test/toggle.test.ts`
- Modify: `tools/agentscope/test/mcp-server.test.ts`
- Modify after RED: `tools/agentscope/src/providers/claude.ts`
- Modify after RED: `tools/agentscope/src/providers/codex.ts`
- Modify after RED: `tools/agentscope/src/providers/cursor.ts`

- [ ] **Step 1: Write failing disable and restore tests**

Add CLI or provider tests that select one fixture agent per provider, apply the file-vault toggle, rediscover the disabled vaulted item, then apply the restore toggle. Assert the live file path, vault payload path, and vault `entry.json` move through the expected states.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd tools/agentscope && npx vitest run test/toggle.test.ts test/mcp-server.test.ts`

Expected: FAIL because provider `planToggle` functions do not yet handle agent items.

- [ ] **Step 3: Implement minimal toggle planning**

Route `category: "agent"` or `kind: "agent"` to provider-specific file-vault planning. File-vault plans rename the live file into the vault and create a manifest. Restore plans rename the payload back, delete the manifest, and delete the vault directory.

- [ ] **Step 4: Run toggle tests**

Run: `cd tools/agentscope && npx vitest run test/toggle.test.ts test/mcp-server.test.ts`

Expected: PASS for disable, disabled discovery, restore, and read-only boundary assertions.

### Task 3: Boundary, Docs, Review, And Commit

**Files:**
- Modify: `tools/agentscope/README.md`
- Modify: `memory-bank/prd/PRD-004-modern-provider-configuration-surfaces.md`
- Modify: `memory-bank/features/README.md`
- Modify: `memory-bank/features/FT-010/feature.md`
- Modify: `memory-bank/features/FT-010/implementation-plan.md`
- Modify: `memory-bank/features/FT-010/protocol.md`

- [ ] **Step 1: Update docs**

Update the capability matrix and governed docs to say agent files are reversible AgentScope-managed file-vault surfaces. Keep hooks, settings, plugin configs, plugin manifests, permissions, sandbox files, and unsupported tools explicitly blocked.

- [ ] **Step 2: Run verification**

Run:

```bash
cd tools/agentscope && npm run build
cd tools/agentscope && npm test
cd tools/agentscope && npm run lint
git diff --check
```

Expected: all commands pass. Biome schema-version informational output is acceptable only if the command exits 0.

Record the external CI exception in `protocol.md`: push/PR is not approved for this local feature slice, so CI cannot be used as a completion carrier in this run.

- [ ] **Step 3: Run focused review**

Dispatch a code review subagent against the diff. Fix all actionable findings and rerun impacted tests.

- [ ] **Step 4: Close docs and commit**

Set `feature.md` `delivery_status: done`, set `implementation-plan.md` `status: archived`, update `protocol.md` execution evidence, stage only FT-010-related files, and commit:

```bash
git add memory-bank/prd/PRD-004-modern-provider-configuration-surfaces.md memory-bank/features/README.md memory-bank/features/FT-010 tools/agentscope/src tools/agentscope/test tools/agentscope/README.md
git commit -m "feat: toggle provider agent files"
```

Expected: one local feature-slice commit, with unrelated homework changes left unstaged.

## Execution Evidence

| Evidence ID | Result |
| --- | --- |
| `EVID-01` | `cd tools/agentscope && npx vitest run test/provider-discovery.test.ts` passed: 1 file, 29 tests |
| `EVID-02` | `cd tools/agentscope && npx vitest run test/provider-discovery.test.ts test/toggle.test.ts test/mcp-server.test.ts` passed: 3 files, 47 tests |
| `EVID-03` | Blocked assertions cover hooks, provider settings, permissions, sandbox files, plugin config declarations, plugin manifests, and unsupported Cursor extensions |
| `EVID-04` | README, `PROJECT.md`, domain problem statement, PRD-004, feature registry, and FT-010 docs updated |
| `EVID-05` | `npm run build`, `npm test` (23 files, 188 tests), `npm run lint` (exit 0 with existing Biome schema-version info), and `git diff --check` passed locally |
| `EVID-05-CI-EXCEPTION` | External CI was not run because push or PR creation is outside current approval; local-only H2 closure is recorded in `protocol.md` |

Focused reviews:

- Document review subagent `019edb3d-45ac-7133-bbbd-6f3f2000391b` found governance and evidence issues; all were addressed before production implementation.
- Code review subagent `019edb47-2efb-7152-9b91-cbe7b001dff1` found target-enabled and vaulted-payload issues; regressions were added, fixes were implemented, and focused re-review returned no findings.
