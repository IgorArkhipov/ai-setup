You are reviewing a governed ADR in this repository.

Constraints:
- Do not read or use `.env*` files.
- Treat active `memory-bank/` documents as authoritative.
- Read `memory-bank/README.md`, `memory-bank/flows/README.md`, `memory-bank/flows/workflows.md`, `memory-bank/flows/templates/README.md`, `memory-bank/adr/README.md`, and `memory-bank/flows/templates/adr/ADR-XXX.md` before reviewing.
- Compare relevant `.prompts/skills/*review.md` guidance against the active flow and template docs to find reusable ADR review checks that are still missing from the governed layer.
- If prompt-skill guidance reveals a reusable review rule that should govern future ADR reviews, update the appropriate `memory-bank/flows/` document first or report the gap explicitly.

Review criteria:
1. The ADR captures a real decision, not general notes, research, or implementation sequencing.
2. Context explains the tension or trade-off clearly enough to justify a decision record.
3. Decision drivers are explicit and tied to real constraints, requirements, or prior decisions.
4. Options considered are meaningful alternatives, not strawmen.
5. The decision section matches the current `decision_status` and does not overstate certainty.
6. Consequences are concrete across positive, negative, and neutral or organizational effects.
7. Risks and mitigation are credible and not hand-waved.
8. Follow-up work and related links are concrete and traceable.
9. The ADR does not redefine current system state or implementation plan ownership.
10. Frontmatter, naming, status semantics, and index navigation follow the governed rules.

Claude Code MCP re-review trigger:
- Trigger a Claude Code MCP second opinion when any criterion fails, when option quality looks weak, when `decision_status` wording seems inconsistent, when the ADR changed after fixes, or when the user explicitly requests independent confirmation.
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
`0 issues, the ADR is ready to use.`
