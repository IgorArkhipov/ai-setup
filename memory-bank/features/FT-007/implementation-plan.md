---
title: "FT-007: Implementation Plan"
doc_kind: feature
doc_function: derived
purpose: "Execution plan for FT-007. Records discovery context, steps, risks, and test strategy without redefining canonical workflow-runner scope."
derived_from:
  - feature.md
status: active
audience: humans_and_agents
must_not_define:
  - ft_007_scope
  - ft_007_architecture
  - ft_007_acceptance_criteria
  - ft_007_blocker_state
---

# Implementation Plan

## Goal Of This Plan

Build the first non-interactive `.ai-setup` workflow-runner slice for FT-007: a route-first governed-document pipeline with timestamped run state, reusable stage definitions, mandatory review-loop transitions, dry-run/status/resume support, and verification that it does not modify `tools/agentscope`.

## Current State / Reference Points

| Path / module | Current role | Why relevant | Reuse / mirror |
| --- | --- | --- | --- |
| `feature.md` | Canonical FT-007 scope, contracts, exit criteria, and non-scope | This plan must stay derived from `REQ-*`, `CTR-*`, `CHK-*`, and `EVID-*` instead of redefining workflow-runner semantics | Reference canonical IDs in every workstream and step |
| `.ai-setup/scripts/start-dev-task.sh` | Existing low-level worktree, init, prompt materialization, Codex, and Zellij launcher | The new runner should reuse its worktree and tool-resolution ideas while staying a dedicated orchestrator | Mirror `slugify`, worktree ignore guard, route-file lookup, and dry-run JSON style where useful |
| `.ai-setup/task-router.json` | Current task-session route table for `impl`, `debug`, `research`, `review`, and `spec` | FT-007 introduces workflow/stage config rather than replacing this route table in the first slice | Keep current task-session behavior compatible; avoid breaking `make check-task-session` |
| `.ai-setup/scripts/test-task-session.sh` | Existing static check for task-session route config and launcher dry-run | New workflow validation can live in a sibling script and be called from this check or a new make target | Reuse simple `jq -e` and shell smoke-test style |
| `.ai-setup/scripts/test-ci.sh` | Bootstrap CI smoke check invoked by the `smoke-bootstrap` job | Workflow-runner validation should join the repo-owned smoke path once stable | Add `make check-agent-workflow` or the script directly here when the runner check is deterministic |
| `.github/workflows/ci.yml` | Runs shell formatting, ShellCheck, AgentScope build/test, and bootstrap smoke jobs | New shell scripts must pass existing shell linting; CI smoke may need to call the new workflow check | Preserve existing jobs unless workflow-runner validation needs a small smoke-step addition |
| `.prompts/README.md` and `.prompts/memory-bank-*.md` | Prompt catalog for priming, routing, generating, reviewing, and second-opinion review | Stage definitions should reference these prompt-chain files instead of embedding prompt prose into the runner | Use prompt paths as config inputs and verify they exist |
| `memory-bank/flows/workflows.md` | Canonical task routing, document-owner selection, and review discipline | The route-first pipeline must honor smallest-document routing and artifact-review-polish loops | Use as the governing rule for route and review stages |
| `memory-bank/flows/feature-flow.md` | Feature lifecycle, Design Ready and Plan Ready gates, stable identifiers, and traceability rules | The runner must understand hard gates and output checks without creating downstream artifacts too early | Use gate names and stable IDs in stage prompts and result contracts |
| `memory-bank/ops/runbooks/zellij-task-sessions.md` | Existing operational documentation for neighboring task sessions | The new runner needs a separate runbook while preserving the existing Zellij runbook | Link to existing launcher where interactive follow-up remains outside slice 1 |
| `.gitignore` | Ignores `.worktrees/`, `tmp`, and `.env.*` | Confirms run state and worktrees stay non-governed and untracked | Store `tmp/agent-workflows/<run-id>/` under ignored `tmp` |

## Test Strategy

| Test surface | Canonical refs | Existing coverage | Planned automated coverage | Required local suites / commands | Required CI suites / jobs | Manual-only gap / justification | Manual-only approval ref |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Workflow and stage config validation | `REQ-02`, `REQ-03`, `REQ-07`, `REQ-08`, `SC-02`, `SC-03`, `SC-06`, `NEG-02`, `CHK-01` | No workflow-runner config exists | Add `.ai-setup/scripts/test-agent-workflow.sh` assertions that every workflow stage resolves, every prompt path exists, every model/agent is allowed, and no `.env*` prompt path is accepted | `make check-agent-workflow`, `make check-task-session` | `smoke-bootstrap` via `.ai-setup/scripts/test-ci.sh` after the check is wired in | Claude MCP execution remains modeled only; availability is not automated in slice 1 | `AG-01` |
| Run id, start/status/resume, and manifest handling | `REQ-01`, `REQ-04`, `REQ-05`, `SC-01`, `SC-04`, `NEG-03`, `CHK-02` | `start-dev-task.sh --dry-run` emits route JSON only | Add dry-run tests against a disposable `tmp` root that derive `YYYY-MM-DD-HHMM-<slug>`, write valid `run.json`, report status, and reject malformed resume state | `make check-agent-workflow` | `smoke-bootstrap` via `.ai-setup/scripts/test-ci.sh` after the check is wired in | none | `none` |
| Review-loop transitions | `REQ-06`, `SC-05`, `NEG-01`, `CHK-03` | Review behavior exists only in prompt docs | Add fixture stage-result files for `accepted`, `needs_polish`, `needs_upstream`, `blocked`, `needs_human`, and `failed`; assert next action and stop reason | `make check-agent-workflow` | `smoke-bootstrap` via `.ai-setup/scripts/test-ci.sh` after the check is wired in | none | `none` |
| Existing task-session compatibility | `REQ-01`, `REQ-08`, `EC-02`, `CHK-04` | `make check-task-session` passes | Keep `make check-task-session` green after adding runner files and any launcher safety fixes | `make check-task-session` | Existing shell lint job plus `smoke-bootstrap` when `.ai-setup/scripts/test-ci.sh` calls task-session or workflow checks | none | `none` |
| Runbook and user-facing command docs | `REQ-01`, `REQ-02`, `REQ-05`, `EC-01`, `EC-04` | Zellij task-session runbook exists | Add an Agent Workflow Runner runbook plus index entries documenting start, status, resume, stop states, and cleanup | Markdown review plus `make check-agent-workflow` where docs are referenced by config or tests | none unless markdown lint is added later | Manual doc review is acceptable because these are operator instructions | `AG-02` |

## Open Questions / Ambiguities

| Open Question ID | Question | Why unresolved | Blocks | Default action / escalation owner |
| --- | --- | --- | --- | --- |
| `OQ-01` | Should `run-agent-workflow.sh start` create a real worktree by default, or should the first implementation default to dry-run until `--apply` is passed? | Existing `start-dev-task.sh` creates worktrees directly, but the new runner has more state and should be cheap to test safely | `STEP-03`, `STEP-05` | Default to dry-run for tests and add explicit `--apply` for real worktree creation unless user chooses otherwise during implementation |
| `OQ-02` | Should the workflow runner call `start-dev-task.sh` for worktree creation or share a small shell helper? | Calling the launcher may also imply Zellij behavior, while copying functions creates drift | `STEP-03` | Extract or duplicate only minimal safe helpers inside the new runner for slice 1; consider shared helper after tests exist |
| `OQ-03` | What exact Codex non-interactive command form should the stage executor use? | The current launcher uses `codex --cd ... --model ... --no-alt-screen "$prompt"` for an interactive-like invocation | `STEP-06` | Implement executor behind a dry-runable function and validate command composition first; run live Codex only after user approval |

## Environment Contract

| Area | Contract | Used by | Failure symptom |
| --- | --- | --- | --- |
| setup | Work from repository root; use `bash`, `jq`, `git`, `date`, `sed`, `mkdir`, and existing `.ai-setup` scripts; do not require Node dependencies for runner checks | `STEP-01` through `STEP-08` | Workflow validation fails on a fresh bootstrap even when `make check-task-session` passes |
| test | `make check-agent-workflow` is the canonical new check; `make check-task-session` must remain green | `CHK-01`, `CHK-02`, `CHK-03`, `CHK-04` | Runner behavior changes without a shell-level regression catching it |
| access / network / secrets | No network or secrets are needed; `.env*` paths are rejected before reading; Claude MCP execution is not automated in slice 1 | all steps | A test or runner path reads `.env*`, requires auth, or treats missing Claude as passed |
| filesystem | Real run state belongs under ignored `tmp/agent-workflows/<run-id>/`; worktrees belong under ignored `.worktrees/<run-id>`; tests use disposable temp roots | `STEP-03` through `STEP-07` | Tests dirty governed docs or create tracked runtime artifacts |
| agent execution | Codex stage execution is configured but must be dry-runable; stage completion depends on declared outputs and result status, not exit code alone | `STEP-06`, `STEP-07` | A stage advances after exit 0 with missing artifact or missing status |

## Preconditions

| Precondition ID | Canonical ref | Required state | Used by steps | Blocks start |
| --- | --- | --- | --- | --- |
| `PRE-01` | `REQ-01`, `NS-01`, `ASM-01` | All runner work stays under `.ai-setup`, `.prompts`, `memory-bank`, `tmp`, or `.worktrees`; no `tools/agentscope` source changes are part of this feature | all steps | yes |
| `PRE-02` | `CON-01`, `REQ-08`, `NEG-02` | `.env*` rejection is implemented before prompt-file or stage-input file reading expands | `STEP-02`, `STEP-04`, `STEP-06` | yes |
| `PRE-03` | `CON-02`, `REQ-06`, `CTR-04` | Stage result parsing and known status vocabulary are defined before the runner can advance between stages | `STEP-04`, `STEP-06`, `STEP-07` | yes |
| `PRE-04` | `OQ-01` | Worktree creation behavior is explicit as dry-run or apply before live start mode is treated as safe | `STEP-03`, `STEP-05` | yes |

## Workstreams

| Workstream | Implements | Result | Owner | Dependencies |
| --- | --- | --- | --- | --- |
| `WS-01` | `REQ-01`, `REQ-04`, `REQ-05` | Runner command skeleton, run-id derivation, manifest creation, status, and resume validation | agent | `PRE-01`, `PRE-04` |
| `WS-02` | `REQ-02`, `REQ-03`, `REQ-07`, `REQ-08` | Declarative route-first workflow and reusable route/draft/review/polish stage configs | agent | `PRE-02` |
| `WS-03` | `REQ-06` | Stage-result parser and transition engine for accepted, polish, upstream, blocked, human, and failed statuses | agent | `PRE-03` |
| `WS-04` | `REQ-07` | Dry-runable non-interactive Codex stage executor that composes prompt chains and output contracts | agent | `WS-01`, `WS-02`, `WS-03`, `OQ-03` |
| `WS-05` | `REQ-01`, `REQ-08` | Runbook, Makefile target, and compatibility checks that keep task-session workflow intact | agent | `WS-01`, `WS-02`, `WS-03` |

## Approval Gates

| Approval Gate ID | Trigger | Applies to | Why approval is required | Approver / evidence |
| --- | --- | --- | --- | --- |
| `AG-01` | A workflow config requires Claude Code MCP second-opinion execution in slice 1 | `STEP-04`, `STEP-06` | FT-007 explicitly defers Claude MCP automation; missing Claude must not be silently marked as passed | Human approves modeling the checkpoint as `needs_human`, `blocked`, or pending in the run state |
| `AG-02` | Operator docs describe live worktree creation, live Codex execution, or cleanup behavior not covered by automated tests | `STEP-08`, `STEP-09` | Runbooks can cause real branch/worktree changes; docs must not overpromise beyond tested behavior | Human or reviewer confirms wording before Plan Ready |
| `AG-03` | Implementation chooses a Node orchestrator instead of Bash plus `jq` | `STEP-02` through `STEP-07` | `DEC-01` prefers Bash initially; changing the toolchain could affect setup assumptions | Human approval captured in plan execution notes |

## Work Sequence

| Step ID | Actor | Implements | Goal | Touchpoints | Artifact | Verifies | Evidence IDs | Check command / procedure | Blocked by | Needs approval | Escalate if |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `STEP-01` | agent | `REQ-01`, `REQ-04`, `REQ-05` | Add `run-agent-workflow.sh` command skeleton with `start`, `status`, `resume`, and `--dry-run` parsing | `.ai-setup/scripts/run-agent-workflow.sh` | Shell script with usage text and argument validation | `CHK-02` | `EVID-02` | `bash -n .ai-setup/scripts/run-agent-workflow.sh` and dry-run status tests | `PRE-01`, `PRE-04` | `none` | command parsing needs hidden env or external auth |
| `STEP-02` | agent | `REQ-08`, `NEG-02` | Implement shared safety helpers for slug normalization and `.env*` path rejection before reading prompt or stage-input files | `.ai-setup/scripts/run-agent-workflow.sh`, `.ai-setup/scripts/start-dev-task.sh` if prompt-file guard is updated | Safety helper behavior covered by tests | `CHK-04` | `EVID-04` | `.env*` prompt-path test fails before file read | `PRE-02` | `none` | a required workflow input can only come from `.env*` |
| `STEP-03` | agent | `REQ-04`, `REQ-05`, `CTR-01`, `CTR-02` | Add run-id derivation, branch/worktree/run-state path planning, and manifest initialization without live agent execution | `.ai-setup/scripts/run-agent-workflow.sh`, `tmp/agent-workflows/<run-id>/run.json` in test sandbox | Valid `run.json` for a dry-run start | `CHK-02` | `EVID-02` | Start dry-run prints and writes expected run metadata in sandbox | `STEP-01`, `OQ-01`, `OQ-02` | `none` | manifest cannot be resumed deterministically |
| `STEP-04` | agent | `REQ-02`, `REQ-03`, `REQ-07`, `CTR-03` | Add declarative workflow and stage config files for route-first doc loops | `.ai-setup/workflows/route-first.json`, `.ai-setup/stages/*.json` | Route, draft, review, and polish stage configs resolve prompt chains | `CHK-01` | `EVID-01` | Config validation checks all referenced prompt files exist and no `.env*` paths are configured | `STEP-02` | `AG-01` if second-opinion execution is made required | prompt-chain config would duplicate prompt prose instead of referencing `.prompts` |
| `STEP-05` | agent | `REQ-02`, `REQ-03`, `REQ-05` | Add workflow config validation, make target, and CI smoke wiring | `.ai-setup/scripts/test-agent-workflow.sh`, `.ai-setup/Makefile`, `.ai-setup/scripts/test-ci.sh` | `make check-agent-workflow` exists and validates configs plus manifest fixtures; CI smoke invokes it | `CHK-01`, `CHK-02` | `EVID-01`, `EVID-02` | `make check-agent-workflow` and `.ai-setup/scripts/test-ci.sh` | `STEP-03`, `STEP-04` | `none` | adding the check requires Node dependencies |
| `STEP-06` | agent | `REQ-06`, `CTR-04`, `CTR-05` | Implement stage-result parsing and transition decisions for all canonical statuses | `.ai-setup/scripts/run-agent-workflow.sh`, `.ai-setup/test/fixtures/stage-results/*.md`, `.ai-setup/scripts/test-agent-workflow.sh` | Transition engine chooses next action or stop reason from fixture results | `CHK-03` | `EVID-03` | Fixture tests cover `accepted`, `needs_polish`, `needs_upstream`, `blocked`, `needs_human`, and `failed` | `PRE-03`, `STEP-05` | `none` | runner advances with missing status or open findings |
| `STEP-07` | agent | `REQ-02`, `REQ-06`, `REQ-07`, `CON-02` | Add dry-runable non-interactive stage execution that composes prompt chains, run metadata, original prompt, previous result, and output contract | `.ai-setup/scripts/run-agent-workflow.sh`, `.ai-setup/stages/*.json` | Stage executor can print the exact Codex command/prompt path and record result path without executing live Codex in tests | `CHK-01`, `CHK-02`, `CHK-03` | `EVID-01`, `EVID-02`, `EVID-03` | Dry-run stage execution records expected command and refuses to advance without expected result | `STEP-04`, `STEP-06`, `OQ-03` | `none` for dry-run; human approval before live Codex smoke if requested | Codex CLI behavior differs from expected non-interactive mode |
| `STEP-08` | agent | `REQ-01`, `REQ-05`, `REQ-08` | Add operator runbook and index entries for workflow start, status, resume, stop states, cleanup, and first-slice limitations | `memory-bank/ops/runbooks/agent-workflow-runner.md`, `memory-bank/ops/runbooks/README.md`, `.ai-setup/SETUP.md` if command surface is documented there | Runbook explains tested commands and stop states without promising future slices | `CHK-02`, `CHK-04` | `EVID-02`, `EVID-04` | Manual doc review plus local check commands | `STEP-05`, `STEP-07` | `AG-02` | docs describe live behavior not covered by tests |
| `STEP-09` | agent | `REQ-01` through `REQ-08` | Run full local verification and capture final acceptance notes | `.ai-setup`, `memory-bank/features/FT-007/implementation-plan.md` | Execution summary showing checks and any deferred Claude/interactive gaps | `CHK-01`, `CHK-02`, `CHK-03`, `CHK-04` | `EVID-01`, `EVID-02`, `EVID-03`, `EVID-04` | `make check-agent-workflow` and `make check-task-session` | `STEP-08` | `AG-01` and `AG-02` if still pending | checks fail or evidence paths are missing |

## Parallelizable Work

- `PAR-01` Stage config drafting and runbook drafting can proceed in parallel after the canonical config schema is settled, because docs and config touch different files.
- `PAR-02` Transition fixture authoring can proceed while manifest/status tests are being written, as long as both use the same canonical status enum from `CTR-04`.
- `PAR-03` Live Codex execution must wait until dry-run command composition and transition parsing are tested.
- `PAR-04` Do not parallelize edits to `run-agent-workflow.sh` across workers until the helper boundaries are split or the script becomes too large and needs extraction.

## Checkpoints

| Checkpoint ID | Refs | Condition | Evidence IDs |
| --- | --- | --- | --- |
| `CP-01` | `STEP-01`, `STEP-03`, `CHK-02` | Runner can create and report a dry-run manifest for a timestamped run id | `EVID-02` |
| `CP-02` | `STEP-04`, `STEP-05`, `CHK-01` | Route-first workflow and stage configs validate against existing `.prompts` paths | `EVID-01` |
| `CP-03` | `STEP-06`, `CHK-03` | Review-loop transitions are deterministic and never advance with unresolved findings | `EVID-03` |
| `CP-04` | `STEP-07`, `CON-02` | Stage execution is dry-runable and completion depends on declared output and status checks | `EVID-01`, `EVID-02`, `EVID-03` |
| `CP-05` | `STEP-08`, `STEP-09` | Operator docs, workflow checks, and existing task-session checks agree | `EVID-01`, `EVID-02`, `EVID-04` |

## Execution Risks

| Risk ID | Risk | Impact | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| `ER-01` | Runner grows into an untestable shell monolith | Future stages become hard to trust or resume safely | Keep helpers small, config declarative, and transition fixtures explicit; extract only after tests prove boundaries | `run-agent-workflow.sh` becomes hard to review or duplicates large launcher sections |
| `ER-02` | Dry-run and live execution diverge | Users approve one plan but the runner performs another action | Use the same computed command, prompt path, run id, and manifest fields for dry-run and apply/live modes | Dry-run output omits a field used by live execution |
| `ER-03` | Workflow config duplicates prompt prose | Prompt changes drift between `.prompts` and config | Stage configs reference prompt-chain paths only and validation checks file existence | A stage config embeds long prompt text |
| `ER-04` | Missing Claude MCP is treated as success | Review discipline is weakened while appearing automated | First slice records unavailable second-opinion as pending, `needs_human`, or `blocked` according to config | A workflow marks second-opinion passed without execution evidence |
| `ER-05` | Worktree creation dirties or breaks local repo state during tests | Verification becomes unsafe or flaky | Tests use disposable roots and dry-run by default; live creation requires explicit mode | Test creates `.worktrees/<run-id>` unexpectedly |

## Stop Conditions / Fallback

| Stop ID | Related refs | Trigger | Immediate action | Safe fallback state |
| --- | --- | --- | --- | --- |
| `STOP-01` | `CON-01`, `NEG-02` | Any prompt, source, or stage input path resolves to `.env*` | Stop before reading, print rejected path, and leave run state unchanged | No file is read; prior manifest remains valid |
| `STOP-02` | `CON-02`, `CTR-04`, `FM-01` | A stage result is missing or has an unknown status | Stop with `failed` and record the missing or invalid result path | Run manifest points to failed stage and can be inspected |
| `STOP-03` | `REQ-06`, `NEG-01`, `FM-02` | Review returns `needs_upstream` and the upstream producer cannot be identified from run history | Stop as `needs_human` with the review finding and artifact path | Current artifact is left unchanged until upstream owner is selected |
| `STOP-04` | `FM-05`, `NEG-03` | `resume` finds missing `current_stage`, `next_action`, or stage history in `run.json` | Stop with a recovery message; do not guess the next stage | User can inspect or repair manifest manually |
| `STOP-05` | `REQ-07`, `FM-03`, `AG-01` | Workflow requires Claude MCP second opinion but no execution path is available | Stop as `needs_human` or `blocked` according to workflow config | Primary review remains recorded; second-opinion is not falsely passed |

## Ready For Acceptance

FT-007 slice 1 is ready for acceptance when:

- `run-agent-workflow.sh` supports `start`, `status`, and `resume` in dry-run/testable mode.
- `route-first` workflow and document-stage configs validate against existing `.prompts` files.
- Run ids, worktree paths, branch names, and run-state paths use `YYYY-MM-DD-HHMM-<slug>` consistently.
- Stage-result parsing supports `accepted`, `needs_polish`, `needs_upstream`, `blocked`, `needs_human`, and `failed`.
- Review-loop fixtures prove the runner loops, backtracks, or stops without advancing on unresolved findings.
- `.env*` prompt/source paths are rejected before reading in both the new runner and any touched launcher path.
- Operator runbook and setup docs describe the tested first slice and defer implementation milestones, Claude MCP execution, and interactive Zellij stages to later work.
- `make check-agent-workflow`, `.ai-setup/scripts/test-ci.sh`, and `make check-task-session` pass locally.

## Execution Summary

Status: implemented locally and ready for acceptance review, with local ShellCheck deferred to CI because `shellcheck` is not installed in this environment.

| Evidence | Result | Notes |
| --- | --- | --- |
| `make check-agent-workflow` | passed | Validates route-first workflow config, stage prompt paths, `.env*` rejection, deterministic run ids, manifest status/resume, dry-run stage composition, and transition fixtures |
| `make check-task-session` | passed | Existing task-session routing remains green, including the new `.env*` prompt-file rejection |
| `shfmt -d init.sh .ai-setup/scripts/*.sh` | passed | No shell formatting diff reported |
| `git diff --check` | passed | No whitespace errors reported |
| `run-agent-workflow.sh start ... --dry-run --json` | passed | Produced `2026-05-11-1432-provider-auth`, branch `task/2026-05-11-1432-provider-auth`, worktree `.worktrees/2026-05-11-1432-provider-auth`, and `next_action: run_stage` |
| `run-agent-workflow.sh start ... --apply --json` | passed | Creates timestamped run state and a git worktree on `task/<run-id>` using a disposable test worktree root |
| `run-agent-workflow.sh stage ... --apply --json` | passed | Writes a composed stage prompt file with run metadata, original prompt, prompt-chain contents, and expected output contract |
| `run-agent-workflow.sh resume ... --apply --json` | passed | When `next_action` is `run_stage`, materializes the manifest's `current_stage` prompt and returns a stage-ready payload |
| `run-agent-workflow.sh transition ... --apply --json` | passed | Persists review-loop decisions into `run.json`, including `next_action`, `last_result`, and `stage_history` |
| `run-agent-workflow.sh transition ... --apply --json` stop reasons | passed | Persists `stop_reason` for stop transitions such as `stop_gate` and exposes it through resume/status JSON |
| `run-agent-workflow.sh transition ... --apply` stage-order guard | passed | Refuses to persist a transition when `--stage` does not match the manifest's `current_stage` |
| `run-agent-workflow.sh transition ... --apply --json` stage-family routing | passed | Converts draft/review/polish decisions into the next runnable stage or `stop_gate` for accepted review gates |
| `run-agent-workflow.sh transition ... --stage route-document --apply --json` | passed | Parses accepted route results with `Next stage:` and moves the manifest to the selected draft stage |
| `run-agent-workflow.sh transition --result-file needs_upstream.md --dry-run --json` | passed | Produced `next_action: backtrack_upstream` |
| `shellcheck init.sh .ai-setup/scripts/*.sh` | not run | `shellcheck` is not installed on the local PATH or through `mise exec` in this environment |
| `.ai-setup/scripts/test-ci.sh` | passed | Runs bootstrap checks plus `task-session` and `agent workflow` asset checks; agent CLI detection now mirrors PATH-based setup behavior |

Deferred by FT-007 scope: live Codex stage execution, Claude Code MCP second-opinion automation, interactive Zellij stage mode, and implementation-plan milestone expansion.
