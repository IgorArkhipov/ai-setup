---
title: Agent Execution Bridge
doc_kind: engineering
doc_function: runbook
purpose: Canonical operator and adapter contract for executing AgentScope development workflow stages through agent-neutral request files.
derived_from:
  - agent-workflow-runner.md
  - ../../features/FT-007/feature.md
  - ../../features/FT-007/implementation-plan.md
status: active
audience: humans_and_agents
---

# Agent Execution Bridge

## Summary

Use this runbook when an AgentScope development workflow stage should be executed by an adapter rather than by a hardcoded local terminal, Codex command, or Claude command.

The canonical bridge entrypoint is [`.ai-setup/scripts/agent-bridge.sh`](../../../.ai-setup/scripts/agent-bridge.sh).

The bridge is intentionally agent-neutral. Codex subagents, Claude MCP, Claude CLI, a Pi-hosted worker, a local shell command, or a human-operated terminal can all implement the same request/result contract.

## Contract

The workflow runner owns orchestration. It creates run state, worktrees, stage prompts, request files, result paths, and transition decisions.

The bridge owns execution. It receives a request file and runs one adapter command that must write the declared result file.

Adapters own agent-specific mechanics only. They must not mutate `run.json`, advance workflow state, skip gates, or treat a missing review as accepted.

## Request Files

When [Agent Workflow Runner](agent-workflow-runner.md) prepares or executes a stage with `--apply`, it writes:

- `tmp/agent-workflows/<run-id>/stage-requests/<stage>.request.json` for normal stage execution.
- `tmp/agent-workflows/<run-id>/stage-review-requests/<stage>.claude.request.json` for second-opinion review execution.

Each request file uses schema `agent-workflow-stage-request/v1` and includes:

- `kind`: `stage` or `review`
- `run_id`
- `workflow`
- `stage_id`
- `prompt_file`
- `result_file`
- `worktree`
- `state_dir`
- `agent_hint`
- `model_hint`
- `implementation_plan`
- `current_milestone.id`
- `current_milestone.goal`

The request file is the stable boundary. Environment variables are a compatibility layer for shell adapters.

## Result Files

Adapters must write the declared `result_file` using the normal stage-result contract:

```text
Status: accepted | needs_polish | needs_upstream | blocked | needs_human | failed
Target artifact: <repo-relative path or none>
Open findings: <non-negative integer>
```

Route-stage results also require:

```text
Next stage: draft-prd | draft-use-case | draft-adr | draft-feature | none
```

The runner applies transitions only after the result file exists and parses successfully.

## Commands

Validate a generated request file:

```bash
./.ai-setup/scripts/agent-bridge.sh validate \
  --request tmp/agent-workflows/<run-id>/stage-requests/<stage>.request.json
```

Run a command adapter from a request file:

```bash
./.ai-setup/scripts/agent-bridge.sh run-command \
  --request tmp/agent-workflows/<run-id>/stage-requests/<stage>.request.json \
  --command "/path/to/adapter"
```

The adapter command receives:

- `AGENT_WORKFLOW_RUN_ID`
- `AGENT_WORKFLOW_WORKFLOW`
- `AGENT_WORKFLOW_STAGE_ID`
- `AGENT_WORKFLOW_REQUEST_KIND`
- `AGENT_WORKFLOW_REQUEST_FILE`
- `AGENT_WORKFLOW_PROMPT_FILE`
- `AGENT_WORKFLOW_RESULT_FILE`
- `AGENT_WORKFLOW_WORKTREE`
- `AGENT_WORKFLOW_STATE_DIR`
- `AGENT_WORKFLOW_IMPLEMENTATION_PLAN`
- `AGENT_WORKFLOW_CURRENT_MILESTONE_ID`
- `AGENT_WORKFLOW_CURRENT_MILESTONE_GOAL`
- `AGENT_WORKFLOW_AGENT`
- `AGENT_WORKFLOW_MODEL`

## Subagent Orchestration

For current-session subagent execution, the master agent remains the orchestrator:

1. Start or resume a run with `run-agent-workflow.sh`.
2. Prepare the current stage with `stage --apply` or let `step/run` prepare it.
3. Read the generated request file.
4. Spawn a bounded worker or reviewer subagent with the request file, prompt file, worktree, and expected result file.
5. Wait for the subagent to write the result file.
6. Let the runner apply the transition.

The subagent must not edit `run.json` or mark a pipeline step complete by itself.

## Adapter Examples

A Codex in-chat adapter can read the request file and spawn a worker subagent.

A Claude MCP adapter can send the prompt file to Claude, ask for review or implementation output, and write the result file.

A Pi worker adapter can poll for request files, run its own local agent stack, and push the result file back into the shared worktree or state directory.

A human adapter can open the prompt file in a terminal, complete the task manually, and write the result file before the runner transitions.

## Safety Notes

- The bridge rejects `.env*` request, prompt, and result paths.
- The bridge validates that the prompt file, worktree, and state directory exist before running an adapter.
- A successful adapter exit code is insufficient; the declared result file must exist.
- Review adapters must return `needs_polish`, `needs_upstream`, `needs_human`, `blocked`, or `failed` when review evidence is missing or unresolved.

## Rollback

Bridge execution does not mutate workflow state directly. If an adapter writes a bad result file, remove or replace that result file and re-run the stage or transition.

Run state cleanup remains owned by [Agent Workflow Runner](agent-workflow-runner.md).
