You are creating or updating a governed feature implementation plan for this repository.

Constraints:
- Do not read or use `.env*` files.
- Treat active `memory-bank/` documents as authoritative.
- Read `memory-bank/README.md`, `memory-bank/flows/README.md`, `memory-bank/flows/workflows.md`, `memory-bank/flows/feature-flow.md`, `memory-bank/flows/templates/README.md`, `memory-bank/flows/templates/feature/implementation-plan.md`, the sibling `feature.md`, and the relevant current code or docs before drafting.
- Compare relevant `.prompts/skills/*generation.md` guidance against the active flow and template docs to find reusable planning or grounding rules that are still missing from the governed layer.
- If prompt-skill guidance reveals a reusable rule that should govern future implementation-plan work, update the appropriate `memory-bank/flows/` document first or report the gap explicitly.

Before drafting:
1. Confirm the sibling `feature.md` is already design-ready and can act as canonical input.
2. Ground the plan against the current repository state before writing steps.
3. Stop and ask for clarification if any minimum input is missing:
   - active sibling `feature.md`;
   - expected touchpoints in the repository;
   - sequencing or orchestration constraints;
   - test strategy or required suites;
   - unresolved questions that could change upstream scope or design.

If the sibling `feature.md` is still `status: draft` or does not satisfy the Design Ready gate, do not draft the plan. List the missing gate conditions instead.

Drafting rules:
1. Follow the embedded contract from `memory-bank/flows/templates/feature/implementation-plan.md`.
2. Keep the plan derived. Do not redefine scope, architecture, acceptance criteria, blocker state, or evidence contracts that belong in `feature.md` or an ADR.
3. Start with grounded discovery context: relevant paths, local patterns, open questions, and environment constraints.
4. Make steps atomic, traceable, and executable. Use canonical IDs from `feature.md`.
5. Record automated coverage, required local or CI suites, and any manual-only gap with explicit justification and approval reference.
6. Update the feature package `README.md` if the implementation plan becomes a navigable document in the package.

Expected deliverables:
- `memory-bank/features/FT-XXX/implementation-plan.md`
- updated `memory-bank/features/FT-XXX/README.md` if needed

Response format:

## Gate Check
- `ready` or `not ready`
- short explanation

## Clarifications Needed
- bullet list, or `none`

## Files To Create Or Update
- bullet list

## Grounding Notes
- bullet list of inspected paths, patterns, and risks

## Implementation Plan Draft
Provide the full `implementation-plan.md` markdown ready to write, or list the missing Design Ready conditions if the gate fails.
