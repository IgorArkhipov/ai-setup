---
doc_kind: governance
doc_function: canonical
purpose: Schema for required and conditionally required YAML frontmatter fields.
derived_from:
  - governance.md
status: active
---
# Frontmatter Schema

## Required

| Field | Type | Description |
|---|---|---|
| `status` | enum | `draft` / `active` / `archived` |

## Conditionally Required

| Field | When | Description |
|---|---|---|
| `derived_from` | An upstream document exists | Direct upstream dependencies. Each item is either a string path or an object `{path, fit}`, where `fit` explains the dependency scope |
| `delivery_status` | Feature documents | `planned` / `in_progress` / `done` / `cancelled` |
| `decision_status` | ADR documents | `proposed` / `accepted` / `superseded` / `rejected` |

## Additional Fields

Governed documents may contain additional fields not described in this schema. Extra fields do not need to be registered here and are interpreted at the level of the specific `doc_kind` or flow.

## Examples

```yaml
---
derived_from:
  - ../../domain/problem.md
status: active
delivery_status: planned
---
```

```yaml
---
derived_from:
  - ../feature.md
  - path: ../../../adr/ADR-001-model-stack.md
    fit: "only the selected models and VRAM constraints are used"
status: active
---
```
