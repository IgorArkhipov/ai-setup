---
title: "UC-001: Cross-Provider Discovery"
doc_kind: use_case
doc_function: canonical
purpose: "Captures the stable project-level scenario where a user inspects local AI-agent configuration across supported providers without mutating provider-managed state."
derived_from:
  - ../domain/problem.md
status: active
audience: humans_and_agents
must_not_define:
  - implementation_sequence
  - architecture_decision
  - feature_level_test_matrix
---

# UC-001: Cross-Provider Discovery

## Goal

Give the user one trustworthy, read-only view of supported local AI-agent configuration, including partial-failure warnings that do not hide healthy results.

## Primary Actor

Developer or operator using AgentScope to inspect local agent configuration.

## Trigger

The actor needs a normalized inventory of supported provider items, including enabled state and any provider-scoped warnings for unreadable or malformed slices.

## Preconditions

- AgentScope can resolve the selected project root and provider roots.
- At least one supported provider is available for inspection, or the absence of data can be reported explicitly.
- Provider-managed files remain read-only for this scenario.

## Main Flow

1. The actor runs the AgentScope inventory flow, currently `agentscope list`, with any desired provider or layer filters.
2. AgentScope inspects supported provider roots and normalizes discovered items into one common model.
3. AgentScope returns discovered items in deterministic order together with provider-scoped warnings for any malformed or unreadable slice.

## Alternate Flows / Exceptions

- `ALT-01` A provider has no items for the requested slice; AgentScope returns an explicit empty result rather than blank output.
- `EX-01` A provider file is malformed or unreadable; AgentScope records a warning for that provider slice while preserving healthy results from other slices.
- `EX-02` The inventory request is invalid; AgentScope exits non-zero without printing misleading partial output.

## Postconditions

- The actor can see discovered items, enabled state, mutability, and warning context for the requested scope.
- Provider-managed files remain unchanged.
- Re-running discovery over stable inputs produces stable item IDs and ordering.

## Business Rules

- `BR-01` Discovery is read-only and must not mutate provider-managed state.
- `BR-02` Provider-scoped failures become warnings unless the CLI invocation itself is invalid.
- `BR-03` Healthy provider results must remain visible when another provider or slice is broken.

## Traceability

| Upstream / Downstream | References |
| --- | --- |
| PRD | `none` |
| Features | `FT-001`, `FT-003` |
| ADR | `none` |
