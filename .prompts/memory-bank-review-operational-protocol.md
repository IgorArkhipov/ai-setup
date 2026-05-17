You are reviewing an operational `protocol.md` in this repository.

Constraints:
- Do not read or use `.env*` files.
- Treat active `memory-bank/` documents as authoritative.
- Read `memory-bank/README.md`, `memory-bank/flows/README.md`, `memory-bank/flows/workflows.md`, `memory-bank/flows/agent-process-operations.md`, `memory-bank/flows/templates/README.md`, and `memory-bank/flows/templates/protocol/operational-protocol.md` before reviewing.
- If the operational protocol belongs to a feature package, also read the sibling `feature.md`, `implementation-plan.md` if it exists, and the feature-package `README.md`.
- Compare `.prompts/skills/operational-protocol-review.md` against active `memory-bank/flows/` rules to find reusable operational protocol review checks that are still missing from the governed layer.
- If prompt-skill guidance reveals a durable review rule that should govern future operational protocols, update the appropriate `memory-bank/flows/` document first or report the gap explicitly.

Review criteria:
1. The protocol is appropriate for a specific operational workflow; if upstream lifecycle phases are still missing, it should use the lifecycle protocol instead.
2. The protocol names the source material and gives an interpretation when the source was externally supplied.
3. Goal and boundaries are understandable, including explicit out-of-scope work.
4. Current facts and baseline evidence are concrete enough to start from.
5. Operating constraints include technical, security/compliance, and production-safety constraints when relevant.
6. Roles and permissions are not vague; allowed and forbidden actions are clear.
7. Human Gates H1/H2/H3 say what must happen before execution starts, before acceptance or commit-point continuation, and before destructive or irreversible actions.
8. Hard stop conditions include secrets, unclear rollout ownership, missing rollback before high-risk action, and workflow-specific risks.
9. The execution plan is focused on Preflight, Implementation, and Verification And Acceptance, or explains any custom operational phase split.
10. Verification checks are explicit and separated from acceptance decisions.
11. Rollback or recovery is described before risky actions.
12. Evidence Log is ready to receive verified facts, commands, and artifact links.
13. Decisions and Open Questions are present and usable.
14. Next Action contains exactly one concrete action.
15. The protocol can be resumed from `protocol.md` without chat memory.
16. The protocol respects upstream governed owners and does not redefine product scope, architecture, acceptance criteria, or implementation facts.
17. Navigation and nearby indexes are updated if this protocol becomes a durable governed artifact.

Claude Code MCP re-review trigger:
- Trigger a Claude Code MCP second opinion when any criterion fails, when source interpretation is uncertain, when the operational workflow may need a lifecycle protocol instead, when the execution contract is ambiguous, when the protocol changed after fixes, or when the user explicitly requests independent confirmation.
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
`0 issues, the operational protocol is ready to use.`
