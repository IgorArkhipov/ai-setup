---
title: Development Environment
doc_kind: engineering
doc_function: canonical
purpose: Canonical local development guide for the `tools/agentscope` package. Read this when setting up the TypeScript CLI, running verification, or exercising local discovery and guarded mutation flows.
derived_from:
  - ../dna/governance.md
status: active
audience: humans_and_agents
---

# Development Environment

`tools/agentscope` is the active code project in this repository. It is a CLI-first TypeScript package with fixture-backed tests and no separate web UI, database, or background service.

Related context:

- architecture and ownership rules: [../domain/architecture.md](../domain/architecture.md)
- package reference: [../../tools/agentscope/README.md](../../tools/agentscope/README.md)

## Setup

Run setup from `tools/agentscope` unless a command explicitly says otherwise.

```bash
npm ci
```

Minimum expectations:

- Node.js `>=25.9.0`
- npm dependencies installed with `npm ci`
- no `.env` bootstrap step; AgentScope is configured through JSON files and CLI flags, not env files
- do not hand-edit `dist/`; regenerate it with `npm run build`

## Daily Commands

Canonical local verification commands:

```bash
npm run lint
npm test
npm run coverage
npm run build
```

Useful direct CLI checks after building:

```bash
node dist/cli.js providers
node dist/cli.js doctor --project-root <path> --app-state-root <path> --cursor-root <path>
node dist/cli.js list [--json] [--provider <id>] [--layer <global|project|all>] --project-root <path> --app-state-root <path> --cursor-root <path>
node dist/cli.js toggle --provider <id> --kind <kind> --id <id> --layer <layer> [--json] [--apply] --project-root <path> --app-state-root <path> --cursor-root <path>
node dist/cli.js restore <backup-id> [--json] --project-root <path> --app-state-root <path> --cursor-root <path>
```

Operational notes:

- `toggle` is dry-run by default; add `--apply` only when you intentionally want guarded writes.
- `restore` replays a previously captured backup id through the same lock and audit path used by apply.
- `doctor` is stricter than `list`: fixture drift and provider input failures are fatal there.

## Verification Data And Local Inputs

The package is intentionally testable without touching real provider state.

- committed fixtures live under [../../tools/agentscope/test/fixtures/](../../tools/agentscope/test/fixtures/)
- production code lives under [../../tools/agentscope/src/](../../tools/agentscope/src/)
- tests live under [../../tools/agentscope/test/](../../tools/agentscope/test/)
- fixture-backed provider drift checks are part of `doctor`
- mutation tests use temporary sandboxes instead of real user config roots

When exercising the built CLI manually, prefer explicit overrides:

```bash
node dist/cli.js doctor \
  --project-root test/fixtures/runtime/project \
  --app-state-root /tmp/agentscope-state \
  --cursor-root test/fixtures/runtime/cursor/User
```

This keeps development work isolated from live home-directory state.

## Browser, Database, And Services

- Browser testing is not part of the current package. `tools/agentscope` has no local web server to start and no browser URL to discover.
- There is no application database to provision for development. SQLite appears only as a local mutation target for provider-owned state handled by the guarded mutation engine.
- There are no required supporting services such as Docker, Redis, or Postgres for the current verification baseline.

## Working Rules

- Keep source changes in `src/` and test changes in `test/`.
- Run at least `npm test` and `npm run build` before handoff; run `npm run coverage` when behavior or mutation logic changes.
- If commands, package scripts, or operational expectations change, update [../../tools/agentscope/README.md](../../tools/agentscope/README.md), [release.md](release.md), and related CI documentation.
