# Memory-Bank Prompts

Reusable prompts for creating or updating governed documentation from `memory-bank/flows/`.

## Prompts

- `memory-bank-prime-project-context.md`
  Load the minimum repository context that should be understood before tackling work in this repo.

- `memory-bank-prime-documentation-context.md`
  Load the governed documentation and prompt-pack context before routing, drafting, or reviewing `memory-bank/` documents.

- `memory-bank-route-document.md`
  Decide which governed document should be created or updated next.

- `memory-bank-create-prd.md`
  Draft or update a PRD for an initiative that spans multiple features.

- `memory-bank-create-use-case.md`
  Draft or update a stable project-level user or operational scenario.

- `memory-bank-create-adr.md`
  Draft or update an ADR for a durable architecture or engineering decision.

- `memory-bank-create-feature.md`
  Bootstrap or update a feature package by creating `README.md` plus canonical `feature.md`.

- `memory-bank-create-implementation-plan.md`
  Draft or update `implementation-plan.md` after the sibling `feature.md` is design-ready.

- `memory-bank-route-review.md`
  Decide which governed review prompt should be applied to an existing document.

- `memory-bank-review-prd.md`
  Review a PRD against the current governed template and initiative-level boundaries.

- `memory-bank-review-use-case.md`
  Review a use case against the current governed template and scenario-level boundaries.

- `memory-bank-review-adr.md`
  Review an ADR against the current governed template and decision-record boundaries.

- `memory-bank-review-feature.md`
  Review a canonical `feature.md` against the current governed feature-flow and template rules.

- `memory-bank-review-implementation-plan.md`
  Review `implementation-plan.md` against the current governed derived-plan rules.

- `memory-bank-second-opinion-claude-review.md`
  Wrapper prompt for a Claude Code MCP independent re-review of any governed document review.

## Prompt Skills

- `skills/README.md`
  Compatibility and orchestration layer for prompt reuse across generation and review.

## Usage Notes

- Recommended preload order for documentation work:
  1. `memory-bank-prime-project-context.md`
  2. `memory-bank-prime-documentation-context.md`
  3. the relevant routing, generation, or review prompt
- Treat active `memory-bank/` documents as the source of truth.
- Do not read or use `.env*` files.
- Compare the relevant prompt-skill guidance in `.prompts/skills/*generation.md` or `.prompts/skills/*review.md` against active `memory-bank/flows/` rules and templates to find reusable requirements or checks that are still missing from the governed layer.
- If prompt-skill guidance reveals a reusable rule that should govern future work, update the appropriate `memory-bank/flows/` document first, then rely on that rule in prompts. If you cannot update it in the current task, report the gap explicitly.
