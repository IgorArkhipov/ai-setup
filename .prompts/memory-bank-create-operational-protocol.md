You are creating or updating an operational `protocol.md` for this repository.

Preserve the source intent, but adapt wording to the governed vocabulary used by this repository.

Source interpretation from the operational protocol template:
- use an operational protocol when a specific operational workflow is ready to execute;
- keep the protocol compact and execution-focused: scope, baseline, roles, permissions, gates, hard stops, verification, rollback, evidence, and one next action;
- start from `Current phase: ready_to_execute` and `Current gate: H0`;
- do not proceed from chat memory; the protocol must carry current state and safe next action.

Constraints:
- Do not read or use `.env*` files.
- Treat active `memory-bank/` documents as authoritative.
- Read `memory-bank/README.md`, `memory-bank/flows/README.md`, `memory-bank/flows/workflows.md`, `memory-bank/flows/agent-process-operations.md`, `memory-bank/flows/templates/README.md`, and `memory-bank/flows/templates/protocol/operational-protocol.md` before drafting.
- If the operational protocol belongs to a feature package, also read the sibling `feature.md`, `implementation-plan.md` if it exists, and the feature-package `README.md`.
- Compare `.prompts/skills/operational-protocol-generation.md` against active `memory-bank/flows/` rules to find reusable operational protocol rules that are still missing from the governed layer.
- If prompt-skill guidance reveals a durable rule that should govern future operational protocols, update the appropriate `memory-bank/flows/` document first or report the gap explicitly.

Before drafting:
1. Confirm the source material is available as a reachable page, pasted excerpt, local document, or explicit user summary.
2. Confirm this is a specific operational workflow rather than a full lifecycle process. Use the lifecycle protocol template when the work needs upstream intent/design phases before execution.
3. Confirm the protocol's target path and scope. If none is provided, propose the smallest appropriate path.
4. Stop and ask for clarification if any minimum input is missing:
   - the operational workflow to execute;
   - goal and scope;
   - current facts or baseline evidence;
   - roles and permissions;
   - H1/H2/H3 gate triggers;
   - hard stop conditions;
   - verification commands or checks;
   - rollback or recovery expectations.

Drafting rules:
1. Use the full local template from `memory-bank/flows/templates/protocol/operational-protocol.md` as the working shape. Do not copy isolated sections into a free-form protocol.
2. Keep the protocol execution-focused. Do not add broad lifecycle phases unless the lifecycle protocol template is actually needed.
3. Set initial `Status` to `draft`, `Current phase` to `ready_to_execute`, and `Current gate` to `H0`.
4. Do not execute changes or run risky tools while creating the protocol.
5. Include a short Source Interpretation section in English that names the source and the concepts carried forward.
6. Define Metadata, Goal, Scope, Current Facts / Baseline, Operating Constraints, Roles, Permissions, State, Human Gates H1/H2/H3, Hard Stop Conditions, Execution Plan, Verification, Rollback, What To Update During Execution, Evidence Log, Decisions, Open Questions, and Next Action.
7. The Execution Plan must include Preflight, Implementation, and Verification And Acceptance phases unless the source workflow requires a stricter split.
8. Hard stop conditions must include secrets, unclear rollout ownership, missing rollback before high-risk action, and any workflow-specific stop condition.
9. Do not redefine canonical product scope, architecture, acceptance, or implementation facts owned by `feature.md`, ADRs, use cases, or implementation plans.

Expected deliverable:
- an operational `protocol.md` at the confirmed target path

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
