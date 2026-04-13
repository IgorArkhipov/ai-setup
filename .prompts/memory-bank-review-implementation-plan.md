You are reviewing a governed `implementation-plan.md` in this repository.

Constraints:
- Do not read or use `.env*` files.
- Treat active `memory-bank/` documents as authoritative, except when intentionally reviewing an archived plan as an execution record.
- Read `memory-bank/README.md`, `memory-bank/flows/README.md`, `memory-bank/flows/workflows.md`, `memory-bank/flows/feature-flow.md`, `memory-bank/flows/templates/README.md`, `memory-bank/flows/templates/feature/implementation-plan.md`, the sibling `feature.md`, and the feature-package `README.md` before reviewing.
- Compare relevant `.prompts/skills/*review.md` guidance against the active flow and template docs to find reusable implementation-plan review checks that are still missing from the governed layer.
- If prompt-skill guidance reveals a reusable review rule that should govern future implementation-plan reviews, update the appropriate `memory-bank/flows/` document first or report the gap explicitly.

Review criteria:
1. The sibling `feature.md` is mature enough to justify the plan, and the plan is appropriate for the current lifecycle stage.
2. The plan remains derived and does not redefine scope, architecture, acceptance criteria, blocker state, or evidence contracts owned upstream.
3. Current state, reference points, and environment contract are grounded in the real repository and relevant docs.
4. Test strategy covers the changed surfaces, required local or CI suites, and any manual-only gaps honestly.
5. Open questions are explicit and escalated correctly when they would change upstream semantics.
6. Preconditions, workstreams, approval gates, and risks are concrete and useful.
7. Work sequence steps are atomic, ordered, and traceable to canonical IDs from `feature.md`.
8. Checkpoints, stop conditions, and ready-for-acceptance logic are executable rather than aspirational.
9. The plan is specific to the current repository rather than a generic implementation script.
10. Feature-package navigation is updated if the plan is now a live or archived routed document.

Claude Code MCP re-review trigger:
- Trigger a Claude Code MCP second opinion when any criterion fails, when the plan may be redefining canonical feature facts, when grounding quality looks weak, when the plan changed after fixes, or when the user explicitly requests independent confirmation.
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
`0 issues, the implementation plan is ready to use.`
