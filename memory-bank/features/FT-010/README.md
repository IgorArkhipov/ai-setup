---
title: "FT-010: Feature Package"
doc_kind: feature
doc_function: index
purpose: "Navigation for the verified modern surface toggle feature. Read `protocol.md` first for lifecycle state, then `feature.md` for canonical scope and `implementation-plan.md` for execution steps."
derived_from:
  - ../../dna/governance.md
  - protocol.md
  - feature.md
status: active
audience: humans_and_agents
---

# FT-010: Feature Package

## About This Section

This feature package stores the lifecycle protocol and governed documents for adding safe, reversible toggles for the first modern provider surface that has a file-level mutation model: agent files.

The package is the second delivery slice of `PRD-004`. It intentionally keeps hooks, settings, plugin manifests, and plugin configuration declarations read-only until a later feature proves provider-specific write semantics.

## Annotated Index

- [`protocol.md`](protocol.md)
  Read this first when executing or resuming the lifecycle run.
  Answers the question: what phase is allowed now, which gates apply, and what evidence must be recorded?

- [`feature.md`](feature.md)
  Read this when you need the canonical scope, design, acceptance scenarios, and verification contract for safe modern surface toggles.
  Answers the question: which modern surfaces should become writable now, and which must stay blocked?

- [`implementation-plan.md`](implementation-plan.md)
  Read this when you need the grounded execution sequence, test strategy, checkpoints, and stop conditions.
  Answers the question: how should verified agent-file toggles be implemented and verified safely?
