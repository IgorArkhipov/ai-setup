---
title: Engineering Documentation Index
doc_kind: engineering
doc_function: index
purpose: Navigation for engineering rules for the active `tools/agentscope` package and the CI that verifies it.
derived_from:
  - ../dna/governance.md
status: active
audience: humans_and_agents
---

# Engineering Documentation Index

The `memory-bank/engineering/` directory contains the active engineering rules for this repository. The current implementation target is the TypeScript CLI package in `tools/agentscope`, with repository-level verification owned by `.github/workflows/ci.yml`.

- [Testing Policy](testing-policy.md) - canonical testing rules for `tools/agentscope`: Vitest expectations, fixture strategy, coverage thresholds, and when manual checks may supplement automation.
- [Autonomy Boundaries](autonomy-boundaries.md) - canonical rules for what an agent may change autonomously, when it must show a checkpoint, and when it must stop and ask before touching live provider state or safety-sensitive mutation logic.
- [Coding Style](coding-style.md) - project conventions for strict TypeScript, ESM imports, module boundaries, tooling, and change discipline in `tools/agentscope`.
- [Git Workflow](git-workflow.md) - repository git and review expectations: default branch, commit style, verification before PR, and current worktree guidance.
- [ADR](../adr/README.md) - the project's instantiated Architecture Decision Records.
