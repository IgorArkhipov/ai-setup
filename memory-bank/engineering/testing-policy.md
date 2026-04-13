---
title: Testing Policy
doc_kind: engineering
doc_function: canonical
purpose: Canonical testing policy for the `tools/agentscope` package: required automated coverage, fixture strategy, local verification commands, and the narrow cases where manual checks may supplement automation.
derived_from:
  - ../dna/governance.md
  - ../flows/feature-flow.md
status: active
canonical_for:
  - repository_testing_policy
  - feature_test_case_inventory_rules
  - automated_test_requirements
  - sufficient_test_coverage_definition
  - manual_only_verification_exceptions
  - simplify_review_discipline
  - verification_context_separation
must_not_define:
  - feature_acceptance_criteria
  - feature_scope
audience: humans_and_agents
---

# Testing Policy

## Scope

`tools/agentscope` is the active code project in this repository. Production code lives in `tools/agentscope/src/`; tests live in `tools/agentscope/test/`.

The package is a local CLI with fixture-backed provider discovery and guarded mutation logic. The testing policy therefore favors deterministic file fixtures and temporary sandboxes over live provider state.

## Canonical Test Stack

- framework: `vitest`
- runtime: Node.js test environment
- coverage provider: V8 via `@vitest/coverage-v8`
- committed test data: `tools/agentscope/test/fixtures/`
- ephemeral write targets: temp directories and runtime sandboxes created during tests

Coverage thresholds are defined in `tools/agentscope/vitest.config.ts` and currently require at least:

- statements: `80`
- branches: `71`
- functions: `80`
- lines: `80`

## Core Rules

- Any deterministic behavior change in `src/` must receive automated regression coverage in `test/`.
- Any command-surface change must cover both exit behavior and rendered output when the output contract changes.
- Any provider discovery change must update fixture-backed coverage for the affected provider roots, warnings, and normalized item shape.
- Any guarded mutation, backup, audit, lock, or restore change must add or update automated tests for the affected safety path.
- Any bug fix must include a regression test for the reproduced scenario.
- Manual inspection of live provider state is not a substitute for fixture-backed automated coverage.

## Relationship To Feature Documents

Canonical lifecycle gates and identifier rules live in [../flows/feature-flow.md](../flows/feature-flow.md). This policy defines repository-wide testing expectations; feature documents define the delivery-unit-specific test inventory, and `feature-flow.md` defines when those testing artifacts must exist.

- In the target feature-package model, `feature.md` owns the canonical test cases for one delivery unit through `SC-*`, feature-specific `NEG-*`, `CHK-*`, and `EVID-*`.
- `implementation-plan.md` owns only the execution strategy: which suites or checks will be added, which verification surfaces are affected, and which gaps remain temporarily manual-only and why.
- Archived legacy `brief.md`, `spec.md`, and `plan.md` files may remain inside a feature package for historical context, but the active owners are always the sibling `feature.md` and `implementation-plan.md`.
- Repository-level engineering policy must not redefine feature scope or acceptance criteria; it only constrains how those feature-specific checks are verified.

## Feature Flow Expectations

Use [../flows/feature-flow.md](../flows/feature-flow.md) as the source of truth for lifecycle timing. The summary below is intentionally limited to testing-relevant gates.

- By `Design Ready`, the canonical feature-intent document already records the test case inventory and traceability for the slice.
- By `Plan Ready`, the execution document records the test strategy: automated coverage surfaces, required local and CI suites, and any manual-only gaps with rationale.
- By `Done`, automated tests for the changed behavior are added or updated, local verification is green, and CI does not contradict the recorded evidence.

## Repository-Specific Coverage Expectations

- `src/commands/*`
  Changes should usually update command-level tests such as `cli.test.ts`, `list.test.ts`, `doctor.test.ts`, `toggle.test.ts`, or `restore.test.ts`.
- `src/providers/*`
  Changes should usually update provider-specific discovery or capability tests and, when fixtures change, keep `doctor` fixture validation green.
- `src/core/config.ts` and `src/core/paths.ts`
  Changes should update config and path resolution tests rather than relying on manual CLI checks only.
- `src/core/mutation-*`
  Changes must cover dry-run/apply/restore behavior, backup persistence, audit logging, fingerprint drift, and rollback semantics with sandboxed writable state.

## Fixture And Sandbox Discipline

- Prefer committed fixtures under `tools/agentscope/test/fixtures/` for provider file shapes and discovery baselines.
- Prefer temporary sandboxes for tests that exercise writes, locks, backup directories, or runtime drift scenarios.
- Do not point tests at real home-directory state or real provider configuration.
- Do not depend on `.env` files; the package is configured through JSON files and CLI flags.

## CI Expectations

Repository CI currently enforces:

- `lint` for GitHub Actions validation, shell formatting, shell linting, and Biome checks
- `agentscope` for package install, build, and coverage
- `smoke-bootstrap` for repository bootstrap smoke coverage on Ubuntu and macOS

For `tools/agentscope` behavior changes, the package-specific minimum is to keep the `agentscope` job green. If the change affects shell scripts, CI wiring, or bootstrap flow, `lint` and `smoke-bootstrap` are also part of the required verification surface.

## Local Verification Before Handoff

Run commands from `tools/agentscope`.

Minimum baseline for code changes:

```bash
npm test
npm run build
```

Required baseline when behavior, contracts, or package scripts change:

```bash
npm run lint
npm test
npm run coverage
npm run build
```

When the CLI contract changes, add at least one direct CLI check against fixture or sandbox roots after building.

## What Counts As Sufficient Coverage

- The changed behavior and its nearest regression path are covered.
- The affected command or provider contract is covered at the level users consume it: exit code, normalized data, or rendered output.
- Failure modes relevant to the change are covered, especially for discovery warnings and guarded mutation rollback paths.
- Coverage thresholds remain green, but threshold compliance alone is not sufficient without scenario-level assertions.

## When Manual-only Verification Is Allowed

Manual checks are supplemental only when they cover something the automated suite does not model well yet, for example:

- a quick sanity pass of the built CLI against fixture roots;
- validating human-readable output formatting after an output-only change;
- confirming behavior against a disposable sandbox that is too cumbersome to encode immediately as a fixture.

Manual-only verification is not sufficient for:

- deterministic parsing and normalization logic;
- command exit behavior;
- backup, lock, audit, fingerprint, or restore safety paths;
- regressions that can be reproduced with committed fixtures or temp sandboxes.

## Simplify Review

After tests pass, perform a separate simplify review.

- keep command entrypoints thin;
- avoid duplicating provider-specific parsing in `src/core`;
- prefer explicit local helpers over abstractions that only serve one call site;
- preserve the current separation between command surface, core runtime, provider adapters, and verification baseline.

## Verification Context Separation

1. Functional verification
   Tests and direct CLI checks prove the changed behavior.
2. Simplify review
   The implementation remains minimal and respects module boundaries.
3. Acceptance check
   The change satisfies the intended command, provider, or mutation workflow without weakening safety guarantees.
