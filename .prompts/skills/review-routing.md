# Review Routing

Use this skill when a governed document exists and needs the correct review gate.

## Execution

1. Use `../memory-bank-route-review.md`.
2. Continue with exactly one of:
   - `prd-review.md`
   - `use-case-review.md`
   - `adr-review.md`
   - `feature-review.md`
   - `implementation-plan-review.md`
3. If the review route says Claude Code MCP re-review should run, follow with `review-loop.md`.

## Preserve

- correct review-to-document matching;
- boundary checks between document types;
- independent re-review when risk or ambiguity is high.
