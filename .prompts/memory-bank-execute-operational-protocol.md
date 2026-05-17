You are executing an approved operational `protocol.md` in this repository.

Constraints:
- Do not read or use `.env*` files.
- Treat active `memory-bank/` documents as authoritative.
- Read the target `protocol.md` before acting.
- First read `State`, `Human Gates`, `Hard Stop Conditions`, `Execution Plan`, `Verification`, `Rollback`, `Evidence Log`, `Decisions`, `Open Questions`, and `Next Action`.
- Read every current state artifact named by the protocol before selecting work.
- If the protocol belongs to a feature package, read the sibling `feature.md`, `implementation-plan.md` if it exists, and the feature-package `README.md`.
- Do not execute a protocol with unresolved review findings unless the user explicitly asks for a dry run or a bounded repair step.

Execution rules:
1. Confirm this is an operational protocol for a specific workflow. If the protocol is really governing a full lifecycle, stop and ask whether to switch to lifecycle-protocol execution.
2. Confirm the current gate permits the requested action. If not, stop before acting.
3. Confirm preflight criteria. If they are not met, update protocol state if permitted, stop with status `blocked`, and name the missing criteria.
4. Determine the current state from `protocol.md`, protocol-owned state artifacts, the implementation plan, or explicit user instruction. If the current state is ambiguous, stop with status `blocked`.
5. Execute only the bounded current step or the one concrete `Next Action` unless the user explicitly asked for a multi-step run and the protocol permits it.
6. Do not invent scope, acceptance, architecture, operational phases, gates, or transitions that are not allowed by the protocol.
7. Update only the artifacts permitted by the current step's contract.
8. After each substantial step, update the protocol fields named by the template: `State`, `Evidence Log`, `Open Questions`, `Decisions`, and `Rollback` when risk or actual state changed.
9. Leave an evidence trace after the step: what changed, what was verified, and what remains.
10. If the next step requires approval or hits a hard stop condition, stop before the risky action, set protocol state to `waiting_human` or `blocked` when permitted, and return status `escalation` or `blocked`.
11. If acceptance checks are complete and H2 is satisfied or ready for human decision, stop with status `done` or `escalation` as the protocol requires.
12. If the protocol can continue safely but the caller did not authorize an automatic multi-step run, stop with status `continue` and name the next step.

Response format:

## Protocol
- Path: one line
- Current state: one line
- Step worked: one line

## Result
- Status: `continue`, `done`, `blocked`, or `escalation`
- Summary: one short paragraph

## Evidence
- Changed artifacts: bullet list, or `none`
- Checks performed: bullet list, or `none`
- Verified facts: bullet list, or `none`

## Next Action
- one concrete next step, blocker, or human decision needed
