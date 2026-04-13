---
doc_kind: governance
doc_function: canonical
purpose: Rules for two-way navigation between code and documentation.
derived_from:
  - principles.md
status: active
---
# Cross-references (code ↔ docs)

The goal is to maintain two-way navigation:

- from code to architecture or feature specs,
- from documentation to implementation and tests.

## Code → docs

A module that implements documented behavior should contain a reference comment pointing to the canonical document.

Minimum contract:
1. The link points to a path relative to the repository root.
2. The annotation explains which part of the document is relevant to this module.

## Docs → code (target)

Documentation may link to files and lines once the code exists. Every such link must be annotated: what the reader will find there, and why it is worth opening.
