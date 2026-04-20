---
name: Context Priming
description: Preload the minimum repository and governed-document context before documentation work starts.
when_to_use: Use this skill when the agent needs repository and documentation context before routing, drafting, or reviewing governed docs.
---

# Context Priming

Use this skill when the agent needs direct preload prompts before documentation work starts.

## Execution

1. Use `../memory-bank-prime-project-context.md` to load repository-level context.
2. If the task touches `memory-bank/` or `.prompts/`, then use `../memory-bank-prime-documentation-context.md`.
3. After priming, continue with exactly one of:
   - `document-routing.md`
   - `review-routing.md`
   - a specific generation or review skill when the target document is already obvious
4. Keep priming concise. Its job is to reduce avoidable context misses, not to restate every doc in the repo.

## Preserve

- smallest necessary reading set;
- active-doc authority;
- explicit identification of missing inputs;
- separation between priming, routing, drafting, and review.
