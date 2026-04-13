---
title: Project Problem Statement
doc_kind: domain
doc_function: canonical
purpose: Canonical description of the product, problem space, and target outcomes. Read this before feature specs so the same general context is not repeated in every delivery unit.
derived_from:
  - ../dna/governance.md
status: active
audience: humans_and_agents
canonical_for:
  - project_problem_statement
  - product_context
  - top_level_outcomes
---

# Project Problem Statement

This document records the overall product context of the project. Feature documents should reference it instead of rewriting the same background every time.

If a PRD is needed, it does not replace this document. It narrows a particular initiative relative to the already documented project-wide context.

## Boundary With PRD

- `domain/problem.md` holds project-wide context: the product, key workflows, top-level outcomes, and persistent constraints.
- `prd/PRD-XXX-short-name.md` is the initiative layer: which product problem is being worked on now, for which users, and with what scope.
- If a new document only repeats the general background of the project and introduces no initiative-specific scope, a PRD is unnecessary.

## Product Context

Describe the project in 2 to 4 short paragraphs:

- who the primary users are;
- which job the system helps them do;
- why the current solution is insufficient;
- what the boundaries of the product or platform are.

Example:

> The team maintains an internal SaaS platform for operational automation. Users expect predictable workflows, transparent statuses, and fast access to critical actions. Any new feature should either reduce operational load, reduce the risk of mistakes, or shorten the path to the user's target outcome.

## Core Workflows

- `WF-01` Primary user workflow number one.
- `WF-02` Primary user workflow number two.
- `WF-03` Internal or operational workflow that must not break.

## Outcomes

| Metric ID | Metric | Baseline | Target | Measurement method |
| --- | --- | --- | --- | --- |
| `MET-01` | What counts as product-level success | Current state | Desired level | How it is measured |

## Constraints

- `PCON-01` A domain constraint that affects most downstream features.
- `PCON-02` An integration, compliance, or performance constraint.

## Source Documents

- Add links to PRDs, roadmap documents, customer research, or other upstream artifacts here if they exist.
- If there are no upstream sources yet, say so explicitly rather than inventing them.
