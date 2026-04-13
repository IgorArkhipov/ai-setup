---
title: Configuration Guide
doc_kind: engineering
doc_function: canonical
purpose: Canonical configuration guide for AgentScope. Read this when changing config precedence, default roots, CLI overrides, or the boundary between AgentScope-managed state and provider-managed files.
derived_from:
  - ../dna/governance.md
status: active
audience: humans_and_agents
---

# Configuration Guide

AgentScope is not `.env`-driven. Its configuration contract is file-based JSON plus explicit CLI overrides, with provider-specific file formats parsed by provider adapters rather than by the top-level config loader.

Related context:

- canonical ownership model: [../domain/architecture.md](../domain/architecture.md)
- config loader: [../../tools/agentscope/src/core/config.ts](../../tools/agentscope/src/core/config.ts)
- path defaults: [../../tools/agentscope/src/core/paths.ts](../../tools/agentscope/src/core/paths.ts)

## Configuration Architecture

Configuration ownership is split across three layers:

1. `src/core/config.ts`
   Owns JSON parsing, schema version checks, config precedence, and the exported `AgentScopeConfig` shape.
2. `src/core/paths.ts`
   Owns default path resolution, `~` expansion, path normalization, and relative-path handling.
3. `src/providers/*.ts`
   Own provider-specific formats such as Claude settings JSON, Codex `config.toml`, and Cursor `mcp.json` and extension metadata.

Current precedence:

1. built-in defaults
2. `~/.config/agentscope/config.json`
3. `<project-root>/.agentscope.json`
4. explicit CLI flags

### File Layout

```text
~/.config/agentscope/
├── config.json
├── audit/log.jsonl
├── backups/<backup-id>/
├── locks/mutation.lock
└── vault/<provider>/<layer>/<kind>/<safe-item-id>/

<project-root>/
└── .agentscope.json
```

### Ownership Rules

Canonical config document shape:

```json
{
  "version": 1,
  "projectRoot": "/absolute/or/relative/path",
  "appStateRoot": "/absolute/or/relative/path",
  "cursorRoot": "/absolute/or/relative/path"
}
```

Rules:

- `version` is optional but, when present, must be integer `1`;
- schema versions greater than `1` fail explicitly;
- unknown additive keys are ignored by the current loader;
- `projectRoot` defaults to the current working directory;
- `appStateRoot` defaults to `~/.config/agentscope`;
- `cursorRoot` defaults to `~/Library/Application Support/Cursor/User`;
- relative paths are resolved from the current working directory;
- `~` is expanded against the active home directory.

## CLI Overrides

The command surface supports the same three override points on all stateful commands:

```bash
--project-root <path>
--app-state-root <path>
--cursor-root <path>
```

These flags are available on:

- `doctor`
- `list`
- `toggle`
- `restore`

Use them whenever you need deterministic fixture-backed runs or when you want to keep experimentation out of your real home-directory state.

## AgentScope-Owned State

Only `appStateRoot` is owned by AgentScope itself. It persists:

- advisory lock state in `locks/`
- backups in `backups/`
- audit entries in `audit/log.jsonl`
- vault state for disabled or displaced provider items in `vault/`

This state is operational data, not checked-in source.

## Provider-Owned Inputs

AgentScope reads or mutates provider-owned state through adapters. Current documented roots are:

- Claude Code: `~/.claude/settings*.json`, `<project>/.claude/settings*.json`, `<project>/.claude/skills/*/SKILL.md`, `<project>/.mcp.json`
- Codex: `~/.codex/config.toml`, `~/.codex/skills/`, `<project>/.codex/skills/`
- Cursor: `~/.cursor/mcp.json`, `~/.cursor/skills-cursor/`, `<cursor-root>/profiles/*/extensions.json`

Do not duplicate those provider schemas here. This document owns the AgentScope config contract and root resolution rules, not every downstream provider key.

## Secrets

- AgentScope does not currently define its own secret catalog or secret manager integration.
- Do not commit real provider credentials or personal config data into fixtures or docs.
- Do not read or rely on `.env*` files for this repository; they are outside the supported AgentScope config contract.
