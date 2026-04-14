---
title: Project Problem Statement
doc_kind: domain
doc_function: canonical
purpose: Canonical description of the AgentScope product, problem space, and target outcomes. Read this before feature specs so the same background is not repeated in every delivery unit.
derived_from:
  - ../dna/governance.md
status: active
audience: humans_and_agents
canonical_for:
  - project_problem_statement
  - product_context
  - top_level_outcomes
---

# Project Problem Statement

This document records the project-wide product context for AgentScope. Feature documents should reference it instead of restating the same background.

If a PRD is needed, it does not replace this document. It narrows a particular initiative relative to the already documented AgentScope context.

## Boundary With PRD

- `domain/problem.md` holds project-wide context: the AgentScope product, core operator workflows, top-level outcomes, and durable constraints.
- `prd/PRD-XXX-short-name.md` is the initiative layer: which slice of AgentScope is being extended now, for which users, and with what delivery scope.
- If a new document only restates how AgentScope discovers and safely manages local AI-agent configuration, a PRD is unnecessary.

## Product Context

AgentScope is a standalone TypeScript tool in [`tools/agentscope/`](../../tools/agentscope/README.md) for developers and coding agents who need one reliable view of local AI-agent configuration across Claude Code, Codex, and Cursor. It discovers skills, configured MCP servers, and provider-managed tools or extensions from the provider roots that the project has explicitly verified, then normalizes that inventory into a shared item model.

The product exists because local agent configuration is fragmented across provider-specific JSON, TOML, directory layouts, and profile metadata. Without a common layer, users have to remember several file locations, interpret incompatible config shapes, and edit provider state manually. That increases the chance of hidden drift, unsafe edits, and provider-specific mistakes.

AgentScope stays intentionally narrow. It is a local discovery and safe-mutation tool, not a cloud control plane or a package installer. In the current implementation, it exposes a CLI with `providers`, `doctor`, `list`, `toggle`, and `restore`, plus a guarded mutation engine that can apply and roll back verified changes. Claude, Codex, and Cursor are verified writable providers for their supported slices, while unsupported provider-managed categories stay explicit instead of being guessed through.

The downstream system boundary is the local machine. AgentScope reads provider-owned files from explicit provider roots and writes only through its guarded mutation path. It also owns its own application state under the AgentScope app-state root for locks, backups, audit history, and vault metadata. Plugin installation, remote orchestration, and undocumented provider roots are outside the current product boundary.

## Core Workflows

- `WF-01` Inspect current agent configuration by running discovery across Claude Code, Codex, and Cursor and returning one normalized inventory with provider-scoped warnings instead of silently hiding partial failures.
- `WF-02` Safely enable or disable one supported item through a dry-run-first workflow, then apply the change with advisory locking, fingerprint checks, persistent backup capture, and deterministic restore support.
- `WF-03` Validate that the committed provider baseline and live local inputs still match AgentScope's assumptions by running `doctor` before relying on discovery or mutation results.

## Outcomes

| Metric ID | Metric | Baseline | Target | Measurement method |
| --- | --- | --- | --- | --- |
| `MET-01` | Cross-provider inventory is available from one command surface | Users inspect provider files manually and per-provider | `agentscope list` returns a normalized inventory for Claude, Codex, and Cursor using stable ordering and stable item IDs | Fixture-backed command and provider tests plus manual CLI verification |
| `MET-02` | Verified local configuration changes are reversible | Users edit provider files directly and must recover by hand | Supported toggles are dry-run first and real writes produce backups plus `restore` coverage | `toggle --apply` and `restore` tests, backup manifests, and audit-log entries |
| `MET-03` | Provider drift becomes visible instead of silently corrupting results | Parse failures or root mismatches are easy to miss during manual inspection | `doctor` and `list` surface provider-scoped warnings and fail explicitly when required assumptions break | Command output and fixture validation in the committed test suite |

## Constraints

- `PCON-01` AgentScope is local-first and file-backed. It must operate against explicit provider roots and local app-state paths, not remote APIs or hidden provider internals.
- `PCON-02` Discovery must be non-destructive. Provider read or parse failures become warnings in `list` so healthy providers and healthy slices remain visible.
- `PCON-03` Real writes must go through the shared guarded mutation engine with advisory locking, source fingerprint checks, persistent backups, audit logging, and rollback or restore behavior.
- `PCON-04` The current writable surface is intentionally narrow: Claude project skills, Claude configured MCP approvals, Claude tools, Codex global and project skills, Codex global configured MCPs, Cursor global skills, and Cursor global configured MCPs with optional workspace disabled-server reconciliation. Codex plugins and Cursor extensions remain unsupported in the current implementation.
- `PCON-05` AgentScope manages configuration through JSON and TOML files plus provider-owned directories. `.env` files are not part of the product contract for this repository and must not become an implicit configuration source.
- `PCON-06` The current package is CLI-first. A dashboard or stdio MCP surface may exist as future product intent, but it is not implemented in `tools/agentscope` today and must not become an undocumented second control path.

## Source Documents

- [`../../PROJECT.md`](../../PROJECT.md) - project-level summary of AgentScope scope and boundaries.
- [`../../tools/agentscope/README.md`](../../tools/agentscope/README.md) - current command surface, mutation-state layout, provider capability matrix, and runtime constraints.
- [`../features/FT-001/feature.md`](../features/FT-001/feature.md) - verified discovery foundation and normalized item model.
- [`../features/FT-002/feature.md`](../features/FT-002/feature.md) - shared guarded mutation engine, backup, audit, and restore contracts.
- [`../features/FT-003/feature.md`](../features/FT-003/feature.md) - first writable Claude provider integration and current verified mutation scope.
- [`../features/FT-004/feature.md`](../features/FT-004/feature.md) - verified Codex writable provider slice for skills and configured MCPs.
- [`../features/FT-005/feature.md`](../features/FT-005/feature.md) - verified Cursor writable provider slice for global skills and configured MCPs.
