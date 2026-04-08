# Homework 1 Report

## Feature 001

### Time spent

- Brief preparation and refinement: about 10 minutes
- Spec preparation and refinement: about 15 minutes
- Plan drafting, review, and fixes: about 30 minutes
- Total for Brief + Spec + Plan: about 55 minutes

### Prompt changes needed in `docs/`

#### `docs/brief.md`

What to change in the generation prompt:

- Require an explicit `why now` sentence so the brief captures urgency or current context, not just the problem.
- Require one observable pain point or failure mode that can later be turned into spec requirements.
- Require a short `non-solution check` so the brief states the outcome without drifting into implementation.

What to change in the review prompt:

- Add a check that the desired outcome is observable enough to become acceptance criteria later.
- Add a check for missing source context, such as an unnamed stakeholder or unclear task origin.

#### `docs/spec.md`

What to change in the generation prompt:

- Require an explicit mapping for provider-specific concepts into the shared model when the spec introduces normalized fields such as `kind`, `category`, or `mutability`.
- If the spec mentions CLI override precedence, require the exact public flags and the config keys they override.
- Require every discovery root mentioned in scope to also appear in the fixture or contract assumptions when fixture-backed validation is part of the feature.
- Require explicit handling for optional slices versus warning-producing failures, so empty states and partial-success rules are not left implicit.

What to change in the review prompt:

- Add a check for implicit model mappings, especially when provider-native concepts do not obviously match the shared schema.
- Add a check for abstract CLI behavior that names precedence but not the actual flags.
- Add a check for unresolved conditional target states like "if implemented then X, otherwise Y".

#### `docs/plan.md`

What to change in the generation prompt:

- Require every task to include concrete files, test files, a verification command, and a commit step.
- Require the orchestration section to justify any parallel work against shared files and shared test surfaces.
- Require any verification step that depends on local machine state to use a controlled fixture-backed environment instead of the reviewer's real machine.
- Require all spec concepts that affect implementation to be grounded to concrete files, fixtures, flags, and data-shape decisions before the task sequence is finalized.

What to change in the review prompt:

- Add a check for shared-file conflicts across tasks marked as parallel.
- Add a check that every important abstraction from the spec has been made concrete in the plan, including CLI flags, fixture roots, and normalized model mappings.
- Add a check that verification steps are reproducible and not dependent on uncontrolled local state.
- Add a check that no task contains conditional target outcomes instead of one fixed expected result.

### Missing information in `memory-bank/features/001`

Most of the review issues came from missing or implicit information in `plan.md`, plus one shared-model gap that was only fully resolved once the plan made it explicit.

- The execution model for provider tasks was not explicit enough. The original plan suggested parallelization even though the tasks shared `tools/agentscope/test/provider-discovery.test.ts`.
- The exact CLI override flags were missing. The docs said CLI flags should override config, but did not say which flags existed or which config keys they controlled.
- The `doctor` verification path was missing a controlled fixture-backed runtime, so the original plan relied on the real machine state.
- The baseline fixture manifest missed Claude and Cursor skill fixtures even though later provider tasks depended on those roots.
- Task 3 originally missed direct tests for shared discovery/output logic and did not include its own verification step before commit.
- The normalized mapping for Cursor extensions was implicit. The shared model allowed only `skill | mcp | plugin`, but the plan did not initially say that Cursor extensions should use `kind: "plugin"` and `category: "tool"`.
- The capability-matrix target for Cursor was initially conditional instead of a single fixed expected state.

### Main takeaway

The biggest source of churn was not broad scope confusion. It was small but important pieces of implicit information that were obvious to a human reviewer only after seeing the generated plan: exact CLI flags, exact fixture roots, concrete verification environments, safe task sequencing, and explicit provider-to-shared-model mappings. Tightening the generation and review prompts around those details should reduce follow-up iterations for future features.
