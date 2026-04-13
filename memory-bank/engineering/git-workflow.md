---
title: Git Workflow
doc_kind: engineering
doc_function: convention
purpose: Template git workflow document. After copying, record the project's real branch names, commit rules, and PR expectations here.
derived_from:
  - ../dna/governance.md
status: active
audience: humans_and_agents
---

# Git Workflow

## Default Branch

State explicitly which branch is considered primary: for example `main`, `master`, or a release branch.

## Commits

- If the project requires issue references in commit messages, document that explicitly.
- If auto-close keywords are allowed, list them.
- If squash merge is required or forbidden, document that here.

## Pull Requests

- Before opening a PR, the project's canonical local checks should be green.
- The PR title should be short and specific.
- The PR body should usually record: what changed, how it was verified, and any remaining risks or manual steps.

## Worktrees

If the project uses worktrees, document:

- where they are created;
- whether a bootstrap script is required after `git worktree add`;
- which directories are forbidden as temporary work locations.

If worktrees are not used, this section can be removed during adaptation.
