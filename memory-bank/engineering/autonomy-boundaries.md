---
title: Autonomy Boundaries
doc_kind: engineering
doc_function: canonical
purpose: Agent autonomy boundaries: what can be done without confirmation, where supervision is required, and when to escalate.
derived_from:
  - ../dna/governance.md
canonical_for:
  - agent_autonomy_rules
  - escalation_triggers
  - supervision_checkpoints
status: active
audience: humans_and_agents
---

# Autonomy Boundaries

## Autopilot - do without confirmation

- edit code within the task scope
- run local tests and linters
- create branches and worktrees
- read logs, metrics, and the error tracker
- create and update internal documentation
- create and update documentation in the memory-bank

## Supervision - do it, but show a checkpoint

- architectural decisions, new services, and contract changes: show the plan before starting
- database schema changes and data migrations: show the migration before running it
- code or file deletion: show what is being removed and why
- a PR into the default branch: show the diff and test results
- changes to configuration, routing, or the deployment contract: show the changes
- decomposing a task into sub-issues: show the proposed breakdown

## Escalation - stop and ask

- unclear or contradictory business requirements
- a choice between equally valid approaches with materially different trade-offs
- any action in production or against live data
- sending messages to users or external counterparties
- changes to payment, security, auth, or compliance-sensitive integrations
- conflicting patterns in the codebase: do not guess which one is correct
- the task clearly exceeds the issue scope: do not expand it silently

## Escalation Rule

If feedback or errors are not decreasing after 2 or 3 iterations, the problem may not be in the code. It may be in upstream requirements, the plan, or environmental constraints. In that case, the agent should stop the loop and propose returning to the previous stage.
