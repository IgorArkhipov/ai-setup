---
title: "FT-008: Feature Package"
doc_kind: feature
doc_function: index
purpose: "Navigation for the local AgentScope MCP control plane feature. Read `protocol.md` first for lifecycle execution state, then `feature.md` for canonical scope and `implementation-plan.md` for execution steps."
derived_from:
  - ../../dna/governance.md
  - protocol.md
  - feature.md
status: active
audience: humans_and_agents
---

# FT-008: Feature Package

## About This Section

This feature package stores the lifecycle protocol and governed documents for adding a local stdio MCP control plane to `tools/agentscope`.

The package is also the Task 1 lifecycle-protocol exercise for HW-5: the protocol governs document creation, grooming, execution, evidence, and handoff.

## Annotated Index

- [`protocol.md`](protocol.md)
  Read this first when executing or resuming the lifecycle run.
  Answers the question: what phase is allowed now, which gates apply, and what evidence must be recorded?

- [`feature.md`](feature.md)
  Read this when you need the canonical scope, design, acceptance scenarios, and verification contract for the local MCP control plane.
  Answers the question: what should AgentScope expose through MCP, and what is explicitly out of scope?

- [`implementation-plan.md`](implementation-plan.md)
  Read this when you need the grounded execution sequence, test strategy, checkpoints, and stop conditions.
  Answers the question: how should the MCP control plane be implemented and verified safely?
