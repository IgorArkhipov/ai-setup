---
title: "FT-016: Zed Provider Review Follow-Up"
doc_kind: feature
doc_function: canonical
purpose: "Canonical feature document for resolving closing review findings against FT-015 Zed provider support."
derived_from:
  - ../../prd/PRD-004-modern-provider-configuration-surfaces.md
  - ../../flows/workflows.md
  - ../../flows/feature-flow.md
  - ../FT-015/feature.md
  - protocol.md
status: active
delivery_status: in_progress
audience: humans_and_agents
must_not_define:
  - implementation_sequence
---

# FT-016: Zed Provider Review Follow-Up

## What

### Problem

The closing review passes for FT-015 found that the Zed provider can overstate or understate Zed's real managed surface in three narrow cases: nested skill folders are recursively discovered even though Zed only loads direct child skills, direct symlinked skill folders are skipped even though Zed documents symlinks as the escape hatch for alternate skill locations, and JSONC Zed settings are discovered as read-write configured MCPs while toggle planning blocks writes.

### Source Evidence

Evidence checked on 2026-06-20:

- Official Zed Skills documentation says global skills live under `~/.agents/skills/`, project skills live under `<worktree>/.agents/skills/`, each skill is a direct child of the skills root, and nested skill folders are not discovered.
- The same Zed Skills documentation says custom search paths are not supported and a symlink should be used when a skill needs to point at another location.
- Official Zed MCP documentation configures custom MCP servers through `context_servers` in Zed settings.
- Official Zed settings reference examples show settings files may contain comments, so AgentScope must not discover a writable item that always fails on common JSONC-shaped settings.

### Scope

- `REQ-01` Restrict Zed skill discovery to immediate children of `~/.agents/skills/` and `<worktree>/.agents/skills/`.
- `REQ-02` Omit nested `SKILL.md` files from Zed inventory and toggles.
- `REQ-03` Discover direct child symlinks that resolve to directories containing `SKILL.md` as Zed skills.
- `REQ-04` Allow Zed configured MCP disable and restore operations to plan and apply against settings files that parse as JSONC.
- `REQ-05` Keep JSONC mutation fail-closed on malformed files, wrong `context_servers` shapes, missing live entries, and live restore conflicts.
- `REQ-06` Record review findings, implemented fixes, and verification evidence in the governed workflow artifacts.

### Non-Scope

- `NS-01` No preservation of comments or original formatting after AgentScope writes a JSONC settings file; writes may normalize to deterministic JSON.
- `NS-02` No validation of Zed skill frontmatter names beyond the existing display-name fallback.
- `NS-03` No modeling of Zed worktree trust state for project-local skills.
- `NS-04` No mutation of Zed instruction files, profiles, models, accounts, extensions, or general settings outside selected `context_servers` entries.
- `NS-05` No real local Zed configuration mutation and no `.env*` reads, copies, fixtures, or derived values.

### Constraints / Assumptions

- `CON-01` Zed skill toggles continue to use AgentScope path-vault operations.
- `CON-02` Zed configured MCP toggles continue to use JSON object-entry mutation operations, backup, audit, and source-fingerprint drift checks.
- `CON-03` JSONC support is parsing support for safe deterministic rewrites; it is not a formatter-preserving editor.
- `CON-04` Direct symlink support must not recurse through arbitrary nested trees during discovery.

## How

### Solution

Update Zed skill discovery to inspect only direct children of each skills root, accepting real directories and direct symlinks that resolve to directories with `SKILL.md`. Reuse the existing JSONC parser behavior for toggle planning and extend mutation application so JSON object operations can parse JSONC before writing deterministic JSON.

### Change Surface

| Surface | Type | Why it changes |
| --- | --- | --- |
| `tools/agentscope/src/providers/zed.ts` | code | Align Zed skill discovery and configured MCP planning with review findings |
| `tools/agentscope/src/core/mutation-io.ts` | code | Let JSON object-entry mutation operations parse JSONC before deterministic rewrite |
| `tools/agentscope/test/provider-discovery.test.ts` | tests | Cover direct-only Zed skill discovery and symlinked skill directories |
| `tools/agentscope/test/toggle.test.ts` | tests | Cover JSONC Zed configured MCP disable and restore |
| `memory-bank/features/FT-016/` | docs | Record protocol, feature intent, implementation plan, and evidence |
| `memory-bank/features/README.md` | docs | Register FT-016 |

## Verify

### Exit Criteria

- `EC-01` Nested Zed `SKILL.md` paths are not discovered or toggleable.
- `EC-02` Direct symlinked Zed skill directories are discovered with stable skill ids and read-write mutability.
- `EC-03` Zed configured MCP entries in JSONC settings files can be disabled and restored through the existing mutation engine.
- `EC-04` Malformed settings and unsafe restore conflicts still block before writes.
- `EC-05` Review findings, local verification, and CI evidence are recorded.

### Acceptance Scenarios

| Scenario ID | Covers | Given | When | Then |
| --- | --- | --- | --- | --- |
| `SC-01` | `REQ-01`, `REQ-02` | a nested `.agents/skills/group/my-skill/SKILL.md` exists | AgentScope discovers Zed inventory | no `zed:*:skill:group/my-skill` item appears |
| `SC-02` | `REQ-03` | a direct `.agents/skills/linked-skill` symlink resolves to a directory containing `SKILL.md` | AgentScope discovers Zed inventory | `zed:*:skill:linked-skill` appears as a read-write skill |
| `SC-03` | `REQ-04`, `REQ-05` | a Zed settings file contains comments, trailing commas, and a `context_servers.github` entry | AgentScope applies disable and restore toggles | the selected entry is removed/restored with vault backup and deterministic JSON output |
| `SC-04` | `REQ-05` | malformed settings, invalid `context_servers`, or live restore conflicts exist | AgentScope plans a toggle | planning blocks with no writes |

### Checks

| Check ID | Covers | How to check | Expected result |
| --- | --- | --- | --- |
| `CHK-01` | `EC-01`, `EC-02` | `cd tools/agentscope && npx vitest run test/provider-discovery.test.ts` | Zed discovery regression tests pass |
| `CHK-02` | `EC-03`, `EC-04` | `cd tools/agentscope && npx vitest run test/toggle.test.ts` | Zed toggle regression tests pass |
| `CHK-03` | `EC-01` through `EC-04` | `cd tools/agentscope && npx vitest run test/provider-discovery.test.ts test/toggle.test.ts test/provider-capabilities.test.ts` | focused provider/toggle tests pass |
| `CHK-04` | `EC-05` | `cd tools/agentscope && npm run build && npm test && npm run coverage && npm run lint`; `git diff --check` | full local verification passes |
| `CHK-05` | `EC-05` | GitHub Actions CI on pushed `main` | all jobs pass |

### Evidence

| Evidence ID | Artifact | Producer | Path contract |
| --- | --- | --- | --- |
| `EVID-01` | Review pass outputs | code-review agents | `/tmp/compound-engineering/ce-code-review/20260620-123511-zed-followup/` and protocol execution record |
| `EVID-02` | Focused discovery test output | test runner | terminal output from `CHK-01` |
| `EVID-03` | Focused toggle test output | test runner | terminal output from `CHK-02` |
| `EVID-04` | Full local verification output | local verifier | terminal output from `CHK-04` |
| `EVID-05` | CI run | GitHub Actions | run id recorded in `protocol.md` |
