# Plan Generation

Use this guide when turning an approved spec into a codebase-specific implementation plan.

## Purpose

A plan is an "in what order and exactly how to do it" document.

- It breaks the implementation into concrete steps.
- It ties those steps to the current codebase.
- It records dependencies, orchestration, and verification.

For simple work, the plan can live inside the spec. For more complex work, use a separate plan document.

## Required Inputs

- An approved spec
- The current state of the repository
- Any constraints about sequencing, ownership, or orchestration

## Writing Rules

- Make the plan specific to the current project, not generic.
- List the files and modules expected to change.
- Order steps so dependencies are explicit and there are no cycles.
- Keep each step atomic enough to complete and verify independently.
- Include test updates, migrations, docs changes, and follow-up verification when they are required.
- State the orchestration pattern explicitly: single agent, specialized agents, or parallel agents.
- Ground the plan against the current codebase before finalizing it.

## Grounding Checklist

Before finalizing the plan, check:

- which files will be affected
- whether those files and modules already exist
- whether the plan matches the current architecture and repository patterns
- whether there are feasibility or conflict risks

If the codebase changes after the plan is written, grounding must be run again.

## Recommended Template

```md
# [Feature Name] Implementation Plan

## Source
- Spec: [link]

## Goal
[One sentence describing what this plan delivers]

## Orchestration
- Pattern: [single agent / specialized agents / parallel agents]
- Why: [reason]

## Grounding
- Files/modules to inspect: [paths]
- Expected touch points: [paths]
- Relevant existing patterns: [notes]
- Risks or conflicts: [notes]

## Steps
1. [Concrete step with affected files]
2. [Concrete step with affected files]
3. [Concrete verification or rollout step]

## Verification
- [Tests or checks to run]
- [How to confirm the change is complete]
```

## Final Check

Before considering the plan ready:

- Confirm every step can be executed independently.
- Confirm the order respects dependencies.
- Confirm the plan fits the current repository rather than an imagined architecture.
