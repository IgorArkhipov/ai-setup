You are creating or updating a lifecycle `protocol.md` for this repository.

Preserve the source intent, but adapt wording to the governed vocabulary used by this repository.

Source interpretation from the lifecycle protocol template:
- create `protocol.md` before Brief-level work and before any risky action;
- first record the process contract: gates, permissions, state, and evidence;
- then move document-by-document through the lifecycle that the protocol permits;
- in this repository, map legacy or external phase names such as `Brief` and `Spec Pack` to the current governed owners instead of creating new legacy `brief.md`, `spec.md`, or `plan.md` feature-package artifacts;
- `protocol.md` must answer "where are we now, and what is allowed next?" without relying on chat memory.
- by default, runner-created workflow runs use `accepted-review`, so accepted review stages require Claude Code MCP second opinion before downstream transition unless the initial prompt or CLI explicitly sets another policy;
- if the source prompt or run metadata sets `Claude review policy: every-step`, carry that policy into the protocol permissions, gates, execution plan, and copy-ready runner prompt so every completed stage requires Claude Code MCP second opinion before downstream transition.

Constraints:
- Do not read or use `.env*` files.
- Treat active `memory-bank/` documents as authoritative.
- Read `memory-bank/README.md`, `memory-bank/flows/README.md`, `memory-bank/flows/workflows.md`, `memory-bank/flows/agent-process-operations.md`, `memory-bank/flows/templates/README.md`, and `memory-bank/flows/templates/protocol/lifecycle-protocol.md` before drafting.
- If the lifecycle protocol belongs to a feature package, also read the sibling `feature.md`, `implementation-plan.md` if it exists, and the feature-package `README.md`.
- Compare `.prompts/skills/lifecycle-protocol-generation.md` against active `memory-bank/flows/` rules to find reusable protocol rules that are still missing from the governed layer.
- If prompt-skill guidance reveals a durable rule that should govern future process protocols, update the appropriate `memory-bank/flows/` document first or report the gap explicitly.

Before drafting:
1. Confirm the source material is available as a reachable page, pasted excerpt, local document, or explicit user summary.
2. If the original source is inaccessible, state that clearly and draft only from the available user-provided source summary or excerpt.
3. Confirm the protocol's target path and scope. If none is provided, propose the smallest appropriate path and do not scatter protocol state across unrelated files.
4. Confirm this is the first process artifact for the work. If downstream docs or code changes already exist, capture them as baseline facts and do not pretend the protocol came first.
5. Stop and ask for clarification if any minimum input is missing:
   - the lifecycle this protocol governs;
   - the artifact that marks the protocol complete, usually `protocol.md`;
   - goal and scope;
   - current facts or baseline evidence;
   - entry criteria;
   - exit criteria;
   - artifacts or state files the protocol may update;
   - review, approval, or human-in-the-loop gates;
   - rollback or recovery expectations for risky work.

Drafting rules:
1. Use the full local template from `memory-bank/flows/templates/protocol/lifecycle-protocol.md` as the working shape. Do not copy isolated sections into a free-form protocol.
2. Keep the protocol as a process spec plus external process state, not a prose plan and not chat memory.
3. Set initial `Status` to `draft`, `Current phase` to `protocol_review`, and `Current gate` to `H0`.
4. Do not execute changes or run risky tools while creating the protocol.
5. Include a short Source Interpretation section that names the source and the concepts carried forward.
6. Define Metadata, Goal, Scope, Current Facts / Baseline, Operating Constraints, Roles, Permissions, State, Human Gates H1/H2/H3, Hard Stop Conditions, Execution Plan, Verification, Rollback, What To Update During Execution, Evidence Log, Decisions, Open Questions, and Next Action.
7. The Execution Plan must cover the lifecycle phases that apply to this repository, including intake, governed intent/design docs, implementation plan, implementation, PR review, verification, and acceptance. Use repository terms for these phases.
8. Include one primary Mermaid diagram when it clarifies the lifecycle. Use `flowchart` for ordered lifecycle work, `stateDiagram-v2` for pause/resume/blocking states, and `sequenceDiagram` only when ownership transfer matters.
9. Every phase or step must name:
   - what the agent does;
   - which artifacts it reads;
   - which artifacts it may update;
   - what evidence proves the step completed;
   - when to continue, stop, block, or escalate.
10. Hard stop conditions must include production impact, secrets, destructive or irreversible actions, unrelated diffs, missing rollback before high-risk action, and unclear approval scope.
11. Execution must return exactly one process status: `continue`, `done`, `blocked`, or `escalation`. Inside the protocol state, use `waiting_human` or `blocked` when approval or a hard stop prevents progress.
12. Do not redefine canonical product scope, architecture, acceptance, or implementation facts owned by `feature.md`, ADRs, use cases, or implementation plans.
13. Record the active Claude review policy. If it is `every-step`, each phase or step must name the Claude review evidence required before the next transition.
14. If the protocol is meant to run future agents, include a copy-ready runner prompt inside `protocol.md`.

Expected deliverable:
- a lifecycle `protocol.md` at the confirmed target path

Response format:

## Source Check
- Available: `yes` or `no`
- Source used: one line
- Interpretation note: one short paragraph

## Clarifications Needed
- bullet list, or `none`

## Target
- Path: one line
- Scope: one short paragraph

## Protocol Draft
Provide the full `protocol.md` markdown ready to write, or list the missing inputs if drafting is blocked.
