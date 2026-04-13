---
title: Operations Index
doc_kind: engineering
doc_function: index
purpose: Navigation for AgentScope operational documentation. Read this when working on local development, configuration, non-local verification, release discipline, or runbooks for `tools/agentscope`.
derived_from:
  - ../dna/governance.md
status: active
audience: humans_and_agents
---

# Operations Index

- [Development Environment](development.md) - local setup and daily commands for the `tools/agentscope` TypeScript CLI package, including fixture-backed verification and mutation-safety state.
- [Stages And Non-Local Environments](stages.md) - the current non-local surface for this repository, which is GitHub Actions CI rather than a deployed service environment.
- [Release And Deployment](release.md) - the current release reality for AgentScope: build-and-verify for a private package with no production deployment target.
- [Configuration](config.md) - the layered AgentScope config model, CLI overrides, default roots, and separation between AgentScope-owned state and provider-owned files.
- [Runbooks](runbooks/README.md) - the index for repeatable operational procedures; no project-specific runbooks are committed yet.
