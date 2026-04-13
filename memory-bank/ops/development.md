---
title: Development Environment
doc_kind: engineering
doc_function: canonical
purpose: Template document for local development. Read this when adapting setup, dev commands, and browser or database workflow for a project.
derived_from:
  - ../dna/governance.md
status: active
audience: humans_and_agents
---

# Development Environment

After copying the template, replace the placeholders below with the project's real commands.

## Setup

List the minimum environment bootstrap steps.

```bash
# Examples:
make setup
./bin/setup
npm install
docker compose up -d
direnv allow
asdf install
uv sync
bundle install
pnpm install
```

## Daily Commands

Record the canonical local commands the agent should know.

```bash
# Examples:
make dev
make test
make lint
docker compose up app db
pnpm dev
pytest
bundle exec rspec
go test ./...
```

## Browser Testing

If the project has a UI, describe:

- how to determine the local URL;
- where the port or host comes from;
- whether it may be discovered automatically;
- which browser verification methods are canonical.

Example:

1. Read `DEV_HOST` or `.env` first.
2. If the variable is missing, use the documented default.
3. Do not scan ports manually without an explicit user request.

## Database And Services

Document only what is truly important for local work:

- migrations;
- rebuilding the local database;
- required services;
- seeded data;
- known pitfalls for developers and agents.

## Adoption Checklist

- [ ] real setup commands are listed
- [ ] real test and lint commands are listed
- [ ] the local URL discovery method is documented
- [ ] local dependencies and services are listed
- [ ] irrelevant examples are removed
