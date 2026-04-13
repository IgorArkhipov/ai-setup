---
title: Coding Style
doc_kind: engineering
doc_function: convention
purpose: Template coding style document. After copying, record the project's real code and tooling conventions here.
derived_from:
  - ../dna/governance.md
status: active
audience: humans_and_agents
---

# Coding Style

## General Rules

- File, module, and directory names should follow the rules of the project's primary language.
- Add comments only where they are needed to explain why something exists or to clarify a boundary condition.
- Prefer minimal local complexity over premature abstractions.
- Generated code, vendored code, and migrations may follow separate rules if the project defines them.

## Tooling Contract

Record the canonical formatting and linting toolchain here.

Example:

- formatter: `prettier`, `ruff format`, `rubocop -A`, `gofmt`
- linter: `eslint`, `ruff`, `rubocop`, `golangci-lint`
- pre-commit hooks: optional, but if they are canonical that should be stated explicitly

## Language-Specific Addendum

After template adoption, add the real project rules for each language in use.

Example structure:

- `Backend`: naming, error handling, module layout, typing policy
- `Frontend`: component boundaries, state management, styling rules
- `SQL / migrations`: naming, rollback expectations, data migration policy

## Change Discipline

- Do not rewrite unrelated code purely for consistency if the task does not require it.
- For touch-up changes, follow the existing local file style unless it directly conflicts with a canonical rule.
- If the project is in transition between two stacks or styles, document the migration rule explicitly instead of leaving it to guesswork.
