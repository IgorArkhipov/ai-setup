# Spec Generation

Use this guide when turning an approved brief into an implementation-ready spec.

## Purpose

A spec is a "how exactly and when it is done" document.

- It describes the solution design.
- It should be detailed enough for an agent to write code without additional clarification.
- The agent may structure requirements, suggest acceptance criteria, and surface edge cases.
- The human still decides the approach, scope boundaries, constraints, and priorities.

## Required Inputs

- A brief or issue reference
- The chosen feature scope
- Any decisions already made by the human about approach or constraints

If approach, scope, or constraints are still undecided, stop and surface the decision instead of guessing.

## Writing Rules

- Use the default structure from `spec-template.md` unless the user explicitly asks for another shape.
- Keep the document focused on one feature.
- Make every requirement concrete and testable.
- State both what is in scope and what is out of scope.
- List the invariants that must remain true before and after implementation.
- Add implementation constraints explicitly, especially when some modules, patterns, or interfaces must not change.
- Cover relevant states and failure modes when they matter for the feature, for example success, empty, loading, and error behavior.
- Avoid ambiguous language such as "fast", "simple", "robust", "if needed", and "etc."
- Prefer a scope that affects no more than three modules and stays under about 1500 words.

## Human Decision Points

The spec must not hide unresolved product or engineering choices. Call them out explicitly when they exist, especially:

- competing implementation approaches
- uncertain scope boundaries
- missing constraints
- unclear acceptance criteria

## Final Check

Before considering the spec ready:

- Confirm the brief or issue is linked in the document.
- Confirm every acceptance criterion is independently verifiable.
- Confirm the invariants and constraints are explicitly listed.
- Confirm the document is specific enough for plan creation.
