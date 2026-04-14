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
- Legacy `brief.md`, `spec.md`, and `plan.md` files may remain inside a package as archived migration history. `feature.md` is the canonical active owner; `implementation-plan.md` is the governed execution document while the feature is open and the archived execution record after closure.

## Naming

- Base format: `FT-XXX/`
- Replace `XXX` with the project's stable identifier: issue ID, ticket ID, or another stable key
- One package = one delivery unit

## Registry

| Feature ID | Title | Status | Delivery status | Canonical doc | Execution plan / record | Related use cases | Last updated |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `FT-001` | Trusted Multi-Provider Discovery Foundation | `active` | `done` | [`FT-001/feature.md`](FT-001/feature.md) | [`FT-001/implementation-plan.md`](FT-001/implementation-plan.md) | `UC-001` | 2026-04-12 |
| `FT-002` | Safe And Reversible Configuration Changes | `active` | `done` | [`FT-002/feature.md`](FT-002/feature.md) | [`FT-002/implementation-plan.md`](FT-002/implementation-plan.md) | `UC-002` | 2026-04-12 |
| `FT-003` | First End-To-End Provider Validation With Claude | `active` | `done` | [`FT-003/feature.md`](FT-003/feature.md) | [`FT-003/implementation-plan.md`](FT-003/implementation-plan.md) | `UC-001`, `UC-002` | 2026-04-12 |
| `FT-004` | Verified Codex Skill And Configured MCP Toggles | `active` | `done` | [`FT-004/feature.md`](FT-004/feature.md) | [`FT-004/implementation-plan.md`](FT-004/implementation-plan.md) | `UC-001`, `UC-002` | 2026-04-13 |
