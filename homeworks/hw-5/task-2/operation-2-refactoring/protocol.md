---
title: "Operational Protocol: Homework 5 Task 2 Operation 2 Refactoring"
doc_kind: process
doc_function: protocol
purpose: "Operational protocol for running refactoring analysis on tools/agentscope and executing exactly one strongest small high-confidence refactoring recommendation."
derived_from:
  - ../../requirements-en.md
  - ../operation-1-dependency-update/execution-result.md
status: h2_ready
audience: humans_and_agents
protocol_version: "0.1"
current_phase: verification_complete
current_gate: H2
---

# Operational Protocol: `homework-5-task-2-operation-2-refactoring`

## Source Interpretation

Source used:

- User request for Worker C to create the protocol-authoring evidence package for Homework 5 Task 2 operation 2.
- `homeworks/hw-5/task-2/requirements-en.md`
- `homeworks/hw-5/task-2/operation-1-dependency-update/execution-result.md`
- Active operational protocol rules in `memory-bank/flows/agent-process-operations.md`
- Local operational protocol template in `memory-bank/flows/templates/protocol/operational-protocol.md`

English interpretation:

- Operation 2 is a bounded non-production refactoring operation for `tools/agentscope`.
- The future executor must first analyze the codebase, then choose exactly one small high-confidence recommendation and implement only that recommendation.
- Verification is required, but operation 1's known coverage-threshold failure is baseline risk rather than automatic permission to run a broad coverage remediation.
- The protocol itself is external process state: a future executor must be able to start from this file without chat memory.

Repository adaptation:

- This is an operational protocol, not a feature package and not a lifecycle protocol.
- The implementation target is `tools/agentscope`, whose package scripts are `test`, `lint`, `coverage`, and `build`.
- Repository safety rules apply throughout: do not read or use `.env*` files, prefix shell commands with `rtk`, use fff tools for file search or grep inside the repo, and do not hand-edit generated `dist/`.

## Metadata

- Protocol version: 0.1
- Owner: Human owner
- Work area: `tools/agentscope` application code and tests; evidence under `homeworks/hw-5/task-2/operation-2-refactoring/`
- Created: 2026-05-17
- Last updated: 2026-05-17
- Status: h2_ready
- Current phase: verification_complete
- Current gate: H2

## Goal

Run a focused refactoring analysis on `tools/agentscope`, select exactly one strongest small high-confidence refactoring recommendation, implement only that recommendation, update or add focused tests if needed, and produce verifiable evidence that the operation is complete or blocked.

Target state:

- One small refactoring is selected from explicit analysis and documented before implementation.
- The implementation diff is limited to the selected recommendation plus focused test changes if needed.
- Verification results are recorded, including the known baseline coverage-threshold risk if it persists.
- Execution stops before H2-only commit, staging, or final acceptance actions.

## Scope

In scope:

- Inspecting `tools/agentscope` source and tests for small refactoring opportunities.
- Choosing exactly one small, high-confidence recommendation based on maintainability, duplication reduction, type clarity, or testability.
- Editing only the files necessary to implement that one recommendation.
- Updating or adding focused tests only if needed to preserve or prove behavior.
- Running verification from `tools/agentscope` with:
  - `rtk npm test`
  - `rtk npm run lint`
  - `rtk npm run coverage`
  - `rtk npm run build`
- Updating this operation's execution evidence under `homeworks/hw-5/task-2/operation-2-refactoring/`.

Out of scope:

- Broad codebase cleanup or multiple refactorings.
- Dependency updates or lockfile work.
- Coverage-threshold changes, broad coverage remediation, or CI policy changes unless the analysis independently selects one small coverage-adjacent refactoring as the single recommendation.
- Changes outside `tools/agentscope` and this operation evidence folder, except unavoidable package-generated artifacts are not expected for this operation.
- Editing generated `dist/`.
- Reading or using `.env*` files.
- Staging, committing, pushing, publishing, releasing, or opening pull requests.
- Destructive cleanup of user or repository files.

## Current Facts / Baseline

- `memory-bank/` is the governed documentation system; evidence: `memory-bank/README.md`.
- Operational protocols must include scope, baseline, constraints, roles, permissions, H1/H2/H3 gates, hard stops, verification, rollback, evidence, decisions, open questions, and one next action; evidence: `memory-bank/flows/agent-process-operations.md`.
- The reusable operational template provides the required section shape; evidence: `memory-bank/flows/templates/protocol/operational-protocol.md`.
- Homework 5 Task 2 requires operation 2 to run refactoring analysis on `tools/agentscope` and execute the strongest small refactoring recommendation; evidence: `homeworks/hw-5/task-2/requirements-en.md`.
- `tools/agentscope/package.json` defines Node `>=25.9.0`, ESM package style, and scripts `test`, `lint`, `coverage`, and `build`; evidence: `tools/agentscope/package.json`.
- Operation 1 left a baseline coverage blocker: `rtk npm run coverage` failed because branch coverage was `70.89%` against the configured `71%` threshold, while `rtk npm test`, `rtk npm run lint`, and `rtk npm run build` passed; evidence: `homeworks/hw-5/task-2/operation-1-dependency-update/execution-result.md`.
- Operation 1 changed developer dependency state in `tools/agentscope/package.json` and `tools/agentscope/package-lock.json`; evidence: `homeworks/hw-5/task-2/operation-1-dependency-update/execution-result.md`.
- No refactoring analysis or refactoring implementation has been executed by this protocol-authoring worker.

## Operating Constraints

- Technical: use existing TypeScript, ESM, Vitest, and Biome patterns in `tools/agentscope`; avoid new dependencies.
- Technical: use fff tools for file search or grep inside the repo.
- Technical: prefix shell commands with `rtk`.
- Technical: do not hand-edit `dist/`; generated output is out of scope.
- Security and compliance: do not read or use `.env*` files, secrets, credentials, tokens, or private configuration.
- Production safety: this is a local non-production operation only; no publish, release, deployment, external service mutation, or repository remote mutation is allowed.
- Collaboration safety: do not revert or overwrite edits made by others; inspect current diffs before editing files that may already be changed.

## Roles

| Actor | Role | Allowed actions | Must not do |
| --- | --- | --- | --- |
| Human owner | Decision maker | Approve H2/H3, accept or reject final result, decide whether a baseline coverage blocker is acceptable | Give implicit approval for out-of-scope work |
| Protocol author | Protocol package owner | Draft, review, and polish this protocol under the operation evidence folder | Execute the refactoring |
| Future executor | Refactoring operator | Analyze `tools/agentscope`, select exactly one recommendation, implement it after H1, run verification, update evidence | Implement multiple recommendations, broaden into coverage cleanup, edit unrelated files |
| Agent verifier | Verification owner | Run and record checks, compare results to baseline, identify residual risks | Change implementation while acting only as verifier |

## Permissions

| Tool / action | Risk | Default policy | Notes |
| --- | --- | --- | --- |
| Read governed docs and `tools/agentscope` files | Low | Allowed after H1 | Do not read `.env*` files |
| File search or grep inside repo | Low | Allowed after H1 through fff tools only | Avoid shell grep/find for repo search |
| Run refactoring analysis | Low | Allowed after H1 | Must produce exactly one selected recommendation before editing |
| Edit scoped source and focused test files under `tools/agentscope` | Medium | Allowed after H1 | Only for the selected recommendation |
| Edit operation evidence under this folder | Low | Allowed after H1 | Record execution result and command evidence |
| Run `rtk npm test`, `rtk npm run lint`, `rtk npm run coverage`, `rtk npm run build` from `tools/agentscope` | Medium | Allowed after H1 | Record outputs and baseline comparisons |
| Stage, commit, push, publish, release, deploy, or open PR | High | H2 required | Out of scope for executor unless human explicitly approves later |
| Destructive or irreversible action | Critical | H3 required | Includes deleting files, force operations, or external irreversible effects |

## State

- Status: h2_ready
- Current phase: verification_complete
- Current gate: H2
- Current actor: Future executor
- Next action: human owner H2 acceptance and commit-point review
- Open loops:
  - H2 acceptance and commit-point review remain unapproved.
  - Staging, commit, push, publish, release, and PR actions remain out of scope until H2 approval.
- Rollback mode: revert only the future executor's own scoped edits by applying an inverse patch or using a targeted non-destructive restore after confirming no unrelated edits would be removed.

## Human Gates

### H1: Start execution

Required before:

- Inspecting `tools/agentscope` for refactoring opportunities.
- Selecting one refactoring recommendation.
- Editing scoped `tools/agentscope` source or test files.
- Running verification commands for this operation.

Approval record:

- Approver: Human owner
- Date: 2026-05-17
- Scope approved: Bounded non-production operation to analyze `tools/agentscope`, select exactly one small high-confidence refactoring, implement only that recommendation, update focused tests if needed, and verify with npm checks.
- Conditions: Do not execute broad cleanup, do not read or use `.env*` files, use fff for repo search/grep, prefix shell commands with `rtk`, and stop before H2/H3 actions.

### H2: Acceptance and commit-point review

Required before:

- Treating the operation as accepted despite any remaining failed verification.
- Staging, committing, pushing, publishing, releasing, opening a pull request, or otherwise crossing a commit-point boundary.
- Deciding that operation 1's known coverage-threshold blocker is acceptable for this operation if it still appears after refactoring.

Approval record:

- Approver:
- Date:
- Scope approved:
- Conditions:

### H3: Destructive or irreversible action

Required before:

- Deleting source, test, package, lockfile, generated, or evidence files.
- Force-resetting, force-checking-out, force-pushing, rebasing published work, cleaning untracked files, or running destructive shell commands.
- Mutating external systems, secrets, credentials, production data, or irreversible repository state.

Approval record:

- Approver:
- Date:
- Exact action approved:
- Rollback expectation:

## Hard Stop Conditions

- Any need or request to read, print, copy, modify, or infer secrets or `.env*` content.
- Any need to perform file search or grep inside the repo without fff tools.
- Any command that cannot be prefixed with `rtk` unless the human owner explicitly changes the rule.
- Unclear rollout ownership, commit ownership, release ownership, or production ownership.
- Missing rollback path before a high-risk action.
- Refactoring analysis yields no small high-confidence recommendation.
- More than one recommendation appears necessary to make progress.
- The selected recommendation would require architecture changes, dependency changes, CI changes, generated `dist/` edits, broad test rewrites, or package lockfile changes.
- Existing user edits overlap with the selected implementation files and cannot be safely preserved.
- Verification failure appears unrelated to the selected refactoring and cannot be clearly separated from baseline risk.
- The executor is tempted to turn the operation into a general coverage-threshold fix without analysis selecting that as the one recommendation.

## Execution Plan

### Phase 1: Preflight

- [x] Re-read this `protocol.md`.
- [x] Confirm H1 is approved and H2/H3 are not approved.
- [x] Check current repository status and record only relevant baseline facts.
- [x] Confirm operation 1's coverage-threshold blocker is understood as baseline risk.
- [x] Inspect `tools/agentscope/package.json` to confirm scripts and package constraints.
- [x] Identify current code/test areas for refactoring analysis without editing.

Exit criteria:

- Current baseline is recorded.
- No hard stop condition is active.
- The executor is ready to analyze without changing files.

### Phase 2: Refactoring Analysis And Selection

- [x] Inspect `tools/agentscope` source and tests using fff tools for search/grep when needed.
- [x] List candidate refactoring recommendations with evidence.
- [x] Choose exactly one small high-confidence recommendation.
- [x] Record why the chosen recommendation is stronger than the alternatives.
- [x] Record the expected behavior-preservation and rollback approach before editing.

Exit criteria:

- Exactly one recommendation is selected.
- The selection is small enough to implement and verify in one bounded operation.
- The recommendation does not depend on broad coverage remediation unless that is the selected small refactoring.

### Phase 3: Implementation

- [x] Edit only files needed for the selected recommendation.
- [x] Add or update focused tests only if needed.
- [x] Avoid unrelated formatting, dependency, lockfile, generated `dist/`, CI, or documentation changes.
- [x] Record changed files and rationale in operation evidence.

Exit criteria:

- Diff is limited to the selected recommendation and any focused tests.
- Rollback remains straightforward and scoped.

### Phase 4: Verification And Acceptance

- [x] From `tools/agentscope`, run `rtk npm test`.
- [x] From `tools/agentscope`, run `rtk npm run lint`.
- [x] From `tools/agentscope`, run `rtk npm run coverage`.
- [x] From `tools/agentscope`, run `rtk npm run build`.
- [x] Compare coverage output against operation 1's baseline blocker.
- [x] Record whether failures are caused by the selected refactoring or by the pre-existing coverage threshold.
- [x] Stop for H2 if acceptance, commit-point continuation, or unresolved-baseline acceptance is needed.

Exit criteria:

- Required checks are recorded.
- Acceptance criteria are met or the failure reason is clear.
- Evidence is complete enough for H2 decision.

## Verification

- Required analysis evidence: candidate list, selected recommendation, rejected alternatives, and selection rationale.
- Required diff evidence: changed file list and confirmation that only one recommendation was implemented.
- Required checks from `tools/agentscope`:
  - `rtk npm test`
  - `rtk npm run lint`
  - `rtk npm run coverage`
  - `rtk npm run build`
- Required baseline comparison: if `rtk npm run coverage` still fails at or near `70.89%` branch coverage against `71%`, record it as the known operation 1 blocker unless evidence shows the refactoring caused a new regression.

## Rollback

- Before editing, record the selected files and verify whether they already contain user changes.
- If rollback is needed, revert only the future executor's own edits.
- Prefer an inverse patch for manual changes.
- Do not use broad destructive commands such as full worktree reset or untracked cleanup without H3 approval.
- If user edits overlap with rollback targets, stop and ask the human owner before changing those files.

## What To Update During Execution

After every substantial step, update:

- `State`: phase, gate, actor, and next action.
- `Evidence Log`: verified facts, commands, outputs, changed files, and links to generated evidence.
- `Open Questions`: blockers or required human decisions.
- `Decisions`: selected recommendation, rejected alternatives, and acceptance conditions.
- `Rollback`: actual rollback path if implementation changes risk or touched files.

## Evidence Log

| Time | Actor | Fact / action | Evidence |
| --- | --- | --- | --- |
| 2026-05-17 | Protocol author | Protocol authored from requested operation, active memory-bank operational rules, local template, package scripts, Homework 5 Task 2 requirements, and operation 1 execution result. | `protocol.md`; `initial-prompt.md`; `protocol-review.initial.md`; `protocol-polish.md`; `protocol-review.accepted.md` |
| 2026-05-17 | Protocol author | H1 recorded as approved by the user's current request for a bounded non-production refactoring operation. | User request; `Human Gates` section |
| 2026-05-17 | Protocol author | Operation 1 coverage blocker recorded as baseline risk rather than automatic refactoring scope. | `homeworks/hw-5/task-2/operation-1-dependency-update/execution-result.md` |
| 2026-05-17 18:50 PDT | Future executor | Preflight confirmed H1 approved and H2/H3 unapproved; current status includes unrelated existing changes outside this worker's edit scope plus modified `tools/agentscope/package*.json` from operation 1. | `rtk git status --short`; `tools/agentscope/package.json`; `homeworks/hw-5/task-2/operation-1-dependency-update/execution-result.md` |
| 2026-05-17 18:51 PDT | Future executor | Baseline coverage reproduced operation 1 blocker before implementation: 23 test files and 162 tests passed, branch coverage `70.89%` against threshold `71%`. | `rtk npm run coverage` from `tools/agentscope` |
| 2026-05-17 18:52 PDT | Future executor | Refactoring analysis produced four candidates and selected exactly one: centralize mutation backup manifest fixture setup and add focused manifest-loading tests for sqlite inline-payload and deterministic manifest-order shapes. | `homeworks/hw-5/task-2/operation-2-refactoring/evidence/analysis-candidates.md` |
| 2026-05-17 18:53 PDT | Future executor | Implemented selected recommendation only in `tools/agentscope/test/mutation-state.test.ts`: added `writeBackupManifest`, reused it in existing manifest tests, and added focused sqlite-inline and deterministic manifest-order tests. | `tools/agentscope/test/mutation-state.test.ts` |
| 2026-05-17 18:53 PDT | Future executor | Final verification passed: `rtk npm test` passed 23 files / 164 tests; `rtk npm run lint` passed with three Biome schema-version info messages only; `rtk npm run coverage` passed with branch coverage `71.09%`; `rtk npm run build` passed. | Command outputs recorded in `execution-result.md`; raw coverage output in `evidence/final-coverage.log` |

## Decisions

| Date | Decision | Owner | Reason |
| --- | --- | --- | --- |
| 2026-05-17 | Use an operational protocol rather than lifecycle protocol. | Protocol author | The workflow is already scoped: analyze `tools/agentscope`, select one small refactoring, implement, and verify. |
| 2026-05-17 | Treat H1 as approved by the current user request. | Human owner | The request explicitly approves this bounded non-production operation. |
| 2026-05-17 | Keep H2 as acceptance and commit-point review. | Protocol author | Acceptance, staging, commit, and unresolved baseline-risk decisions require human review. |
| 2026-05-17 | Keep H3 for destructive or irreversible actions. | Protocol author | Destructive operations are out of scope and require explicit approval. |
| 2026-05-17 | Treat operation 1 coverage failure as baseline risk. | Protocol author | Operation 1 verified coverage branch `70.89%` below `71%` even across Vitest versions. |
| 2026-05-17 | Select the mutation-state manifest fixture refactor and focused manifest-loading tests as the one recommendation. | Future executor | It was the smallest high-confidence refactoring/test improvement that stayed in one clean test file, preserved production behavior, and directly addressed the baseline coverage risk. |
| 2026-05-17 | Reject MCP helper identity extraction, production manifest parser helper extraction, and broad CLI coverage work for this operation. | Future executor | They were either less relevant to the verification blocker or more likely to expand beyond one small recommendation. |

## Open Questions

- Does the human owner accept the verified operation and approve any H2 commit-point action? Owner: Human owner; needed by: H2.
- No verification blocker remains: final coverage passed at branch `71.09%`, above the configured `71%` threshold.

## Next Action

Actor: Human owner

Action: Review the completed operation evidence and decide H2 acceptance and any commit-point action.

Stop if: H2 is not approved, acceptance requires more changes, or commit-point actions remain out of scope.
