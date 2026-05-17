You are reviewing a lifecycle `protocol.md` in this repository.

Constraints:
- Do not read or use `.env*` files.
- Treat active `memory-bank/` documents as authoritative.
- Read `memory-bank/README.md`, `memory-bank/flows/README.md`, `memory-bank/flows/workflows.md`, `memory-bank/flows/agent-process-operations.md`, `memory-bank/flows/templates/README.md`, and `memory-bank/flows/templates/protocol/lifecycle-protocol.md` before reviewing.
- If the lifecycle protocol belongs to a feature package, also read the sibling `feature.md`, `implementation-plan.md` if it exists, and the feature-package `README.md`.
- Compare `.prompts/skills/lifecycle-protocol-review.md` against active `memory-bank/flows/` rules to find reusable protocol-review checks that are still missing from the governed layer.
- If prompt-skill guidance reveals a durable review rule that should govern future process protocols, update the appropriate `memory-bank/flows/` document first or report the gap explicitly.

Review criteria:
1. The protocol names the source material and gives an interpretation when the source was externally supplied.
2. The protocol exists before risky work starts, or honestly records that downstream work already existed as baseline.
3. The protocol is the right artifact for a repeatable lifecycle and is not merely an implementation plan or one run's chat summary.
4. Goal and boundaries are understandable, including explicit out-of-scope work.
5. Current facts are separated from unchecked hypotheses and include evidence.
6. Roles and permissions are not vague; allowed and forbidden actions are clear.
7. Human Gates H1/H2/H3 say what must happen before scoped execution, commit or production go/no-go, and destructive or irreversible actions.
8. Hard stop conditions include production impact, secrets, destructive actions, unrelated diffs, missing rollback, and unclear approval.
9. Verification is separated from release and operation.
10. Rollback or recovery is described before risky actions.
11. Evidence Log is ready to receive verified facts, commands, and artifact links.
12. Next Action contains exactly one concrete action.
13. Lifecycle states and transitions are complete enough for an agent to know the current state without guessing.
14. The primary Mermaid diagram, if present, matches the written step contract.
15. Each phase or step names the artifacts it reads, the artifacts it may update, the evidence it must leave, and the next allowed statuses.
16. The observable runner contract is executable and returns only `continue`, `done`, `blocked`, or `escalation`.
17. Handoff and resume behavior is safe for long-running or interrupted work; the protocol can be resumed from `protocol.md` without chat memory.
18. The protocol respects upstream governed owners and does not redefine product scope, architecture, acceptance criteria, or implementation facts.
19. External phase names from the source playbook are mapped to this repository's current governed document model and do not create new legacy `brief.md`, `spec.md`, or `plan.md` feature-package artifacts.
20. Open questions, blockers, and source-access limitations are explicit rather than hidden in optimistic prose.
21. Navigation and nearby indexes are updated if this protocol becomes a durable governed artifact.

Claude Code MCP re-review trigger:
- Trigger a Claude Code MCP second opinion when any criterion fails, when the source interpretation is uncertain, when the protocol may redefine upstream facts, when the execution contract is ambiguous, when the protocol changed after fixes, or when the user explicitly requests independent confirmation.
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
`0 issues, the lifecycle protocol is ready to use.`
