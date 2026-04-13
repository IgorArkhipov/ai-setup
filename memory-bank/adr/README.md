---
title: Architecture Decision Records Index
doc_kind: adr
doc_function: index
purpose: Navigation for project ADRs. Read this to find accepted decisions or create a new ADR from the template.
derived_from:
  - ../dna/governance.md
  - ../flows/templates/adr/ADR-XXX.md
status: active
audience: humans_and_agents
---

# Architecture Decision Records Index

The `memory-bank/adr/` directory stores instantiated ADRs for the project.

- Create a new ADR from [`../flows/templates/adr/ADR-XXX.md`](../flows/templates/adr/ADR-XXX.md).
- Keep only real decision records in this directory, not notes or draft research.
- If no ADRs exist yet, this index remains empty and serves as the expected home for future decisions.

## Naming

- File format: `ADR-XXX-short-decision-name.md`
- Numbering is monotonic and never reused
- The filename should match the `title` in frontmatter

## Statuses

- `proposed` - the decision has been written down but not yet accepted
- `accepted` - the decision is accepted and becomes canonical input for downstream documents
- `superseded` - the decision has been replaced by another ADR
- `rejected` - the decision was considered and rejected
