---
title: FT-XXX Feature Template - Implementation Plan
doc_kind: feature
doc_function: template
purpose: Governed wrapper template for an implementation plan. Defines how to instantiate an execution document without redefining scope, architecture, or acceptance criteria and without mixing the wrapper with the target `implementation-plan.md`.
derived_from:
  - ../../feature-flow.md
  - ../../../dna/frontmatter.md
  - ../../../engineering/testing-policy.md
status: active
audience: humans_and_agents
template_for: feature
template_target_path: ../../../features/FT-XXX/implementation-plan.md
---

# Implementation Plan

This file describes the wrapper template. The instantiated `implementation-plan.md` lives below as an embedded contract and is copied without the wrapper frontmatter or history.

## Wrapper Notes

Requirements, design, blocker state, and acceptance criteria are defined in the sibling `feature.md`. This document defines only work sequencing and execution checkpoints. In the created feature package, the sibling `feature.md` must be instantiated from the canonical feature template in `memory-bank/flows/templates/feature/`.

Create this document only after the sibling `feature.md` has been moved to `status: active`. While the plan is still forming, `implementation-plan.md` itself may remain in `status: draft`; before the feature moves to `delivery_status: in_progress`, the plan must become `status: active`.

When the feature reaches `delivery_status: done` or `delivery_status: cancelled`, `implementation-plan.md` should be archived if it is no longer needed as a working execution document.

The document must be executable without extra interpretation. If a step cannot be tied to canonical IDs, an artifact, a check, or an explicit manual procedure, then it is underspecified. The plan must be grounded in the current state of the repository: first record relevant modules, local patterns, open questions, and the execution environment, then describe the sequence of changes.

The plan must explicitly record which automated tests will be added or updated for the change surface, which suites must be green locally and in CI, and which gaps remain temporarily manual-only, with justification and an approval reference.

For references inside the plan, use stable identifiers from the taxonomy in [../../feature-flow.md#stable-identifiers](../../feature-flow.md#stable-identifiers).

If an unknown changes scope, architecture, acceptance criteria, blocker state, or the evidence contract, raise it upstream first into the sibling `feature.md` or an ADR. Only after that should it appear in the plan.

## Instantiated Frontmatter

```yaml
title: "FT-XXX: Implementation Plan"
doc_kind: feature
doc_function: derived
purpose: "Execution plan for FT-XXX. Records discovery context, steps, risks, and test strategy without redefining canonical feature facts."
derived_from:
  - feature.md
status: draft
audience: humans_and_agents
must_not_define:
  - ft_xxx_scope
  - ft_xxx_architecture
  - ft_xxx_acceptance_criteria
  - ft_xxx_blocker_state
```

## Instantiated Body

```markdown
# Implementation Plan

## Goal Of This Plan

What delivery outcome this plan is expected to produce.

## Current State / Reference Points

Which existing files, modules, commands, or documents the agent must study before making changes. This section records grounding in the current repository state and local patterns that must not be ignored.

| Path / module | Current role | Why relevant | Reuse / mirror |
| --- | --- | --- | --- |
| `path/to/module` | What this artifact already does | Why planning would be incorrect without it | Which pattern, helper, command, or contract must be reused |

## Test Strategy

Which test surfaces must be updated during implementation. This section records expected automated coverage, required local or CI gates, and manual-only exceptions for the change surface, without redefining canonical test cases from `feature.md`.

| Test surface | Canonical refs | Existing coverage | Planned automated coverage | Required local suites / commands | Required CI suites / jobs | Manual-only gap / justification | Manual-only approval ref |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `path/or/behavior` | `REQ-01`, `SC-01`, `NEG-01`, `CHK-01` | What is covered now | Which suite, test type, or deterministic check must be added or updated | Which commands or suites must be green locally | Which jobs or suites must be green in CI | What remains manual-only for now and why | `AG-01` / review link / `none` |

## Open Questions / Ambiguities

Which unknowns remain after discovery. If a question changes upstream semantics, it must not be resolved silently inside an execution step.

| Open Question ID | Question | Why unresolved | Blocks | Default action / escalation owner |
| --- | --- | --- | --- | --- |
| `OQ-01` | What exactly is unknown | Why it has not yet been proven | `STEP-02` / `WS-1` / whole plan | What we do by default and who decides on escalation |

## Environment Contract

Which execution environment is valid for the plan: setup, test commands, env vars, permissions, mocks, external dependencies, and other operational assumptions.

| Area | Contract | Used by | Failure symptom |
| --- | --- | --- | --- |
| setup | Which environment preparation is mandatory | `STEP-01`, `STEP-02` | How to recognize an invalid environment |
| test | Which command or procedure is the canonical verification method at this stage | `CHK-01` | What counts as untrustworthy verification |
| access / network / secrets | Which permissions, domains, keys, or sandbox assumptions are needed | `STEP-03` | When the work must stop and escalate |

## Preconditions

What must exist before work starts: data, access, ADRs, environment, agreements. Each row references a canonical item and does not restate its meaning in different words.

| Precondition ID | Canonical ref | Required state | Used by steps | Blocks start |
| --- | --- | --- | --- | --- |
| `PRE-01` | `ASM-01` / `DEC-01` / `CON-01` / ADR path | Which upstream state is required for work to begin | `STEP-01`, `STEP-02` | yes / no |

## Workstreams

Split the work into independent streams with an explicit result for each.

| Workstream | Implements | Result | Owner | Dependencies |
| --- | --- | --- | --- | --- |
| `WS-1` | `REQ-01`, `CTR-01` | What should exist when the stream finishes | human / agent / either | What blocks start or completion |

## Approval Gates

Which actions must not be performed without explicit human confirmation. Use this section for risky, irreversible, expensive, or externally effective operations.

| Approval Gate ID | Trigger | Applies to | Why approval is required | Approver / evidence |
| --- | --- | --- | --- | --- |
| `AG-01` | Which step or symptom requests approval | `STEP-03` / `WS-2` | Why autonomous continuation is not allowed | Who approves and how it is recorded |

## Work Sequence

Describe execution as atomic steps. Each step should be small enough to verify and, if needed, roll back or stop without letting the change surface sprawl.

| Step ID | Actor | Implements | Goal | Touchpoints | Artifact | Verifies | Evidence IDs | Check command / procedure | Blocked by | Needs approval | Escalate if |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `STEP-01` | human / agent / either | `REQ-01`, `REQ-02`, `CTR-01` | What is done in this step | Which files, services, or data are touched | What should exist afterward | `CHK-01` | `EVID-01` | How completion is verified | `PRE-01`, `OQ-01` | `AG-01` / `none` | When work cannot continue without escalation |

## Parallelizable Work

Which steps or workstreams can run in parallel without conflicting on the change surface.

- `PAR-01` What can proceed in parallel.
- `PAR-02` What must not be parallelized because it shares a write surface.

## Checkpoints

Which intermediate states must be reached before rollout or handoff.

| Checkpoint ID | Refs | Condition | Evidence IDs |
| --- | --- | --- | --- |
| `CP-01` | `STEP-01`, `CHK-01` | Which intermediate state must be proven | `EVID-01` |

## Execution Risks

Which practical risks may derail the schedule or force the plan to be reworked.

| Risk ID | Risk | Impact | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| `ER-01` | What can go wrong | What it breaks | What is done proactively | Which signal activates the mitigation |

## Stop Conditions / Fallback

When the plan should stop or fall back to a safe state.

| Stop ID | Related refs | Trigger | Immediate action | Safe fallback state |
| --- | --- | --- | --- | --- |
| `STOP-01` | `DEC-01`, `RJ-01` | Which symptom causes work to stop | What happens immediately | Which safe state work falls back to or freezes at |

## Ready For Acceptance

Which conditions must be met for the plan to be considered exhausted so final acceptance can proceed through the `Verify` section in the sibling `feature.md`.
```
