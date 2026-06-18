# HW-5 Task 1 Requirements Interpretation

Fetched on: 2026-05-17

## Assignment Focus

Task 1 asks for a managed feature-development process using a lifecycle protocol.

The required shape is:

1. One-time setup: the lifecycle protocol template must exist in the Memory Bank and be easy for agents to find.
2. Create a `protocol.md` for one concrete issue or feature using the lifecycle protocol template.
3. Create the standard governed feature document pack for that feature.
4. Groom the protocol as its own artifact through review and fixes.
5. Start execution in a new session or fresh agent context by passing it the protocol path and asking it to execute.
6. Record what went wrong and what should improve in the template, starter prompt, lower-level processes, Memory Bank rules, review criteria, checks, or Human Gate boundaries.
7. Optionally teach the launcher to perform the upper-level protocol steps: create a lifecycle protocol from a feature intention and continue execution from an approved `protocol.md`.

## Repository Adaptation

This repo maps the external lifecycle terms into current Memory Bank owners:

- `Brief` / `Spec Pack` -> `feature.md`
- `Implementation Plan` -> `implementation-plan.md`
- Lifecycle state / gates / evidence / permissions -> `protocol.md`

No new legacy `brief.md`, `spec.md`, or `plan.md` files are created inside feature packages.

## Selected Feature Goal

The next AgentScope feature selected for this lifecycle run is `FT-008: Local MCP Control Plane`.

Reason:

- `memory-bank/features/` already has `FT-001` through `FT-007`.
- Current code already contains snapshot, restore, mutation vault, and provider toggle support from the earlier backlog phases.
- The next unimplemented product slice from `tmp/Agentscope Implementation Plan.md` is Phase 3 Tasks 19-23: expose AgentScope through a local stdio MCP server.

## Expected Final Result

- `memory-bank/features/FT-008/protocol.md` exists and is groomed.
- `memory-bank/features/FT-008/{README.md,feature.md,implementation-plan.md}` exists.
- `tools/agentscope` implements the selected feature.
- `.ai-setup` runner automation can carry an initial lifecycle feature intention through protocol creation, review, polish, and execution stages.
- This `homeworks/hw-5/task-1/` package records source interpretation, protocol grooming, execution evidence, runner updates, and improvement notes.
