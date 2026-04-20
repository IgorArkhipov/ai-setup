---
name: Document Routing
description: Choose the smallest governed document type that should own the requested work.
when_to_use: Use this skill when the next governed document is not obvious and the agent must route the task before drafting.
---

# Document Routing

Use this skill when the next governed document is not obvious yet.

## Execution

1. Use `../memory-bank-route-document.md`.
2. Read the routing result before drafting anything.
3. Continue with exactly one of:
   - `prd-generation.md`
   - `use-case-generation.md`
   - `adr-generation.md`
   - `feature-generation.md`
   - `implementation-plan-generation.md`
4. If the router says no new governed document is needed, stop and work from the existing canonical owner.

## Preserve

- smallest-document routing;
- explicit source inputs;
- no invention of missing upstream context;
- no premature downstream artifacts.
