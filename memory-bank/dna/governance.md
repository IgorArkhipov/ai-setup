---
doc_kind: governance
doc_function: canonical
purpose: SSoT implementation and dependency tree rules. Answers the question of which document owns which fact.
derived_from:
  - principles.md
status: active
---
# Document Governance

A `governed document` is a Markdown file inside `memory-bank/` with valid YAML frontmatter. The SSoT principle is defined in [principles.md](principles.md). This document defines the mechanism that enforces it.

## SSoT Implementation

1. Only `active` documents are authoritative. A `draft` document does not override an `active` one.
2. Among status-eligible documents, upstream wins: first `canonical_for`, then the dependency tree.
3. Publication status (`status`) is separate from entity lifecycle status (`delivery_status`, `decision_status`).

## Source Dependency Tree

1. The `derived_from` field lists direct upstream documents. Authority flows upstream → downstream.
2. The root document is `principles.md` and has no `derived_from`. Every `active` non-root document must define `derived_from`.
3. Cyclic dependencies are forbidden. Changing an upstream document may require downstream updates.

## Governance-specific Frontmatter Fields

Governance documents (DNA and flows) use additional fields that are outside the shared schema in [`frontmatter.md`](frontmatter.md):

| Field | Values | Purpose |
|-|-|-|
| `doc_kind` | `governance`, `project` | Document type. Governance means meta-rules; project means domain or ops-level content |
| `doc_function` | `canonical`, `index`, `template` | Role: canonical fact owner, navigation index, or template |

These fields are required for governance documents and are not required in domain, ops, or engineering documents.
