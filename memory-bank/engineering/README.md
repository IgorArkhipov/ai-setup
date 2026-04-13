---
title: Engineering Documentation Index
doc_kind: engineering
doc_function: index
purpose: Navigation for template engineering-level documentation.
derived_from:
  - ../dna/governance.md
status: active
audience: humans_and_agents
---

# Engineering Documentation Index

The `memory-bank/engineering/` directory contains engineering rules that usually need to be adapted to a specific repository after copying the template.

- [Testing Policy](testing-policy.md) - testing rules, required automated tests, and sufficient coverage. Answers the question: when must a feature have test cases, and when is manual-only verification allowed.
- [Autonomy Boundaries](autonomy-boundaries.md) - agent autonomy boundaries: autopilot, supervision, and escalation. Answers the question: what an agent may do alone and where it must stop and ask.
- [Coding Style](coding-style.md) - code style conventions, tooling, and local complexity rules.
- [Git Workflow](git-workflow.md) - git conventions: commits, branches, pull requests, and optional worktrees.
- [ADR](../adr/README.md) - the project's instantiated Architecture Decision Records.
