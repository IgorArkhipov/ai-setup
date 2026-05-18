# Initial Prompt: Operation 2 Refactoring Protocol

You are authoring the operational evidence package for Homework 5 Task 2 operation 2 in `/Users/igor.arkhipov/Documents/Work/Ruby/thinknetica/ai-setup`.

Hard constraints:

- Do not read or use `.env*` files.
- Prefix shell commands with `rtk`.
- For file search or grep inside the repo, use the fff tools rather than shell grep/find.
- Keep writes under `homeworks/hw-5/task-2/operation-2-refactoring/` while authoring the protocol package.
- Do not execute the refactoring during protocol authoring.

Operation:

- Create an operational `protocol.md` for running refactoring analysis on `tools/agentscope` and executing exactly one strongest small high-confidence refactoring recommendation.
- The future executor may inspect `tools/agentscope`, choose one recommendation, implement only that recommendation, update or add focused tests if needed, and verify with `rtk npm test`, `rtk npm run lint`, `rtk npm run coverage`, and `rtk npm run build` from `tools/agentscope`.
- The protocol must explicitly record operation 1's baseline coverage-threshold blocker: `rtk npm run coverage` currently fails because branch coverage is `70.89%` against a `71%` threshold. The operation must not pretend to be primarily a coverage fix unless the refactoring analysis independently selects a small test or branch-structure refactoring as the one recommendation.

Read before drafting:

- `memory-bank/README.md`
- `memory-bank/flows/agent-process-operations.md`
- `memory-bank/flows/templates/protocol/operational-protocol.md`
- `.prompts/memory-bank-create-operational-protocol.md`
- `.prompts/memory-bank-review-operational-protocol.md`
- `.prompts/skills/operational-protocol-generation.md`
- `.prompts/skills/operational-protocol-review.md`
- `tools/agentscope/package.json`
- `homeworks/hw-5/task-2/requirements-en.md`
- `homeworks/hw-5/task-2/operation-1-dependency-update/execution-result.md`, if present

Deliverables under `homeworks/hw-5/task-2/operation-2-refactoring/`:

- `initial-prompt.md`
- `protocol.md`
- `protocol-review.initial.md`
- `protocol-polish.md`
- `protocol-review.accepted.md`

Gate model:

- H1 is approved by the user's current request for this bounded non-production refactoring operation.
- H2 is the acceptance and commit-point review.
- H3 is required before any destructive or irreversible action.

End with a concise report listing changed files and whether the protocol is ready for execution.
