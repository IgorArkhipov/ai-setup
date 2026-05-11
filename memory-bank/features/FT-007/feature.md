---
title: "FT-007: Agentic Development Workflow Runner"
doc_kind: feature
doc_function: canonical
purpose: "Canonical feature document for adding a repo-local workflow runner that develops AgentScope features through governed prompt, review, polish, and approval loops without modifying the AgentScope app command surface."
derived_from:
  - ../../domain/problem.md
  - ../../flows/workflows.md
  - ../../flows/feature-flow.md
  - ../../engineering/autonomy-boundaries.md
status: active
delivery_status: in_progress
audience: humans_and_agents
must_not_define:
  - implementation_sequence
---

# FT-007: Agentic Development Workflow Runner

## What

### Problem

Source input: user-approved brainstorming in this Codex thread on 2026-05-11 about optimizing the development workflow for new AgentScope features through agentic prompt, review, polish, and implementation loops.

Developing new AgentScope features currently requires a human or agent to manually assemble the workflow: create a worktree, choose the right governed document owner, draft PRDs, use cases, ADRs, feature docs, or implementation plans from `.prompts`, run reviews, address findings, and decide when to stop for human approval. The repository already has the process ingredients in `.ai-setup`, `.prompts`, and `memory-bank`, but the current launcher only starts a routed task session. It does not run a reusable pipeline that can draft, review, polish, backtrack, and resume across stages.

This feature is specifically about the development process for `tools/agentscope`. It must not add `agentscope author ...` or other product commands to the AgentScope app. AgentScope remains the target being developed; `.ai-setup` remains the orchestration layer.

### Outcome

| Metric ID | Metric | Baseline | Target | Measurement method |
| --- | --- | --- | --- | --- |
| `MET-01` | New AgentScope feature prompts can enter a repeatable governed pipeline | Agents manually choose prompts, reviews, and stop points | A single route-first workflow can create a timestamped run, one worktree, run state, and execute document draft-review-polish loops until a hard gate or blocker | Dry-run and fixture-backed workflow-runner tests |
| `MET-02` | Review feedback blocks downstream progression until resolved | Review is a convention inside prompts and can be skipped | Every artifact-producing stage is followed by required review, polish, and re-review before the pipeline advances | Stage-result assertions and run-state transition tests |
| `MET-03` | Pipeline runs can resume without losing context | Interrupted work requires manual reconstruction from files and chat history | `resume` and `status` commands read `tmp/agent-workflows/<run-id>/run.json` and continue from the recorded next action | Resume/status tests against sample run manifests |

### Scope

- `REQ-01` Add a dedicated repo-local orchestrator under `.ai-setup` that runs agentic development workflows for AgentScope without modifying `tools/agentscope`.
- `REQ-02` Support a default route-first pipeline that starts from a user prompt, chooses the smallest governed document owner, drafts the selected artifact, reviews it, polishes findings, and stops at the first hard approval gate or blocker.
- `REQ-03` Compose workflows from reusable stage definitions so individual stages can later be invoked directly for interactive or surgical workflows.
- `REQ-04` Use one timestamped worktree per pipeline run, with the user slug preserved as a human label and a filesystem-safe run id such as `YYYY-MM-DD-HHMM-<slug>`.
- `REQ-05` Store non-governed run state under `tmp/agent-workflows/<run-id>/`, including the original prompt, `run.json`, and parseable stage result files.
- `REQ-06` Treat every artifact-producing stage as incomplete until required review loops pass. Review findings may trigger current-artifact polish, upstream backtracking, human feedback, or failure.
- `REQ-07` Execute the pipeline non-interactively with Codex-compatible stage commands, direct Claude Code second-opinion review hooks, and implementation-plan milestone loops; interactive Zellij stage execution is a follow-up slice.
- `REQ-08` Preserve the existing governed source-of-truth rules: `memory-bank` owns intent and lifecycle, `.prompts` supplies reusable prompt chains, `.ai-setup` owns orchestration, and `.env*` files must not be read or used.

### Non-Scope

- `NS-01` Adding AgentScope product commands or changing the runtime behavior of `tools/agentscope`.
- `NS-02` Replacing human approval gates for ambiguous review findings or failed verification.
- `NS-03` Guaranteeing Claude Code availability in every environment; when unavailable, the workflow must stop instead of silently passing review.
- `NS-04` Replacing the governed memory-bank lifecycle or making `.prompts` authoritative over active `memory-bank/flows` documents.
- `NS-05` Creating one worktree per stage.

### Constraints / Assumptions

- `ASM-01` The initial pipeline optimizes development of `tools/agentscope`, but the orchestration lives entirely outside that app.
- `ASM-02` Route-first is the default because incoming prompts may require a PRD, use case, ADR, feature package, or no new governed document.
- `ASM-03` One worktree per pipeline run is preferred because Node dependency trees, build outputs, coverage, and temporary fixtures can make per-stage worktrees expensive.
- `CON-01` The runner must not read or use `.env*` files, including prompt files and generated stage inputs.
- `CON-02` The runner must verify declared outputs and stage statuses; agent exit code alone is not completion evidence.
- `CON-03` A run state file is non-governed operational state and must live under `tmp/agent-workflows/<run-id>/`, not inside the feature package.
- `CON-04` The first implementation slice must keep review loops mandatory for generated documents while stopping before implementation work.
- `DEC-01` The first implementation should use a small dedicated orchestrator with declarative workflow and stage config. Bash plus `jq` is preferred initially unless implementation proves the state machine needs a Node module.

## How

### Solution

Add a dedicated `.ai-setup` workflow runner that composes declarative workflows from reusable stages. The runner creates one timestamped worktree per run, writes a run manifest under `tmp/agent-workflows/<run-id>/`, executes non-interactive Codex stages from configured prompt chains, parses each stage result for a known status, verifies expected artifacts, and advances, loops, backtracks, or stops according to the review policy.

### Change Surface

| Surface | Type | Why it changes |
| --- | --- | --- |
| `.ai-setup/scripts/run-agent-workflow.sh` | script | New dedicated orchestrator for starting, resuming, and inspecting agentic development workflow runs |
| `.ai-setup/workflows/*.json` | config | Declarative workflow graphs such as `route-first` |
| `.ai-setup/stages/*.json` | config | Reusable stage definitions for route, draft, review, and polish stages |
| `.ai-setup/scripts/start-dev-task.sh` | script | May remain the low-level worktree/Zellij primitive; only small integration changes are expected if needed |
| `.ai-setup/scripts/test-task-session.sh` or a sibling test script | test script | Validate workflow config, run-id derivation, state transitions, and `.env*` rejection |
| `.prompts/*.md` | prompt docs | Existing prompt chains are referenced by stage configs; changes only if output contracts need parseable status headings |
| `memory-bank/ops/runbooks/` | docs | Document how to start, resume, inspect, and recover workflow runs |
| `memory-bank/features/FT-007/*` | docs | Canonical scope and later execution plan for this orchestration feature |

### Flow

1. A user or agent starts the default route-first workflow with a slug and prompt.
2. The runner derives a run id such as `2026-05-11-1432-provider-auth-detection`, creates or reuses one branch and worktree for that run, and writes the original prompt plus `run.json`.
3. The `route-document` stage runs with project and documentation priming prompts plus `memory-bank-route-document.md`.
4. The route result selects the next artifact loop: PRD, use case, ADR, feature, or no governed document.
5. The selected draft stage produces or updates the governed artifact.
6. The review wrapper runs primary review, records findings, and either accepts the artifact, runs polish and re-review, backtracks to an upstream artifact, or stops for human feedback.
7. The runner stops at the hard gate after the selected document is accepted, or continues through later configured workflow stages with the same review invariant.
8. When the `implementation-plan` workflow is selected, the runner extracts milestones from an accepted `implementation-plan.md`, executes each milestone in the same worktree, runs review plus optional Claude second-opinion review, and advances only after the milestone is accepted.

### Contracts

| Contract ID | Input / Output | Producer / Consumer | Notes |
| --- | --- | --- | --- |
| `CTR-01` | Workflow run id | runner / branch, worktree, run-state paths | Format is filesystem-safe `YYYY-MM-DD-HHMM-<slug>`; display may show `YYYY-MM-DD HH:mm` separately |
| `CTR-02` | Run manifest | runner / resume, status, stage executor | Stored at `tmp/agent-workflows/<run-id>/run.json`; records workflow, current stage, artifact, stage history, and next action |
| `CTR-03` | Stage config | `.ai-setup/stages/*.json` / runner | Declares prompt chain, agent, model, inputs, outputs, review policy, and completion check |
| `CTR-04` | Parseable stage result | agent stage / runner | Markdown result includes `Status: accepted | needs_polish | needs_upstream | blocked | needs_human | failed`, target artifact, findings, and upstream update requests |
| `CTR-05` | Review wrapper | workflow runner / stage loops | Expands any artifact-producing stage into produce, review, polish, and re-review transitions until accepted or stopped |
| `CTR-06` | Implementation milestone queue | accepted `implementation-plan.md` / runner | Stored in `run.json` as `milestones`, `current_milestone_index`, and `current_milestone`; every milestone must pass implementation and review before the next one starts |

### Failure Modes

- `FM-01` A stage exits successfully but does not create the declared artifact or result status.
- `FM-02` Review findings require upstream changes, but the runner only patches the current artifact and advances with stale assumptions.
- `FM-03` Claude Code second-opinion is unavailable, but the workflow treats it as passed.
- `FM-04` A prompt file under `.env*` is accidentally read as workflow input.
- `FM-05` Resume starts from stale or inconsistent `run.json` and repeats or skips a stage.

## Verify

### Exit Criteria

- `EC-01` A non-interactive route-first workflow can start from a prompt, create a timestamped run id, create or reuse one worktree, and write run state under `tmp/agent-workflows/<run-id>/`.
- `EC-02` The non-interactive runner can run route, draft, review, polish, and re-review stages for governed documents without touching `tools/agentscope`.
- `EC-03` Review-loop status controls downstream progression: `accepted` advances or stops at a gate, `needs_polish` loops on the current artifact, `needs_upstream` backtracks to the upstream artifact owner, `blocked` and `needs_human` stop, and `failed` reports command/log context.
- `EC-04` `resume` and `status` can read run state and report or continue from the recorded next action.
- `EC-05` The `implementation-plan` workflow can execute parsed milestones one at a time and review every milestone before advancing.

### Traceability matrix

| Requirement ID | Design refs | Acceptance refs | Checks | Evidence IDs |
| --- | --- | --- | --- | --- |
| `REQ-01` | `ASM-01`, `CON-03`, `CTR-02` | `EC-01`, `SC-01` | `CHK-01`, `CHK-02` | `EVID-01`, `EVID-02` |
| `REQ-02` | `ASM-02`, `CTR-03`, `CTR-04`, `FM-01` | `EC-02`, `SC-02` | `CHK-01`, `CHK-03` | `EVID-01`, `EVID-03` |
| `REQ-03` | `CTR-03` | `EC-02`, `SC-03` | `CHK-01` | `EVID-01` |
| `REQ-04` | `ASM-03`, `CTR-01` | `EC-01`, `SC-01` | `CHK-02` | `EVID-02` |
| `REQ-05` | `CON-03`, `CTR-02` | `EC-01`, `EC-04`, `SC-04`, `NEG-03` | `CHK-02` | `EVID-02` |
| `REQ-06` | `CON-02`, `CTR-04`, `CTR-05`, `FM-02` | `EC-03`, `SC-05`, `NEG-01` | `CHK-03` | `EVID-03` |
| `REQ-07` | `CON-04`, `FM-03`, `CTR-06` | `EC-02`, `EC-05`, `SC-06`, `SC-07` | `CHK-01`, `CHK-03` | `EVID-01`, `EVID-03` |
| `REQ-08` | `CON-01`, `FM-04` | `EC-02`, `NEG-02` | `CHK-01`, `CHK-04` | `EVID-01`, `EVID-04` |

### Acceptance Scenarios

- `SC-01` A user starts `run-agent-workflow.sh start --workflow route-first --slug provider-auth --prompt "..."` and receives a timestamped run id, branch, worktree, and run-state path.
- `SC-02` The route-first workflow routes a prompt to the correct governed document owner and runs the matching draft stage.
- `SC-03` A stage definition can be reused by more than one workflow without copying prompt text into the runner script.
- `SC-04` A user runs `run-agent-workflow.sh status --run-id <run-id>` and sees current stage, last result, next action, and stop reason when present.
- `SC-05` A review result with findings triggers polish and re-review before the workflow advances.
- `SC-06` Claude second-opinion review can override an accepted primary review with `needs_polish`, causing polish and re-review before the workflow advances.
- `SC-07` An accepted implementation plan with multiple milestone rows runs milestone implementation and milestone review for each row, then stops at `all_milestones_accepted`.

### Negative / Edge Scenarios

- `NEG-01` A review result says upstream scope is wrong, returns `needs_upstream`, and the workflow stops or backtracks instead of patching only the downstream artifact.
- `NEG-02` A prompt file path points to `.env`, `.env.local`, or another `.env*` segment, and the runner rejects it without reading the file.
- `NEG-03` A run manifest is missing the current stage or next action, and `resume` stops with a clear recovery message.

### Checks

| Check ID | Covers | How to check | Expected result | Evidence path |
| --- | --- | --- | --- | --- |
| `CHK-01` | `EC-02`, `SC-02`, `SC-03`, `SC-06`, `NEG-02` | Run the workflow config validation script against `.ai-setup/workflows` and `.ai-setup/stages` | All stages resolve prompt chains, allowed agents, models, outputs, and review policy | `.ai-setup/scripts/test-agent-workflow.sh` |
| `CHK-02` | `EC-01`, `EC-04`, `SC-01`, `SC-04`, `NEG-03` | Run start/status/resume dry-run tests against a temporary run root | The runner derives stable paths, writes valid state, reports status, and resumes only from valid state | `tmp/agent-workflows/<run-id>/run.json` in test sandbox |
| `CHK-03` | `EC-03`, `SC-05`, `NEG-01` | Feed sample stage result files with `accepted`, `needs_polish`, `needs_upstream`, `blocked`, `needs_human`, and `failed` statuses into transition tests | The runner chooses the expected next action and never advances with open findings | `.ai-setup/test/fixtures/stage-results/` |
| `CHK-04` | `EC-02`, `NEG-02` | Attempt to use `.env*` prompt paths in launcher and workflow-runner tests | Commands fail before reading the file | `.ai-setup/scripts/test-agent-workflow.sh` |

### Test matrix

| Check ID | Evidence IDs | Evidence path |
| --- | --- | --- |
| `CHK-01` | `EVID-01` | `.ai-setup/scripts/test-agent-workflow.sh` |
| `CHK-02` | `EVID-02` | workflow test sandbox under `tmp/` |
| `CHK-03` | `EVID-03` | `.ai-setup/test/fixtures/stage-results/` |
| `CHK-04` | `EVID-04` | `.ai-setup/scripts/test-agent-workflow.sh` |

### Evidence

- `EVID-01` Workflow and stage config validation output.
- `EVID-02` Start, status, and resume dry-run output with a valid run manifest.
- `EVID-03` Transition test output for review-loop and backtracking statuses.
- `EVID-04` `.env*` rejection test output.

### Evidence contract

| Evidence ID | Artifact | Producer | Path contract | Reused by checks |
| --- | --- | --- | --- | --- |
| `EVID-01` | Config validation log | workflow test script | `.ai-setup/scripts/test-agent-workflow.sh` output | `CHK-01` |
| `EVID-02` | Run-state dry-run sample | workflow test script | `tmp/agent-workflows/<run-id>/run.json` in disposable sandbox | `CHK-02` |
| `EVID-03` | Stage transition sample results | workflow test script | `.ai-setup/test/fixtures/stage-results/` | `CHK-03` |
| `EVID-04` | Prompt-file safety result | workflow test script | `.ai-setup/scripts/test-agent-workflow.sh` output | `CHK-04` |
