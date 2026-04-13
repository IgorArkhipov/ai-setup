You are routing a documentation request in this repository.

Constraints:
- Do not read or use `.env*` files.
- `memory-bank/` is the governed source of truth. Only documents with `status: active` are authoritative.
- Start with `memory-bank/README.md`, then read only the relevant active flow and index docs.
- Compare relevant `.prompts/skills/*generation.md` guidance against active `memory-bank/flows/` rules and templates to find reusable drafting inputs that are still missing from the governed layer.
- If prompt-skill guidance reveals a reusable rule that should govern future work, update the appropriate `memory-bank/flows/` document first or report the gap explicitly.

Task:
1. Read the incoming request, ticket, or draft context.
2. Decide the single next governed action:
   - create or update a PRD;
   - create or update a use case;
   - create or update an ADR;
   - bootstrap or update a feature package;
   - create or update an implementation plan;
   - no new governed document is needed.
3. Justify the choice using `memory-bank/flows/workflows.md`.
4. Name the canonical template and target path if a document should be created.
5. List the minimum required inputs already known.
6. List the missing inputs that must be clarified before drafting.
7. If old `docs/` material contains a reusable requirement that the active flow docs do not yet capture, say which governed `memory-bank/flows/` file should be updated first.

Output format:

## Chosen Action
- Action: one line
- Why this fits: one short paragraph
- Template: path or `none`
- Target path: path or `none`

## Known Inputs
- bullet list

## Missing Inputs
- bullet list

## Next Step
- one concrete next action
