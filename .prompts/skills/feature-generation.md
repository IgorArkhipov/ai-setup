---
name: Feature Generation
description: Bootstrap or update a governed feature package and immediately run the matching feature review.
when_to_use: Use this skill when the work belongs in a governed feature package rather than a PRD, use case, ADR, or implementation plan.
---

# Feature Generation

Use this skill when the work belongs in a governed feature package.

## Execution

1. If document type is still unclear, start with `document-routing.md`.
2. Use `../memory-bank-create-feature.md`.
3. Immediately follow with `feature-review.md`.
4. If review finds issues or the feature changes materially, use `review-loop.md`.

## Preserve

- correct template choice: `short.md` vs `large.md`;
- explicit `REQ-*`, `NS-*`, and governed verification;
- delivery-slice focus;
- no premature `implementation-plan.md`.
