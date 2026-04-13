---
title: "UC-XXX: Use Case Name"
doc_kind: use_case
doc_function: template
purpose: Governed wrapper template for a use case. Read this to instantiate a canonical user or operational scenario without mixing wrapper metadata and the future use case frontmatter.
derived_from:
  - ../../../dna/governance.md
  - ../../../dna/frontmatter.md
  - ../../../domain/problem.md
status: active
audience: humans_and_agents
template_for: use_case
template_target_path: ../../../use-cases/UC-XXX-short-name.md
canonical_for:
  - use_case_template
---

# UC-XXX: Use Case Name

This file describes the wrapper template. The instantiated use case lives below as an embedded contract and is copied without the wrapper frontmatter or history.

## Wrapper Notes

A use case captures a stable project scenario. It describes the trigger, preconditions, main flow, alternatives, and postconditions, but does not dive into implementation sequencing, architecture, or feature-level verification.

If the scenario is too local and exists only inside one delivery unit, do not promote it into `UC-*`. Keep it as `SC-*` in the corresponding feature instead.

## Instantiated Frontmatter

```yaml
title: "UC-XXX: Use Case Name"
doc_kind: use_case
doc_function: canonical
purpose: "Captures a stable user or operational scenario of the project."
derived_from:
  - ../domain/problem.md
  # Optional:
  # - ../prd/PRD-XXX-short-name.md
status: draft
audience: humans_and_agents
must_not_define:
  - implementation_sequence
  - architecture_decision
  - feature_level_test_matrix
```

## Instantiated Body

```markdown
# UC-XXX: Use Case Name

## Goal

Which outcome the actor should receive after a successful run of the scenario.

## Primary Actor

Who initiates the scenario.

## Trigger

Which event or intention starts the flow.

## Preconditions

- What must be true before the scenario starts.
- Which data, permissions, or system state are required.

## Main Flow

1. First step of the scenario.
2. Second step of the scenario.
3. Observable result.

## Alternate Flows / Exceptions

- `ALT-01` How the scenario branches under an expected alternative.
- `EX-01` Which failure or rejection must be handled correctly.

## Postconditions

- What is true after successful completion.
- What remains true after unsuccessful completion.

## Business Rules

- `BR-01` A rule that every implementation of this scenario must obey.
- `BR-02` A constraint or policy that affects the flow.

## Traceability

| Upstream / Downstream | References |
| --- | --- |
| PRD | `PRD-XXX` / `none` |
| Features | `FT-XXX`, `FT-YYY` |
| ADR | `ADR-XXX` / `none` |
```
