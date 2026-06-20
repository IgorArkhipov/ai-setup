---
title: "FT-012: Feature Package"
doc_kind: feature
doc_function: index
purpose: "Navigation for the terminal dashboard and CLI filter parity feature. Read `protocol.md` first for workflow state, then `feature.md` for canonical scope and `implementation-plan.md` for execution."
derived_from:
  - ../../dna/governance.md
  - protocol.md
  - feature.md
status: active
audience: humans_and_agents
---

# FT-012: Feature Package

## About This Section

This feature package stores the lifecycle protocol and governed documents for restoring the remaining dashboard-related AgentScope capabilities from the original implementation plan.

The feature is downstream of `PRD-003`: dashboard/TUI work had been deferred until a future request re-established users, workflows, and acceptance criteria. The current goal reopens that scope, but the dashboard remains a thin local terminal surface over the existing headless discovery, mutation, backup, restore, and snapshot contracts.

## Annotated Index

- [`protocol.md`](protocol.md)
  Read this first when executing or resuming the lifecycle run.

- [`feature.md`](feature.md)
  Read this for canonical scope, contracts, acceptance scenarios, and verification.

- [`implementation-plan.md`](implementation-plan.md)
  Read this for execution steps, tests, and evidence.
