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

## Routing Rules

Use the smallest workflow that still keeps risk under control.

- If the task is small and clear, do not inflate it into a large feature package.
- If the task changes a contract, rollout, or approval boundary, promote it to the feature flow.
- If the findings are not shrinking from iteration to iteration, the problem may be upstream rather than in the code.
