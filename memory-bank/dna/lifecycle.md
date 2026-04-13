---
doc_kind: governance
doc_function: canonical
purpose: Maintenance rules and sync checklist for governed documents.
derived_from:
  - governance.md
status: active
---
# Document Lifecycle

Rules that keep governed documentation consistent as the project changes.

## Maintenance Rules

1. **Upstream first.** When you change a fact, first find and update its canonical owner.
2. **Downstream sync.** After changing an upstream document, check any document that depends on it through `derived_from`.
3. **README sync.** If a document is added, removed, or renamed, update the parent README.
4. **Conflict = defect.** Any divergence inside the authoritative set should be treated as a defect and resolved immediately.
5. **Conflict = report, not fix.** If an agent discovers a mismatch while reading, it should record it as a finding and report it to a human. Autonomous repair is allowed only if the current task explicitly requires editing that document.

## Sync Checklist

Before finalizing changes to governed documentation:

- [ ] frontmatter is valid, and every `active` non-root document defines `derived_from`
- [ ] canonical `feature` documents define `delivery_status`, and canonical `adr` documents define `decision_status`
- [ ] the parent `README.md` is updated when membership or reading order changes
