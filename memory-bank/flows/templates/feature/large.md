---
title: "FT-XXX: Feature Template - Large"
doc_kind: feature
doc_function: template
purpose: Governed wrapper template for an extended canonical `feature.md` in AI-driven development. Defines how to instantiate intent, design, and machine-checkable verification without mixing the wrapper with the target feature frontmatter.
derived_from:
  - ../../feature-flow.md
  - ../../../dna/frontmatter.md
  - ../../../engineering/testing-policy.md
status: active
audience: humans_and_agents
template_for: feature
template_target_path: ../../../features/FT-XXX/feature.md
canonical_for:
  - feature_template_large
---

# FT-XXX: Feature Name

This file describes the wrapper template. The instantiated `feature.md` lives below as an embedded contract and is copied without wrapper frontmatter or history.

## Wrapper Notes

Use this template whenever at least one `short.md` rule stops being true: the feature touches multiple surfaces, changes a contract, requires explicit assumptions or blockers, or needs a nontrivial verification layer.

Use stable identifiers from the taxonomy in [../../feature-flow.md#stable-identifiers](../../feature-flow.md#stable-identifiers).

### Frontmatter Quick Ref

The full schema is in [../../../dna/frontmatter.md](../../../dna/frontmatter.md). A standard feature needs:

| Field | Required? | Values / default |
|---|---|---|
| `title` | required | `"FT-XXX: Name"` |
| `doc_kind` | required | `feature` |
| `doc_function` | required | `canonical` |
| `purpose` | required | 1-2 sentences |
| `status` | required | `draft` → `active` → `archived` |
| `derived_from` | required for active docs | upstream documents |
| `delivery_status` | required for features | `planned` → `in_progress` → `done` / `cancelled` |
| `audience` | recommended | `humans_and_agents` |
| `must_not_define` | recommended | what this document does NOT define |

## Instantiated Frontmatter

```yaml
title: "FT-XXX: Feature Name"
doc_kind: feature
doc_function: canonical
purpose: "Extended canonical feature document for a complex or multi-surface delivery unit."
derived_from:
  - ../../domain/problem.md
  # Optional:
  # - ../../prd/PRD-XXX-short-name.md
  # - ../../use-cases/UC-XXX-short-name.md
status: draft
delivery_status: planned
audience: humans_and_agents
must_not_define:
  - implementation_sequence
```

## Instantiated Body

```markdown
# FT-XXX: Feature Name

## What

### Problem

Which symptom, limitation, or opportunity makes this feature necessary. If the general context is already fixed upstream, describe only the feature-specific delivery problem here.

If an upstream PRD exists, this section records only the feature-specific delta relative to the PRD instead of rewriting the whole product document.

If an upstream use case exists, this section captures the feature-specific implementation or change to that scenario rather than the whole project flow.

### Outcome

Describe the outcome as a measurable table.

If a numeric success threshold belongs only to this delivery unit, keep it here. Promote the threshold upstream only after it has a shared owner across multiple features.

| Metric ID | Metric | Baseline | Target | Measurement method |
| --- | --- | --- | --- | --- |
| `MET-01` | What is measured | Starting point | What counts as success | How it is measured |

### Scope

- `REQ-01` What is definitely in the deliverable.
- `REQ-02` Another thing that is definitely in the deliverable.

### Non-Scope

- `NS-01` What is intentionally excluded.
- `NS-02` What the agent must not invent or implement on its own.

### Constraints / Assumptions

- `ASM-01` What the current plan relies on.
- `CON-01` What directly constrains design, rollout, or verification.
- `DEC-01` Which decision is still unresolved and exactly what it blocks.

## How

### Solution

One short paragraph: the main technical approach and the primary trade-off.

### Change Surface

Record where changes are expected.

| Surface | Type | Why it changes |
| --- | --- | --- |
| `path/or/component` | code / config / doc / data | Why this belongs in the change set |

### Flow

1. What comes in.
2. What the system does.
3. What comes out.

### Contracts

Describe inputs, outputs, events, payloads, or schema changes when they are significant for this feature.

| Contract ID | Input / Output | Producer / Consumer | Notes |
| --- | --- | --- | --- |
| `CTR-01` | What changes | Who writes / who reads | What must be respected |

### Failure Modes

- `FM-01` What can go wrong.
- `FM-02` How the system should react.

### ADR Dependencies

If the feature depends on an ADR, record it explicitly.

| ADR | Current `decision_status` | Used for | Execution rule |
| --- | --- | --- | --- |
| [../../adr/ADR-XXX.md](../../adr/ADR-XXX.md) | `proposed` / `accepted` | Which design choice or baseline it supports | `proposed` is only a hypothesis or benchmark candidate and does not count as finalized design; `accepted` may be used as canonical input |

## Verify

`Verify` defines the canonical test case inventory for the delivery unit: positive scenarios through `SC-*`, feature-specific negative coverage through `NEG-*`, executable checks through `CHK-*`, and evidence through `EVID-*`.

### Exit Criteria

- `EC-01` A verifiable sign of completion.
- `EC-02` Another required sign of completion.

### Traceability matrix

| Requirement ID | Design refs | Acceptance refs | Checks | Evidence IDs |
| --- | --- | --- | --- | --- |
| `REQ-01` | `ASM-01`, `CON-01`, `DEC-01`, `CTR-01`, `FM-01` | `EC-01`, `SC-01` | `CHK-01` | `EVID-01` |
| `REQ-02` | `ASM-01`, `CON-01`, `CTR-01`, `FM-02` | `EC-02`, `SC-02` | `CHK-01` | `EVID-01` |

### Acceptance Scenarios

- `SC-01` Primary happy path.
- `SC-02` Required real-world or edge scenario.

### Checks

Verification must be executable.

| Check ID | Covers | How to check | Expected result | Evidence path |
| --- | --- | --- | --- | --- |
| `CHK-01` | `EC-01`, `SC-01` | Command or procedure | What counts as success | Where the artifact is stored |

### Test matrix

| Check ID | Evidence IDs | Evidence path |
| --- | --- | --- |
| `CHK-01` | `EVID-01` | `artifacts/ft-xxx/verify/chk-01/` |

### Evidence

- `EVID-01` Which artifact must exist after verification.

### Evidence contract

| Evidence ID | Artifact | Producer | Path contract | Reused by checks |
| --- | --- | --- | --- | --- |
| `EVID-01` | Log, report, screenshot, or sample output | verify-runner / human | `artifacts/ft-xxx/verify/chk-01/` | `CHK-01` |
```
