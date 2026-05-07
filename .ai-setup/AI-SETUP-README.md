# Setup/bootstrap repository for the AI Driven Development course

![AI setup meme](https://i.programmerhumor.io/2025/07/9d40116f39da7b5d83f41899584b86c9c21d5c750c6330ff88d46532ecfb8d59.png)

This repository was created for [Danil Pismenny's AI-driven development course on Thinknetica](https://thinknetica.com/ai/ai_swe_course?utm_source=telegram&utm_medium=post&utm_campaign=ai_swe_course&utm_content=dpismenny).

First, it is a base setup/bootstrap repository for the environment and agent tooling. Second, it is a template you can use to start a course project.

## Goals Of This Repository

1. Give all participants a shared baseline `ai-setup` for tools.
2. Provide a starter template for a course project used to practice tasks.

## How To Use This Repository

1. Follow the instructions in [SETUP.md](SETUP.md).
2. After installation, verify the environment with `make check`.
3. If you create your own course project from this repository, replace this `README.md` with your project description and commit the change.

## Useful Commands

- `make check-context` - verify the baseline context for Claude Code and Codex.
- `make codex-context` - summary of the current/latest Codex session: context window, live token usage, skills, subagents, and a rough baseline estimate.
- `make check-task-session` - static validation of the repo-owned workflow for isolated task sessions in `zellij`.
- `./.ai-setup/scripts/start-dev-task.sh --type impl --slug my-task --prompt "..."` - create or reuse `.worktrees/my-task`, run `init.sh`, and open the routed task in `zellij`.
