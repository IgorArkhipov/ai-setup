---
title: "FT-XXX: Feature Template - Short"
doc_kind: feature
doc_function: template
purpose: Governed wrapper template for a short canonical `feature.md` in AI-driven development. Read this to instantiate the minimal feature contract without mixing the wrapper and the target frontmatter.
derived_from:
  - ../../feature-flow.md
  - ../../../dna/frontmatter.md
  - ../../../engineering/testing-policy.md
status: active
audience: humans_and_agents
template_for: feature
template_target_path: ../../../features/FT-XXX/feature.md
canonical_for:
  - feature_template_short
---

# FT-XXX: Feature Name

This file describes the wrapper template. The instantiated `feature.md` lives below as an embedded contract and is copied without wrapper frontmatter or history.

## Wrapper Notes

Use this template only if the feature fits into one local slice and can be described with `REQ-*`, `NS-*`, one `SC-*`, at most one `CON-*`, one `EC-*`, one `CHK-*`, and one `EVID-*`.

If you need `ASM-*`, `DEC-*`, `CTR-*`, `FM-*`, feature-specific negative cases, more than one acceptance scenario, more than one `CHK-*` / `EVID-*`, or explicit ADR-dependent design logic, upgrade to `large.md` before continuing. The meaning of prefixes is defined in [../../feature-flow.md](../../feature-flow.md#stable-identifiers).

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
purpose: "Short canonical feature document for a small and local delivery unit."
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

Which concrete problem or opportunity this feature addresses.

If an upstream PRD exists, do not rewrite the entire product context here. Focus on the slice-specific problem statement.

If an upstream use case exists, record only how the current delivery unit implements or changes that scenario.

### Scope

- `REQ-01` What is definitely included.
- `REQ-02` Another thing that is definitely included.

### Non-Scope

- `NS-01` What we explicitly do not do.

### Constraints

- `CON-01` Which constraint defines the boundaries of the solution.

## How

### Solution

One short paragraph: the main approach and the key trade-off.

### Change Surface

| Surface | Why |
| --- | --- |
| `path/or/component` | Why it changes |

### Flow

1. Input.
2. Processing.
3. Output.

## Verify

### Exit Criteria

- `EC-01` What must be true after implementation.

### Acceptance Scenarios

- `SC-01` The primary happy path and canonical positive test case for this delivery unit.

### Traceability matrix

| Requirement ID | Design refs | Acceptance refs | Checks | Evidence IDs |
| --- | --- | --- | --- | --- |
| `REQ-01` | `CON-01` | `EC-01`, `SC-01` | `CHK-01` | `EVID-01` |
| `REQ-02` | `CON-01` | `EC-01`, `SC-01` | `CHK-01` | `EVID-01` |

### Checks

Verification must be executable and must define at least one explicit test case through `SC-01`.

| Check ID | Covers | How to check | Expected |
| --- | --- | --- | --- |
| `CHK-01` | `EC-01`, `SC-01` | Command or procedure | Expected result |

### Test matrix

| Check ID | Evidence IDs | Evidence path |
| --- | --- | --- |
| `CHK-01` | `EVID-01` | `artifacts/ft-xxx/verify/chk-01/` |

### Evidence

- `EVID-01` Which artifact should remain after verification.

### Evidence contract

| Evidence ID | Artifact | Producer | Path contract | Reused by checks |
| --- | --- | --- | --- | --- |
| `EVID-01` | Minimal verification artifact | verify-runner / human | `artifacts/ft-xxx/verify/chk-01/` | `CHK-01` |
```
