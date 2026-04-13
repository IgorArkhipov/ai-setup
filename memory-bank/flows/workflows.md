---
title: Task Workflows
doc_kind: governance
doc_function: canonical
purpose: Task routing by type and the base development cycle. Read this when receiving a new task to choose the right approach.
derived_from:
  - ../dna/governance.md
  - feature-flow.md
canonical_for:
  - task_routing_rules
  - base_development_cycle
  - workflow_type_selection
  - autonomy_gradient
status: active
audience: humans_and_agents
---

# Task Workflows

## Base Cycle

Any workflow is a chain of repetitions of one core cycle:

```text
Artifact → Review → Polish
                   → Decompose
                   → Accept
```

An artifact is whatever is produced at each stage: a spec, design doc, plan, code, PR, or runbook.

## Human Participation Gradient

The closer the work is to business requirements, the more human involvement it needs. The closer it is to code and local verification, the more autonomously the agent can work.

```text
Business requirements  ← human | agent →  Code
  PRD, Use Cases         Spec, Plan      PR, Tests
```

## Workflow Types

### 1. Small Feature

Use this when:

- the task is clear;
- the scope is local;
- the solution fits in one session or one compact change set.

Flow:

`issue/task -> routing -> implementation -> review -> merge`

### 2. Medium Or Large Feature

Use this when:

- several layers are affected;
- design choices are required;
- checkpoints and an explicit execution plan are needed.

Flow:

`issue/task -> spec -> feature package -> implementation plan -> execution -> review -> handoff`

### 3. Bug Fix

The input can come from anywhere: an error tracker, support, QA, direct user report, or incident analysis.

Flow:

`report -> reproduction -> analysis -> fix -> regression coverage -> review`

### 4. Refactoring

Split refactoring into at least three classes:

- refactoring done during a delivery task;
- exploratory refactoring;
- system-level refactoring with a large change surface.

Exploratory and system-level refactoring usually require an explicit plan and checkpoints.

### 5. Incident / PIR

Flow:

`incident -> timeline -> root cause analysis -> fixes -> prevention work`

Here a human usually confirms the RCA and prioritizes follow-up work.

## Governed Document Routing

Choose the smallest governed document that owns the missing decision or intent.

### PRD

Create or update a PRD when the work is still at initiative level and needs product framing before it can be decomposed into multiple delivery slices.

Use a PRD when:

- multiple feature packages are expected downstream;
- user segments, goals, scope, or success metrics still need one canonical owner;
- feature work would otherwise repeat the same product rationale.

Do not create a PRD when one feature package already owns the whole change safely.

### Use Case

Create or update a `UC-*` when the work introduces or materially changes a stable user or operational scenario that may be reused by multiple features.

Use a use case when:

- the scenario has a stable trigger, preconditions, main flow, and postconditions;
- the same flow is implemented by more than one feature or is expected to stay project-relevant over time;
- a project-level owner is needed for business rules that must survive individual feature changes.

Do not promote a scenario into `UC-*` if it exists only as one feature's local acceptance case. Keep that in `SC-*`.

### ADR

Create or update an ADR when a durable architecture or engineering decision must be recorded explicitly with options, trade-offs, and consequences.

Use an ADR when:

- unresolved design choices block a feature or affect multiple components;
- a decision must become canonical input for downstream features or plans;
- the team needs a durable record of why one option was selected over others.

Do not use an ADR for current-state notes, implementation steps, or exploratory research without a real decision.

### Feature Package

Create or update a feature package when the work is one delivery unit: one vertical slice of value or one justified infra/refactoring slice.

Use a feature package when:

- scope can be expressed through `REQ-*` and `NS-*`;
- the change needs feature-level design and verification ownership;
- implementation should trace back to one canonical delivery document.

Bootstrap the package by creating `README.md` and `feature.md` together. Do not create `implementation-plan.md` until the feature reaches Design Ready.

### Implementation Plan

Create or update `implementation-plan.md` only after the sibling `feature.md` is mature enough to act as canonical input.

Use an implementation plan when:

- the feature is already `status: active`;
- execution needs grounded sequencing, checkpoints, risks, and test strategy;
- the repository has been inspected enough to record current paths, patterns, and open questions.

Do not use the plan to invent scope, architecture, or acceptance rules. Raise those upstream first into `feature.md` or an ADR.

## Drafting Quality Rules

These rules apply to any governed document created from the templates in `memory-bank/flows/templates/`.

1. Link or reference the source input explicitly: issue, ticket, request, meeting note, upstream doc, or sibling canonical doc. Do not leave the origin implicit.
2. If a required input is missing, ask for clarification instead of inventing business context, scope, stakeholders, acceptance criteria, or technical constraints.
3. Avoid ambiguous wording such as "fast", "simple", "convenient", "robust", "if needed", and "etc." unless the document immediately defines what that means in a measurable way.
4. Surface unresolved choices explicitly instead of hiding them in optimistic prose. Unknowns belong in the appropriate governed owner: PRD scope, use-case behavior, ADR options, feature blockers, or plan `OQ-*`.
5. Keep each document at its own boundary:
   - PRD and use case describe upstream problem or scenario intent, not implementation design.
   - ADR records a decision and its trade-offs, not current-state notes or execution steps.
   - `feature.md` owns delivery intent, design, and verification, not step-by-step execution.
   - `implementation-plan.md` owns execution sequencing and grounding, not canonical scope or architecture.

## Review Discipline

Generated governed documents should be reviewed before downstream work starts from them.

1. After drafting a PRD, use-case, feature, ADR, or implementation plan, run the matching review against the active flow and template rules.
2. If review changes the document materially, review it again before treating it as accepted input for the next stage.
3. If the first review finds significant issues, the document boundary is debatable, or independent confirmation is needed, trigger a second-opinion review rather than silently continuing.

## Routing Rules

Use the smallest workflow that still keeps risk under control.

- If the task is small and clear, do not inflate it into a large feature package.
- If the task changes a contract, rollout, or approval boundary, promote it to the feature flow.
- If the findings are not shrinking from iteration to iteration, the problem may be upstream rather than in the code.
