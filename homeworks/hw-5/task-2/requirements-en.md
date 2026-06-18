# HW-5 Task 2 Requirements Interpretation

Fetched on: 2026-05-17

Access note: fetched with user-provided Basic Auth after the initial unauthenticated request returned `401 Unauthorized`.

## Assignment Focus

Task 2 asks for several small repository changes to be performed through operational protocol creation and execution. The source gives refactoring as an example, and the user selected two concrete operations for this repository.

The required shape is:

1. One-time setup: copy and adapt the Operational protocol template into the Memory Bank.
2. Specify that durable operational protocols should be created in `.protocols/`.
3. Create an operational protocol artifact for one small task.
4. Groom the protocol as its own artifact.
5. Start a new session from the created protocol and execute it.
6. Repeat the same protocol-first pattern for more than one small change.
7. Store the homework execution record under `homeworks/hw-5/task-2/`, per this task request.

## Repository Adaptation

This repo maps the external operational protocol concept into the active Memory Bank process layer:

- Operational method and safety rules live in `memory-bank/flows/agent-process-operations.md`.
- The reusable template lives in `memory-bank/flows/templates/protocol/operational-protocol.md`.
- Protocol creation, review, polish, and execution prompts live in `.prompts/`.
- The workflow runner now has an `operational-protocol` workflow with draft, review, polish, and execute stages.
- Durable future operational protocols default to `.protocols/<operation-slug>/protocol.md`.
- This homework package keeps evidence copies under `homeworks/hw-5/task-2/` because the user explicitly requested task-local execution records similar to Task 1.

The task is not a new feature package and does not create legacy `brief.md`, `spec.md`, or `plan.md` files.

## Selected Operations

Operation 1: update the package libraries listed in `tools/agentscope/package.json`.

Reason:

- The operation is concrete, bounded, reversible through `package.json` and `package-lock.json`, and naturally verifiable with npm checks.
- It exercises an operational protocol for dependency maintenance rather than product feature development.

Operation 2: run refactoring analysis on `tools/agentscope` and execute the strongest small refactoring recommendation.

Reason:

- The operation starts with analysis and then applies one bounded code improvement.
- It exercises the protocol's ability to convert an investigation result into safe implementation with verification.

## Expected Final Result

- `operation-1-dependency-update/` contains the initial prompt, reviewed protocol, polish record, execution result, and command evidence.
- `operation-2-refactoring/` contains the same protocol and execution evidence shape for the refactoring operation.
- `tools/agentscope` reflects the accepted dependency and refactoring changes, if the protocols complete successfully.
- Runner automation can start, review, polish, and execute future operational protocols through the `operational-protocol` workflow.
- Memory Bank guidance now records `.protocols/<operation-slug>/protocol.md` as the default durable operational protocol path.
