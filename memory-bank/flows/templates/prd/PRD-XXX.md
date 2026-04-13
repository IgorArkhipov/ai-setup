---
title: "PRD-XXX: Product Initiative Name"
doc_kind: prd
doc_function: template
purpose: Governed wrapper template for a PRD. Read this to instantiate a compact Product Requirements Document without mixing wrapper metadata and the future PRD frontmatter.
derived_from:
  - ../../../dna/governance.md
  - ../../../dna/frontmatter.md
  - ../../../domain/problem.md
status: active
audience: humans_and_agents
template_for: prd
template_target_path: ../../../prd/PRD-XXX-short-name.md
canonical_for:
  - prd_template
---

# PRD-XXX: Product Initiative Name

This file describes the wrapper template. The instantiated PRD lives below as an embedded contract and is copied without the wrapper frontmatter or history.

## Wrapper Notes

The PRD in this template is intentionally lean. It records the product problem, users, goals, scope, and success metrics, but does not take over implementation sequencing, architectural decisions, or the verify and evidence contracts of downstream feature packages.

The PRD builds on `domain/problem.md` rather than replacing it. Do not copy the entire project-wide context into the PRD if it is already stable upstream.

Use a PRD as an upstream layer between overall project context and multiple feature packages. If the initiative is local and does not need a separate product-layer document, a PRD can be skipped.

## Instantiated Frontmatter

```yaml
title: "PRD-XXX: Product Initiative Name"
doc_kind: prd
doc_function: canonical
purpose: "Records the product problem, target users, goals, scope, and success metrics of the initiative."
derived_from:
  - ../domain/problem.md
status: draft
audience: humans_and_agents
must_not_define:
  - implementation_sequence
  - architecture_decision
  - feature_level_verify_contract
```

## Instantiated Body

```markdown
# PRD-XXX: Product Initiative Name

## Problem

Which user or business problem the initiative solves. Describe the problem space, not the solution. Reference the overall context from `../domain/problem.md` and record only the initiative-specific delta.

## Users And Jobs

Who the primary user is and what job they are trying to do.

| User / Segment | Job To Be Done | Current Pain |
| --- | --- | --- |
| `primary-user` | What they want to accomplish | What blocks them today |

## Goals

- `G-01` Which product outcome is mandatory.
- `G-02` Which additional outcome is desirable.

## Non-Goals

- `NG-01` What is intentionally out of scope.
- `NG-02` What must not be guessed or invented during implementation.

## Product Scope

Describe scope at the capability level, not as a change set.

### In Scope

- What should become possible for the user or the system.

### Out Of Scope

- What stays outside the initiative boundary.

## UX / Business Rules

- `BR-01` An important product or operational rule.
- `BR-02` A constraint that every downstream feature must respect.

## Success Metrics

| Metric ID | Metric | Baseline | Target | Measurement method |
| --- | --- | --- | --- | --- |
| `MET-01` | What is measured | Starting point | What counts as success | How it is measured |

## Risks And Open Questions

- `RISK-01` What may derail the initiative at product level.
- `OQ-01` Which unknown is still unresolved.

## Downstream Features

List the expected feature packages if they are already known.

| Feature | Why it exists | Status |
| --- | --- | --- |
| `FT-XXX` | Which slice it implements | planned / draft / active |
```
