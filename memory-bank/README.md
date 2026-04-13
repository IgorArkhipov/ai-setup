---
title: Template Documentation Index
doc_kind: project
doc_function: index
purpose: Root navigation for the template memory-bank. Read this first to understand the structure and the main adaptation points for a specific project.
status: active
audience: humans_and_agents
---

# Documentation Index

The `memory-bank/` directory contains a portable template for software project documentation. After copying it into a downstream repository, adapt `domain/`, `engineering/`, and `ops/` to match the real stack, processes, and constraints of that project.

Concrete instantiated examples live in the top-level `examples/` directory.

## Annotated Index

- [`domain/README.md`](domain/README.md)
  Read when you need to capture product context, architectural boundaries, and project UI conventions.

- [`prd/README.md`](prd/README.md)
  Read when you need to describe a product initiative between the general problem statement and downstream feature packages.

- [`use-cases/README.md`](use-cases/README.md)
  Read when you need to register a stable user or operational scenario for the project.

- [`ops/README.md`](ops/README.md)
  Read when you need to describe local development, environments, releases, configuration, and runbooks.

- [`engineering/README.md`](engineering/README.md)
  Read when you need to define the testing policy, coding style, git workflow, and agent autonomy boundaries.

- [`dna/README.md`](dna/README.md)
  Read when you need to check SSoT rules, the frontmatter contract, and documentation governance rules.

- [`flows/README.md`](flows/README.md)
  Read when you need to create a feature package, move a feature through lifecycle gates, or use one of the governed templates.

- [`adr/README.md`](adr/README.md)
  Read when you need to find or create an Architecture Decision Record.

- [`features/README.md`](features/README.md)
  Read when you need to understand where instantiated feature packages live.
