---
title: Flows And Templates Index
doc_kind: governance
doc_function: index
purpose: Navigation for lifecycle flows and governed templates. Read this when creating a feature package, moving a feature between stages, or instantiating a new governed document.
derived_from:
  - ../dna/governance.md
  - agent-process-operations.md
  - feature-flow.md
  - workflows.md
  - templates/README.md
status: active
audience: humans_and_agents
---

# Flows And Templates Index

The `memory-bank/flows/` directory contains the reusable process layer of the template: lifecycle rules, stable identifier taxonomy, and governed templates.

- [Task Workflows](workflows.md) - task routing by type, the base development cycle, and the autonomy gradient.
- [Feature Flow](feature-flow.md) - lifecycle from draft to closure, gates, and stable IDs such as `REQ-*`, `CHK-*`, and `STEP-*`.
- [Agent Process Operations](agent-process-operations.md) - reusable process specs, long-run state artifacts, runner prompts, handoff/resume rules, and HITL gates for agent workflows.
- [Templates Index](templates/README.md) - reference templates for governed documents, including PRD, use case, feature, and ADR.
