---
title: Templates Index
doc_kind: governance
doc_function: index
purpose: Navigation for the reference templates used in project documentation. Read this when you need to create a feature, ADR, or execution document without inventing a new structure.
derived_from:
  - ../../dna/governance.md
  - prd/PRD-XXX.md
  - use-case/UC-XXX.md
  - feature/README.md
  - feature/implementation-plan.md
  - feature/short.md
  - feature/large.md
  - adr/ADR-XXX.md
status: active
audience: humans_and_agents
---

# Templates Index

The `memory-bank/flows/templates/` directory stores the reference templates for project documentation. All templates live as governed wrapper documents with `doc_function: template`: the wrapper has its own purpose, while the frontmatter and body of the instantiated document live inside the embedded template contract.

- [PRD-XXX: Product Initiative Name](prd/PRD-XXX.md) - a lean Product Requirements Document for an initiative that is not yet decomposed into one concrete feature slice.
- [UC-XXX: Use Case Name](use-case/UC-XXX.md) - the canonical use case for a stable user or operational scenario.
- [FT-XXX Feature README Template](feature/README.md) - the README template for a feature directory. Answers: how should the feature-level index be structured?
- [FT-XXX: Feature Template - Short](feature/short.md) - the minimal canonical feature document for a small feature. Answers: what does a short feature document look like?
- [FT-XXX: Feature Template - Large](feature/large.md) - a canonical feature document with assumptions, blockers, contracts, and a richer verification layer. Answers: what does a large feature document look like?
- [FT-XXX: Implementation Plan](feature/implementation-plan.md) - the template for a derived execution plan. Answers: how should sequencing and checkpoints be described?
- [ADR-XXX: Short Decision Name](adr/ADR-XXX.md) - the ADR template. Answers: how should an architectural decision be captured?
