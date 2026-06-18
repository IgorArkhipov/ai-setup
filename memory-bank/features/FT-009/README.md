---
title: "FT-009: Feature Package"
doc_kind: feature
doc_function: index
purpose: "Navigation for the modern provider surface inventory feature. Read `protocol.md` first for lifecycle execution state, then `feature.md` for canonical scope and `implementation-plan.md` for execution steps."
derived_from:
  - ../../dna/governance.md
  - protocol.md
  - feature.md
status: active
audience: humans_and_agents
---

# FT-009: Feature Package

## About This Section

This feature package stores the lifecycle protocol and governed documents for adding read-only discovery of modern provider configuration surfaces to `tools/agentscope`.

The package is the first delivery slice of `PRD-004`. It intentionally broadens inventory before any new mutation support.

## Annotated Index

- [`protocol.md`](protocol.md)
  Read this first when executing or resuming the lifecycle run.
  Answers the question: what phase is allowed now, which gates apply, and what evidence must be recorded?

- [`feature.md`](feature.md)
  Read this when you need the canonical scope, design, acceptance scenarios, and verification contract for modern provider surface inventory.
  Answers the question: what should AgentScope discover and how should it classify the new surfaces?

- [`implementation-plan.md`](implementation-plan.md)
  Read this when you need the grounded execution sequence, test strategy, checkpoints, and stop conditions.
  Answers the question: how should the feature be implemented and verified safely?
