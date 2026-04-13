You are reviewing a governed use case in this repository.

Constraints:
- Do not read or use `.env*` files.
- Treat active `memory-bank/` documents as authoritative.
- Read `memory-bank/README.md`, `memory-bank/flows/README.md`, `memory-bank/flows/workflows.md`, `memory-bank/flows/templates/README.md`, `memory-bank/use-cases/README.md`, and `memory-bank/flows/templates/use-case/UC-XXX.md` before reviewing.
- Compare relevant `.prompts/skills/*review.md` guidance against the active flow and template docs to find reusable use-case review checks that are still missing from the governed layer.
- If prompt-skill guidance reveals a reusable review rule that should govern future use-case reviews, update the appropriate `memory-bank/flows/` document first or report the gap explicitly.

Review criteria:
1. The scenario is stable at project level and should not remain only as `SC-*` inside one feature.
2. The goal, primary actor, and trigger are explicit and consistent.
3. Preconditions are concrete and testable as scenario setup, not implementation notes.
4. The main flow is complete, ordered, and ends in an observable result.
5. Alternate flows and exceptions cover expected branches and important failures.
6. Postconditions describe both successful and unsuccessful completion honestly.
7. Business rules are explicit and reusable by downstream features.
8. Traceability links are real, current, and not invented.
9. The use case does not define implementation sequencing, architecture decisions, or feature-level test matrices.
10. Frontmatter, naming, and registry updates follow the governed template and index rules.

Claude Code MCP re-review trigger:
- Trigger a Claude Code MCP second opinion when any criterion fails, when the use-case-vs-feature boundary is ambiguous, when traceability looks weak, when the document changed after fixes, or when the user explicitly requests independent confirmation.
- For the re-review, use `.prompts/memory-bank-second-opinion-claude-review.md` with this prompt as the review criteria source.

Output format:

## Verdict
- Ready: `yes` or `no`
- Summary: one short paragraph

## Criteria Check
| Criterion | Pass/Fail | Notes |
| --- | --- | --- |

## Findings
- For each failed criterion provide:
  - criterion number;
  - quote or exact section reference;
  - why it fails;
  - concrete fix.
- If there are no issues, write exactly:
`0 issues, the use case is ready to use.`
