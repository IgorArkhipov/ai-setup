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
mise exec -- zellij --version
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
- resolves `zellij` from `PATH` or `mise which zellij`
- sets a short `ZELLIJ_SOCKET_DIR` automatically when one is not already defined
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

## Demonstration Run

This repository now includes one rerun from `2026-05-05` against the live launcher with `zellij` resolved through `mise`.

### Task that was run

- task: document a real-world example of the neighboring-task orchestration infrastructure in this repository
- chosen route type: `spec`
- reason: the task is governed-document and operational-documentation work rather than direct product implementation

### Command used

```bash
./.ai-setup/scripts/start-dev-task.sh \
  --type spec \
  --slug task-session-demo \
  --prompt-file /tmp/task-session-demo-prompt.txt \
  --detached
```

### How it was routed

- route source: [`.ai-setup/task-router.json`](../../../.ai-setup/task-router.json)
- route key: `spec`
- resolved workflow: `governed-doc`
- resolved agent: `codex`
- resolved model: `gpt-5.5`

### Where the isolated branch and worktree would be created

- branch: `task/task-session-demo`
- worktree: [`.worktrees/task-session-demo`](../../../.worktrees/task-session-demo)
- zellij session name: `ai-setup-task-session-demo`
- zellij tab name: `spec:task-session-demo`

### Observable result

The same route resolves in dry-run as:

```json
{
  "type": "spec",
  "workflow": "governed-doc",
  "agent": "codex",
  "model": "gpt-5.5",
  "slug": "task-session-demo",
  "branch": "task/task-session-demo",
  "worktree": "/Users/igor.arkhipov/Documents/Work/Ruby/thinknetica/ai-setup/.worktrees/task-session-demo",
  "session": "ai-setup-task-session-demo",
  "tab": "spec:task-session-demo",
  "baseRef": "HEAD",
  "detached": 1
}
```

The actual full-launch attempt then failed before session creation with this verifiable Git error:

```text
Preparing worktree (new branch 'task/task-session-demo')
fatal: cannot lock ref 'refs/heads/task/task-session-demo': unable to create directory for .git/refs/heads/task/task-session-demo
```

The root cause in this environment is sandboxed write denial inside `.git/refs/heads`, confirmed separately by:

```text
mkdir: .git/refs/heads/task-test-dir: Operation not permitted
```

So the current strongest observable result is:

- the real repo-owned launcher script was executed
- the task was routed through the live route table
- detached `zellij` launch mode was selected
- the intended branch, worktree, session, and tab names were resolved
- the run stopped at the real sandbox boundary during git ref creation, before `zellij` could be asked to start the session

## Rollback

If you no longer need the parallel task:

```bash
git worktree remove .worktrees/<slug>
git branch -D task/<slug>
```

Kill the `zellij` session manually if it is still running:

```bash
mise exec -- zellij kill-session <repo>-<slug>
```

## Escalation

Stop and ask before deviating when:

- `.worktrees/` is no longer ignored;
- `init.sh` becomes destructive or environment-specific;
- the route table needs an agent other than `codex` or a model policy that is not yet encoded in `task-router.json`;
- the task scope implies a governed feature package or ADR update rather than a direct implementation session.
