---
title: Lifecycle Protocol Template
doc_kind: governance
doc_function: template
purpose: Governed wrapper template for a lifecycle `protocol.md`. Defines how to instantiate a protocol that controls allowed behavior, gates, evidence, rollback, and external process state for long-running or risky agent work.
derived_from:
  - ../../agent-process-operations.md
  - ../../workflows.md
status: active
audience: humans_and_agents
template_for: process_protocol
template_target_path: ../../../features/FT-XXX/protocol.md
---

# Lifecycle Protocol Template

This file describes the wrapper template. The instantiated `protocol.md` lives below as an embedded contract and is copied without the wrapper frontmatter or history.

## Wrapper Notes

Use a lifecycle protocol when a task needs a repeatable process contract before risky work starts. The protocol records what is allowed, who may approve gates, what evidence must be kept, when execution must stop, and how another session can resume without chat memory.

The protocol is not a replacement for a feature document or implementation plan. In this repository:

- `feature.md` owns canonical scope, design, acceptance, and verification intent;
- `implementation-plan.md` owns derived execution sequencing for code or documentation changes;
- `protocol.md` owns process permissions, state, gates, evidence, rollback, and allowed transitions.

Create `protocol.md` before downstream intent/design work and before any risky action when the task needs this level of control. If downstream artifacts or code changes already exist, record them honestly as baseline facts.

## Instantiated Frontmatter

```yaml
title: "Protocol: <task-name>"
doc_kind: process
doc_function: protocol
purpose: "Lifecycle protocol for <task-name>. Controls allowed behavior, gates, evidence, rollback, and external process state."
derived_from:
  - <source-request-or-feature-path>
status: draft
audience: humans_and_agents
protocol_version: "0.1"
current_phase: protocol_review
current_gate: H0
```

## Instantiated Body

```markdown
# Protocol: `<task-name>`

## Source Interpretation

Source used:

- `<source-request-or-material>`

English interpretation:

- `<source-concept-carried-forward-1>`
- `<source-concept-carried-forward-2>`
- `<source-concept-carried-forward-3>`

Repository adaptation:

- `<how external phase names or process ideas map to this repository's governed documents>`

## Metadata

- Protocol version: 0.1
- Owner: `<human-owner>`
- Work area: `<repo-or-project>`, issue `<issue-id>`, service `<service-name>`
- Created: `<yyyy-mm-dd>`
- Last updated: `<yyyy-mm-dd>`
- Status: draft
- Current phase: protocol_review
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
- `<allowed-change-3>`

Out of scope:

- `<forbidden-change-1>`
- `<forbidden-change-2>`
- `<forbidden-change-3>`

## Current Facts / Baseline

Verified facts:

- `<fact-1>`; evidence: `<source-or-command>`
- `<fact-2>`; evidence: `<source-or-command>`
- `<fact-3>`; evidence: `<source-or-command>`

Unchecked hypotheses:

- `<hypothesis-1>`
- `<hypothesis-2>`

## Operating Constraints

- `<technical-constraint>`
- `<organizational-constraint>`
- `<security-or-compliance-constraint>`
- `<production-safety-constraint>`

## Roles

| Actor | Role | Allowed actions | Must not do |
| --- | --- | --- | --- |
| Human owner | decision maker | approve gates, accept risk, stop execution | skip evidence or give implicit approval |
| Operator | execution owner | run approved commands, update evidence, pause on hard stop | cross gates without approval |
| Agent planner | protocol review | inspect sources, propose phases, update TODOs | execute risky changes |
| Agent implementer | source changes | edit scoped files, prepare changes | mutate production runtime |
| Agent verifier | verification | compare outputs, inspect logs, record evidence | change implementation during verification |

## Permissions

| Tool / action | Risk | Default policy | Notes |
| --- | --- | --- | --- |
| read repository files | low | allow | source inspection |
| render templates / dry run | low | allow | no mutation |
| edit scoped source files | medium | allow after H1 | no unrelated changes |
| run non-production apply | medium | H1 required | one environment at a time |
| run production apply | high | H2 required | approved window only |
| destructive / irreversible action | critical | H3 required | separate approval record |

## State

- Status: draft
- Current phase: protocol_review
- Current gate: H0
- Current actor: Human owner
- Next action: review protocol and approve or reject Gate H1
- Open loops:
  - `<open-loop-1>`
  - `<open-loop-2>`
- Rollback mode: no mutation yet; source-only revert

## Human Gates

### H1: Approve scoped execution

Required before:

- `<action-requiring-h1-1>`
- `<action-requiring-h1-2>`

Approval record:

- Approver:
- Date:
- Scope approved:
- Conditions:

### H2: Commit point / production go-no-go

Required before:

- `<action-requiring-h2-1>`
- `<action-requiring-h2-2>`

Required evidence before H2:

- `<evidence-1>`
- `<evidence-2>`
- `<evidence-3>`

Approval record:

- Approver:
- Date:
- Scope approved:
- Conditions:

### H3: Destructive or irreversible action

Required before:

- `<destructive-action-1>`
- `<destructive-action-2>`

Approval record:

- Approver:
- Date:
- Exact action approved:
- Rollback expectation:

## Hard Stop Conditions

Stop immediately and update `State` to `blocked` or `waiting_human` if:

- `<hard-stop-1>`
- `<hard-stop-2>`
- `<hard-stop-3>`
- any step requires printing or copying a secret value;
- rendered diff includes unrelated resources;
- rollback path is missing before a high-risk action;
- approval scope is unclear.

## Execution Plan

### Phase 0: No-Mutation Audit

- [ ] Confirm clean or understood worktree.
- [ ] Capture current baseline without mutation.
- [ ] Confirm required access without printing secrets.
- [ ] Record evidence in `Evidence Log`.

Exit criteria:

- baseline facts are recorded;
- unknowns are resolved or moved to `Open Questions`;
- no mutation has happened.

### Phase 1: Governed Intent / Design

- [ ] Create or update only the governed intent/design artifacts allowed by this protocol.
- [ ] Keep product scope, architecture, and acceptance in their canonical owners.
- [ ] Review the governed artifacts before downstream execution.
- [ ] Record evidence in `Evidence Log`.

Exit criteria:

- governed intent/design artifacts are present or explicitly not needed;
- unresolved questions are recorded with owners and gates;
- no risky mutation has happened.

### Phase 2: Implementation Planning

- [ ] Create or update the derived execution plan if the canonical upstream artifact is ready.
- [ ] Ground the plan in current repository paths, commands, and constraints.
- [ ] Identify approval gates, stop conditions, and verification commands.
- [ ] Record evidence in `Evidence Log`.

Exit criteria:

- the implementation plan is executable or the missing input is recorded;
- risky actions remain gated;
- rollback remains source-only revert unless approved otherwise.

### Phase 3: Source Changes

- [ ] Confirm H1 approval if required by this protocol.
- [ ] Edit only scoped files.
- [ ] Render or dry-run the result when possible.
- [ ] Confirm diff is limited to intended resources.
- [ ] Update `Evidence Log`.

Exit criteria:

- source changes match scope;
- verification commands are recorded;
- rollback remains known.

### Phase 4: Non-Production Execution

- [ ] Apply to the first non-production environment only when the protocol allows it.
- [ ] Verify health and logs.
- [ ] Repeat for the next non-production environment only after success.
- [ ] Record evidence and open issues.

Exit criteria:

- non-production rollout passed;
- no hard stop condition is active;
- H2 evidence is ready for review.

### Phase 5: Production Execution

- [ ] Confirm H2 approval.
- [ ] Apply to one production environment at a time.
- [ ] Verify health before continuing.
- [ ] Stop on any unexpected diff, failed rollout, or alert.

Exit criteria:

- production rollout completed;
- verification evidence is recorded;
- rollback mode is updated.

### Phase 6: PR Review, Verification, And Acceptance

- [ ] Run the required review path.
- [ ] Run verification separately from release or operation.
- [ ] Record final evidence.
- [ ] Confirm acceptance criteria or record why acceptance is blocked.

Exit criteria:

- review findings are resolved or explicitly accepted;
- verification evidence is recorded;
- the human owner can accept, reject, or request another loop from current evidence.

## Verification

Required checks:

- [ ] `<verification-command-or-check-1>`
- [ ] `<verification-command-or-check-2>`
- [ ] `<verification-command-or-check-3>`

Acceptance evidence:

- `<evidence-artifact-1>`
- `<evidence-artifact-2>`
- `<evidence-artifact-3>`

## Rollback

Rollback before H2:

- `<rollback-step-1>`
- `<rollback-step-2>`

Rollback after H2:

- `<rollback-step-1>`
- `<rollback-step-2>`
- `<human-decision-needed-if-any>`

No-rollback / H3 zone:

- `<action-or-state-that-requires-h3>`

## What To Update During Execution

After every substantial step, update:

- `State`: current phase, gate, actor, and next action;
- `Evidence Log`: verified facts, commands, and links to artifacts;
- `Open Questions`: questions that block the next gate;
- `Decisions`: human decisions or selected trade-offs;
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
