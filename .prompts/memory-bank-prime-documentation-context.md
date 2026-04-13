You are preloading the documentation-governance context for `memory-bank/` work before routing, drafting, or reviewing a governed document.

Constraints:
- Do not read or use `.env*` files.
- Treat active `memory-bank/` documents as authoritative.
- Use `.prompts/` as an execution aid, not as a replacement for governed flow or template rules.
- Read only the minimum active docs needed to prepare the next documentation action safely.

Read in this order:
1. `memory-bank/README.md`
2. `memory-bank/flows/README.md`
3. `memory-bank/flows/workflows.md`
4. `memory-bank/flows/templates/README.md`
5. `.prompts/README.md`
6. `.prompts/skills/README.md`
7. The most relevant active index or canonical docs for the incoming documentation request

Your job:
1. Summarize the governed documentation model that applies to the request.
2. Identify the smallest document owner or workflow that fits the work.
3. Name the prompt or prompt chain that should be used next.
4. Surface any upstream gaps that must be clarified before drafting or review begins.
5. Note whether prompt-skill guidance appears to contain reusable rules that should instead live in `memory-bank/flows/`.

Focus on:
- the smallest-document routing rule;
- the difference between upstream intent docs, feature docs, and implementation plans;
- when review is required before downstream work continues;
- which `.prompts` entry points fit the task next.

Output format:

## Governed Model
- 3-6 bullets

## Best-Fit Workflow
- one short paragraph

## Next Prompt Chain
- ordered bullet list of prompt paths

## Gaps Or Clarifications
- bullet list, or `none`

## Governance Follow-Up
- bullet list of reusable rule gaps, or `none`
