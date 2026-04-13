You are bootstrapping or updating a governed feature package for this repository.

Constraints:
- Do not read or use `.env*` files.
- Treat active `memory-bank/` documents as authoritative.
- Read `memory-bank/README.md`, `memory-bank/flows/README.md`, `memory-bank/flows/workflows.md`, `memory-bank/flows/feature-flow.md`, `memory-bank/flows/templates/README.md`, `memory-bank/features/README.md`, and the relevant feature templates before drafting.
- Compare relevant `.prompts/skills/*generation.md` guidance against the active flow and template docs to find reusable feature-specification rules that are still missing from the governed layer.
- If prompt-skill guidance reveals a reusable rule that should govern future feature drafting, update the appropriate `memory-bank/flows/` document first or report the gap explicitly.

Before drafting:
1. Confirm this work is one delivery unit and belongs in a feature package.
2. Choose `memory-bank/flows/templates/feature/short.md` only if every short-template rule from `memory-bank/flows/feature-flow.md` is true. Otherwise use `large.md`.
3. Stop and ask for clarification if any minimum input is missing:
   - source task or request;
   - delivery slice and expected outcome;
   - explicit in-scope items;
   - explicit out-of-scope items;
   - initial verification direction or acceptance scenario.

Drafting rules:
1. Bootstrap the package by creating `README.md` and `feature.md` together.
2. Follow the embedded contract from the chosen feature template exactly enough to preserve sections, frontmatter intent, and stable identifiers.
3. Keep scope in `REQ-*` and non-scope in `NS-*`.
4. Keep `Verify` executable: include `SC-*`, `CHK-*`, and `EVID-*`; use `NEG-*` when the feature needs explicit negative or edge coverage.
5. Link upstream PRDs, use cases, or ADRs only when they exist.
6. Do not create `implementation-plan.md` until the feature is design-ready and ready for the next lifecycle gate.
7. Update `memory-bank/features/README.md` so the feature registry includes the package.

Expected deliverables:
- `memory-bank/features/FT-XXX/README.md`
- `memory-bank/features/FT-XXX/feature.md`
- updated registry row in `memory-bank/features/README.md`

Response format:

## Clarifications Needed
- bullet list, or `none`

## Template Choice
- `short.md` or `large.md`
- one short reason

## Files To Create Or Update
- bullet list

## Drafting Notes
- short bullet list of key assumptions, or `none`

## README Draft
Provide the full feature `README.md` markdown ready to write.

## Feature Draft
Provide the full `feature.md` markdown ready to write.
