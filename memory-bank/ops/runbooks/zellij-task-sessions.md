---
title: Zellij Task Sessions
doc_kind: engineering
doc_function: runbook
purpose: Canonical operator procedure for opening a neighboring development task in Zellij with git-worktree isolation, environment bootstrap, and explicit task routing.
derived_from:
  - ../../engineering/git-workflow.md
  - ../../flows/workflows.md
status: active
audience: humans_and_agents
---

# Zellij Task Sessions

## Summary

Use this runbook when you want to start a parallel task from the current repository context without contaminating the current checkout.

The canonical entrypoint is [`.ai-setup/scripts/start-dev-task.sh`](../../../.ai-setup/scripts/start-dev-task.sh).

## Trigger / Symptoms

Use this flow when:

- the current task should continue in the current tab, but a second task needs its own shell history and git branch;
- you need an isolated branch and working tree for review, debugging, implementation, or spec work;
- you want the repo to choose the correct workflow and default model from one stable route table.

## Safety Notes

- `.worktrees/` must remain git-ignored before you create project-local worktrees.
- The launcher uses the current repository `HEAD` as the default base ref for new worktrees.
- The launcher runs `init.sh` inside the new worktree before opening the agent session.
- The route table is repo-owned in [`.ai-setup/task-router.json`](../../../.ai-setup/task-router.json). Change it there rather than hardcoding alternate model choices in ad hoc commands.

## Diagnosis

Check these inputs first:

```bash
git status --short --branch
zellij --version
codex --version
make check-task-session
```

If you expect the full bootstrap stack to be present, also run:

```bash
make check
```

## Resolution

### 1. Choose the route

Supported route keys:

- `impl` -> workflow `small-feature` -> `codex` model `gpt-5.4`
- `debug` -> workflow `bug-fix` -> `codex` model `gpt-5.4`
- `research` -> workflow `repo-research` -> `codex` model `gpt-5.5`
- `review` -> workflow `code-review` -> `codex` model `gpt-5.5`
- `spec` -> workflow `governed-doc` -> `codex` model `gpt-5.5`

### 2. Start the task session

Example:

```bash
./.ai-setup/scripts/start-dev-task.sh \
  --type impl \
  --slug add-snapshot-filter \
  --prompt "Implement snapshot filtering for the new provider list"
```

Behavior:

- creates or reuses `.worktrees/add-snapshot-filter`
- creates or reuses branch `task/add-snapshot-filter`
- runs `./init.sh` inside that worktree
- if already inside `zellij`, opens a neighboring tab in the current session
- otherwise, starts a dedicated `zellij` session named after the repo and task slug

### 3. Work inside the routed session

The launched pane prints:

- worktree path
- branch
- task type
- routed workflow
- agent
- model

It then starts `codex` with the routed model and a prompt composed from the route contract plus the user task text.

## Rollback

If you no longer need the parallel task:

```bash
git worktree remove .worktrees/<slug>
git branch -D task/<slug>
```

Kill the `zellij` session manually if it is still running:

```bash
zellij kill-sessions <repo>-<slug>
```

## Escalation

Stop and ask before deviating when:

- `.worktrees/` is no longer ignored;
- `init.sh` becomes destructive or environment-specific;
- the route table needs an agent other than `codex` or a model policy that is not yet encoded in `task-router.json`;
- the task scope implies a governed feature package or ADR update rather than a direct implementation session.
