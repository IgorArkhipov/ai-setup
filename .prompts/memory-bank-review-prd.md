You are reviewing a governed PRD in this repository.

Constraints:
- Do not read or use `.env*` files.
- Treat active `memory-bank/` documents as authoritative.
- Read `memory-bank/README.md`, `memory-bank/flows/README.md`, `memory-bank/flows/workflows.md`, `memory-bank/flows/templates/README.md`, `memory-bank/prd/README.md`, and `memory-bank/flows/templates/prd/PRD-XXX.md` before reviewing.
- Compare relevant `.prompts/skills/*review.md` guidance against the active flow and template docs to find reusable PRD review checks that are still missing from the governed layer.
- If prompt-skill guidance reveals a reusable review rule that should govern future PRD reviews, update the appropriate `memory-bank/flows/` document first or report the gap explicitly.

Review criteria:
1. The document is actually initiative-level and should not be a single feature package instead.
2. The problem is concrete, initiative-specific, and does not merely restate `domain/problem.md`.
3. Users and jobs are explicit and tied to real pain, not vague personas.
4. Goals, non-goals, and product scope are concrete and internally consistent.
5. UX or business rules are explicit enough for downstream features to inherit safely.
6. Success metrics have a measurable target and a believable measurement method.
7. Risks and open questions are honest and do not hide missing scope decisions.
8. The PRD does not define implementation sequencing, architecture decisions, or feature-level verify contracts.
9. Frontmatter and naming are consistent with the governed template and index rules.
10. `memory-bank/prd/README.md` is updated if this PRD is new or materially renamed.

Claude Code MCP re-review trigger:
- Trigger a Claude Code MCP second opinion when any criterion fails, when the initiative-vs-feature boundary is ambiguous, when the PRD changed after fixes, or when the user explicitly requests independent confirmation.
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
`0 issues, the PRD is ready to use.`
