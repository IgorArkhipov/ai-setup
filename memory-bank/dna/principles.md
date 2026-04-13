---
doc_kind: governance
doc_function: canonical
purpose: Fundamental principles of project documentation. Root document of the dependency tree.
status: active
---
# Principles

1. **SSoT.** Every fact has exactly one canonical owner. Duplication is a defect.
2. **Atomicity.** One file = one topic. If it grows too large, split it.
3. **Compactness.** A document should stay readable. If it grows too large, split it.
4. **Progressive disclosure.** Start with the overview, then link deeper. Top down.
5. **WHY / WHAT / HOW.** `adr/` explains why, `feature/` and specs explain what, code explains how.
6. **Code vs Docs.** Code owns implementation. Documentation owns intent, rationale, and contracts.
7. **Index-first.** Every document must appear in an index. An orphan file is a defect.
8. **Annotated links.** A link should explain what is behind it and why it is worth reading.
9. Every architectural decision should live in a separate ADR in a dedicated section.
