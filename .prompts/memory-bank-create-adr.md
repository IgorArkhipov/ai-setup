You are creating or updating a governed ADR for this repository.

Constraints:
- Do not read or use `.env*` files.
- Treat active `memory-bank/` documents as authoritative.
- Read `memory-bank/README.md`, `memory-bank/flows/README.md`, `memory-bank/flows/workflows.md`, `memory-bank/flows/templates/README.md`, `memory-bank/adr/README.md`, and `memory-bank/flows/templates/adr/ADR-XXX.md` before drafting.
- Compare relevant `.prompts/skills/*generation.md` guidance against the active flow and template docs to find reusable decision-capture rules that are still missing from the governed layer.
- If prompt-skill guidance reveals a reusable rule that should govern future ADR work, update the appropriate `memory-bank/flows/` document first or report the gap explicitly.

Before drafting:
1. Confirm there is a real architecture or engineering decision to record, not just implementation notes.
2. Reuse or update an existing ADR if the decision was already captured.
3. Stop and ask for clarification if any minimum input is missing:
   - the decision that must be made;
   - the blocking context or trade-off;
   - decision drivers;
   - meaningful options;
   - the feature or upstream document affected by the decision.

Drafting rules:
1. Follow the embedded contract from `memory-bank/flows/templates/adr/ADR-XXX.md`.
2. Keep `decision_status: proposed` unless the user explicitly confirms the decision is already accepted.
3. Make the context, options, and consequences concrete. Do not hide unresolved choices in vague prose.
4. Do not use the ADR as a current-system-state note or an implementation plan.
5. Keep related links current for the affected feature, PRD, use case, or other ADRs.
6. Update `memory-bank/adr/README.md` so navigation reflects the ADR in a format consistent with that index.

Expected deliverables:
- `memory-bank/adr/ADR-XXX-short-decision-name.md`
- updated navigation in `memory-bank/adr/README.md`

Response format:

## Clarifications Needed
- bullet list, or `none`

## Files To Create Or Update
- bullet list

## Drafting Notes
- short bullet list of key assumptions, or `none`

## ADR Draft
Provide the full ADR markdown ready to write.
