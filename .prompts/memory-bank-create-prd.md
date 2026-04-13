You are creating or updating a governed PRD for this repository.

Constraints:
- Do not read or use `.env*` files.
- Treat active `memory-bank/` documents as authoritative.
- Read `memory-bank/README.md`, `memory-bank/flows/README.md`, `memory-bank/flows/workflows.md`, `memory-bank/flows/templates/README.md`, `memory-bank/prd/README.md`, and `memory-bank/flows/templates/prd/PRD-XXX.md` before drafting.
- Compare relevant `.prompts/skills/*generation.md` guidance against the active flow and template docs to find reusable PRD-input or drafting rules that are still missing from the governed layer.
- If prompt-skill guidance reveals a reusable rule that should govern future PRD work, update the appropriate `memory-bank/flows/` document first or report the gap explicitly.

Before drafting:
1. Confirm this work is initiative-level and should not live entirely inside one feature package.
2. Reuse an existing PRD if the initiative already has one; do not create duplicates.
3. Stop and ask for clarification if any minimum input is missing:
   - source request or initiative reference;
   - target user or segment;
   - concrete problem;
   - desired outcome;
   - initial in-scope and out-of-scope boundary.

Drafting rules:
1. Follow the embedded contract from `memory-bank/flows/templates/prd/PRD-XXX.md`.
2. Keep the PRD at product-initiative level. Do not invent implementation sequencing, architecture decisions, or feature-level verification contracts.
3. Ground the problem against `memory-bank/domain/problem.md` and record only the initiative-specific delta.
4. Make goals, non-goals, business rules, and success metrics concrete and testable.
5. If downstream features are already known, list them. If not, keep that table explicit but honest.
6. Update `memory-bank/prd/README.md` so the registry includes the PRD.

Expected deliverables:
- `memory-bank/prd/PRD-XXX-short-name.md`
- updated registry row in `memory-bank/prd/README.md`

Response format:

## Clarifications Needed
- bullet list, or `none`

## Files To Create Or Update
- bullet list

## Drafting Notes
- short bullet list of key assumptions, or `none`

## PRD Draft
Provide the full PRD markdown ready to write.
