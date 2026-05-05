---
title: Git Workflow
doc_kind: engineering
doc_function: convention
purpose: Repository git workflow for AgentScope changes: default branch, commit style, verification before review, and current worktree guidance.
derived_from:
  - ../dna/governance.md
status: active
audience: humans_and_agents
---

# Git Workflow

## Default Branch

The repository's primary branch is `main`.

## Branch And Commit Discipline

- There is no documented branch naming scheme enforced today.
- There is no documented Conventional Commits or commitlint requirement.
- Use short, specific, imperative commit subjects that describe the actual change.
- Keep unrelated documentation, CI, and code changes separate when that separation materially improves reviewability.

Recent history in this repository follows the pattern of direct subjects such as `Add ...`, `Align ...`, and `Adopt ...`; keep that tone unless the project later documents a stricter convention.

## Pull Requests

Before opening a PR for `tools/agentscope`, run the relevant local verification from `tools/agentscope`.

Required baseline for most package changes:

```bash
npm run lint
npm test
npm run coverage
npm run build
```

PR expectations:

- the title is short and specific;
- the body records what changed, how it was verified, and any remaining risks;
- if command contracts, config paths, mutation behavior, or CI expectations changed, the PR also updates `tools/agentscope/README.md`, `memory-bank/`, and `.github/workflows/ci.yml` as needed;
- do not rely on a local green run if GitHub Actions `CI` disagrees.

## Worktrees

This repository now defines a specialized local worktree workflow for parallel development tasks.

Rules:

- the canonical worktree root is project-local [`.worktrees/`](../../.worktrees/), which must stay git-ignored;
- create parallel task worktrees through [`.ai-setup/scripts/start-dev-task.sh`](../../.ai-setup/scripts/start-dev-task.sh) rather than ad hoc `git worktree add` commands when you want the full dev-session setup;
- the launcher creates or reuses `.worktrees/<slug>`, runs `init.sh`, and opens the task in `zellij` using the route table in [`.ai-setup/task-router.json`](../../.ai-setup/task-router.json);
- routing is by task type rather than branch name alone: `impl`, `debug`, `research`, `review`, and `spec` each map to a governed workflow and default model;
- run package commands from `tools/agentscope` inside the selected worktree;
- do not treat generated output such as `dist/` as a worktree-specific scratch area.

Operational details live in [../ops/runbooks/zellij-task-sessions.md](../ops/runbooks/zellij-task-sessions.md).
