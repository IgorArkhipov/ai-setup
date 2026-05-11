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

### 4. Resume A Run

```bash
./.ai-setup/scripts/run-agent-workflow.sh resume \
  --run-id <run-id> \
  --dry-run
```

The current slice validates the manifest and reports the resumable stage. Later slices will execute the recorded next action.

### 5. Prepare A Stage Prompt

Compose a dry-run stage command without executing live Codex:

```bash
./.ai-setup/scripts/run-agent-workflow.sh stage \
  --run-id <run-id> \
  --stage route-document \
  --dry-run
```

The output includes the configured agent, model, prompt file path, result file path, and command text.

Use `--apply` with `stage` to write the composed stage prompt file under `tmp/agent-workflows/<run-id>/stage-prompts/`. The prompt includes run metadata, the original user prompt, configured prompt-chain contents, and the expected output contract.

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

For document-stage families, applied transitions also update `current_stage` when the decision points to a next runnable stage:

- `draft-<kind>` with `accepted` moves to `review-<kind>`;
- `review-<kind>` with `needs_polish` moves to `polish-<kind>`;
- `polish-<kind>` with `accepted` moves back to `review-<kind>`;
- `review-<kind>` with `accepted` stops at `stop_gate`.

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
