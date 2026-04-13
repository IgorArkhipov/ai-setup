---
title: Templates Index
doc_kind: governance
doc_function: index
purpose: Navigation for the reference templates used in project documentation. Read this when you need to create a feature, ADR, or execution document without inventing a new structure.
derived_from:
  - ../../dna/governance.md
  - prd/PRD-XXX.md
  - use-case/UC-XXX.md
  - feature/README.md
  - feature/implementation-plan.md
  - feature/short.md
  - feature/large.md
  - adr/ADR-XXX.md
status: active
audience: humans_and_agents
---

# Templates Index

The `memory-bank/flows/templates/` directory stores the reference templates for project documentation. All templates live as governed wrapper documents with `doc_function: template`: the wrapper has its own purpose, while the frontmatter and body of the instantiated document live inside the embedded template contract.

- [PRD-XXX: Product Initiative Name](prd/PRD-XXX.md) - a lean Product Requirements Document for an initiative that is not yet decomposed into one concrete feature slice.
- [UC-XXX: Use Case Name](use-case/UC-XXX.md) - the canonical use case for a stable user or operational scenario.
- [FT-XXX Feature README Template](feature/README.md) - the README template for a feature directory. Answers: how should the feature-level index be structured?
- [FT-XXX: Feature Template - Short](feature/short.md) - the minimal canonical feature document for a small feature. Answers: what does a short feature document look like?
- [FT-XXX: Feature Template - Large](feature/large.md) - a canonical feature document with assumptions, blockers, contracts, and a richer verification layer. Answers: what does a large feature document look like?
- [FT-XXX: Implementation Plan](feature/implementation-plan.md) - the template for a derived execution plan. Answers: how should sequencing and checkpoints be described?
- [ADR-XXX: Short Decision Name](adr/ADR-XXX.md) - the ADR template. Answers: how should an architectural decision be captured?

## Minimum Inputs Before Drafting

If the minimum input for a document is missing, stop and ask instead of inventing business context, scope, or technical decisions.

| Document | Minimum required inputs | Stop and ask when |
| --- | --- | --- |
| PRD | initiative source or request, target user or segment, concrete problem, desired outcome, initial scope boundary | the problem is still solution-shaped, the user is unknown, success cannot be described, or the work is really one feature not an initiative |
| Use case | source request or upstream doc, stable actor, trigger, preconditions, main flow, expected postconditions, upstream PRD if one exists | the flow is still local to one feature, the actor or trigger is unclear, or business rules are missing |
| ADR | source feature or upstream doc, decision statement, blocking context, decision drivers, meaningful options, feature or upstream document that needs the decision | there is no real choice to make, the decision owner is unclear, or the work is only implementation sequencing |
| Feature package | source task or request, delivery slice, explicit in-scope and out-of-scope statements, expected user-visible or operational outcome, verification direction | scope is still initiative-level, the slice is not vertically coherent, or acceptance cannot yet be described |
| Implementation plan | active sibling `feature.md`, grounded repository context, expected touchpoints, sequencing constraints, test strategy | `feature.md` is still draft, repository grounding has not happened, or plan work would redefine canonical scope or design |

## Review Heuristics To Preserve

The governed templates remain the source of truth. The checks below summarize reusable quality heuristics that should be applied when drafting or reviewing governed documents.

### Upstream Intent Docs

- Problem or scenario statements should be concrete and measurable when possible, not vague or generic.
- The relevant stakeholder, user, or actor should be named explicitly.
- Context should explain why the work matters now rather than only restating the request.
- Upstream intent docs should not drift into implementation design.

### Feature Docs

- Scope should stay focused on one delivery unit rather than an unfocused initiative.
- In-scope and out-of-scope boundaries should both be explicit.
- Constraints, invariants, and failure modes should be called out when they materially affect implementation or acceptance.
- Important behavior states and failure scenarios should appear in design or verification rather than being left implicit.
- Verification should remain independently checkable.

### Implementation Plans

- Each step should name the affected file, module, behavior, or surface clearly enough to execute and verify independently.
- Step order should respect dependencies and avoid cycles.
- The plan should call out required test updates, migrations, documentation changes, rollout checks, or follow-up verification when they are part of the change.
- Grounding should be against real repository paths and patterns rather than an imagined architecture.

## Prompting Notes

- Read `memory-bank/README.md` first, then only the relevant active index and template docs for the target document.
- Follow the embedded contract from the chosen template closely instead of paraphrasing its structure.
- Compare the relevant prompt-skill guidance in `.prompts/skills/*generation.md` or `.prompts/skills/*review.md` against the active `memory-bank/flows/` rules and templates to identify reusable inputs, checks, or drafting constraints that are still missing from the governed layer.
- If prompt-skill guidance reveals a reusable rule that should govern future work, update the appropriate `memory-bank/flows/` document first, then apply that rule through prompts. If you cannot update it in the current task, report the gap explicitly instead of treating the prompt-skill layer as the long-term authority.
- When a new governed document is created, update the parent index or registry so navigation stays current.
