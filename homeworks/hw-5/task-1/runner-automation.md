# Runner Automation Notes

Task 1 asks, optionally, to teach the local launcher to perform the upper lifecycle actions: create a lifecycle protocol and continue execution from a ready `protocol.md`.

This run implements that optional path in the repo-local agent workflow runner.

## Added Workflow

Workflow file:

- `.ai-setup/workflows/lifecycle-feature.json`

Purpose:

- Accept an initial feature intention prompt.
- Run lifecycle protocol creation.
- Run lifecycle protocol review.
- Route `needs_polish` through a protocol polish stage.
- Route accepted protocol review into protocol execution.

## Added Stages

- `.ai-setup/stages/draft-lifecycle-protocol.json`
- `.ai-setup/stages/review-lifecycle-protocol.json`
- `.ai-setup/stages/polish-lifecycle-protocol.json`
- `.ai-setup/stages/execute-lifecycle-protocol.json`

## Added Prompt

- `.prompts/memory-bank-polish-lifecycle-protocol.md`

The existing create, review, and execute prompts are reused:

- `.prompts/memory-bank-create-lifecycle-protocol.md`
- `.prompts/memory-bank-review-lifecycle-protocol.md`
- `.prompts/memory-bank-execute-lifecycle-protocol.md`

## Runner Transition Update

`run-agent-workflow.sh` now knows that:

- accepted `review-lifecycle-protocol` continues to `execute-lifecycle-protocol`;
- accepted `execute-lifecycle-protocol` stops at the lifecycle execution gate with `stop_reason: lifecycle_protocol_executed`;
- `needs_polish` for lifecycle protocol review uses the existing stage-family rule and routes to `polish-lifecycle-protocol`.

## Verification Added

`.ai-setup/scripts/test-agent-workflow.sh` now validates every workflow under `.ai-setup/workflows/*.json`, not only `route-first`, and checks the lifecycle workflow dry-run and transition behavior.
