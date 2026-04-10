# Brief Generation

Use this guide when turning an issue, ticket, chat message, or stakeholder request into a brief.

## Purpose

A brief is a "what and why" document.

- It captures the problem, stakeholder, context, and desired outcome.
- It does not describe the implementation or prescribe the solution.

## Required Inputs

- A source reference, such as an issue, ticket, message, or meeting note
- The stakeholder or user affected
- The problem or pain point
- The desired outcome

If a required input is missing, ask for clarification instead of inventing business context.

## Writing Rules

- Stay at the problem level.
- Name the stakeholder or user explicitly.
- Make the problem specific and measurable when possible.
- Explain why the task matters now.
- Do not propose architecture, APIs, database changes, or UI structure.
- Avoid ambiguous words such as "fast", "convenient", "improve", "if needed", and "etc."

## Recommended Template

```md
# [Task Name]

## Source
- Origin: [issue, ticket, message, or meeting reference]

## Problem
[What is wrong today? Include evidence, metric, or pain point when available.]

## Stakeholder
[Who is affected or asking for this?]

## Context
[Where the request came from and why it matters now.]

## Desired Outcome
[What should be true after this work is complete, without describing the solution.]
```

## Final Check

Before considering the brief ready:

- Confirm it contains no solution design.
- Confirm every section is concrete enough for a spec author to continue.
- Confirm the source is linked or referenced explicitly.
