---
title: Release And Deployment
doc_kind: engineering
doc_function: canonical
purpose: Template release process document. Read this when adapting versioning, changelog, deployment, and release verification for a project.
derived_from:
  - ../dna/governance.md
status: active
audience: humans_and_agents
---

# Release And Deployment

## Release Flow

Describe the real order of steps for the project.

Example:

1. bump the version;
2. update the changelog;
3. create a tag or release branch;
4. build artifacts;
5. deploy to staging;
6. run smoke or acceptance checks;
7. deploy to production.

## Release Commands

Record the project's canonical commands and explicit safety rules.

```bash
# Examples:
make release ENV=staging
make deploy ENV=production
gh release create vX.Y.Z
docker build -t registry/app:vX.Y.Z .
```

State explicitly:

- which environment variables are required;
- which environments need explicit approval;
- where the boundary lies between automated and manual release steps.

## Release Test Plan

For each release, it is often useful to create a separate test plan.

**Format:** `release-v{VERSION}-test-plan.md`

**Minimum structure:**

```markdown
# Release Test Plan v{VERSION}

**Date:** YYYY-MM-DD
**Previous version:** v{PREV_VERSION}
**Current version:** v{VERSION}
**Environment:** <environment>

## Change Overview

| Issue | Title | Type | Priority |
| --- | --- | --- | --- |
| #XXXX | Task description | Feature/Fix/Refactoring/Tech debt | High/Medium/Low |

## Change Verification

- [ ] At least one test case is described for every major change set

## Smoke Tests

- [ ] Home page opens
- [ ] Primary user flow works
- [ ] Admin or internal path works
- [ ] Health endpoint responds successfully
```

## Rollback

For a real project, document explicitly:

- what counts as the rollback unit;
- which path is the fastest safe rollback;
- who confirms a production rollback;
- which data changes or migrations are irreversible.
