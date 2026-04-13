---
title: Testing Policy
doc_kind: engineering
doc_function: canonical
purpose: Describes the repository testing policy: required test case design, automated regression coverage requirements, and allowed manual-only gaps.
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

## Project Adaptation

After copying the template, fill in the project-specific testing stack:

- primary test framework;
- test data strategy;
- canonical local commands;
- required CI jobs;
- allowed manual-only exceptions.

Example wording:

- **Framework:** `pytest`, `rspec`, `go test`, `vitest`
- **Data:** fixtures / factories / builders / seeded test database
- **Local commands:** `make test`, `npm test`, `bundle exec rspec`
- **CI jobs:** `unit`, `integration`, `e2e`

## Core Rules

- Any behavior change that can be tested deterministically must receive automated regression coverage.
- Any new or changed contract must receive contract-level automated verification.
- Any bug fix must add a regression test for the reproducible scenario.
- Required automated tests only close risk if they pass both locally and in CI.
- Manual-only verification is allowed only as an explicit exception and must not replace automation where automation is realistic.

## Ownership Split

- The canonical test cases for a delivery unit are defined in `feature.md` via `SC-*`, feature-specific `NEG-*`, `CHK-*`, and `EVID-*`.
- `implementation-plan.md` owns only the execution strategy: which test surfaces will be added or updated, and which gaps remain temporarily manual-only and why.

## Feature Flow Expectations

Canonical lifecycle gates live in [../flows/feature-flow.md](../flows/feature-flow.md):

- by `Design Ready`, `feature.md` already records the test case inventory;
- by `Plan Ready`, `implementation-plan.md` contains a `Test Strategy` with planned automated coverage and manual-only gaps;
- by `Done`, required tests are added, local commands are green, and CI does not contradict local verification.

## What Counts As Sufficient Coverage

- The main changed behavior and the nearest regression path are covered.
- New or changed contracts, events, schemas, or integration boundaries are covered.
- Critical failure modes from `FM-*`, bug history, or acceptance risks are covered.
- Feature-specific negative or edge scenarios are covered when they change the verdict.
- Line coverage percentage alone is not sufficient; scenario-level and contract-level coverage are required.

## When Manual-only Verification Is Allowed

- The scenario depends on live infrastructure, external systems, hardware, a nondeterministic environment, or human UI judgment.
- Every manual-only gap must include a reason, a manual procedure, and an owner follow-up.
- If a manual-only gap leaves a critical path without regression protection, the feature is not complete.

## Simplify Review

This is a separate verification pass after functional testing. Its goal is to ensure the implementation stays minimally complex.

- It happens after tests pass, but before the closure gate.
- Typical findings: premature abstractions, deep nesting, duplicated logic, dead code, and overengineering.
- Three similar lines are better than a premature abstraction. An abstraction is justified only when it materially reduces risk or repetition.

## Verification Context Separation

Different verification phases are separate passes:

1. **Functional verification** - tests pass and acceptance scenarios are covered
2. **Simplify review** - the code is minimally complex
3. **Acceptance test** - end-to-end verification against `SC-*`

For small features these can happen in one session, but simplify review must still be performed.

## Project-Specific Conventions

After adapting the template, add the downstream-specific rules here. Record:

- where new tests should be added;
- which helper or setup pattern is canonical;
- how to work with the database, mocks, and fixtures;
- which commands the agent must run before handoff.

Example:

- new unit tests live in `tests/unit/` or `spec/`;
- integration tests must cover the changed contract;
- expensive setup should use shared fixtures or builders;
- text assertions should not duplicate hardcoded UI copy if translations are already owned centrally.

## Checklist For Template Adoption

- [ ] real local test commands are documented
- [ ] required CI suites are listed
- [ ] the deterministic test data pattern is documented
- [ ] manual-only exceptions are described
- [ ] the policy does not contradict [../flows/feature-flow.md](../flows/feature-flow.md)
