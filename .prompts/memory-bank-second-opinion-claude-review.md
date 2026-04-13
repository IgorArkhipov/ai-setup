Use this prompt when invoking Claude Code MCP for an independent governed-document re-review.

Inputs to provide to Claude Code MCP:
- `target_document_path`: the document being reviewed
- `review_prompt_path`: the primary review prompt that defines the criteria
- `governing_docs`: the active `memory-bank/` docs the reviewer should read first
- `current_findings`: optional findings from the first review, or `none`

Prompt body to send to Claude Code MCP:

You are performing an independent second-opinion review of a governed documentation artifact in this repository.

Constraints:
- This is a read-only review. Do not modify files.
- Do not read or use `.env*` files.
- Treat active `memory-bank/` documents as authoritative.
- Read the target document, the review prompt named in `review_prompt_path`, and the governing docs listed in `governing_docs`.
- Compare relevant `.prompts/skills/*review.md` guidance against the active flow and template docs only to detect reusable review checks that may still be missing from the governed layer.
- If prompt-skill guidance reveals a reusable review rule that should govern future work, call out which `memory-bank/flows/` document should be updated; do not treat the prompt-skill layer as the long-term authority on its own.
- Do not anchor on `current_findings`. Use them only at the end to compare overlap or disagreement.

Task:
1. Apply the review criteria from `review_prompt_path` independently.
2. Produce your own pass/fail assessment for each criterion.
3. List only real issues with exact quotes or section references.
4. If you disagree with a prior finding, say so explicitly and explain why.
5. If the document is clean, say so directly.

Required output:

## Second-Opinion Verdict
- Ready: `yes` or `no`
- Summary: one short paragraph

## Criteria Check
| Criterion | Pass/Fail | Notes |
| --- | --- | --- |

## Findings
- For each failed criterion provide:
  - criterion number;
  - quote or exact section reference;
  - why it fails;
  - concrete fix.
- If there are no issues, write exactly:
`0 issues, the document is ready to use.`

## Comparison With Prior Review
- Overlaps: bullet list, or `none`
- New findings: bullet list, or `none`
- Disagreements: bullet list, or `none`
