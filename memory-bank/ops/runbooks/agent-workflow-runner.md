---
title: Agent Workflow Runner
doc_kind: engineering
doc_function: runbook
purpose: Canonical operator procedure for starting, inspecting, and resuming repo-local agentic development workflow runs for AgentScope.
derived_from:
  - ../../features/FT-007/feature.md
  - ../../features/FT-007/implementation-plan.md
  - ../../flows/workflows.md
status: active
audience: humans_and_agents
---

# Agent Workflow Runner

## Summary

Use this runbook when a prompt should enter the repo-local, non-interactive AgentScope development workflow runner, or when an existing run should execute one current stage.

The canonical entrypoint is [`.ai-setup/scripts/run-agent-workflow.sh`](../../../.ai-setup/scripts/run-agent-workflow.sh).

This runner is an orchestration layer for developing `tools/agentscope`. It is not an AgentScope app command and does not add runtime behavior under `tools/agentscope`.

## Trigger / Symptoms

Use this flow when:

- a prompt needs governed routing before drafting a PRD, use case, ADR, or feature package;
- an agentic workflow run needs a timestamped run id and resumable state;
- a document-producing stage must be followed by review, polish, and re-review before downstream work continues.

Use [Agent Execution Bridge](agent-execution-bridge.md) when the current stage should be executed by a Codex subagent, Claude MCP, a remote worker, or another adapter through an agent-neutral request file.

Use [Zellij Task Sessions](zellij-task-sessions.md) instead when you need an interactive neighboring shell or Zellij session.

## Safety Notes

- The runner rejects `.env*` prompt paths before reading.
- Run state is non-governed operational state under `tmp/agent-workflows/<run-id>/`.
- `run` and `step` execute stages non-interactively. The default executor is `codex exec`; use `--stage-command` or `AGENT_WORKFLOW_STAGE_COMMAND` when a test harness or alternate agent command should produce the stage result file.
- Applied stage preparation writes an agent-neutral request file under `tmp/agent-workflows/<run-id>/stage-requests/`. The request file is the stable adapter boundary; shell environment variables are compatibility helpers.
- `--claude-review` runs a Claude second-opinion review after accepted review stages. If Claude is unavailable or cannot complete the review, the stage result must stop as `needs_human`, `blocked`, or `failed`; do not treat missing review as accepted.
- `.worktrees/` remains the intended worktree root for live pipeline runs, but workflow checks use disposable test roots.

## Diagnosis

Check the workflow assets first:

```bash
make check-agent-workflow
make check-task-session
```

If the whole bootstrap stack matters, run:

```bash
.ai-setup/scripts/test-ci.sh
```

## Resolution

### 1. Start A Dry-Run Workflow

```bash
./.ai-setup/scripts/run-agent-workflow.sh start \
  --workflow route-first \
  --slug provider-auth \
  --prompt "Add provider auth detection" \
  --dry-run
```

The runner prints:

- timestamped `run_id`;
- workflow id;
- current stage;
- next action;
- branch and worktree paths;
- run-state path.

### 2. Create Run State And Worktree

Use `--apply` when you want the initial run manifest, prompt file, branch, and worktree created:

```bash
./.ai-setup/scripts/run-agent-workflow.sh start \
  --workflow route-first \
  --slug provider-auth \
  --prompt "Add provider auth detection" \
  --apply
```

This creates:

- `tmp/agent-workflows/<run-id>/prompt.md`
- `tmp/agent-workflows/<run-id>/run.json`
- `tmp/agent-workflows/<run-id>/stage-results/`
- `.worktrees/<run-id>/` on branch `task/<run-id>`

### 3. Run A Full Pipeline From A Prompt

Use `run --apply` when the workflow should start from a prompt and continue stage by stage until it reaches a stop action such as `stop_gate`, `stop_blocked`, `stop_needs_human`, or `stop_failed`:

```bash
./.ai-setup/scripts/run-agent-workflow.sh run \
  --workflow route-first \
  --slug provider-auth \
  --prompt "Add provider auth detection" \
  --apply
```

The runner creates the run state and worktree, writes each stage prompt under `tmp/agent-workflows/<run-id>/stage-prompts/`, expects each stage result under `tmp/agent-workflows/<run-id>/stage-results/<stage>.md`, applies the transition, and continues while `next_action` is `run_stage`.

Use `--max-steps <n>` to guard against an unexpected loop. Use `--json` to return the final manifest plus the number of executed stages.

For test harnesses or alternate agents, provide a stage command:

```bash
./.ai-setup/scripts/run-agent-workflow.sh run \
  --workflow route-first \
  --slug provider-auth \
  --prompt "Add provider auth detection" \
  --stage-command "/path/to/stage-agent" \
  --apply
```

The command runs with these environment variables:

- `AGENT_WORKFLOW_RUN_ID`
- `AGENT_WORKFLOW_STAGE_ID`
- `AGENT_WORKFLOW_REQUEST_FILE`
- `AGENT_WORKFLOW_PROMPT_FILE`
- `AGENT_WORKFLOW_RESULT_FILE`
- `AGENT_WORKFLOW_WORKTREE`
- `AGENT_WORKFLOW_STATE_DIR`
- `AGENT_WORKFLOW_AGENT`
- `AGENT_WORKFLOW_MODEL`

Add `--claude-review` when accepted review stages should receive an independent Claude second-opinion pass before the runner advances:

```bash
./.ai-setup/scripts/run-agent-workflow.sh run \
  --workflow route-first \
  --slug provider-auth \
  --prompt "Add provider auth detection" \
  --claude-review \
  --apply
```

For test harnesses or alternate Claude wrappers, set `--review-command` or `AGENT_WORKFLOW_REVIEW_COMMAND`. Review commands receive the stage environment plus:

- `AGENT_WORKFLOW_REVIEW_REQUEST_FILE`
- `AGENT_WORKFLOW_REVIEW_PROMPT_FILE`
- `AGENT_WORKFLOW_REVIEW_RESULT_FILE`
- `AGENT_WORKFLOW_IMPLEMENTATION_PLAN`
- `AGENT_WORKFLOW_CURRENT_MILESTONE_ID`
- `AGENT_WORKFLOW_CURRENT_MILESTONE_GOAL`

The review command must write the normal parseable stage-result contract to `AGENT_WORKFLOW_REVIEW_RESULT_FILE`. If that result is `needs_polish`, the runner moves into the matching polish stage and then re-runs review.

### 4. Run An Implementation Plan By Milestone

Use the `implementation-plan` workflow when a governed `implementation-plan.md` has been accepted and should be executed milestone by milestone:

```bash
./.ai-setup/scripts/run-agent-workflow.sh run \
  --workflow implementation-plan \
  --slug provider-auth-implementation \
  --implementation-plan memory-bank/features/FT-007/implementation-plan.md \
  --claude-review \
  --apply
```

The runner extracts milestone rows shaped as any of the following, stores them in `run.json`, and runs:

- governed table rows whose first cell is `STEP-*`, `MS-*`, or `TASK-*`;
- Markdown checklist rows such as `- [ ] STEP-01: ...`;
- Markdown headings such as `### MS-01 - ...`.

For each queued milestone it runs:

- `implement-milestone`
- `review-milestone`
- `polish-milestone`, when review finds current-milestone issues

After `review-milestone` accepts the current milestone, the runner advances to the next queued milestone. When all milestones are accepted, it stops with `stop_reason: all_milestones_accepted`.

### 5. Inspect Run State

```bash
./.ai-setup/scripts/run-agent-workflow.sh status \
  --run-id <run-id>
```

Expected output includes:

- `current_stage`
- `next_action`
- `stop_reason`, when present
- `last_result_stage`, `last_result_status`, and `last_result_next_action`, when present

### 6. Resume A Run

```bash
./.ai-setup/scripts/run-agent-workflow.sh resume \
  --run-id <run-id> \
  --dry-run
```

The runner validates the manifest and reports the resumable stage.

Use `--apply` when `next_action` is `run_stage` to materialize the prompt for the recorded `current_stage`:

```bash
./.ai-setup/scripts/run-agent-workflow.sh resume \
  --run-id <run-id> \
  --apply
```

This writes `tmp/agent-workflows/<run-id>/stage-prompts/<current-stage>.prompt.md` and returns the same stage-ready fields as the explicit `stage` command.

When the manifest has a stop action such as `stop_gate`, `resume --dry-run --json` and `resume --apply --json` return `status: stopped` with the persisted `stop_reason` instead of preparing another stage.

### 7. Prepare A Stage Prompt

Compose a dry-run stage command without executing live Codex:

```bash
./.ai-setup/scripts/run-agent-workflow.sh stage \
  --run-id <run-id> \
  --stage route-document \
  --dry-run
```

The output includes the configured agent, model, prompt file path, result file path, and command text.

Use `--apply` with `stage` to write the composed stage prompt file under `tmp/agent-workflows/<run-id>/stage-prompts/`. The prompt includes run metadata, the original user prompt, previous-stage result metadata and content when present, configured prompt-chain contents, and the expected output contract. Stage results must include `Status`, `Target artifact`, and `Open findings`; route results also include `Next stage`.

Applied stage preparation also writes `tmp/agent-workflows/<run-id>/stage-requests/<stage>.request.json`. This request contains the prompt file, result file, worktree, state directory, agent/model hints, implementation plan path, and current milestone metadata. Use [Agent Execution Bridge](agent-execution-bridge.md) when an external adapter or current-session subagent should consume that request instead of launching a standalone shell session.

Applied stage prompt preparation is ordered. The manifest must have `next_action: run_stage`, and the requested `--stage` must match the manifest's current `current_stage`; otherwise the runner stops before writing a prompt. Use `stage --dry-run` when you only want to inspect a stage config or command shape without enforcing the runnable manifest position.

### 8. Execute One Current Stage

Use `step --apply` when a run already exists and only the current stage should execute before returning control:

```bash
./.ai-setup/scripts/run-agent-workflow.sh step \
  --run-id <run-id> \
  --apply
```

`step` uses the same executor contract as `run`, writes one stage prompt, requires the stage command to create the declared result file, persists one transition, and stops. This is the non-interactive equivalent of advancing one item in an otherwise interactive workflow.

### 9. Open One Stage Interactively

Use `stage --interactive --apply` when a human wants to take over the current stage in a terminal:

```bash
./.ai-setup/scripts/run-agent-workflow.sh stage \
  --run-id <run-id> \
  --stage <current-stage> \
  --interactive \
  --apply
```

This writes:

- `tmp/agent-workflows/<run-id>/stage-prompts/<stage>.prompt.md`
- `tmp/agent-workflows/<run-id>/stage-launchers/<stage>.sh`
- `tmp/agent-workflows/<run-id>/stage-launchers/<stage>.json`

The launcher opens Codex in the run worktree with the prepared stage prompt. Add `--launch` to start a Zellij tab or session immediately. Add `--detached` with `--launch` when creating a detached Zellij session from outside an existing Zellij session.

### 10. Check Or Persist A Stage Result Transition

```bash
./.ai-setup/scripts/run-agent-workflow.sh transition \
  --result-file .ai-setup/test/fixtures/stage-results/accepted.md \
  --dry-run
```

Use `--apply` with `--run-id` and `--stage` to persist the decision into `run.json`:

```bash
./.ai-setup/scripts/run-agent-workflow.sh transition \
  --run-id <run-id> \
  --stage route-document \
  --result-file tmp/agent-workflows/<run-id>/stage-results/route-document.md \
  --apply
```

This updates:

- `next_action`
- `last_result`
- `stage_history`
- `stop_reason`, when the transition stops instead of preparing another stage

Applied transitions are ordered. The `--stage` value must match the manifest's current `current_stage`; otherwise the runner stops without changing `run.json`. Use dry-run transition checks when you only want to inspect a result fixture or parse a status out of order. Add `--stage` to a dry-run transition when you want to preview the resolved workflow target, such as `route-document` to `draft-feature` or `review-feature` back to `draft-feature`.

Accepted non-route stage results are completion-gated. When `Status: accepted` and `Open findings: 0`, the declared `Target artifact` must exist in the run worktree before the runner updates `run.json`. Route-stage decisions are exempt because they select the downstream artifact loop rather than proving that artifact already exists.

For document-stage families, applied transitions also update `current_stage` when the decision points to a next runnable stage:

- `route-document` with `accepted` and `Next stage: draft-<kind>` moves to that draft stage;
- `route-document` with `accepted` and `Next stage: none` stops at `stop_gate` with `stop_reason: no_governed_document`;
- `draft-<kind>` with `accepted` moves to `review-<kind>`;
- `review-<kind>` with `needs_polish` moves to `polish-<kind>`;
- `review-<kind>` with `needs_upstream` moves back to `draft-<kind>`;
- `polish-<kind>` with `accepted` moves back to `review-<kind>`;
- `review-<kind>` with `accepted` stops at `stop_gate`.

The route-stage result must include `Next stage:` when accepted. Valid first draft stages in the current route-first workflow are:

- `draft-prd`
- `draft-use-case`
- `draft-adr`
- `draft-feature`
- `none`

Recognized statuses:

- `accepted`
- `needs_polish`
- `needs_upstream`
- `blocked`
- `needs_human`
- `failed`

## Rollback

Run-state files are under ignored `tmp/` and can be removed when no longer needed:

```bash
rm -rf tmp/agent-workflows/<run-id>
```

If a live worktree was created, remove it separately:

```bash
git worktree remove .worktrees/<run-id>
git branch -D task/<run-id>
```

## Escalation

Stop and ask before continuing when:

- a prompt or stage input needs a `.env*` file;
- `resume` reports a malformed `run.json`;
- a stage result is missing `Status`;
- a review result returns `needs_upstream` but the upstream owner cannot be identified;
- Claude MCP second-opinion review is required but unavailable.
