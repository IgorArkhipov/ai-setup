---
title: Product Requirements Documents Index
doc_kind: prd
doc_function: index
purpose: Navigation for instantiated project PRDs. Read this to find an existing Product Requirements Document or create a new one from the template.
derived_from:
  - ../dna/governance.md
  - ../flows/templates/prd/PRD-XXX.md
status: active
audience: humans_and_agents
---

# Product Requirements Documents Index

The `memory-bank/prd/` directory stores instantiated PRDs for the project.

A PRD is needed when the work lives at the level of a product initiative or capability rather than a single vertical slice. Usually a PRD sits between the general context from [`../domain/problem.md`](../domain/problem.md) and downstream feature packages from [`../features/README.md`](../features/README.md).

## Boundary With `domain/problem.md`

- [`../domain/problem.md`](../domain/problem.md) remains the project-wide document and should not be turned into a PRD.
- A PRD inherits that context through `derived_from`, but records only the initiative-specific problem, users, goals, and scope.
- If a document exists only to repeat the general background of the project, stay at the `domain/problem.md` level.

## When To Create A PRD

- the initiative decomposes into multiple feature packages;
- users, goals, product scope, and success metrics need to be fixed before implementation design starts;
- there is a risk of mixing product requirements with architecture or design detail.

## When A PRD Is Not Needed

- the task is local and fits entirely inside one `feature.md`;
- the general product context is already covered by [`../domain/problem.md`](../domain/problem.md), and the feature does not need a separate product-layer document.

## Naming

- File format: `PRD-XXX-short-name.md`
- Replace `XXX` with the stable identifier used by the project: initiative ID, epic ID, or another stable key
- One PRD may be upstream for multiple feature packages

## Template

- Use the template [`../flows/templates/prd/PRD-XXX.md`](../flows/templates/prd/PRD-XXX.md)
