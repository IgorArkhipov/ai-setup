---
name: ADR Generation
description: Draft or update an ADR and immediately route it through the governed ADR review flow.
when_to_use: Use this skill when a durable architecture or engineering decision must be recorded explicitly.
---

# ADR Generation

Use this skill when a durable architecture or engineering decision must be recorded explicitly.

## Execution

1. Use `../memory-bank-create-adr.md`.
2. Immediately follow with `adr-review.md`.
3. If review finds issues or the ADR changes materially, use `review-loop.md`.

## Preserve

- real decision, not notes;
- meaningful options and decision drivers;
- status-consistent decision wording;
- explicit consequences and follow-up.
