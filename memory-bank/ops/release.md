---
title: Release And Deployment
doc_kind: engineering
doc_function: canonical
purpose: Canonical release and deployment guide for AgentScope. Read this when shipping changes to the private `tools/agentscope` package, updating CI expectations, or defining rollback behavior.
derived_from:
  - ../dna/governance.md
status: active
audience: humans_and_agents
---

# Release And Deployment

AgentScope is currently a private package (`"private": true` in `tools/agentscope/package.json`) with no automated publish or production deployment target. The release discipline is therefore build-and-verify rather than deploy-to-environment.

## Release Flow

Current release flow for `tools/agentscope` changes:

1. bump the version when the repository explicitly wants a versioned package change;
2. update package-facing documentation if command contracts, file paths, or operational behavior changed;
3. run the local verification baseline from `tools/agentscope`;
4. ensure GitHub Actions `CI` stays green on the branch or pull request;
5. merge to `main`.

What does not exist yet:

- no npm publish flow;
- no staging promotion;
- no production deployment;
- no release branch requirement documented for this package.

## Release Commands

Package-local verification commands:

```bash
npm ci
npm run lint
npm test
npm run coverage
npm run build
```

Repository-level CI parity commands:

```bash
npm --prefix tools/agentscope ci
npm --prefix tools/agentscope run biome:check
```

Safety rules:

- do not edit `dist/` by hand; `npm run build` is the only supported way to regenerate it;
- do not treat a local green run as sufficient if the GitHub Actions workflow disagrees;
- if the CLI surface changes, update [../../tools/agentscope/README.md](../../tools/agentscope/README.md) and any affected governed docs in `memory-bank/`;
- keep release notes lightweight unless the repository later adopts a formal changelog process.

## Release Test Plan

For meaningful package releases or version bumps, capture at least:

- changed commands or user-visible behaviors;
- provider adapters or mutation paths affected;
- tests added or updated;
- exact local commands run;
- CI jobs reviewed.

Minimum smoke baseline for a release candidate:

- `npm run lint`
- `npm run coverage`
- `npm run build`
- at least one direct CLI check when the command surface changed, usually `providers`, `doctor`, or the changed command itself

If the repository later introduces formal tagged releases, add a release-specific checklist document and link it from here.

## Rollback

There are two different rollback units in this repository:

1. Repository rollback
   The rollback unit is a git commit or pull request. Use a normal revert or follow-up fix; there is no deployment platform rollback today.
2. User-state rollback
   When a guarded mutation changed provider-owned local state, the rollback unit is an AgentScope backup id replayed with `agentscope restore <backup-id>`.

Operational implications:

- code rollback and provider-state rollback are separate concerns;
- a green code revert does not restore a user's mutated local config unless the backup restore is also run;
- there are no irreversible schema migrations documented in the current package scope.
