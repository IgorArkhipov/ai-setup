---
title: "ADR-XXX: Short Decision Name"
doc_kind: adr
doc_function: template
purpose: Governed wrapper template for an ADR. Read this to instantiate a decision record without mixing wrapper metadata and the future ADR frontmatter.
derived_from:
  - ../../../dna/governance.md
  - ../../../dna/frontmatter.md
status: active
audience: humans_and_agents
template_for: adr
template_target_path: ../../../adr/ADR-XXX.md
---

# ADR-XXX: Short Decision Name

This file describes the wrapper template. The instantiated ADR lives below as an embedded contract and is copied without wrapper frontmatter or history.

## Wrapper Notes

`decision_status: proposed` in the embedded contract below means the ADR text is still a proposal and does not count as an accepted decision until the instantiated ADR is moved to `accepted`.

## Instantiated Frontmatter

```yaml
title: "ADR-XXX: Short Decision Name"
doc_kind: adr
doc_function: canonical
purpose: "Records an architectural or engineering decision, its current `decision_status`, and its consequences."
derived_from:
  - ../features/FT-XXX/feature.md
status: draft
decision_status: proposed
date: YYYY-MM-DD
audience: humans_and_agents
must_not_define:
  - current_system_state
  - implementation_plan
```

## Instantiated Body

```markdown
# ADR-XXX: Short Decision Name

## Context

Which problem, constraint, trade-off, or architectural tension needs to be resolved.

## Decision Drivers

- which requirements or constraints affect the choice;
- which KPI, operational, or product factors matter;
- which dependencies and previously accepted decisions must be respected.

## Options Considered

| Option | Pros | Cons | Why it is or is not the leading candidate |
| --- | --- | --- | --- |
| `Option A` | What it provides | Which limitations it introduces | Reasoning behind the choice |

## Decision

For `decision_status: proposed`, describe the proposed direction here and avoid final-language wording such as "selected", "finally rejected", or "accepted" until the ADR moves to `accepted`. After moving to `accepted`, update the wording so the section records the adopted decision, its scope, and the affected components.

## Consequences

### Positive

What becomes simpler, better, or newly possible.

### Negative

Which limitations, debt, or additional costs appear.

### Neutral / Organizational

Which documents, processes, or areas of responsibility must be updated after the decision is accepted.

## Risks And Mitigation

Which risks remain after the choice and how they are reduced.

## Follow-up

Which downstream documents, tasks, benchmarks, or migrations should follow from this decision.

## Related Links

- feature, spec, or analysis documents that provide context;
- related ADRs when this decision depends on them or refines them.
```
