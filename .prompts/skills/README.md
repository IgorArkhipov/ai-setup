# Prompt Skills

This directory is the orchestration layer for governed documentation work.

It follows the current project structure and `memory-bank` flows directly. There are no `brief`, `spec`, or `plan` document types in the governed model.

## Skills

- `context-priming.md`
  Preload repository and governed-document context before choosing a documentation prompt chain.

- `document-routing.md`
  Choose the correct governed document type before drafting.

- `review-routing.md`
  Choose the correct governed review prompt for an existing document.

- `prd-generation.md`
  Draft or update a PRD, then run PRD review.

- `prd-review.md`
  Review a PRD and trigger second-opinion review when needed.

- `use-case-generation.md`
  Draft or update a use case, then run use-case review.

- `use-case-review.md`
  Review a use case and trigger second-opinion review when needed.

- `adr-generation.md`
  Draft or update an ADR, then run ADR review.

- `adr-review.md`
  Review an ADR and trigger second-opinion review when needed.

- `feature-generation.md`
  Bootstrap or update a feature package, then run feature review.

- `feature-review.md`
  Review `feature.md` against the current feature-flow and template rules.

- `implementation-plan-generation.md`
  Draft or update `implementation-plan.md`, then run plan review.

- `implementation-plan-review.md`
  Review `implementation-plan.md` against the derived-plan rules.

- `review-loop.md`
  Re-run review after fixes and escalate to Claude Code MCP when needed.

- `code-review.md`
  Static behavioral code review for diffs or changed files.

## Rules

- Treat active `memory-bank/` documents as the source of truth.
- Use these files to choose and chain prompts, not to override governed flow rules.
- Prime context before routing, generation, or review when the agent has not already loaded the relevant repository and governance docs.
- Prefer the smallest governed document that safely owns the work.
- Generation should normally be followed immediately by the matching review skill.
- Use `../memory-bank-second-opinion-claude-review.md` when an independent Claude Code MCP re-review is needed.
