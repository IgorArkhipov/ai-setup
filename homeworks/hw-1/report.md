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

Feature 001 needed a real post-implementation phase after the initial brief, spec, and plan work. That phase surfaced behavior that had to be made explicit in the implementation and then written back into `memory-bank/features/001/spec.md` and `plan.md` so the design and implementation docs matched the verified result.

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

## Feature 002

### Time spent

- Brief preparation and refinement: about 5 minutes
- Spec preparation and refinement: about 10 minutes
- Plan drafting, review, and fixes: about 30 minutes
- Total for Brief + Spec + Plan: about 45 minutes
- Implementation: about 20 minutes
- Post-implementation review against `spec.md` and `plan.md`: about 20 minutes
- External second-opinion review and follow-up fixes: about 55 minutes
- Verification reruns and feature-doc alignment updates: about 20 minutes
- Total post-implementation review and alignment: about 95 minutes
- Total tracked planning + review loop for Feature 002: about 160 minutes.

These numbers are approximate and based on the observed preparation window for `memory-bank/features/002/brief.md`, `spec.md`, and `plan.md`, plus the follow-up review and correction loop on the plan.

### Post-implementation review and alignment

Feature 002 also needed a real post-implementation phase after the initial brief, spec, and plan work. That phase materially changed the final documented design. The biggest value was was tightening safety-critical execution semantics and then writing those clarified semantics back into `memory-bank/features/002/spec.md` and `plan.md` so the docs matched the verified implementation.

What the post-implementation phase covered:

- Review the implementation against the original `spec.md` and `plan.md`
- Run an external second-opinion review
- Fix the issues found during review
- Re-run tests and build verification after each repair pass
- Update the feature spec and plan so they describe the verified implementation rather than the original assumptions

Main clarifications discovered after implementation:

- Successful `apply` audit timing needed to be made explicit. The verified implementation writes the success audit entry only after all planned mutations succeed, rather than before the mutation loop.
- Failed guarded apply needed explicit semantics even when the failure happens during guarded setup after lock acquisition and fingerprint recheck but before any live mutation completes.
- Rollback behavior needed to be written separately for apply and restore. Apply rollback is based on completed operations in reverse execution order, while restore captures a pre-restore rollback snapshot and reapplies that snapshot if restore fails mid-flight.
- Structured `--json` output needed to cover early validation failures too, not only happy-path or later blocked states.
- The dry-run contract needed more precise wording: read-only for provider-managed state, with no backup or audit entries, while still allowing AgentScope to initialize its own state directories.
- Review added meaningful coverage rather than just polish: stale-lock reclaim, rollback-failure surfacing, restore rollback, persisted backup reload, `--apply` no-op behavior, blob-id validation, and SQLite identifier validation.

### Prompt changes needed in `docs/`

#### `docs/brief.md`

What to change in the generation prompt:

- Require one explicit `risk to the user or system` sentence when the feature is about mutation, reversibility, or safety, so the brief captures what must not go wrong.
- Require one short `current capability gap` sentence that explains what exists today and what is still missing, for example discovery without safe mutation.
- Require one `affected artifact types` hint at problem level, such as config files, local state, or binary-backed stores, without drifting into implementation design.

What to change in the review prompt:

- Add a check that safety-sensitive briefs describe the user-visible failure or harm being prevented, not just the desired improvement.
- Add a check that the outcome is observable enough to later distinguish dry run, apply, restore, and blocked behavior instead of leaving "safe" as a vague target.

#### `docs/spec.md`

What to change in the generation prompt:

- Require explicit ownership and timing for any captured state mentioned in the spec, for example who captures a fingerprint and when it is later compared.
- Require reverse-behavior semantics for every mutation operation named in the vocabulary, especially one-way-looking operations like `createFile`, `deletePath`, and `renamePath`.
- Require explicit lock lifecycle rules when advisory locking is part of scope, including whether stale locks are reclaimed or treated as permanent blockers.
- Require runtime and toolchain constraints whenever the spec introduces environment-sensitive APIs or stores, such as `node:sqlite`.
- Require selector uniqueness or disambiguation rules when command contracts use normalized fields like `provider`, `kind`, `id`, and `layer`.
- Require explicit backup lifecycle semantics for successful apply, failed apply with rollback, and successful restore.
- Require restore failure semantics to be described with the same no-partial-state rigor as apply when both paths use the same shared engine.
- Require explicit audit timing semantics for successful apply and failed guarded apply instead of leaving audit ordering implicit.
- Require guarded setup failure semantics to be written explicitly, not only failures that happen after the first live mutation.
- Require command-output rules for validation failures when a command supports `--json`, not just for successful or later blocked results.
- Require the read-only scope of dry run to state whether it applies to provider-managed state only or to every possible filesystem side effect.
- Require validation requirements for dynamic identifiers and persisted references when the design touches SQL identifiers, blob references, or other externally loaded names.

What to change in the review prompt:

- Add a check for hidden design choices inside passive wording like "captured when the plan was built" or "restored safely".
- Add a check that each mutation operation has a clear reverse path and that multi-target rollback semantics are described for both apply and restore.
- Add a check for missing runtime assumptions, version constraints, or store-shape requirements when the spec names specific platform APIs.
- Add a check for selector contracts that might not uniquely identify an item once normalized fields like `kind` and `category` coexist.
- Add a check for backup retention and cleanup semantics so audit and restore behavior do not rely on undocumented assumptions.
- Add a check for audit-order ambiguity, especially when the spec says something happens "before writing" but the implementation could safely choose success-only logging.
- Add a check for guarded setup failures that occur inside the safety envelope but before any live mutation, since those often fall through the cracks between "blocked" and "failed".
- Add a check that `--json` behavior is specified for validation failures and not only for success or steady-state command results.
- Add a check that dry-run wording is precise enough to distinguish provider-state immutability from internal tool-state initialization.

#### `docs/plan.md`

What to change in the generation prompt:

- Require every test-only helper or fake module to have an explicit verification path; do not assume `npm run build` or unrelated tests will cover files outside `src/`.
- Require the plan to choose one concrete dependency-injection or mocking strategy whenever command-level tests need fake providers or fixtures.
- Require fake or test-only modules to stay grounded to existing unions and registry contracts, or else explicitly list the model changes needed to support them.
- Require runtime and toolchain prerequisites to land before any tests or implementation steps that depend on them, especially for environment-sensitive APIs.
- Require rollback behavior to be stated separately for apply and restore when the spec forbids partial live state.
- Require the guarded-apply task to name what counts as the start of the guarded flow and how setup failures inside that flow are reported and audited.
- Require rollback order to be specified in terms of completed operations, not only affected targets or backup entries.
- Require command tasks to include `--json` validation-failure cases, not just happy-path structured output.
- Require plans for safety-sensitive features to include a short verified-alignment step so post-review behavior can be written back into the feature docs after implementation.

What to change in the review prompt:

- Add a check that every newly created test-only file is actually exercised by the listed verification step.
- Add a check that fake providers, mocks, and injected test dependencies fit the current codebase types and registries without hidden expansion.
- Add a check that command tasks explain exactly how production dependencies are overridden or injected in tests.
- Add a check that runtime/toolchain preconditions are introduced before dependent test or implementation steps.
- Add a check that rollback, cleanup, and audit semantics are explicit for both failed apply and failed restore flows.
- Add a check that the plan distinguishes rollback over completed operations from restore over persisted backup entries, instead of treating both as the same ordering problem.
- Add a check that command-level tests cover early validation failures under `--json`.
- Add a check that post-implementation review has an explicit place to record verified deviations from the original plan so the plan does not remain frozen in pre-review form.

### Missing information in `memory-bank/features/002`

Most review churn came from missing or implicit information in `spec.md` and the first draft of `plan.md`. `brief.md` was mostly fine as a problem statement, but it did not force some of the implementation-defining safety details that the later documents had to make concrete.

- The spec introduced `replaceSqliteItemTableValue`, but it did not initially force the runtime and toolchain implications of relying on `node:sqlite`.
- The spec said fingerprints must match what was captured when the plan was built, but it did not explicitly say which layer captures that fingerprint data and carries it into apply.
- The spec named a reversible mutation vocabulary, but the reverse behavior for `createFile` and the rollback behavior for failed multi-step apply and restore flows had to be made explicit during review.
- The spec required advisory locking, but stale-lock recovery semantics were initially implicit.
- The spec and plan did not initially make successful apply audit timing explicit, so review had to resolve whether that audit belongs before the mutation loop or only after a completed apply.
- The original docs did not clearly classify guarded setup failures after lock acquisition and fingerprint recheck, so review had to decide whether those paths are blocked, failed, audited, and cleanup-producing.
- The command contract did not initially say clearly enough that `--json` must also cover early validation failures like missing selectors or a missing backup ID.
- The dry-run contract originally said "pure" or "strictly read-only" without separating provider-managed state from internal AgentScope state initialization.
- The command selector contract in the spec used `provider`, `kind`, `id`, and `layer`, but uniqueness relative to the normalized `category` field had to be clarified in the plan.
- The first plan draft did not make the fake writable provider strategy explicit enough: it did not say how the fake provider fit the existing `ProviderId` union or how command-level tests would inject it.
- The first plan draft assumed new test-only helpers were sufficiently covered by build and existing tests, even though the project build only typechecks `src/**/*.ts`.
- The initial plan also needed follow-up clarification around rollback cleanup, restore rollback, rollback ordering based on completed operations, explicit `cli.test.ts` updates, and reproducible verification of test-only infrastructure.

### Main takeaway

For Feature 002, the biggest source of churn was not unclear product scope. It was missing execution-detail in safety-critical parts of the design: who owns captured state, when audits are written, how guarded setup failures are classified, how rollback works for both apply and restore, what runtime baseline the feature assumes, how fake test infrastructure fits the real type system, and how command tests override production dependencies and structured output behavior. Tightening the prompts around those points should reduce review rounds for future mutation-oriented features.
