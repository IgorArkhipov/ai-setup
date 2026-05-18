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

## Claude Review Policy Toggle

The runner now supports a persisted Claude review policy:

- `off` - no automatic Claude second-opinion pass;
- `accepted-review` - the default scenario when the initial prompt does not request another policy, reviewing accepted `review-*` stages;
- `every-step` - review every accepted workflow stage before transition.

The policy can be tightened with `--claude-review-policy every-step`, or in the first prompt:

```markdown
Claude review policy: every-step
```

When the prompt sets this marker, the runner stores `claude_review_policy` in `run.json`, includes it in stage prompts and request files, and applies it through later `run`, `step`, and `resume` operations. A prompt may also set `Claude review policy: off` for a human-approved or fixture-only run that should not call Claude.

## Verification Added

`.ai-setup/scripts/test-agent-workflow.sh` now validates every workflow under `.ai-setup/workflows/*.json`, not only `route-first`, and checks the lifecycle workflow dry-run and transition behavior.

The workflow test also covers prompt-driven `every-step` review policy by asserting that Claude review result files are produced for route, draft, review, and polish stages.
