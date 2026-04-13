---
title: Architecture Patterns
doc_kind: domain
doc_function: canonical
purpose: Canonical home for the project's architectural boundaries. Read this when changes affect modules, background processes, integrations, or configuration.
derived_from:
  - ../dna/governance.md
status: active
audience: humans_and_agents
---

# Architecture Patterns

This document defines the expected architectural rules of the project, not a specific implementation. Replace the placeholders below with the real bounded contexts, integration boundaries, and technical constraints of the downstream system.

## Module Boundaries

Document the main isolated areas of the system here.

Example:

| Context | Owns | Must not depend on directly |
| --- | --- | --- |
| `customer-facing` | user journeys, public APIs | internal admin details |
| `operations` | back office, manual actions, moderation | private billing or storage internals |
| `platform` | shared services, auth, delivery infrastructure | product-specific UI assumptions |

Minimum rules:

- each module owns its state and public contracts;
- cross-module dependencies go through a clearly named API, event, or adapter;
- UI, jobs, and integrations must not read another module's internals behind the owner's back.

## Concurrency And Critical Sections

If the project contains concurrent operations, document the canonical pattern for critical sections and background work.

Example:

```ruby
ResourceLock.with_lock(resource_key) do
  # critical section
end
```

State explicitly:

- which locking pattern is allowed;
- which pattern is forbidden and why;
- what counts as idempotent recovery;
- where transaction boundaries sit relative to external APIs.

If the project uses a job queue, add the canonical rule for concurrency control there as well.

## Failure Handling And Error Tracking

Document the shared approach:

- where errors should be raised upward and where they should be converted into a domain verdict;
- how contextual metadata is attached to the error tracker;
- where retry policy is already implemented by infrastructure and must not be duplicated with local `rescue` logic.

Example question this section should answer:

> Should a job log errors manually if the base job class already performs retries and notifications?

## Configuration Ownership

Do not document every environment variable one by one here. Document the configuration ownership model:

- where the canonical configuration schema lives;
- which files or classes are considered the owner layer;
- where defaults are defined;
- who owns the env contract documentation.

Example:

1. Update the configuration schema owner.
2. Update default values or environment overlays.
3. Update [`../ops/config.md`](../ops/config.md).
