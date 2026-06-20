---
title: "Protocol: FT-016 Zed Provider Review Follow-Up"
doc_kind: process
doc_function: protocol
purpose: "Operational protocol for resolving closing review findings against FT-015 Zed provider support."
derived_from:
  - ../../flows/agent-process-operations.md
  - ../../flows/workflows.md
  - feature.md
  - implementation-plan.md
status: active
audience: humans_and_agents
protocol_version: "0.1"
current_phase: ci_pending
current_gate: H2
---

# Protocol: `FT-016 Zed Provider Review Follow-Up`

## Source Interpretation

Source used:

- User goal: run `compound-engineering:ce-code-review`, `comprehensive-review`, and `code-review` as closing review subagents, protocol the remaining improvements, then run a memory-bank-compatible follow-up workflow.
- Review artifact root: `/tmp/compound-engineering/ce-code-review/20260620-123511-zed-followup/`.
- Upstream feature: `memory-bank/features/FT-015/feature.md`.
- Official Zed Skills, MCP, and settings documentation checked on 2026-06-20.

Repository adaptation:

- The review follow-up is a new feature slice because FT-015 is already done and pushed.
- The slice addresses concrete review findings only; residual risks about invalid skill names and worktree trust remain non-scope until promoted by a future requirement.
- JSONC write support normalizes to deterministic JSON rather than preserving comments.

## Metadata

- Protocol version: 0.1
- Owner: Igor Arkhipov
- Work area: `/Users/igor.arkhipov/Documents/Work/Ruby/thinknetica/ai-setup`, feature `FT-016`, tool `tools/agentscope`
- Created: 2026-06-20
- Last updated: 2026-06-20
- Status: active
- Current phase: ci_pending
- Current gate: H2

## Goal

Resolve review-driven Zed provider correctness gaps so AgentScope only reports real Zed skill surfaces, includes direct symlinked skills, and can toggle Zed configured MCP entries in JSONC settings files.

## Scope

In scope:

- Restrict Zed skill discovery to direct child skill folders.
- Omit nested Zed skill folders from inventory and toggles.
- Include direct child symlinked Zed skill directories when they resolve to a directory containing `SKILL.md`.
- Allow Zed configured MCP disable/restore operations against JSONC settings files while preserving backup, audit, and drift checks.
- Add regression tests and record verification evidence.

Out of scope:

- Comment-preserving JSONC edits.
- Zed skill frontmatter validation.
- Zed worktree trust-state modeling.
- Zed instruction, profile, model, account, extension, marketplace, or general settings mutation.
- Real local Zed configuration mutation.
- `.env*` reads or fixtures.

## Review Synthesis

| Source | Finding | Disposition |
| --- | --- | --- |
| `compound-engineering:ce-code-review` | Nested Zed skills are reported active and toggleable | Accepted as `REQ-01`, `REQ-02` |
| `code-review` | Nested Zed skills are falsely discovered and toggleable | Accepted as `REQ-01`, `REQ-02` |
| `comprehensive-review` | Nested Zed skills are reported as live writable skills | Accepted as `REQ-01`, `REQ-02` |
| `comprehensive-review` | JSONC Zed settings are discovered read-write but blocked on toggle | Accepted as `REQ-04`, `REQ-05` |
| `comprehensive-review` | Direct symlinked Zed skill directories are skipped | Accepted as `REQ-03` |
| review residual risk | Invalid Zed skill names are not modeled | Deferred as `NS-02` |
| review residual risk | Zed project trust state is not modeled | Deferred as `NS-03` |

## Human Gates

### H1: Approve scoped implementation

Approval record:

- Approver: Igor Arkhipov
- Date: 2026-06-20
- Scope approved: Continue all milestones and run the review follow-up workflow.
- Conditions: Preserve memory-bank workflow, no `.env*` access, one follow-up feature-slice commit.

### H2: Commit and push point

Required before:

- Creating and pushing the FT-016 follow-up commit.
- Treating CI as acceptance evidence.

Required evidence before H2:

- Regression tests fail before implementation for the reviewed behaviors.
- Focused discovery and toggle tests pass after implementation.
- Full local build, test, coverage, lint, and `git diff --check` pass.
- Protocol and feature docs are updated with evidence.

Approval record:

- Approver: Igor Arkhipov
- Date: 2026-06-20
- Scope approved: User has granted approval for all milestones in this workflow.
- Conditions: No release, publication, or real provider configuration mutation.

### H3: Destructive or externally effective action

No H3 actions are expected. Stop if a step requires real user Zed settings mutation, credentials, production access, release, or irreversible state.

## Hard Stop Conditions

Stop and report if:

- any step requires reading, printing, copying, or deriving values from `.env*`;
- implementation requires mutating real local Zed state rather than fixtures or temp sandboxes;
- JSONC mutation cannot remain backup-protected and fail-closed;
- symlink support requires recursive traversal through arbitrary trees;
- the diff expands beyond the FT-016 change surface without explicit approval.

## Execution Plan

| Phase | Plan refs | Action | Gate |
| --- | --- | --- | --- |
| Protocol and docs | `STEP-01` | Create FT-016 package and register it | H1 |
| Regression tests | `STEP-02`, `STEP-03` | Add tests and observe expected failures | H1 |
| Implementation | `STEP-04`, `STEP-05` | Implement discovery and mutation fixes | H1 |
| Verification and handoff | `STEP-06` | Run local gates, update docs, commit, push, watch CI | H2 |

## Verification

| Check ID | Command / procedure | Result |
| --- | --- | --- |
| `CHK-01` | `cd tools/agentscope && npx vitest run test/provider-discovery.test.ts` | pass: 31 tests |
| `CHK-02` | `cd tools/agentscope && npx vitest run test/toggle.test.ts` | pass: 17 tests |
| `CHK-03` | `cd tools/agentscope && npx vitest run test/provider-discovery.test.ts test/toggle.test.ts test/provider-capabilities.test.ts` | pass: 3 files / 71 tests |
| `CHK-04` | `cd tools/agentscope && npm run build && npm test && npm run coverage && npm run lint`; `git diff --check` | pass: build; full tests 25 files / 240 tests; coverage thresholds pass; lint pass with Biome schema info only; diff check pass |
| `CHK-05` | GitHub Actions CI on pushed `main` | pending |

## Recovery

- If a code change fails verification, revert only the FT-016 code change and keep the protocol evidence.
- If JSONC writes prove unsafe, update `feature.md` to mark JSONC write support out of scope and document the read-only fallback before changing behavior.
- If symlink handling is platform-blocked, keep direct-folder and nested-suppression fixes, document the blocker, and leave symlink support as a future feature.

## Execution Record

| Time | Actor | Event | Evidence |
| --- | --- | --- | --- |
| 2026-06-20 | master Codex agent | Created shared review artifacts for `6bee48e..HEAD` | `/tmp/compound-engineering/ce-code-review/20260620-123511-zed-followup/full.diff`, `files.txt`, `stat.txt` |
| 2026-06-20 | Cicero subagent | Ran `compound-engineering:ce-code-review` in report-only mode | found nested Zed skill discovery issue |
| 2026-06-20 | Jason subagent | Ran `code-review` | found nested Zed skill discovery issue; focused tests passed before follow-up |
| 2026-06-20 | Boyle subagent | Ran `comprehensive-review` | found nested skills, JSONC MCP toggle mismatch, and symlinked skill omission |
| 2026-06-20 | master Codex agent | Verified official Zed docs for direct child skills, nested limitation, symlink escape hatch, settings JSONC examples, and `context_servers` MCP configuration | official Zed docs checked live |
| 2026-06-20 | master Codex agent | Created FT-016 governed feature package | `memory-bank/features/FT-016/` |
| 2026-06-20 | master Codex agent | Added failing regression tests before production edits | `test/provider-discovery.test.ts` failed 1 of 31 tests; `test/toggle.test.ts` failed 1 of 17 tests |
| 2026-06-20 | master Codex agent | Implemented direct-child Zed skill discovery, direct symlink support, and JSONC-capable configured MCP mutation | `tools/agentscope/src/providers/zed.ts`, `tools/agentscope/src/core/mutation-io.ts` |
| 2026-06-20 | master Codex agent | Verified focused regression tests | `test/provider-discovery.test.ts` passed 31 tests; `test/toggle.test.ts` passed 17 tests; combined provider slice passed 71 tests |
| 2026-06-20 | master Codex agent | Verified full local gates | build pass; full tests 25 files / 240 tests; coverage pass with 82.74% statements, 72.95% branches, 93.38% functions, 82.64% lines; lint pass with Biome schema info only; `git diff --check` pass |

## Decisions

| Decision ID | Decision | Rationale |
| --- | --- | --- |
| `DEC-01` | Treat nested skill discovery as a correctness fix, not a documentation caveat | AgentScope must not report or toggle surfaces Zed does not load |
| `DEC-02` | Support direct child symlinks without recursion | Zed documents symlinks as the custom-location escape hatch, while direct-only discovery keeps scope bounded |
| `DEC-03` | Parse JSONC for mutation and write deterministic JSON | FT-015 promised writable configured MCP entries; backup and deterministic rewrites are safer than read-only downgrades |

## Open Questions

| Question ID | Question | Current handling |
| --- | --- | --- |
| `OQ-01` | Should JSONC comments be preserved after mutation? | No; non-scope for FT-016 |
| `OQ-02` | Should invalid Zed skill names be hidden? | Deferred residual risk |
| `OQ-03` | Should untrusted project Zed skills be inactive? | Deferred residual risk |

## Next Action

Commit and push the FT-016 feature slice, then watch GitHub Actions CI and record `CHK-05`.
