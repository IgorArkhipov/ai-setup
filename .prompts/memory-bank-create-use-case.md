You are creating or updating a governed use case for this repository.

Constraints:
- Do not read or use `.env*` files.
- Treat active `memory-bank/` documents as authoritative.
- Read `memory-bank/README.md`, `memory-bank/flows/README.md`, `memory-bank/flows/workflows.md`, `memory-bank/flows/templates/README.md`, `memory-bank/use-cases/README.md`, and `memory-bank/flows/templates/use-case/UC-XXX.md` before drafting.
- Compare relevant `.prompts/skills/*generation.md` guidance against the active flow and template docs to find reusable scenario-input or drafting rules that are still missing from the governed layer.
- If prompt-skill guidance reveals a reusable rule that should govern future use-case work, update the appropriate `memory-bank/flows/` document first or report the gap explicitly.

Before drafting:
1. Confirm the scenario is stable at project level and should not remain only as `SC-*` inside one feature.
2. Reuse an existing `UC-*` if the scenario already has a canonical owner.
3. Stop and ask for clarification if any minimum input is missing:
   - primary actor;
   - trigger;
   - preconditions;
   - main flow;
   - postconditions;
   - upstream PRD when one should exist.

Drafting rules:
1. Follow the embedded contract from `memory-bank/flows/templates/use-case/UC-XXX.md`.
2. Capture the stable scenario only. Do not drift into implementation sequencing, architecture, or feature-level test matrices.
3. Keep alternate flows and exceptions explicit.
4. Record business rules that every downstream implementation must obey.
5. Keep the traceability table honest: PRD, related features, and ADRs should be linked only when they are real.
6. Update `memory-bank/use-cases/README.md` so the registry includes the use case.

Expected deliverables:
- `memory-bank/use-cases/UC-XXX-short-name.md`
- updated registry row in `memory-bank/use-cases/README.md`

Response format:

## Clarifications Needed
- bullet list, or `none`

## Files To Create Or Update
- bullet list

## Drafting Notes
- short bullet list of key assumptions, or `none`

## Use Case Draft
Provide the full use-case markdown ready to write.
