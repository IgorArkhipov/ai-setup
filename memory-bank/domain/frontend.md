---
title: Frontend
doc_kind: domain
doc_function: canonical
purpose: Template for describing UI surfaces, the design system, and the i18n layer. Read this when working on web, mobile, or internal UI.
derived_from:
  - ../dna/governance.md
status: active
audience: humans_and_agents
---

# Frontend

This document should describe the real UI surfaces of the downstream project. If the system has no separate frontend layer, reduce this file to the smallest useful set of rules.

## UI Surfaces

Describe the main interfaces of the system.

Example:

- public web;
- internal back office;
- mobile app;
- embedded widgets;
- shared component library.

For each surface, it is useful to record:

- where the code lives;
- which stack it uses;
- where the backend boundary sits;
- which layer is the canonical owner for design decisions.

## Component And Styling Rules

Describe the project rules for UI components:

- whether there is a shared design system;
- where shared components live;
- whether ad hoc UI can be created without a common component;
- which layer owns theme tokens, spacing, typography, and state styles.

Example rules:

- new UI elements should first look for a home in `packages/ui`;
- local CSS is allowed only inside a feature boundary;
- complex interactivity requires an ADR or an explicit architectural decision.

## Interaction Patterns

Describe the canonical interaction model here: server-rendered UI, SPA, islands, an HTMX/Turbo-like approach, native mobile, and so on.

If no project-specific choice exists yet, start from template guidance like this:

- new features should use the current primary interactive stack;
- do not mix two competing patterns without an explicit reason;
- if the project is migrating between stacks, document the migration rule and allowed exceptions.

## Localization

Document:

- where translations come from;
- how they reach the UI;
- where they are cached or versioned;
- how new keys are added and who owns fallback behavior.

If the project has multiple translation sources, document priority and merge order.
