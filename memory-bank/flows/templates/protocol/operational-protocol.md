---
title: Operational Protocol Template
doc_kind: governance
doc_function: template
purpose: Governed wrapper template for an operational `protocol.md`. Defines how to instantiate a protocol for executing a specific operational workflow with explicit permissions, gates, evidence, rollback, and stop conditions.
derived_from:
  - ../../agent-process-operations.md
  - lifecycle-protocol.md
status: active
audience: humans_and_agents
template_for: operational_protocol
template_target_path: ../../../features/FT-XXX/protocol.md
---

# Operational Protocol Template

This file describes the wrapper template. The instantiated operational `protocol.md` lives below as an embedded contract and is copied without the wrapper frontmatter or history.

## Wrapper Notes

This template is adapted to this repository's governed memory-bank model.

Use an operational protocol when a specific operational workflow is ready to execute and needs a compact process contract: permissions, current state, gates, evidence, rollback, and stop conditions. Compared with a lifecycle protocol, this template assumes the workflow is already scoped and focuses on safe execution of the known operation.

The protocol is not a replacement for a feature document or implementation plan. In this repository:

- `feature.md` owns canonical scope, design, acceptance, and verification intent;
- `implementation-plan.md` owns derived execution sequencing for code or documentation changes;
- operational `protocol.md` owns execution permissions, state, gates, evidence, rollback, and allowed operational transitions for the specific workflow.

Use this template for custom operational cases such as controlled command runs, scoped repository changes, verification procedures, non-production or production operations, and other repeatable procedures where the agent must not proceed from chat memory alone.

## Instantiated Frontmatter

```yaml
title: "Operational Protocol: <task-name>"
doc_kind: process
doc_function: protocol
purpose: "Operational protocol for <task-name>. Controls execution permissions, gates, evidence, rollback, and stop conditions for a specific workflow."
derived_from:
  - <source-request-or-feature-path>
status: draft
audience: humans_and_agents
protocol_version: "0.1"
current_phase: ready_to_execute
current_gate: H0
```

## Instantiated Body

```markdown
# Operational Protocol: `<task-name>`

## Source Interpretation

Source used:

- `<source-request-or-material>`

English interpretation:

- `<source-concept-carried-forward-1>`
- `<source-concept-carried-forward-2>`
- `<source-concept-carried-forward-3>`

Repository adaptation:

- `<how the operational workflow maps to this repository's governed documents, commands, and safety rules>`

## Metadata

- Protocol version: 0.1
- Owner: `<human-owner>`
- Work area: `<repo-or-project>`, issue `<issue-id>`, service `<service-name>`
- Created: `<yyyy-mm-dd>`
- Last updated: `<yyyy-mm-dd>`
- Status: draft
- Current phase: ready_to_execute
- Current gate: H0

## Goal

`<what result must be achieved and why it matters>`

Target state:

- `<target-state-1>`
- `<target-state-2>`
- `<target-state-3>`

## Scope

In scope:

- `<allowed-change-1>`
- `<allowed-change-2>`

Out of scope:

- `<forbidden-change-1>`
- `<forbidden-change-2>`

## Current Facts / Baseline

- `<fact-1>`; evidence: `<source-or-command>`
- `<fact-2>`; evidence: `<source-or-command>`

## Operating Constraints

- `<technical-constraint>`
- `<security-or-compliance-constraint>`
- `<production-safety-constraint>`

## Roles

| Actor | Role | Allowed actions | Must not do |
| --- | --- | --- | --- |
| Human owner | decision maker | approve gates, stop execution | skip evidence or give implicit approval |
| Operator | execution owner | run approved commands, update evidence | run gates without approval |
| Agent implementer | source changes | edit scoped files, prepare diff | change unrelated files |
| Agent verifier | verification | run checks, compare results | change implementation during verification |

## Permissions

| Tool / action | Risk | Default policy | Notes |
| --- | --- | --- | --- |
| read repository files | low | allow | source inspection |
| edit scoped source files | medium | allow after H1 | no unrelated changes |
| run verification commands | medium | H1 required | include outputs in Evidence Log |
| production apply | high | H2 required | approved window only |
| destructive / irreversible action | critical | H3 required | explicit approval record |

## State

- Status: draft
- Current phase: ready_to_execute
- Current gate: H0
- Current actor: Human owner
- Next action: approve Gate H1 and start execution phase
- Open loops:
  - `<open-loop-1>`
  - `<open-loop-2>`
- Rollback mode: `<rollback-mode>`

## Human Gates

### H1: Start execution

Required before:

- `<action-requiring-h1-1>`
- `<action-requiring-h1-2>`

Approval record:

- Approver:
- Date:
- Scope approved:
- Conditions:

### H2: Acceptance check pass

Required before:

- `<action-requiring-h2-1>`

Approval record:

- Approver:
- Date:
- Scope approved:
- Conditions:

### H3: Destructive or irreversible action

Required before:

- `<destructive-action-1>`

Approval record:

- Approver:
- Date:
- Exact action approved:
- Rollback expectation:

## Hard Stop Conditions

- `<hard-stop-1>`
- `<hard-stop-2>`
- any request to print or copy a secret;
- unclear rollout ownership;
- missing rollback path before a high-risk action.

## Execution Plan

### Phase 1: Preflight

- [ ] Confirm no open questions block execution.
- [ ] Confirm Scope, Roles, Permissions, and Gates are set.
- [ ] Confirm baseline facts are recorded.
- [ ] Record all decisions and constraints in `Decisions`.

Exit criteria:

- execution preconditions are satisfied;
- gate owner is ready for H1 decision.

### Phase 2: Implementation

- [ ] Implement scoped changes.
- [ ] Limit diff to allowed scope.
- [ ] Record verification-ready artifacts and tests.

Exit criteria:

- diff matches scope;
- implementation checks are ready to run.

### Phase 3: Verification And Acceptance

- [ ] Run required checks.
- [ ] Validate acceptance criteria.
- [ ] Update Evidence Log.

Exit criteria:

- acceptance criteria are met or failure reason is clear;
- evidence set is complete for H2 decision.

## Verification

- `<verification-command-or-check-1>`
- `<verification-command-or-check-2>`
- `<verification-command-or-check-3>`

## Rollback

- `<rollback-step-1>`
- `<rollback-step-2>`
- `<rollback-step-3>`

## What To Update During Execution

After every substantial step, update:

- `State`: phase, gate, actor, and next action;
- `Evidence Log`: verified facts and links to checks;
- `Open Questions`;
- `Decisions`: accepted trade-offs or conditions;
- `Rollback`: when risk or actual state changes.

## Evidence Log

| Time | Actor | Fact / action | Evidence |
| --- | --- | --- | --- |
| `<yyyy-mm-dd hh:mm>` | `<actor>` | `<fact-or-action>` | `<source-or-command-output-ref>` |

## Decisions

| Date | Decision | Owner | Reason |
| --- | --- | --- | --- |
| `<yyyy-mm-dd>` | `<decision>` | `<owner>` | `<reason>` |

## Open Questions

- `<question-1>`; owner: `<owner>`; needed by: `<gate-or-phase>`
- `<question-2>`; owner: `<owner>`; needed by: `<gate-or-phase>`

## Next Action

Actor: `<actor>`

Action: `<one-specific-next-action>`

Stop if: `<stop-condition>`
```
