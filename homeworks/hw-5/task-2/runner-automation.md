# Runner Automation Notes

Task 2 uses the same runner concept as Task 1, but for scoped operational protocols instead of lifecycle protocols.

## Added Workflow

Workflow file:

- `.ai-setup/workflows/operational-protocol.json`

Purpose:

- Accept a concrete operational intention prompt.
- Run operational protocol creation.
- Run operational protocol review.
- Route `needs_polish` through a protocol polish stage.
- Route accepted protocol review into protocol execution.

## Added Stages

- `.ai-setup/stages/draft-operational-protocol.json`
- `.ai-setup/stages/review-operational-protocol.json`
- `.ai-setup/stages/polish-operational-protocol.json`
- `.ai-setup/stages/execute-operational-protocol.json`

## Added Prompt

- `.prompts/memory-bank-polish-operational-protocol.md`

The existing create, review, and execute prompts are reused:

- `.prompts/memory-bank-create-operational-protocol.md`
- `.prompts/memory-bank-review-operational-protocol.md`
- `.prompts/memory-bank-execute-operational-protocol.md`

## Runner Transition Update

`run-agent-workflow.sh` now knows that:

- accepted `review-operational-protocol` continues to `execute-operational-protocol`;
- accepted `execute-operational-protocol` stops at the operational execution gate with `stop_reason: operational_protocol_executed`;
- `needs_polish` for operational protocol review uses the existing stage-family rule and routes to `polish-operational-protocol`.

## Verification Added

`.ai-setup/scripts/test-agent-workflow.sh` now validates:

- `operational-protocol` dry-run start shape;
- accepted operational review transition into execution;
- accepted operational execution transition into the final stop gate.

Verification command:

```text
rtk ./.ai-setup/scripts/test-agent-workflow.sh
```

Result:

```text
agent-workflow assets OK
```
