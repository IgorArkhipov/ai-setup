---
title: "PRD-004: Modern Provider Configuration Surfaces"
doc_kind: prd
doc_function: canonical
purpose: "Records the product problem, target users, goals, scope, and success metrics for broadening AgentScope beyond skills and MCP servers into modern provider configuration surfaces."
derived_from:
  - ../domain/problem.md
status: active
audience: humans_and_agents
must_not_define:
  - implementation_sequence
  - architecture_decision
  - feature_level_verify_contract
---

# PRD-004: Modern Provider Configuration Surfaces

## Problem

Claude Code, Codex, and Cursor have expanded their local configuration surfaces beyond skills and configured MCP servers. Current provider documentation and local installations now expose agent or subagent files, hooks, plugin manifests or enabled-plugin state, provider settings, permissions, sandbox files, and cloud/runtime environment descriptors. AgentScope still presents the older narrow model, so users and agent clients cannot reliably inspect the modern operational state that affects what an AI coding agent can do.

This initiative narrows that product gap without weakening AgentScope's safety model. Discovery should become broader first. Mutation should only expand after each provider's storage and toggle semantics are verified through official documentation, fixture-backed tests, and reversible implementation paths.

## Users And Jobs

| User / Segment | Job To Be Done | Current Pain |
| --- | --- | --- |
| `developer-operator` | Understand which local agent capabilities are installed, active, blocked, or provider-managed across Claude Code, Codex, and Cursor | They must inspect many provider-specific files and settings UIs manually |
| `agent-client` | Ask AgentScope for a structured inventory before planning changes or delegating subagents | The MCP and CLI surfaces do not include agents, hooks, settings, or plugin manifests as first-class items |
| `workflow-maintainer` | Keep the memory-bank and implementation model aligned with changing provider surfaces | Provider docs and changelogs evolve faster than the current AgentScope capability matrix |

## Goals

- `G-01` AgentScope discovers modern provider configuration surfaces as normalized, typed, read-only inventory before adding any new write behavior.
- `G-02` The capability matrix and memory-bank documents distinguish verified writable surfaces from discovered read-only or unsupported surfaces.
- `G-03` Provider changes are grounded in official docs, local example shapes, fixture-backed tests, and explicit version or drift notes where provider behavior may vary.
- `G-04` Future write support for plugins, hooks, settings, or agent files is split into separate feature slices with clear safety contracts.

## Non-Goals

- `NG-01` Do not automatically install, uninstall, enable, disable, or migrate provider plugins, hooks, settings, agent files, or cloud environments in this initiative's first slice.
- `NG-02` Do not read or use `.env*` files, even when provider docs allow env-file references.
- `NG-03` Do not mutate real local Claude, Codex, or Cursor configuration while researching examples; copy or fixture the shapes into temporary or test-only locations.
- `NG-04` Do not treat undocumented provider cache internals as writable product contracts.
- `NG-05` Do not replace provider UIs, marketplaces, package managers, or cloud configuration products.

## Product Scope

### In Scope

- Discover agent and subagent file surfaces documented by Claude Code, Codex, and Cursor.
- Discover hook configuration surfaces documented by Claude Code, Codex, and Cursor.
- Discover plugin manifests, enabled-plugin declarations, and plugin-provided component roots where the provider documents them as user-visible configuration.
- Discover provider settings, permission, sandbox, and config files as read-only configuration items when those files are documented or present in verified local examples.
- Update AgentScope's normalized item taxonomy, schemas, summaries, fixtures, README, and memory-bank docs so provider surfaces are not hidden behind generic warnings.
- Keep unsupported or read-only status explicit in CLI and MCP output.

### Out Of Scope

- New write semantics for discovered modern surfaces unless a downstream feature proves reversible provider-specific behavior.
- Direct edits to the user's real provider configuration during implementation or verification.
- Cloud-agent secret handling, remote marketplaces, remote policy control planes, or managed enterprise policy enforcement.
- Provider-specific UI automation.

## UX / Business Rules

- `BR-01` Discovery must be honest: a known surface that cannot be safely parsed should produce a scoped warning instead of silent omission.
- `BR-02` Unsupported or read-only items must remain visible but blocked from mutation planning.
- `BR-03` New item types must remain stable across CLI, MCP schemas, snapshots, and tests.
- `BR-04` Provider examples copied from local installations must omit secret values and must not include `.env*` content.
- `BR-05` Official provider docs and changelogs are the source of truth for time-sensitive surface descriptions; local examples are evidence of installed shape, not product law.

## Success Metrics

| Metric ID | Metric | Baseline | Target | Measurement method |
| --- | --- | --- | --- | --- |
| `MET-01` | Modern surface inventory is visible | AgentScope reports skills, configured MCPs, Claude tools, and limited unsupported plugin/tool entries | CLI and MCP inventory include first-class `agent`, `hook`, `setting`, and documented plugin-manifest surfaces where present | Fixture-backed provider and MCP tests |
| `MET-02` | Unsupported modern surfaces are safe | Unknown surfaces may be omitted or collapsed into warnings | Discovered modern surfaces are read-only unless an explicit writable feature proves safe mutation semantics | Provider mutation tests and blocked-plan assertions |
| `MET-03` | Docs and capability matrix reflect provider reality | README and domain docs describe the older narrow support boundary | README and memory-bank docs separate verified writable, read-only discovered, and unsupported surfaces | Documentation review plus `npm run lint` |
| `MET-04` | Provider-drift evidence is reproducible | Research lives in chat only | Protocol and implementation plan record official-doc and local-example evidence used for the feature slice | Memory-bank review and protocol evidence log |

## Risks And Open Questions

- `RISK-01` Provider docs and installed application versions may differ. Downstream features must record version-sensitive assumptions instead of hard-coding a single global truth.
- `RISK-02` Plugin cache directories may look parseable but be provider-owned implementation details. Treat cache internals as read-only and avoid declaring write contracts without official docs.
- `RISK-03` Agent file compatibility paths can overlap across providers, especially Cursor reading `.claude/agents/` and `.codex/agents/`. Downstream feature docs must decide whether duplicated provider interpretation is acceptable.
- `OQ-01` Which discovered settings surfaces should eventually become writable remains unresolved and must be handled by separate feature packages.

## Downstream Features

| Feature | Why it exists | Status |
| --- | --- | --- |
| `FT-009` | Add first-class read-only discovery for modern provider surfaces and update the normalized taxonomy | `done` |
| `FT-010` | Add verified safe toggles for modern surfaces where provider docs and tests prove reversible mutability | `done` |
| `FT-011` | Add provider drift and compatibility reporting for the committed capability matrix and documented support boundary; automated local-example or changelog drift belongs to later matrix updates or feature slices | `done` |
