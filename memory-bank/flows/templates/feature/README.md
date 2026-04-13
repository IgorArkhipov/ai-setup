---
title: FT-XXX Feature README Template
doc_kind: feature
doc_function: template
purpose: Governed wrapper template for feature-level `README.md`. Read this to instantiate a bootstrap-safe routing layer for a feature without mixing wrapper metadata and the target README frontmatter.
derived_from:
  - ../../feature-flow.md
  - ../../../dna/frontmatter.md
status: active
audience: humans_and_agents
template_for: feature
template_target_path: ../../../features/FT-XXX/README.md
---

# FT-XXX Feature Template

This file describes the template wrapper itself. The instantiated feature README lives below as an embedded contract and is copied into the feature package without the wrapper frontmatter or history.

## Wrapper Notes

The `memory-bank/flows/templates/feature/` directory contains the wrapper templates for a feature package: this README template, canonical feature templates for short and large features, and the derived template for `implementation-plan.md`. When creating a new feature package, the embedded README should stay bootstrap-safe: at first it routes only to the instantiated `feature.md`, and optional `implementation-plan.md` plus related ADRs are added only after those documents exist.

Optional routes for a living feature package are added after the corresponding documents appear. Typical post-bootstrap routes:

- [`implementation-plan.md`](implementation-plan.md)
  Read this when you need to break implementation into steps, workstreams, checkpoints, and traceability to canonical IDs.
  Answers the question: how do we move this feature from the current state to acceptance?

- `../../../adr/ADR-XXX.md`
  Read this when the feature has a related ADR that needs to be created or checked with the correct `decision_status`.
  Answers the question: why is this architectural or engineering decision being chosen for the feature, and what stage is it in?

## Instantiated Frontmatter

```yaml
title: "FT-XXX: Feature Package"
doc_kind: feature
doc_function: index
purpose: "Bootstrap-safe navigation for feature documentation. Read this to reach the canonical `feature.md` first; add optional derived docs only after they exist."
derived_from:
  - ../../dna/governance.md
  - feature.md
status: active
audience: humans_and_agents
```

## Instantiated Body

```markdown
# FT-XXX: Feature Package

## About This Section

The feature package directory stores the canonical `feature.md`. Optional derived or external routes are added only after the corresponding documents exist. Read `feature.md` first, then expand routing as execution and decision artifacts appear.

## Annotated Index

- [`feature.md`](feature.md)
  Read this when you need to open the instantiated canonical feature document immediately after bootstrapping a new feature package.
  Answers the question: where are the scope, design, verification, blockers, and canonical IDs for this feature?
```
