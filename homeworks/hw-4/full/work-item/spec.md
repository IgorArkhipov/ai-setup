# Spec: Full HW-4 Process Evidence Package

## Purpose

Create a complete English HW-4 evidence package under `homeworks/hw-4/full/` that can be reviewed as a standalone submission. The package must show how small improvement loops for `Brief` and `Spec` fit into a larger SDLC-style loop, how state is saved across stages, and how one real run can be stopped, resumed, traced, and reported.

## Source Inputs

- Improved brief: `homeworks/hw-4/full/work-item/brief.md`
- Draft spec: `homeworks/hw-4/full/work-item/spec.initial.md`
- Historical preliminary attempt: allowed only as background context when it is referenced from the full package; the full package must remain reviewable on its own.

## Requirements

### R1. Full Package Boundary

All new artifacts for this attempt must live under `homeworks/hw-4/full/`.

The full package must not depend on generated files or notes outside this directory for review, except repository-level tooling and standard verification commands.

### R2. English Assignment Interpretation

The package must interpret the HW-4 requirements in English and make the assignment expectations visible to a reviewer.

The interpretation must focus on evidence required by the assignment: small loops, a larger loop, saved state, traceability, stop/resume behavior, and final reporting.

### R3. Separate Small Improvement Loops

The package must include two distinct small-loop definitions:

- a `Brief` improvement loop;
- a `Spec` improvement loop.

Each small loop must have a process specification that describes entry criteria, flow, step contract, exit criteria, and escalation or blocking rules.

### R4. Small-Loop Runner Inputs

The package must include prompt or runner-request artifacts for both small loops.

Each prompt or request must name the required inputs, expected outputs, and runner behavior clearly enough that another agent can execute the loop without relying on hidden context.

### R5. Reusable Small-Loop Runner Shape

The package must provide a reusable small-loop runner artifact. This can be documented as prompt/process artifacts unless a later decision requires an executable script.

The runner shape must be reusable by both the `Brief` and `Spec` improvement loops without duplicating their loop logic inside the large loop.

### R6. Larger SDLC Loop

The package must define a larger feature/task execution loop that calls or reuses the small-loop runner for `Brief` and `Spec` improvement.

The large loop must make stage order and stage responsibilities explicit, including where state is read, where state is updated, and where a human or orchestrator may stop and resume the run.

### R7. State Pack

The package must include a small state pack with 2-3 files.

The state pack must record meaningful stage transitions, not just static placeholders. It should show at least:

- current stage or stage status;
- prior completed stage evidence;
- next planned action or resume instruction.

### R8. Real Run Trace

The package must capture a real run trace or report for one large-loop run.

The trace must name the actual runners used, record the stop/resume point, and report final status.

### R9. Final Evidence Report

The package must include a final report that maps HW-4 requirements to concrete evidence files under `homeworks/hw-4/full/`.

The report must be understandable by a reviewer who starts from the full package directory and does not know the preliminary attempt.

### R10. Repository Verification

The final package must name and run repository verification commands appropriate for homework documentation changes.

At minimum, the package should expect:

- `rtk git diff --check`
- `cd tools/agentscope && rtk npm run lint`

If additional verification is required by later implementation choices, such as an executable runner script, the implementation plan must add the matching test or smoke command.

## Non-Scope

- Do not change production code in `tools/agentscope`.
- Do not create or configure a real deployment environment.
- Do not read or use `.env*` files.
- Do not replace or rewrite preliminary HW-4 artifacts outside `homeworks/hw-4/full/`.
- Do not add assignment requirements that are not present in the HW-4 issue or evidenced by the brief.
- Do not require a real external service, credential, or network dependency for package review.

## Constraints

- All authored homework artifacts must be in English.
- All new full-attempt files must stay under `homeworks/hw-4/full/`.
- The large loop must reuse the small-loop runner shape rather than embedding separate copies of the small-loop logic.
- State and trace artifacts must be concrete enough to audit stage transitions and resume behavior.
- Verification must avoid `.env*` inputs and must not require production deployment.
- Shell verification commands should use the repository's `rtk` wrapper.

## Acceptance Scenarios

### A1. Reviewer Finds the Full Package

Given a reviewer opens `homeworks/hw-4/full/`, when they inspect the package, then they can identify the brief, spec, loop specs, prompts or runner requests, state pack, run trace, and final report without needing files outside the full directory.

### A2. Reviewer Checks Separate Small Loops

Given the reviewer inspects the small-loop artifacts, when they compare the `Brief` and `Spec` loops, then they see separate process specifications and separate prompts or runner requests for each loop.

### A3. Reviewer Checks Large-Loop Reuse

Given the reviewer inspects the large-loop artifact, when they trace the `Brief` and `Spec` stages, then they see the large loop calling or reusing the small-loop runner instead of duplicating the small-loop logic.

### A4. Reviewer Checks State Transitions

Given the reviewer inspects the state pack, when they follow the recorded stage transitions, then they can see what completed, where the run stopped or resumed, and what action was next.

### A5. Reviewer Checks Real Run Evidence

Given the reviewer inspects the run trace or report, when they look for runner evidence, then they find the actual runners used, the stop/resume point, and the final status.

### A6. Reviewer Checks Requirement Mapping

Given the reviewer opens the final report, when they compare the assignment evidence needs to the package contents, then every requirement is mapped to at least one concrete file path.

### A7. Maintainer Runs Verification

Given the homework artifacts are complete, when a maintainer runs the named verification commands, then formatting and repository checks pass or any failure is recorded with the exact command and reason.

## Verification Plan

Use these checks for the final homework package:

1. Inspect the package tree under `homeworks/hw-4/full/` and confirm every required artifact is present.
2. Confirm small-loop process specs and prompts exist for both `Brief` and `Spec`.
3. Confirm the large loop references the reusable small-loop runner shape.
4. Confirm the state pack contains 2-3 files with meaningful stage transitions.
5. Confirm the run trace records actual runners, stop/resume evidence, and final status.
6. Confirm the final report maps requirements to concrete evidence files.
7. Run `rtk git diff --check`.
8. Run `cd tools/agentscope && rtk npm run lint`.

## Risks

- The package may become a collection of static documents rather than evidence of a real run. Mitigation: require a trace that names actual runners, stop/resume point, and final status.
- The large loop may duplicate the small-loop logic. Mitigation: require explicit reuse of the small-loop runner shape.
- Verification may be under-specified if an executable runner is added later. Mitigation: add script-specific tests or smoke checks when executable scope is chosen.
- The full attempt may accidentally rely on preliminary artifacts. Mitigation: keep reviewable evidence under `homeworks/hw-4/full/` and use preliminary work only as historical context.

## Open Questions

- Should final acceptance require only documentation checks and `tools/agentscope` lint, or should it also require a package-tree smoke check command if a runner script is added?
- Should the reusable small-loop runner remain a documented prompt/process contract, or should a later implementation stage add an executable script?

## Implementation Planning Notes

The implementation plan should create or verify artifacts in this order:

1. Complete the small-loop process specs and prompts.
2. Define the reusable small-loop runner contract.
3. Define the large SDLC loop and its reuse points.
4. Create the state pack.
5. Execute and record one real large-loop run with stop/resume evidence.
6. Write the final report mapping requirements to evidence.
7. Run and record verification.
