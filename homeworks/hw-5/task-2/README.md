# HW-5 Task 2: Operational Protocol Runs

This package records two operational protocol runs for Week 5 Task 2.

It applies the assignment idea to this repository's Memory Bank workflow and `tools/agentscope` codebase:

1. Operation 1 updates developer libraries listed in `tools/agentscope/package.json`.
2. Operation 2 runs refactoring analysis on `tools/agentscope` and executes the strongest small recommendation.

The authenticated homework page also asks the project setup to adapt the Operational protocol template so durable operational protocols normally live under `.protocols/`. The Memory Bank guidance was updated accordingly; this homework folder remains the evidence package requested for the assignment submission.

Each operation follows the requested agentic lifecycle:

1. A fresh protocol-authoring subagent starts from an orchestrating prompt.
2. The subagent creates `protocol.md`, reviews it, and addresses findings.
3. A fresh execution subagent starts from the final `protocol.md`.
4. The execution subagent runs until completion or a protocol-defined stop.
5. The execution record is stored under this homework package.

## Contents

- `requirements-en.md` - English interpretation of the task and repository adaptation.
- `runner-automation.md` - operational-protocol workflow and runner updates.
- `execution-summary.md` - end-to-end record for both operations and verification.
- `operation-1-dependency-update/` - protocol, review, polish, execution record, and coverage-blocker evidence.
- `operation-2-refactoring/` - protocol, review, polish, analysis candidates, execution record, and final coverage evidence.
- `evidence/package-tree.txt` - file tree for this homework evidence package.

## Final State

- Operation 1 updated scoped developer dependencies and stopped at H2 because coverage was `70.89%` against a `71%` branch threshold.
- Operation 2 selected one small test refactor, added focused manifest-loading coverage, and moved coverage to `71.09%`.
- Final verification passed for the runner assets and `tools/agentscope` checks.
