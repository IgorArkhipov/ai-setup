# HW-3: Orchestrated Development Task Launch

## Summary

This repository now has a minimal working orchestration path for starting a development task from the current checkout into an isolated neighboring work context.

The selected multiplexer is **Zellij**. The selected isolation mechanism is a repo-local **Git worktree** under `.worktrees/`. The selected environment bootstrap is the repository `init.sh`, which currently runs `mise trust` and `direnv allow`. Routing is owned by `.ai-setup/task-router.json`.

Because launching `codex` from inside a running Codex session can trigger macOS Gatekeeper, the demonstration used the new `--handoff-only` mode. This mode prepares the routed Zellij shell and handoff artifacts without invoking the agent binary. CI and normal terminal usage can still use the full launcher path.

## Infrastructure Added

The entrypoint is:

```bash
./.ai-setup/scripts/start-dev-task.sh
```

The launcher already supported:

- route selection from `.ai-setup/task-router.json`;
- branch/worktree creation under `.worktrees/<slug>`;
- `init.sh` execution inside the new worktree;
- detached Zellij session creation;
- prompt and manifest generation under `tmp/task-launchers/`.

This step added:

- `--handoff-only`, which starts the routed shell/session without launching `codex`;
- detached Zellij success recovery when Zellij creates the session but the non-TTY client exits non-zero after the session check.

## Routing Rule

The demonstration used route type `spec`.

From `.ai-setup/task-router.json`, `spec` resolves to:

```json
{
  "workflow": "governed-doc",
  "agent": "codex",
  "model": "gpt-5.5"
}
```

This route is appropriate because the task is governed documentation and workflow-infrastructure documentation, not direct AgentScope app implementation.

## Demonstration Task

Task prompt:

```text
Document the HW-3 orchestration demonstration: selected multiplexer, isolated worktree, init step, routing rule, and observable handoff result.
```

Slug:

```text
hw-3-orchestration-demo-20260511-2312
```

## Dry Run

Command:

```bash
./.ai-setup/scripts/start-dev-task.sh \
  --type spec \
  --slug hw-3-orchestration-demo-20260511-2312 \
  --prompt "Document the HW-3 orchestration demonstration: selected multiplexer, isolated worktree, init step, routing rule, and observable handoff result." \
  --detached \
  --handoff-only \
  --dry-run
```

Resolved plan:

```json
{
  "type": "spec",
  "workflow": "governed-doc",
  "agent": "codex",
  "model": "gpt-5.5",
  "slug": "hw-3-orchestration-demo-20260511-2312",
  "branch": "task/hw-3-orchestration-demo-20260511-2312",
  "worktree": "./.worktrees/hw-3-orchestration-demo-20260511-2312",
  "session": "ai-setup-hw-3-orchestration-demo-20260511-2312",
  "tab": "spec:hw-3-orchestration-demo-20260511-2312",
  "baseRef": "HEAD",
  "detached": 1,
  "handoffOnly": 1
}
```

## Execution Run

Command:

```bash
./.ai-setup/scripts/start-dev-task.sh \
  --type spec \
  --slug hw-3-orchestration-demo-20260511-2312 \
  --prompt "Document the HW-3 orchestration demonstration: selected multiplexer, isolated worktree, init step, routing rule, and observable handoff result." \
  --detached \
  --handoff-only
```

Observed launcher output:

```text
Prepared task worktree ./.worktrees/hw-3-orchestration-demo-20260511-2312 on branch task/hw-3-orchestration-demo-20260511-2312
Route: spec -> governed-doc (gpt-5.5)
Started or confirmed detached Zellij session ai-setup-hw-3-orchestration-demo-20260511-2312; zellij client returned non-zero after session creation/check
```

The Zellij client can return non-zero from this non-TTY Codex shell after creating the detached session. The launcher now verifies the session exists and treats that as a successful handoff.

## Verifiable Result

### Worktree

```text
worktree ./.worktrees/hw-3-orchestration-demo-20260511-2312
HEAD 5c023b9f49db3fa06953d2f29f841be0e4d430b1
branch refs/heads/task/hw-3-orchestration-demo-20260511-2312
```

### Branch

```text
task/hw-3-orchestration-demo-20260511-2312
```

### Zellij Session

With `ZELLIJ_SOCKET_DIR=/tmp/zellij-502`, `zellij list-sessions` showed:

```text
ai-setup-hw-3-orchestration-demo-20260511-2312
```

### Handoff Manifest

Generated at:

```text
tmp/task-launchers/hw-3-orchestration-demo-20260511-2312.json
```

The manifest records:

```json
{
  "type": "spec",
  "workflow": "governed-doc",
  "agent": "codex",
  "model": "gpt-5.5",
  "slug": "hw-3-orchestration-demo-20260511-2312",
  "branch": "task/hw-3-orchestration-demo-20260511-2312",
  "worktree": "./.worktrees/hw-3-orchestration-demo-20260511-2312",
  "session": "ai-setup-hw-3-orchestration-demo-20260511-2312",
  "tab": "spec:hw-3-orchestration-demo-20260511-2312",
  "promptFile": "./tmp/task-launchers/hw-3-orchestration-demo-20260511-2312.prompt.txt",
  "launcher": "./tmp/task-launchers/hw-3-orchestration-demo-20260511-2312.sh",
  "handoffOnly": 1
}
```

### Handoff Launcher

Generated at:

```text
tmp/task-launchers/hw-3-orchestration-demo-20260511-2312.sh
```

The generated launcher enters the worktree, prints the route, skips agent launch in handoff-only mode, and drops into the user shell. It also prints the manual command that can be run from a safe terminal session:

```bash
codex --cd ./.worktrees/hw-3-orchestration-demo-20260511-2312 \
  --model gpt-5.5 \
  --no-alt-screen "$(cat ./tmp/task-launchers/hw-3-orchestration-demo-20260511-2312.prompt.txt)"
```

## How To Attach

From a normal terminal:

```bash
export ZELLIJ_SOCKET_DIR=/tmp/zellij-502
zellij attach ai-setup-hw-3-orchestration-demo-20260511-2312
```

Inside that session, the shell is already scoped to:

```text
/Users/igor.arkhipov/Documents/Work/Ruby/thinknetica/ai-setup/.worktrees/hw-3-orchestration-demo-20260511-2312
```

## Cleanup

After the demonstration is no longer needed:

```bash
export ZELLIJ_SOCKET_DIR=/tmp/zellij-502
zellij kill-session ai-setup-hw-3-orchestration-demo-20260511-2312
git worktree remove .worktrees/hw-3-orchestration-demo-20260511-2312
git branch -D task/hw-3-orchestration-demo-20260511-2312
```
