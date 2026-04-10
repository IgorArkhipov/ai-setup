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

### Appended revision after Feature 003 planning

Feature 003 planning exposed one follow-on compatibility gap in Feature 001 that was not visible during the original read-only discovery work.

Task 1 revision:

- The original Claude fixture contract was good enough for read-only discovery, but later writable Claude MCP planning depends on keyed JSON object-entry mutations.
- Because of that, `enabledMcpjsonServers` and `disabledMcpjsonServers` should no longer be treated as array-oriented approval lists when the Claude fixture baseline is revised again. They should be modeled as object-valued maps keyed by server ID.

Task 3 plan/code conflict:

- The shared normalized discovery model and warning/orchestration code from Task 3 were not the problem; they stayed compatible with later work.
- The conflict was between the initial plan assumption and the later code reality: the first plan implicitly assumed future Claude writable features could reuse the discovery-era provider fixture shape unchanged, while the existing mutation engine in Feature 002 expresses these Claude MCP toggles through object-entry JSON mutations.
- That made the original planning assumption too loose. The fix is an appended revision to Feature 001, not a rewrite of the shipped discovery behavior: keep the Task 3 shared-model work as-is, but update the Task 1 Claude fixture-shape expectation so later writable Claude planning fits the real mutation primitives already present in the codebase.

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

## Feature 003

### Time spent

- Brief preparation and refinement: about 5 minutes
- Spec preparation and refinement: about 15 minutes
- Plan drafting: about 35 minutes
- Plan review, fixes, and re-verification: about 30 minutes
- Total for Brief + Spec + Plan: about 85 minutes
- Implementation: about 15 minutes
- Post-implementation review against `spec.md` and `plan.md`: about 20 minutes
- External second-opinion review and follow-up fixes: about 35 minutes
- Verification reruns and feature-doc alignment updates: about 20 minutes
- Total post-implementation review and alignment: about 75 minutes
- Total tracked planning + implementation + review loop for Feature 003: about 175 minutes

These numbers are approximate and based on the observed feature-003 planning and review loop around `memory-bank/features/003/brief.md`, `spec.md`, and `plan.md`.

### Post-implementation review and alignment

Feature 003 also needed a real post-implementation phase after the initial brief, spec, and plan work. That phase did not change the feature goal, but it did change the final documented contract. The biggest value came from reviewing the implementation against `memory-bank/features/003/spec.md` and `plan.md`, fixing the issues found during review, and then writing the verified behavior back into the feature docs so they matched the shipped implementation rather than the earlier planning assumptions.

What the post-implementation phase covered:

- Review the implementation against the original `spec.md` and `plan.md`
- Run an external second-opinion review
- Fix the issues found during review
- Re-run tests and build verification after the fixes
- Update the feature spec and plan so they describe the verified implementation rather than the original assumptions

Main clarifications discovered after implementation:

- Invalid `list --layer` values needed to be part of the public contract instead of silently producing an empty successful result.
- Vault persistence needed an explicit on-disk identity rule: vault paths use a URI-encoded safe item id.
- Corrupted or malformed vault directory names needed defined behavior: discovery should ignore only the malformed entry rather than fail the whole Claude vault slice.
- Unsupported internal toggle categories needed explicit blocked behavior instead of relying only on compile-time exhaustiveness.
- Claude fixture validation needed to match runtime parsing strictness, especially for non-boolean `enabledPlugins` values.
- Final verified tool coverage was broader than the original minimum and needed to be written back into the docs: apply and restore are verified for both project and global Claude tools.
- The feature docs needed a final alignment pass so `spec.md` and `plan.md` reflected the shipped scope: project-only Claude skills, canonical configured-MCP behavior, stricter CLI validation, and review-driven hardening.

### Prompt changes needed in `docs/`

#### `docs/brief.md`

What to change in the generation prompt:

- Require one explicit `current baseline vs target capability` sentence when the feature extends an existing system, for example read-only provider discovery today versus the first writable provider path next.
- Require one short `provider or artifact scope hint` when the problem is provider-specific, such as skills, settings JSON, or local config roots, while still keeping the brief solution-free.
- Require one `why this provider first` sentence when the feature chooses one integration as the reference implementation for later work.

What to change in the review prompt:

- Add a check for hidden scope expansion, especially when the brief names one provider but the outcome language could be read as platform-wide support.
- Add a check that the outcome is concrete enough to distinguish inventory-only visibility from real management/toggle capability.
- Add a check for missing scope qualifiers like project-only versus global-plus-project when the brief hints at provider configuration management.

#### `docs/spec.md`

What to change in the generation prompt:

- Require provider-native data shapes to be stated explicitly whenever later mutations depend on them, for example whether approval keys are arrays or object-valued maps keyed by ID.
- Require canonical identity rules when one conceptual item is derived from more than one source, for example `.mcp.json` plus settings approval state.
- Require lifecycle semantics for disabled items: whether they become absent, remain discoverable as disabled, or move to a separate recovery path.
- Require every scope sentence that mentions multiple layers to be grounded to actual discovery roots, so language like "global and project" cannot survive when only one live root exists.
- Require mutability semantics to be tied to verified planning support, not just to discovery intent.

What to change in the review prompt:

- Add a check for contradictions between requirements and acceptance criteria, especially around post-toggle discovery state.
- Add a check for provider-layer claims that have no corresponding discovery root in the same spec.
- Add a check for canonical-source ambiguity when the same item may appear in both provider-owned config and AgentScope-managed state.
- Add a check that every mutation-oriented requirement names the preconditions needed for the planned operation shape to succeed, such as missing object containers or missing target files.
- Add a check that every enumerated CLI flag value has explicit invalid-input behavior, not just happy-path accepted values.
- Add a check that any persisted recovery or vault state keyed by normalized ids names its on-disk encoding rule and corrupted-entry handling.
- Add a check that fixture-validation expectations are at least as strict as the runtime parser assumptions when fixtures are part of acceptance coverage.
- Add a check that the spec clearly separates verified shipped behavior from future-capable abstraction, especially when the model supports more than the currently implemented flow.

#### `docs/plan.md`

What to change in the generation prompt:

- Require mutability changes to land only in the same task that introduces real planning or apply support for that item kind; do not mark items writable earlier as a discovery cleanup step.
- Require mutation preconditions to be made explicit in the plan, including bootstrap steps for missing directories, missing JSON object containers, or missing target files.
- Require runtime acceptance fixtures to be listed separately from provider fixtures whenever CLI tests depend on both.
- Require any spec contradiction discovered during planning to be converted into an explicit resolution step or a required spec revision, not just a note at the bottom.
- Require plans for provider-specific toggles to state whether disabled items remain discoverable and how they are addressed for re-enable after restart.
- Require an explicit post-implementation review and doc-alignment step so verified behavior can be written back into the feature docs after implementation.
- Require provider-capability or fixture-validation changes to include supporting files outside the main provider module when needed, such as registry validation, provider summary tests, or capability-matrix fixtures.
- Require acceptance coverage for every writable layer or surface declared in scope, for example project and global tool coverage if both are meant to be writable.
- Require persisted-state handling to include malformed or corrupted entry behavior, not only happy-path storage and restore behavior.

What to change in the review prompt:

- Add a check for `writable before writable logic exists` plan steps, where discovery mutability changes arrive before real planning support.
- Add a check for hidden mutation prerequisites, especially entry-level JSON mutations that assume parent objects already exist.
- Add a check that every runtime fixture touched by acceptance tests appears in the task file lists, not only the provider fixture tree.
- Add a check that review notes have been resolved into executable steps rather than left as commentary that implementers must interpret themselves.
- Add a check that the plan includes an explicit place to record post-review implementation clarifications instead of leaving the original plan as the only source of truth.
- Add a check that every writable surface declared in scope is actually covered by acceptance tests, including layer variants like project versus global.
- Add a check that provider-validation changes pull in all affected verification surfaces, including fixture validators, capability summaries, and command-level tests.
- Add a check that persisted-state handling covers malformed on-disk entries and specifies whether they are ignored, warned on, or fatal.

### Missing information in `memory-bank/features/003`

Most of the review churn came from missing or implicit information in the first draft of `spec.md` and `plan.md`. `brief.md` was mostly fine as a problem statement, but it did not force some of the provider-specific lifecycle and data-shape decisions that later had to become explicit.

- The disabled-skill lifecycle was under-specified. The spec originally said the skill should be absent after disable, while the plan needed it to remain discoverable as `enabled: false` so `toggle` could re-enable it by ID.
- The spec mentioned global and project skill toggle semantics even though Claude discovery in this feature only defines a project-local skill root.
- The provider-native shape of `enabledMcpjsonServers` and `disabledMcpjsonServers` was implicit. Earlier discovery assumptions allowed array-oriented approval lists, but writable MCP planning required object-valued maps keyed by server ID.
- The first plan draft changed Claude item `mutability` to `read-write` too early, before `planToggle(...)` actually supported skills, configured MCPs, or tools.
- The first plan draft did not make JSON mutation preconditions explicit, especially the need to bootstrap missing approval objects before `removeJsonObjectEntry` or `updateJsonObjectEntry` can work.
- The runtime acceptance fixture `tools/agentscope/test/fixtures/runtime/project/.mcp.json` was initially missing from the task file inventory even though configured-MCP discovery and CLI verification depend on it.
- The first Task 5 draft did not explicitly carry `test/restore.test.ts` forward even though tool-toggle restore coverage is part of the end-to-end acceptance story.

### Main takeaway

For Feature 003, the biggest source of churn was not deciding what Claude support should do at a high level. It was turning provider-specific details into explicit, testable contracts: whether disabled items stay addressable, which layers really exist, what shape provider approval keys take on disk, when an item is truly writable, what runtime fixtures the CLI path actually touches, and which mutation preconditions must be satisfied before a generic engine can execute a provider plan safely. Tightening the prompts around provider-native data shapes, disabled-item lifecycle, mutability timing, and runtime-fixture grounding should reduce review rounds for future provider-validation features.
