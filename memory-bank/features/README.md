---
title: Feature Packages Index
doc_kind: feature
doc_function: index
purpose: Navigation for instantiated feature packages. Read this to find an existing delivery unit or understand where to create a new one.
derived_from:
  - ../dna/governance.md
  - ../flows/feature-flow.md
status: active
audience: humans_and_agents
---

# Feature Packages Index

The `memory-bank/features/` directory stores instantiated feature packages in the form `FT-XXX/`.

## Rules

- Each package is created according to the rules in [`../flows/feature-flow.md`](../flows/feature-flow.md).
- For bootstrap, use the templates from [`../flows/templates/feature/`](../flows/templates/feature/).
- If a feature implements or materially changes a stable project scenario, it should reference the corresponding `UC-*` from [`../use-cases/README.md`](../use-cases/README.md).
- In the template repository this directory may be empty. That is normal.

## Naming

- Base format: `FT-XXX/`
- Replace `XXX` with the project's stable identifier: issue ID, ticket ID, or another stable key
- One package = one delivery unit
