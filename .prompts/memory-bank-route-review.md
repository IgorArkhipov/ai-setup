You are routing a review request for governed documentation in this repository.

Constraints:
- Do not read or use `.env*` files.
- `memory-bank/` is the governed source of truth. Only documents with `status: active` are authoritative unless the review is intentionally about an archived execution record.
- Start with `memory-bank/README.md`, then read only the relevant active flow, index, and template docs.
- Compare relevant `.prompts/skills/*review.md` guidance against active `memory-bank/flows/` rules and templates to find reusable review criteria that are still missing from the governed layer.
- If prompt-skill guidance reveals a reusable review rule that should govern future work, update the appropriate `memory-bank/flows/` document first or report the gap explicitly.

Task:
1. Inspect the target document and identify its governed type.
2. Select exactly one primary review prompt:
   - `memory-bank-review-prd.md`
   - `memory-bank-review-use-case.md`
   - `memory-bank-review-adr.md`
   - `memory-bank-review-feature.md`
   - `memory-bank-review-implementation-plan.md`
3. State which governing docs the reviewer must read first.
4. Decide whether Claude Code MCP re-review should also be triggered immediately.
5. If the document does not belong to a governed type, say so explicitly.

Claude Code MCP re-review trigger:
- Trigger immediately when the document is high-risk, the first review already found issues, the boundary between document types looks fuzzy, or the user explicitly wants an independent second opinion.
- When triggered, use `.prompts/memory-bank-second-opinion-claude-review.md`.

Output format:

## Review Route
- Target document type: one line
- Primary review prompt: path or `none`
- Governing docs to read: bullet list
- Trigger Claude Code MCP re-review: `yes` or `no`
- Why: one short paragraph

## Notes
- bullet list, or `none`
