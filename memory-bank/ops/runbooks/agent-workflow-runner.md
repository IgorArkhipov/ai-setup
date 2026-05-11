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

Use this runbook when a prompt should enter the repo-local, non-interactive AgentScope development workflow runner.

The canonical entrypoint is [`.ai-setup/scripts/run-agent-workflow.sh`](../../../.ai-setup/scripts/run-agent-workflow.sh).

This runner is an orchestration layer for developing `tools/agentscope`. It is not an AgentScope app command and does not add runtime behavior under `tools/agentscope`.

## Trigger / Symptoms

Use this flow when:

- a prompt needs governed routing before drafting a PRD, use case, ADR, or feature package;
- an agentic workflow run needs a timestamped run id and resumable state;
- a document-producing stage must be followed by review, polish, and re-review before downstream work continues.

Use [Zellij Task Sessions](zellij-task-sessions.md) instead when you need an interactive neighboring shell or Zellij session.

## Safety Notes

- The runner rejects `.env*` prompt paths before reading.
- Run state is non-governed operational state under `tmp/agent-workflows/<run-id>/`.
- The current slice materializes run state, a timestamped worktree, and stage prompt files. It still does not execute live Claude MCP review automation.
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

### 3. Inspect Run State

```bash
./.ai-setup/scripts/run-agent-workflow.sh status \
  --run-id <run-id>
```

Expected output includes:

- `current_stage`
- `next_action`
- `stop_reason`, when present
- `last_result_stage`, `last_result_status`, and `last_result_next_action`, when present

### 4. Resume A Run

```bash
./.ai-setup/scripts/run-agent-workflow.sh resume \
  --run-id <run-id> \
  --dry-run
```

The current slice validates the manifest and reports the resumable stage. Later slices will execute the recorded next action.

Use `--apply` when `next_action` is `run_stage` to materialize the prompt for the recorded `current_stage`:

```bash
./.ai-setup/scripts/run-agent-workflow.sh resume \
  --run-id <run-id> \
  --apply
```

This writes `tmp/agent-workflows/<run-id>/stage-prompts/<current-stage>.prompt.md` and returns the same stage-ready fields as the explicit `stage` command.

When the manifest has a stop action such as `stop_gate`, `resume --apply --json` returns `status: stopped` with the persisted `stop_reason` instead of preparing another stage.

### 5. Prepare A Stage Prompt

Compose a dry-run stage command without executing live Codex:

```bash
./.ai-setup/scripts/run-agent-workflow.sh stage \
  --run-id <run-id> \
  --stage route-document \
  --dry-run
```

The output includes the configured agent, model, prompt file path, result file path, and command text.

Use `--apply` with `stage` to write the composed stage prompt file under `tmp/agent-workflows/<run-id>/stage-prompts/`. The prompt includes run metadata, the original user prompt, previous-stage result metadata and content when present, configured prompt-chain contents, and the expected output contract.

Applied stage prompt preparation is ordered. The manifest must have `next_action: run_stage`, and the requested `--stage` must match the manifest's current `current_stage`; otherwise the runner stops before writing a prompt. Use `stage --dry-run` when you only want to inspect a stage config or command shape without enforcing the runnable manifest position.

### 6. Check Or Persist A Stage Result Transition

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

Applied transitions are ordered. The `--stage` value must match the manifest's current `current_stage`; otherwise the runner stops without changing `run.json`. Use dry-run transition checks when you only want to inspect a result fixture or parse a status out of order.

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

If a live worktree was created in a later slice, remove it separately:

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
