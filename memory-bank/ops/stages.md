---
title: Stages And Non-Local Environments
doc_kind: engineering
doc_function: canonical
purpose: Template document for access to production-like environments. Read this when adapting access rules, smoke checks, logs, and runtime operations for a project.
derived_from:
  - ../dna/governance.md
status: active
audience: humans_and_agents
---

# Stages And Non-Local Environments

Describe not only production here, but also staging, beta, preview, sandbox, or any other non-local environment if they exist.

## Environment Inventory

| Environment | Purpose | Access path | Notes |
| --- | --- | --- | --- |
| `production` | Real users and live traffic | Command, jump host, or UI | Strictest restrictions |
| `staging` | Pre-release verification | Command, URL, or namespace | May be used for smoke tests |
| `sandbox` | Integration checks and unsafe experiments | Optional | If it exists |

## Common Operations

Only list operations that are actually allowed and their canonical entry points.

```bash
# Examples:
make console ENV=staging
make logs ENV=production
kubectl -n staging logs deploy/app
ssh <bastion>
psql "$DATABASE_URL"
```

For each operation, record:

- who is allowed to run it;
- which approval gates are required;
- where the boundary lies between read-only and mutating access.

## Credentials And Access

Describe:

- where secrets are stored;
- how access is granted;
- which env vars or secret stores are used;
- what counts as an unacceptable bypass of the access process.

Never store real production credentials in the template.

## Version And Health Checks

Document the safe ways to check:

- the currently deployed version;
- the health endpoint;
- the smoke URL;
- the primary operational dashboards.

Example:

```bash
curl -fsS https://<stage-host>/health
kubectl -n <namespace> get deploy <app>
```

## Logs And Observability

Describe the canonical paths to:

- application logs;
- metrics;
- traces;
- the error tracker;
- dashboards for core services.

## Test Data And Smoke Targets

If the project uses staging or demo tenants, seed users, or test accounts, list them here together with usage rules.

## Adoption Checklist

- [ ] all non-local environments are listed
- [ ] canonical access paths are documented
- [ ] safe health and version checks are described
- [ ] observability entry points are listed
- [ ] fake or irrelevant examples are removed
