# Homework 1 Report

## Feature 001

### Time spent

- Brief preparation and refinement: about 10 minutes
- Spec preparation and refinement: about 15 minutes
- Plan drafting, review, and fixes: about 30 minutes
- Total for Brief + Spec + Plan: about 55 minutes
- Implementation: about 17 minutes
- Post-implementation review against `spec.md` and `plan.md`: about 15 minutes
- External second-opinion review and follow-up fixes: about 20 minutes
- Verification reruns and feature-doc alignment updates: about 15 minutes
- Total post-implementation review and alignment: about 50 minutes
- Total for Feature 001 planning + review loop: about 122 minutes

### Post-implementation review and alignment

Feature 001 needed a real post-implementation phase after the initial brief, spec, and plan work. That phase was not just polish. It surfaced behavior that had to be made explicit in the implementation and then written back into `memory-bank/features/001/spec.md` and `plan.md` so the design and implementation docs matched the verified result.

What the post-implementation phase covered:

- Review the staged implementation against the original `spec.md` and `plan.md`
- Run an external second-opinion review
- Fix the issues found during review
- Re-run verification after the fixes
- Update the feature spec and plan so they describe the verified implementation rather than the original assumptions

Main clarifications discovered after implementation:

- `doctor` needed explicit semantics: provider-scoped local input problems are not fixture-assumption failures, but they still make the command exit non-zero when required live discovery inputs are broken.
- Invalid CLI usage needed to be part of the contract: missing command, unknown command, and invalid flags all need explicit non-zero behavior.
- Partial-success behavior needed to be stated at provider-slice level, not only at whole-provider level: one provider can still contribute healthy items from one slice while warning on another slice.
- `appStateRoot` needed clarification: it is part of AgentScope config and path handling in this feature, but not a provider discovery root.
- Review added meaningful verification coverage, not just cosmetic clean-up: CLI misuse tests, JSON partial-success and empty-state checks, path coverage for app-state resolution, and provider scan-failure preservation tests.

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
- Require explicit command exit semantics for each command, not just success behavior.
- Require invalid CLI usage cases to be named directly when the feature includes a CLI, including missing command, unknown command, and invalid flags.
- Require every config or path concept to be classified as either an active discovery root, a support path, or a deferred future concern.
- Require partial-success language to say whether it applies only across providers or also within slices of the same provider.

What to change in the review prompt:

- Add a check for implicit model mappings, especially when provider-native concepts do not obviously match the shared schema.
- Add a check for abstract CLI behavior that names precedence but not the actual flags.
- Add a check for unresolved conditional target states like "if implemented then X, otherwise Y".
- Add a check for ambiguous command failure semantics, especially around warnings versus non-zero exit conditions.
- Add a check for config or path values that are described in the spec but not clearly classified as live inputs versus support-only values.
- Add a check for partial-success rules that are only written at whole-system level and not at the finer slice level used by the implementation.

#### `docs/plan.md`

What to change in the generation prompt:

- Require every task to include concrete files, test files, a verification command, and a commit step.
- Require the orchestration section to justify any parallel work against shared files and shared test surfaces.
- Require any verification step that depends on local machine state to use a controlled fixture-backed environment instead of the reviewer's real machine.
- Require all spec concepts that affect implementation to be grounded to concrete files, fixtures, flags, and data-shape decisions before the task sequence is finalized.
- Require command-related tasks to include invalid-usage tests and expected non-zero behavior, not just happy-path command checks.
- Require the plan to state whether partial-failure handling must preserve healthy slices inside the same provider, not only results from other providers.
- Require config and path concepts mentioned in the plan to state whether they are actively consumed in this feature or only prepared for future features.
- Require a short post-implementation alignment step so the finished feature can record where verified behavior differs from the original plan.

What to change in the review prompt:

- Add a check for shared-file conflicts across tasks marked as parallel.
- Add a check that every important abstraction from the spec has been made concrete in the plan, including CLI flags, fixture roots, and normalized model mappings.
- Add a check that verification steps are reproducible and not dependent on uncontrolled local state.
- Add a check that no task contains conditional target outcomes instead of one fixed expected result.
- Add a check that command tasks include explicit failure-path expectations, especially for invalid CLI usage and warning-producing provider failures.
- Add a check that each config override or path helper mentioned in the plan is traced to real usage in the feature or clearly marked as support-only.
- Add a check that the plan contains an explicit place to record verified implementation clarifications after review instead of leaving the original plan as the only source of truth.

### Missing information in `memory-bank/features/001`

Most of the review issues came from missing or implicit information in `plan.md`, plus one shared-model gap that was only fully resolved once the plan made it explicit.

- The execution model for provider tasks was not explicit enough. The original plan suggested parallelization even though the tasks shared `tools/agentscope/test/provider-discovery.test.ts`.
- The exact CLI override flags were missing. The docs said CLI flags should override config, but did not say which flags existed or which config keys they controlled.
- The `doctor` verification path was missing a controlled fixture-backed runtime, so the original plan relied on the real machine state.
- The baseline fixture manifest missed Claude and Cursor skill fixtures even though later provider tasks depended on those roots.
- Task 3 originally missed direct tests for shared discovery/output logic and did not include its own verification step before commit.
- The normalized mapping for Cursor extensions was implicit. The shared model allowed only `skill | mcp | plugin`, but the plan did not initially say that Cursor extensions should use `kind: "plugin"` and `category: "tool"`.
- The capability-matrix target for Cursor was initially conditional instead of a single fixed expected state.
- The command contract did not initially make invalid CLI usage explicit, so missing command, unknown command, and invalid flag behavior had to be clarified during review.
- The original docs did not say clearly enough that partial-success semantics also had to preserve healthy slices within a single provider.
- `appStateRoot` was part of config and path handling, but the docs did not clearly distinguish it from a provider discovery root.

### Main takeaway

The biggest source of churn was not broad scope confusion. It was small but important pieces of implicit information that became obvious only after implementation and review: exact CLI flags, exact fixture roots, concrete verification environments, safe task sequencing, explicit provider-to-shared-model mappings, command failure semantics, partial-success granularity, and the difference between active discovery roots and support-only paths. Tightening the generation and review prompts around those details should reduce follow-up iterations for future features.
