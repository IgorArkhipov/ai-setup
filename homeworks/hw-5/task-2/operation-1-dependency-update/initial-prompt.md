# Initial Prompt: Homework 5 Task 2 Operation 1

You are an execution agent in `/Users/igor.arkhipov/Documents/Work/Ruby/thinknetica/ai-setup`.

Operation: update all developer libraries listed in `tools/agentscope/package.json`.

Before execution, read and follow:

- `memory-bank/README.md`
- `memory-bank/flows/agent-process-operations.md`
- `memory-bank/flows/templates/protocol/operational-protocol.md`
- `.prompts/memory-bank-create-operational-protocol.md`
- `.prompts/memory-bank-review-operational-protocol.md`
- `.prompts/skills/operational-protocol-generation.md`
- `.prompts/skills/operational-protocol-review.md`
- `tools/agentscope/package.json`

Hard rules:

- Do not read or use `.env*` files.
- Prefix shell commands with `rtk`.
- Use `fff` tools for file search or grep inside the repo.
- Use `apply_patch` for manual file edits.
- Do not change production systems, publish packages, push branches, merge pull requests, or edit `dist/`.

Starting state:

- The operation is scoped to `tools/agentscope`.
- The developer libraries are the packages listed in `tools/agentscope/package.json` under `devDependencies`.
- The current request approves H1 for this bounded non-production operation.
- H2 is the acceptance and commit-point review gate.
- H3 is required for destructive or irreversible actions.

Task:

1. Start from `homeworks/hw-5/task-2/operation-1-dependency-update/protocol.md`.
2. Confirm the protocol state permits execution.
3. Execute only the approved protocol.
4. Update protocol evidence after each substantial step.
5. Stop at H2 with evidence ready for human acceptance or commit-point review.

Expected end report:

- packages considered for update;
- files changed;
- commands run;
- verification results;
- current protocol state;
- whether H2 is ready, blocked, or failed.
