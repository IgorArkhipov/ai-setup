---
name: Review Loop
description: Re-run the correct governed review after fixes and trigger independent re-review when the risk warrants it.
when_to_use: Use this skill after an initial governed review has run and the document was fixed, changed materially, or still needs independent confirmation.
---

# Review Loop

Use this skill after an initial governed review has run.

## Execution

1. Fix the document using the findings from the first review.
2. Re-run the matching primary review prompt:
   - PRD -> `../memory-bank-review-prd.md`
   - use case -> `../memory-bank-review-use-case.md`
   - ADR -> `../memory-bank-review-adr.md`
   - feature -> `../memory-bank-review-feature.md`
   - implementation plan -> `../memory-bank-review-implementation-plan.md`
3. Trigger `../memory-bank-second-opinion-claude-review.md` when:
   - the first review found significant issues;
   - the document boundary is still debatable;
   - the document changed materially after fixes;
   - the user asks for an independent second opinion.
4. Compare overlap and disagreement before treating the document as accepted input.

## Preserve

- no silent acceptance after material fixes;
- independent re-review for risky or ambiguous cases;
- clear compare-and-resolve behavior after Claude Code MCP review.
