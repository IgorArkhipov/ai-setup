---
title: Use Cases Index
doc_kind: use_case
doc_function: index
purpose: Navigation for instantiated project use cases. Read this to find a canonical product scenario or register a new one.
derived_from:
  - ../dna/governance.md
  - ../flows/templates/use-case/UC-XXX.md
status: active
audience: humans_and_agents
---

# Use Cases Index

The `memory-bank/use-cases/` directory stores the project's canonical user and operational scenarios.

A use case is needed for a scenario that exists at product level, repeats over time, and can serve as upstream input for multiple feature packages. It does not replace `SC-*` inside `feature.md`: `SC-*` describe acceptance scenarios of a delivery unit, while `UC-*` describe stable system behavior at project level.

## When To Create A Use Case

- a new stable user or operational scenario appears;
- multiple features implement or change the same flow;
- a canonical owner is needed for trigger, preconditions, main flow, and postconditions.

## When A Use Case Is Not Needed

- the scenario is one-off and exists only inside one feature;
- it is an implementation detail rather than a product or operational flow;
- it is sufficiently described through `SC-*` in `feature.md`.

## Registry

| UC ID | Title | Status | Primary actor | Upstream PRD | Implemented by | Last updated |
| --- | --- | --- | --- | --- | --- | --- |
| [`UC-001`](UC-001-cross-provider-discovery.md) | Cross-Provider Discovery | `active` | Developer or operator | `PRD-001`, `PRD-002` | `FT-001`, `FT-003`, `FT-004` | 2026-04-13 |
| [`UC-002`](UC-002-safe-toggle-and-restore.md) | Safe Toggle And Restore | `active` | Developer or operator | `PRD-001`, `PRD-002` | `FT-002`, `FT-003`, `FT-004` | 2026-04-13 |

## Naming

- File format: `UC-XXX-short-name.md`
- Replace `XXX` with a stable project identifier
- One use case may be upstream for multiple feature packages

## Template

- Use the template [`../flows/templates/use-case/UC-XXX.md`](../flows/templates/use-case/UC-XXX.md)
