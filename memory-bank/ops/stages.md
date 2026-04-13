---
title: Stages And Non-Local Environments
doc_kind: engineering
doc_function: canonical
purpose: Canonical description of non-local execution surfaces for AgentScope. Read this when you need to know whether the repository has deployed environments, where CI runs, and how remote verification works today.
derived_from:
  - ../dna/governance.md
status: active
audience: humans_and_agents
---

# Stages And Non-Local Environments

`tools/agentscope` does not currently have staging, preview, or production deployments. The only authoritative non-local execution surface is GitHub Actions CI defined in [../../.github/workflows/ci.yml](../../.github/workflows/ci.yml).

## Environment Inventory

| Environment | Purpose | Access path | Notes |
| --- | --- | --- | --- |
| `github-actions-lint` | Repository lint and static checks | GitHub Actions `CI` workflow, `lint` job | Validates workflow files, shell scripts, and Biome checks |
| `github-actions-agentscope` | Package build and coverage verification | GitHub Actions `CI` workflow, `agentscope` job | Runs inside `tools/agentscope` on Node `25.9.0` |
| `github-actions-smoke-bootstrap` | Cross-platform repo bootstrap smoke test | GitHub Actions `CI` workflow, `smoke-bootstrap` job | Runs on `ubuntu-latest` and `macos-latest`; exercises the repository bootstrap scripts rather than an AgentScope deployment |

## Common Operations

Canonical non-local checks are CI-centric, not runtime-environment-centric.

```bash
gh run view <run-id> --log
gh run watch <run-id>
```

Rules:

- treat GitHub Actions logs as the source of truth for non-local verification;
- do not assume SSH, Kubernetes, or remote shell access exists for this package;
- if a CI failure needs deeper diagnosis, reproduce it locally from `tools/agentscope` before proposing workflow changes.

## Credentials And Access

Current access model:

- there are no documented production credentials because there is no deployed production environment for AgentScope;
- CI receives repository-scoped GitHub tokens through Actions for workflow operations;
- agents must not invent undocumented shared environments or secret stores;
- local provider files in a contributor's home directory are user-owned state, not shared staging infrastructure.

## Version And Health Checks

There is no hosted health endpoint.

Safe checks today:

- inspect the package version in [../../tools/agentscope/package.json](../../tools/agentscope/package.json);
- inspect CI job status in GitHub Actions;
- reproduce the build locally with `npm run build`;
- reproduce the package verification suite locally with `npm run coverage`.

## Logs And Observability

Current observability surface:

- GitHub Actions step logs are the canonical remote logs.
- Local command output from `doctor`, `list`, `toggle`, and `restore` is the canonical operator-facing runtime signal.
- There is no metrics, tracing, or hosted dashboard stack documented for this package yet.

## Test Data And Smoke Targets

Smoke checks in CI use repository fixtures and bootstrap scripts:

- `tools/agentscope/test/fixtures/` for package-level verification
- `./.ai-setup/scripts/test-ci.sh` for repository bootstrap smoke coverage

There are no shared demo tenants, seeded remote users, or non-local test accounts documented for AgentScope.

If the project later gains a published service, dashboard backend, preview environment, or remote MCP endpoint, this document must be updated before that environment is treated as a supported operational target.
