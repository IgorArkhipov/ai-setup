You are reviewing a governed canonical `feature.md` in this repository.

Constraints:
- Do not read or use `.env*` files.
- Treat active `memory-bank/` documents as authoritative.
- Read `memory-bank/README.md`, `memory-bank/flows/README.md`, `memory-bank/flows/workflows.md`, `memory-bank/flows/feature-flow.md`, `memory-bank/flows/templates/README.md`, `memory-bank/features/README.md`, and the matching feature template (`short.md` or `large.md`) before reviewing.
- Compare relevant `.prompts/skills/*review.md` guidance against the active flow and template docs to find reusable feature-review checks that are still missing from the governed layer.
- If prompt-skill guidance reveals a reusable review rule that should govern future feature reviews, update the appropriate `memory-bank/flows/` document first or report the gap explicitly.

Review criteria:
1. The document is the right delivery unit and belongs in a feature package.
2. The chosen template is correct: `short.md` is used only if every short-template rule holds; otherwise the feature should be `large.md`.
3. Frontmatter, lifecycle state, and upstream links are correct for the current stage.
4. `What` contains a concrete problem plus explicit `REQ-*` and `NS-*`.
5. `How` is specific enough to describe the delivery slice without drifting into step-by-step implementation planning.
6. If present, assumptions, constraints, contracts, decisions, failure modes, or ADR dependencies are explicit and internally consistent.
7. `Verify` is executable and complete for the current stage: `SC-*`, `CHK-*`, and `EVID-*` exist and remain coherent.
8. Traceability from `REQ-*` to acceptance refs, checks, and evidence is complete and honest.
9. The feature does not hide missing scope, blockers, or acceptance decisions in vague prose.
10. The document satisfies the current lifecycle gate it claims to satisfy, especially Design Ready when `status: active`.
11. Registry and feature-package navigation are current if the feature is new or materially changed.

Claude Code MCP re-review trigger:
- Trigger a Claude Code MCP second opinion when any criterion fails, when template choice is debatable, when traceability or verification quality looks weak, when the feature changed after fixes, or when the user explicitly requests independent confirmation.
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
`0 issues, the feature document is ready to use.`
