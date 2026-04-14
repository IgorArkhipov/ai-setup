---
title: Command Surface
doc_kind: domain
doc_function: canonical
purpose: Canonical description of the current AgentScope presentation layer. Read this when changing CLI interaction, machine-readable output, or any future interface that sits on top of the same headless core.
derived_from:
  - ../dna/governance.md
status: active
audience: humans_and_agents
canonical_for:
  - ui_surfaces
  - interaction_patterns
  - presentation_rules
---

# Command Surface

`tools/agentscope` does not currently ship a separate web, mobile, or desktop frontend. The only implemented presentation layer today is the command-line interface plus its human-readable and JSON renderers.

## UI Surfaces

- CLI entrypoint in [`../../tools/agentscope/src/cli.ts`](../../tools/agentscope/src/cli.ts) using `cac`
- Human-readable renderers in [`../../tools/agentscope/src/core/output.ts`](../../tools/agentscope/src/core/output.ts) and [`../../tools/agentscope/src/core/mutation-output.ts`](../../tools/agentscope/src/core/mutation-output.ts)
- Machine-readable JSON output from the same command flows for `snapshot`, `list`, `toggle`, and `restore`

There is no separate dashboard code in `tools/agentscope` today. If a dashboard or MCP-facing surface is added later, it should be treated as another thin presentation layer over the same discovery and mutation core, not as a second implementation path.

## Component And Presentation Rules

- Command handlers own argument validation and exit codes, then delegate to shared renderers.
- Human-readable output must stay deterministic, line-oriented, and easy to scan in a terminal.
- JSON output is part of the public automation surface and must describe the same state as the human output.
- Presentation logic belongs in renderer modules, not in provider adapters or low-level mutation code.
- Avoid ANSI-heavy formatting or TUI-specific assumptions until the project actually ships a terminal dashboard.

## Interaction Patterns

The current interaction model is subcommand-oriented:

- `providers` reports the capability matrix
- `doctor` validates committed fixture assumptions and live provider inputs
- `snapshot` persists the current normalized discovery inventory into project-scoped app-state history
- `list` returns normalized discovery inventory
- `toggle` plans by default and applies only with `--apply`
- `restore` restores one saved backup by id

Interaction rules:

- dry-run is the default for state-changing workflows;
- real writes must remain explicit and reversible;
- future interfaces should call the same headless discovery and mutation paths so safety behavior stays identical across surfaces.

## Localization

AgentScope currently has no localization layer.

- User-facing output is English-only and lives in command and renderer modules.
- If localization is added later, string ownership should move into a dedicated presentation layer instead of spreading literals across provider or core mutation code.
