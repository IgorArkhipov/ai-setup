---
title: "Operational Protocol: Agentscope Plan Memory-Bank Slices"
doc_kind: process
doc_function: protocol
purpose: "Operational protocol for turning tmp/Agentscope Implementation Plan.md into governed memory-bank feature slices, verified implementation work, and one local commit per accepted slice."
derived_from:
  - tmp/Agentscope Implementation Plan.md
  - memory-bank/flows/workflows.md
  - memory-bank/flows/agent-process-operations.md
  - memory-bank/features/README.md
  - memory-bank/features/FT-007/feature.md
  - memory-bank/features/FT-007/implementation-plan.md
  - memory-bank/features/FT-008/feature.md
  - memory-bank/features/FT-008/implementation-plan.md
  - memory-bank/features/FT-008/protocol.md
status: active
audience: humans_and_agents
protocol_version: "0.1"
current_phase: ft_007_ft_008_acceptance_reconciliation
current_gate: H1
---

# Operational Protocol: `Agentscope Plan Memory-Bank Slices`

## Source Interpretation

Source used:

- User request to create the first-draft operational protocol for the current goal.
- `tmp/Agentscope Implementation Plan.md`.
- Active memory-bank workflow and operational protocol rules.
- Current FT-007 and FT-008 feature packages.

English interpretation:

- The current goal is not to re-run a broad lifecycle protocol from nothing. The operation is scoped: audit the current AgentScope plan, docs, and code, identify missing or still-open feature slices, route each slice through the active memory-bank document owners, implement each slice, verify it, and create one local commit per feature slice.
- The initial backlog source is `tmp/Agentscope Implementation Plan.md`; it now states Tasks 1 through 23 are complete and Phase 3 reflects the shipped local MCP control plane.
- The active feature registry still lists FT-007 and FT-008 as `in_progress`, while their implementation plans say the work is implemented locally and ready for acceptance. FT-008's existing protocol is `current_phase: done` and `current_gate: H2`, with push/CI follow-up gated by explicit approval.
- The user's current instruction approves main-branch work and task-scoped local commits after verification, with one commit per feature slice. Push, merge, release, destructive actions, and real provider configuration mutations remain gated.

Repository adaptation:

- This protocol is a durable operational protocol at `.protocols/agentscope-plan-memory-bank-slices/protocol.md`, the default location defined by `memory-bank/flows/agent-process-operations.md`.
- The protocol controls execution permissions, gate handling, evidence, rollback, and subagent handoffs for the current operation. It does not replace PRDs, ADRs, feature documents, or implementation plans.
- Governed document routing follows `memory-bank/flows/workflows.md`: create or update top-level PRD or ADR documents only when the missing owner is initiative-level product framing or a durable architecture decision; create/update feature packages only for concrete delivery slices; create/update `implementation-plan.md` only after the sibling `feature.md` is mature enough.

## Metadata

- Protocol version: 0.1
- Owner: Igor Arkhipov
- Work area: `/Users/igor.arkhipov/Documents/Work/Ruby/thinknetica/ai-setup`
- Operation slug: `agentscope-plan-memory-bank-slices`
- Created: 2026-06-18
- Last updated: 2026-06-18
- Status: escalation
- Current phase: ft_007_ft_008_acceptance_reconciliation
- Current gate: H1

## Goal

Execute the AgentScope plan-to-feature-slices operation safely: use `tmp/Agentscope Implementation Plan.md` as the initial feature-goal source, reconcile it with active memory-bank documents and current code, prepare only the governed documents needed for each valid slice, implement one verified slice at a time, and create exactly one local commit per verified feature slice.

Target state:

- Open or missing AgentScope feature slices are identified from plan, docs, and code rather than assumed from backlog prose alone.
- Each slice has the smallest valid governed owner: PRD, ADR, feature package, and/or implementation plan as permitted by memory-bank routing.
- Each implementation slice is verified with required local checks before a local commit is created.
- Push, merge, release, destructive actions, real provider mutations, and `.env*` use do not occur under this protocol.

## Scope

In scope:

- Audit `tmp/Agentscope Implementation Plan.md`, active memory-bank documents, existing feature packages, and current `tools/agentscope` code/tests.
- Identify missing, incomplete, inconsistent, or acceptance-pending feature slices.
- Create or update PRD, ADR, feature, and implementation-plan documents only where active memory-bank routing permits.
- Use subagents or worker handoffs to divide discovery, document preparation, implementation, review, and verification work.
- Implement one coherent feature slice at a time.
- Run required verification for each slice.
- Create one task-scoped local git commit per verified feature slice on the current branch or main branch when the slice is clean and scoped.
- Update protocol evidence, decisions, open questions, and next action after substantial work.

Out of scope:

- Reading or using `.env*` files.
- Mutating real Claude, Codex, Cursor, or other provider configuration outside fixture or disposable test roots.
- Editing `dist/` by hand.
- Updating feature registries or governed indexes before a document addition, removal, rename, or status change actually requires it.
- Touching `homeworks/hw-5/task-2/execution-summary.md`.
- Bundling multiple feature slices into one commit.
- Push, PR creation, merge, release, package publication, external CI triggering, or production operation without explicit approval.
- Destructive git commands such as `git reset --hard` or `git checkout --`.

## Current Facts / Baseline

- `memory-bank/flows/workflows.md` defines lifecycle protocol-governed feature flow and governed document routing; evidence: required read during protocol drafting.
- `memory-bank/flows/agent-process-operations.md` defines operational protocols and default durable location `.protocols/<operation-slug>/protocol.md`; evidence: required read during protocol drafting.
- `memory-bank/flows/templates/protocol/operational-protocol.md` requires `Status: draft`, `Current phase: ready_to_execute`, `Current gate: H0`, explicit gates, hard stops, verification, rollback, evidence, decisions, open questions, and one next action; evidence: required read during protocol drafting.
- `tmp/Agentscope Implementation Plan.md` states Tasks 1 through 23 are complete and Phase 3 reflects the shipped local MCP control plane; evidence: required read during protocol drafting.
- `memory-bank/features/README.md` still lists FT-007 and FT-008 with delivery status `in_progress`; evidence: required read during protocol drafting.
- `memory-bank/features/FT-007/implementation-plan.md` says FT-007 is implemented locally and ready for acceptance review; evidence: required read during protocol drafting.
- `memory-bank/features/FT-008/implementation-plan.md` says FT-008 is implemented locally and ready for human acceptance; evidence: required read during protocol drafting.
- `memory-bank/features/FT-008/protocol.md` has `current_phase: done` and `current_gate: H2`, and says commit/push/CI follow-up requires explicit H2 approval; evidence: required read during protocol drafting.
- A discovery subagent identified dashboard/TUI as the first missing or superseded slice from `tmp/Agentscope Implementation Plan.md`: the temp plan names `agentscope dashboard`, Ink, React, and `src/ui/*`, while current `tools/agentscope` has no dashboard command, no Ink/React dependencies, no `src/ui`, and `memory-bank/domain/frontend.md` says there is no dashboard code today.
- FT-007 and FT-008 acceptance-status reconciliation remains a separate candidate after the dashboard/TUI routing decision because their implementation summaries say ready for acceptance while the feature registry still says `in_progress`.
- Current pre-draft git status showed `homeworks/hw-5/task-2/execution-summary.md` as the existing dirty file; evidence: `rtk git status --short`.
- `.protocols/agentscope-plan-memory-bank-slices/` is the target durable protocol location. No active `.protocols` index was identified during this draft, so no index update is required for creating this file.

## Operating Constraints

- Do not read or use `.env*` files.
- For file search or grep in this repository, use fff MCP tools rather than shell search tools.
- Prefix shell commands with `rtk`.
- CodeGraph is absent, so no CodeGraph lookup is required.
- Treat active `memory-bank/` documents as authoritative; when documents conflict, apply the upstream ownership rules from repository instructions.
- Use the root `biome.jsonc` and existing TypeScript, ESM, Vitest, and npm conventions under `tools/agentscope`.
- Avoid adding dependencies unless required for a slice.
- Do not hand-edit `dist/`; regenerate it with `npm run build`.
- Work with existing dirty files and other agents' edits; do not revert unrelated changes.
- Preserve fixture-backed tests for provider discovery, CLI, mutation, MCP, workflow runner, and documentation behavior.
- Keep verification separate from acceptance, commit, push, merge, and release.

## Roles

| Actor | Role | Allowed actions | Must not do |
| --- | --- | --- | --- |
| Human owner | decision maker | approve gates, change scope, accept slices, approve push/merge/release/destructive actions | imply approval for external or destructive actions |
| Protocol operator | run coordinator | read protocol state, assign subagents, update evidence, enforce gates, summarize findings | execute beyond current gate or rely on chat memory as durable state |
| Discovery subagent | audit owner | compare plan, docs, code, tests, and current git state; propose feature slices | edit source or commit while auditing |
| Document subagent | governed document owner | create or update PRD, ADR, feature, and implementation-plan documents within memory-bank routing | invent scope, architecture, or acceptance outside the proper owner |
| Implementation subagent | slice implementer | edit scoped code/docs/tests for one feature slice and run focused checks | touch unrelated dirty files, mutate real provider configs, or bundle slices |
| Verification subagent | quality gate owner | run required commands, inspect diffs, verify evidence and acceptance criteria | modify implementation while acting as verifier |
| Commit operator | local commit owner | create exactly one local commit for a verified feature slice | push, merge, release, amend unrelated work, or include another slice |

## Permissions

| Tool / action | Risk | Default policy | Notes |
| --- | --- | --- | --- |
| read repository files | low | allow | except `.env*` |
| file search / grep in repo | low | allow via fff only | do not use shell grep/find/rg for repo file search |
| inspect git status/log/diff | low | allow | prefix shell commands with `rtk` |
| edit `.protocols/agentscope-plan-memory-bank-slices/protocol.md` | low | allow at H0 | protocol drafting and review only |
| create/update governed docs | medium | H1 required | only through memory-bank routing |
| edit `tools/agentscope` source/tests/docs | medium | H1 required | one feature slice at a time |
| run verification commands | medium | H1 required | record results in Evidence Log |
| create local task-scoped commit | medium | conditionally allowed after slice verification | current user instruction approves one local commit per verified feature slice |
| push, PR, merge, release, publish, or external CI operation | high | explicit human approval required | not covered by local commit approval |
| mutate real provider configs | high | explicit human approval required | fixture/temp roots only under this protocol |
| destructive or irreversible action | critical | H3 required | includes destructive git commands |

## State

- Status: escalation
- Current phase: ft_007_ft_008_acceptance_reconciliation
- Current gate: H1
- Current actor: protocol operator
- Next action: Ask the human owner to accept or reject FT-007 and FT-008 for Done-gate closure, and either provide or authorize current CI evidence or explicitly approve the manual gaps before any feature registry or package status is changed.
- Open loops:
  - The protocol review, docs review, review fixes, and final focused re-review completed with no open findings for the prior dashboard/TUI routing slice.
  - The dashboard/TUI slice was routed to the existing secondary-surfaces PRD, domain command-surface docs, and project summary as an explicit deferral: MCP is the first secondary control surface; dashboard/TUI requires a future separate feature package if revived.
  - FT-007 cannot be marked done from current evidence because its package remains `delivery_status: in_progress`, its implementation plan remains `status: active`, and no current external CI evidence or human acceptance approval is recorded in the governed package. Local ShellCheck and workflow checks now pass.
  - FT-008 cannot be marked done from current evidence because its package remains `delivery_status: in_progress`, its implementation plan remains `status: active`, its implementation summary says ready for human acceptance, and its lifecycle protocol explicitly gates commit/push/CI follow-up on H2 approval.
  - Current git baseline is understood: the existing homework summary modification belongs outside this operation, and the operation has three local commits ahead of `origin/main`.
- Rollback mode: source-only revert/edit before push; local commits may be reverted with non-destructive follow-up commits if already created.

## Human Gates

### H1: Start execution

Required before:

- Launching slice discovery or implementation subagents beyond protocol review.
- Creating or updating PRD, ADR, feature, implementation-plan, or source files.
- Running verification commands that may create generated output, caches, coverage, or temp artifacts.
- Starting any implementation work from a discovered slice.

Approval record:

- Approver: User instruction in the source request for this protocol.
- Date: 2026-06-18.
- Scope approved: fully automated post-review execution using subagents; governed document edits; scoped source/test/doc edits; local verification; main-branch work for this operation.
- Conditions: follow active memory-bank routing; one feature slice at a time; one local commit per verified feature slice; no `.env*`; no real provider config mutation; no push, merge, release, publication, destructive git command, or external operation without separate approval.

### H2: Verified local slice commit

Required before:

- Creating a local git commit for a completed feature slice.

Pre-approved condition:

- The user's current instruction approves task-scoped local commits after verification, with one commit per feature slice and main-branch work allowed.

Conditions that must be true before each local commit:

- The commit contains exactly one coherent feature slice.
- Required verification for the slice has passed or any unavailable check is explicitly recorded as a concern.
- `rtk git status --short` has been inspected.
- The existing dirty file `homeworks/hw-5/task-2/execution-summary.md` is not staged or modified by this operation.
- No `.env*`, real provider config mutation, destructive git command, push, merge, release, or publication is included.
- Commit message names the slice value plainly.

Approval record:

- Approver: User instruction in the source request for this protocol.
- Date: 2026-06-18.
- Scope approved: local task-scoped commits, one per verified feature slice, on the current branch or main branch.
- Conditions: verification first; no push/merge/release/destructive actions; no real provider config mutation.

### H3: External, destructive, or irreversible action

Required before:

- Pushing commits or tags.
- Opening a PR if it triggers external workflow the user has not approved.
- Merging, releasing, publishing, or changing package distribution state.
- Deleting user data, real provider configs, non-test backups, branches, or worktrees.
- Running destructive git commands.
- Mutating external systems or provider configurations outside fixtures/temp roots.

Approval record:

- Approver:
- Date:
- Exact action approved:
- Rollback expectation:

## Hard Stop Conditions

Stop immediately and update `State` plus `Evidence Log` if:

- Any step requires reading, printing, copying, inferring, or deriving values from `.env*`.
- A file search or grep is needed in the repository and fff MCP tools are unavailable.
- A command would mutate real provider configs or user home-directory state outside fixture or disposable test roots.
- A proposed edit touches `homeworks/hw-5/task-2/execution-summary.md`.
- A proposed commit would include more than one feature slice or unrelated dirty work.
- A governed document conflict would require changing upstream intent, architecture, or acceptance outside the current slice.
- A PRD, ADR, feature document, or implementation plan would be created outside the memory-bank routing rules.
- Rollout ownership, approval window, or rollback is unclear for any push, release, CI trigger, publication, provider mutation, or external operation.
- A high-risk action lacks rollback or explicit approval.
- Push, merge, release, publish, external CI, or destructive git actions are requested without explicit approval.
- Verification fails and the failure cannot be scoped to the current slice.
- Another agent's concurrent edit makes the current slice unsafe to continue without coordination.

## Execution Plan

### Phase 1: Preflight

- [x] Review this protocol against `.prompts/memory-bank-review-operational-protocol.md`.
- [x] Address review findings in this protocol before execution.
- [x] Confirm current git status with `rtk git status --short`.
- [x] Confirm recent slice history with `rtk git log --oneline -8`.
- [x] Confirm `homeworks/hw-5/task-2/execution-summary.md` remains untouched and unstaged.
- [x] Confirm no `.env*` file is read or used.
- [x] Confirm fff tools are available for repository search/grep.
- [x] Confirm H1 approval before any source or governed-document execution begins.

Exit criteria:

- Protocol review findings are fixed or explicitly deferred.
- Worktree baseline and known dirty files are recorded.
- Gate owner is ready for H1 decision.

### Phase 2: Slice Discovery And Routing

- [x] Audit `tmp/Agentscope Implementation Plan.md` against active memory-bank feature packages and current `tools/agentscope` code/tests.
- [x] Route the discovered dashboard/TUI gap first: decide whether it needs a PRD, ADR, feature package, implementation plan, or an explicit governed decision that the MCP control plane supersedes or defers the dashboard.
- [x] Identify candidate slices as one of: acceptance/status reconciliation, documentation gap, workflow automation gap, product/code feature gap, ADR-needed decision, or PRD-needed initiative.
- [x] For each candidate, decide the smallest governed owner using `memory-bank/flows/workflows.md`.
- [x] Record findings as candidate slices before editing implementation files.
- [x] Stop if the operation needs a broad lifecycle protocol instead of this scoped operational protocol.

Exit criteria:

- The next feature slice is named, scoped, and routed to the correct governed owner.
- Any ambiguous slice has an open question or escalation rather than invented scope.

### Phase 3: Governed Document Preparation

- [x] Create or update PRD documents only when initiative-level framing is missing and multiple downstream features are expected.
- [x] Create or update ADR documents only when a durable architecture or engineering decision blocks or affects multiple components.
- [x] Create or update feature packages only for one delivery unit.
- [x] Create or update `implementation-plan.md` only after the sibling `feature.md` is active and mature enough.
- [x] Update parent indexes only when a governed document is added, removed, renamed, or its registry status changes.
- [x] Keep `.protocols` unindexed unless an active `.protocols` index is discovered.

Exit criteria:

- The slice has the minimum governed documentation required for safe execution.
- Downstream implementation work is not using a plan to invent upstream scope or architecture.

### Phase 4: Slice Implementation And Commit

- [x] Implement only the current routed feature slice.
- [x] Keep production code in `tools/agentscope/src/` and tests in `tools/agentscope/test/` unless the slice is documentation or workflow-only.
- [x] Use fixture or disposable temp roots for any mutation behavior.
- [x] Run focused checks while developing.
- [x] Address docs review findings for the dashboard/TUI routing slice.
- [x] Run required full verification before commit.
- [ ] Inspect `rtk git status --short` and the staged diff.
- [ ] Stage only files belonging to the current feature slice.
- [ ] Create exactly one local commit for the verified slice.
- [ ] Update protocol evidence with commit hash and verification summary.

Exit criteria:

- One verified feature slice is committed locally.
- No unrelated dirty file or second slice is included.
- Push/merge/release remains unperformed unless separately approved.

### Phase 5: Verification And Acceptance

- [x] Run required verification commands for the slice.
- [x] Confirm workflow-script verification is not required because no workflow docs or scripts changed.
- [x] Run `git diff --check`.
- [x] Confirm acceptance criteria from the governing feature or plan.
- [x] Record evidence and any residual concerns.
- [ ] Decide whether to continue to the next slice, wait for human acceptance, or stop.

Exit criteria:

- Verification evidence is complete for the current slice.
- The next action is one concrete step, not an open-ended instruction.

## Verification

Required baseline and slice checks:

- `rtk git status --short`
- `rtk git log --oneline -8`
- `cd tools/agentscope && npm run build`
- `cd tools/agentscope && npm test`
- `cd tools/agentscope && npm run lint`
- `.ai-setup/scripts/test-agent-workflow.sh` when workflow docs or scripts change
- `git diff --check`

Verification rules:

- Prefix shell commands with `rtk` when executing through this environment.
- Run `tools/agentscope` commands from `tools/agentscope`.
- Record pass/fail, unavailable tools, and notable warnings in `Evidence Log`.
- Do not treat a successful command as acceptance if the diff does not match the current slice.
- If verification changes generated files, inspect whether those files belong to the slice before staging.

## Rollback

Before push, rollback is source-only:

- Prefer targeted edits or follow-up revert commits over destructive git commands.
- If a local commit must be undone, use a non-destructive revert commit unless the human explicitly approves another method.
- Remove only test-created temp artifacts under ignored `tmp/`, coverage, cache, or disposable fixture roots when safe.
- Do not touch `.env*` files.
- Do not mutate real provider configs.
- Do not delete or reset another agent's work.

If a dependency or build change fails:

- Revert or edit the slice files back to the previous source state.
- Regenerate lockfiles only when the dependency change remains in scope.
- Record the failing command and error in `Evidence Log`.
- Stop before commit if the slice no longer has a clean verification path.

## What To Update During Execution

After every substantial step, update:

- `State`: phase, gate, actor, next action, and open loops.
- `Evidence Log`: reads, audits, verification commands, commit hashes, and stop reasons.
- `Decisions`: accepted routing, gate, or implementation decisions.
- `Open Questions`: unresolved routing, scope, or approval needs.
- `Rollback`: if risk or actual state changes.

If a governed document changes:

- Update the canonical owner first.
- Sync downstream documents only when needed.
- Update the parent `README.md` only when an index or registry actually changes.

## Evidence Log

| Time | Actor | Fact / action | Evidence |
| --- | --- | --- | --- |
| 2026-06-18 | protocol drafter | Read active operational protocol and workflow docs | `memory-bank/README.md`, `memory-bank/flows/README.md`, `memory-bank/flows/workflows.md`, `memory-bank/flows/agent-process-operations.md`, `memory-bank/flows/templates/README.md`, `memory-bank/flows/templates/protocol/operational-protocol.md` |
| 2026-06-18 | protocol drafter | Read operational protocol prompt guidance | `.prompts/memory-bank-create-operational-protocol.md`, `.prompts/skills/operational-protocol-generation.md` |
| 2026-06-18 | protocol drafter | Confirmed FT-007 and FT-008 registry status mismatch with implementation summaries | `memory-bank/features/README.md`, `memory-bank/features/FT-007/implementation-plan.md`, `memory-bank/features/FT-008/implementation-plan.md` |
| 2026-06-18 | protocol drafter | Confirmed FT-008 lifecycle protocol is done/current gate H2 with follow-up gated | `memory-bank/features/FT-008/protocol.md` |
| 2026-06-18 | protocol drafter | Confirmed backlog source says Tasks 1 through 23 are complete and Phase 3 is shipped | `tmp/Agentscope Implementation Plan.md` |
| 2026-06-18 | protocol drafter | Confirmed existing dirty file to avoid | `rtk git status --short` showed `M homeworks/hw-5/task-2/execution-summary.md` |
| 2026-06-18 | discovery subagent | Identified dashboard/TUI as the first missing or superseded temp-plan slice | Compared `tmp/Agentscope Implementation Plan.md`, `tools/agentscope/package.json`, `tools/agentscope/src/cli.ts`, `tools/agentscope/README.md`, and `memory-bank/domain/frontend.md` |
| 2026-06-18 | review subagent | Reviewed this protocol and found six execution-readiness issues | Findings covered dashboard/TUI baseline, H1 approval, unclear rollout hard stop, stale open questions, compound next action, and resumability |
| 2026-06-18 | protocol operator | Addressed protocol review findings | Added dashboard/TUI baseline and routing next action, populated H1, added rollout hard stop, and resolved stale open questions |
| 2026-06-18 | review subagent | Focused re-review found Phase 1 preflight was not recorded before Phase 2 state | Required either returning to preflight or recording completed preflight evidence |
| 2026-06-18 | protocol operator | Completed and recorded Phase 1 preflight | `rtk git status --short` showed only existing `M homeworks/hw-5/task-2/execution-summary.md` plus untracked `.protocols/`; `rtk git log --oneline -8` confirmed recent protocol commits; fff tools were used for repo search; no `.env*` files were read or used; H1 approval is recorded above |
| 2026-06-18 | review subagent | Final re-review found stale Phase 1 open question about unstaged changes | Required closing the question because the baseline had already been recorded |
| 2026-06-18 | protocol operator | Closed stale unstaged-changes question | Recorded `homeworks/hw-5/task-2/execution-summary.md` as unrelated dirty work and `.protocols/` as the expected protocol artifact |
| 2026-06-18 | routing/document worker | Read required routing sources for dashboard/TUI decision | `.protocols/agentscope-plan-memory-bank-slices/protocol.md`, `memory-bank/README.md`, `memory-bank/flows/workflows.md`, `memory-bank/flows/feature-flow.md`, `memory-bank/flows/templates/README.md`, `memory-bank/features/README.md`, `memory-bank/domain/frontend.md`, `tools/agentscope/README.md`, `tmp/Agentscope Implementation Plan.md`, `memory-bank/prd/README.md`, `memory-bank/adr/README.md`, `memory-bank/flows/templates/adr/ADR-XXX.md` |
| 2026-06-18 | routing/document worker | Confirmed dashboard/TUI plan text is stale against current command surface | `tmp/Agentscope Implementation Plan.md` names `agentscope dashboard`, Ink, React, and `src/ui/*`; `tools/agentscope/package.json`, `tools/agentscope/src/cli.ts`, and `tools/agentscope/README.md` show the current CLI plus `mcp` surface without dashboard dependencies or command registration |
| 2026-06-18 | routing/document worker | Routed dashboard/TUI to the existing secondary-surfaces PRD instead of a new ADR or feature package | `memory-bank/prd/PRD-003-persistent-discovery-snapshots-and-secondary-surfaces.md` now records MCP as the first secondary surface and defers dashboard/TUI until a future separately scoped feature; `memory-bank/domain/frontend.md` and `memory-bank/domain/problem.md` now reflect the current MCP surface |
| 2026-06-18 | routing/document worker | Ran docs-only verification for the dashboard/TUI routing slice | `rtk git diff --check` passed for tracked changes; untracked protocol no-index check produced no whitespace output; `rtk git status --short` still shows unrelated `M homeworks/hw-5/task-2/execution-summary.md` plus scoped doc/protocol changes |
| 2026-06-18 | fix worker | Aligned project summary with current MCP surface and dashboard deferral | `PROJECT.md` now says AgentScope has CLI plus local stdio MCP, while dashboard remains deferred unless future scope revives it |
| 2026-06-18 | fix worker | Held FT-007 and FT-008 routing until the current slice is committed | Protocol state and next action now keep this dashboard/TUI routing slice in verification and commit readiness |
| 2026-06-18 | docs review | Found dashboard/TUI routing review gaps | PRD-003 still described snapshot inventory as currently ephemeral, FT-008 lacked PRD-003 in `derived_from`, the domain index summary omitted the MCP presentation layer, and this protocol lacked review-fix evidence |
| 2026-06-18 | fix worker | Addressed dashboard/TUI routing review gaps | Reframed PRD-003 historically around FT-006 snapshots and MCP-first secondary-surface reuse, added PRD-003 to FT-008 `derived_from`, updated `memory-bank/domain/README.md`, and recorded these fixes in this protocol |
| 2026-06-18 | protocol operator | Ran final full local verification for the dashboard/TUI routing slice | `rtk npm run build` passed; `rtk npm test` passed with 23 files and 174 tests; `rtk npm run lint` passed with the existing Biome schema-version info; `rtk git diff --check` passed |
| 2026-06-18 | final docs review | Re-reviewed the dashboard/TUI routing slice after fixes | 0 issues; residual risk limited to doc/protocol consistency review scope |
| 2026-06-18 | routing/document worker | Read required FT-007/FT-008 reconciliation sources and recent git state | `.protocols/agentscope-plan-memory-bank-slices/protocol.md`, `memory-bank/README.md`, `memory-bank/flows/workflows.md`, `memory-bank/flows/feature-flow.md`, `memory-bank/features/README.md`, `memory-bank/features/FT-007/{README.md,feature.md,implementation-plan.md}`, `memory-bank/features/FT-008/{README.md,feature.md,implementation-plan.md,protocol.md}`, `memory-bank/prd/PRD-003-persistent-discovery-snapshots-and-secondary-surfaces.md`, `rtk git status --short`, `rtk git log --oneline -8` |
| 2026-06-18 | routing/document worker | Evaluated FT-007 against feature-flow Done gates | Not safe to close: feature registry and `feature.md` still say `in_progress`; `implementation-plan.md` still says `status: active`; execution summary says ready for acceptance review, not accepted; local ShellCheck is unavailable; no current CI evidence is recorded |
| 2026-06-18 | routing/document worker | Evaluated FT-008 against feature-flow Done gates and downstream PRD status | Not safe to close: feature registry and `feature.md` still say `in_progress`; `implementation-plan.md` still says `status: active`; execution summary says ready for human acceptance; FT-008 protocol is `current_phase: done` / `current_gate: H2` but still gates commit/push/CI follow-up on explicit H2 approval; PRD-003 still lists FT-008 as `in_progress` |
| 2026-06-18 | routing/document worker | Left governed feature docs and indexes unchanged and escalated closure decision | No FT-007/FT-008 status or archive changes were made because Done-gate evidence is insufficient without human acceptance and current CI/manual-gap approval |
| 2026-06-18 | protocol operator | Gathered current local closure evidence after escalation | `rtk .ai-setup/scripts/test-agent-workflow.sh` passed; `rtk .ai-setup/scripts/test-ci.sh` passed; `rtk npm run build`, `rtk npm test`, and `rtk npm run lint` passed under `tools/agentscope`; lint reported only the existing Biome schema-version info |
| 2026-06-18 | protocol operator | Confirmed shell script local checks now pass | `rtk shellcheck init.sh .ai-setup/scripts/*.sh`, `rtk shfmt -d init.sh .ai-setup/scripts/*.sh`, `rtk make -C .ai-setup check-task-session`, and `rtk make -C .ai-setup check-agent-workflow` all exited 0 |
| 2026-06-18 | protocol operator | Checked external CI availability without push or external mutation | Branch `main` was ahead of `origin/main` by 2 commits at the time of the check; `rtk gh run list --commit 0fb67ef --limit 5` returned no runs for that local head; recent remote `gh run list --limit 5` entries were failing CI runs |
| 2026-06-18 | commit operator | Created the local operation commits permitted by H2 local-commit conditions | `3ef8cc6 docs: route dashboard surface through mcp`; `0fb67ef docs: record feature closure gate`; `af0a749 docs: record local closure evidence` |
| 2026-06-18 | protocol operator | Rechecked current branch state after the local commits | `rtk git status --short --branch` showed `main...origin/main [ahead 3]` and only unrelated `M homeworks/hw-5/task-2/execution-summary.md` |
| 2026-06-18 | review subagent | Fresh gate review found no legitimate non-gated local work that would materially advance closure | Subagent `019ed967-24ae-7122-ab9f-6188c7d79f1f` confirmed FT-007/FT-008 closure still requires explicit human acceptance and current CI evidence, manual-gap approval, or H3 approval to push/trigger CI |

## Decisions

| Date | Decision | Owner | Reason |
| --- | --- | --- | --- |
| 2026-06-18 | Use an operational protocol rather than a lifecycle protocol | Protocol drafter | The operation is already scoped to auditing, routing, implementing, verifying, and committing feature slices from the existing plan and memory-bank state. |
| 2026-06-18 | Store this protocol at `.protocols/agentscope-plan-memory-bank-slices/protocol.md` | Protocol drafter | Active process docs define `.protocols/<operation-slug>/protocol.md` as the default durable location for operational protocols. |
| 2026-06-18 | Treat current user instruction as conditional approval for local slice commits | Human owner | The request explicitly says one commit equals one feature slice and main branch work is allowed, while push/merge/release/destructive actions remain gated. |
| 2026-06-18 | Do not update indexes for this draft | Protocol drafter | `.protocols` is the default durable protocol location and no active index for `.protocols` was discovered. |
| 2026-06-18 | Route dashboard/TUI before FT-007/FT-008 closure reconciliation | Protocol operator | Current audit found dashboard/TUI is the first missing or superseded temp-plan slice; closure reconciliation is real but secondary. |
| 2026-06-18 | Use subagent handoffs for discovery, protocol review, routing, implementation, and verification | Human owner / protocol operator | The user explicitly asked to divide workflow stages by subagent and keep the main agent as orchestrator. |
| 2026-06-18 | Treat current dirty baseline as understood before routing | Protocol operator | `homeworks/hw-5/task-2/execution-summary.md` is pre-existing unrelated work; untracked `.protocols/` is the current operation artifact. |
| 2026-06-18 | Route dashboard/TUI gap to PRD-003 and domain command-surface docs | Routing/document worker | The stale dashboard/TUI plan text is product sequencing for secondary surfaces. PRD-003 already owns secondary-surface intent, while no architecture decision blocks implementation and no mature dashboard delivery slice exists. |
| 2026-06-18 | Do not create ADR-001 for MCP before dashboard | Routing/document worker | Existing docs already require secondary surfaces to be thin adapters over the same core; the current decision is to defer a product surface, not to choose between unresolved architecture options. |
| 2026-06-18 | Do not create a dashboard/TUI feature package in this operation | Routing/document worker | The current evidence does not define dashboard users, workflows, acceptance criteria, or implementation need beyond stale backlog text, and the shipped MCP control plane covers the secondary agent-facing surface goal. |
| 2026-06-18 | Update `PROJECT.md` as part of the dashboard/TUI routing slice | Fix worker | The project summary is a top-level source document for `memory-bank/domain/problem.md` and must not contradict the current CLI plus local stdio MCP surface. |
| 2026-06-18 | Hold FT-007 and FT-008 status reconciliation until after this local commit | Fix worker | The protocol should keep the current docs-only dashboard/TUI slice in verification and commit readiness rather than starting the next candidate slice prematurely. |
| 2026-06-18 | Treat PRD-003 as the upstream owner for FT-008 secondary-surface scope | Fix worker | PRD-003 owns the persisted snapshot and secondary-surface initiative, and FT-008 is the MCP-first downstream feature that reuses FT-006's snapshot foundation while dashboard/TUI remains deferred. |
| 2026-06-18 | Do not mark FT-007 or FT-008 done without explicit acceptance or current external CI evidence | Routing/document worker / protocol operator | Feature-flow Done requires acceptance, complete evidence, local and CI green checks, manual-gap approval, `delivery_status: done`, and archived implementation plans. Current local evidence is now green, but the local head has no external CI run because push is not approved. |

## Open Questions

- `OQ-FT007-ACCEPT` Should the human owner accept FT-007 based on current green local checks, or should a current external CI run provide that evidence first? Owner: human owner; needed before any FT-007 `delivery_status: done` or plan archive update.
- `OQ-FT008-ACCEPT` Should the human owner accept FT-008 based on current green local checks and approve H2 follow-up evidence for external CI, or keep it open for further review? Owner: human owner; needed before any FT-008 `delivery_status: done`, PRD downstream status update, or plan archive update.

## Next Action

Actor: human owner

Action: Decide FT-007 and FT-008 acceptance explicitly. If accepting either feature on local evidence, approve the external-CI gap or authorize push/CI evidence; then a follow-up routing/document worker may update `feature.md`, `implementation-plan.md`, `memory-bank/features/README.md`, and PRD downstream status as one scoped closure slice.

Stop if: acceptance is not explicit, current CI evidence is unavailable, manual-only gaps are not approved, or closure would require push/merge/release/external operations outside the approved scope.
