---
title: Architecture Patterns
doc_kind: domain
doc_function: canonical
purpose: Canonical home for AgentScope architectural boundaries. Read this when changes affect commands, provider adapters, guarded mutations, local integration roots, or configuration ownership.
derived_from:
  - ../dna/governance.md
status: active
audience: humans_and_agents
canonical_for:
  - module_boundaries
  - integration_boundaries
  - concurrency_rules
  - failure_handling
  - configuration_ownership
---

# Architecture Patterns

AgentScope is a CLI-first local tool. Its architecture separates command parsing, provider-specific discovery and planning, and the shared guarded mutation engine so provider integrations can evolve without weakening safety guarantees.

## Module Boundaries

| Context | Owns | Must not depend on directly |
| --- | --- | --- |
| `command-surface` | `src/cli.ts`, `src/commands/*`, command argument validation, exit codes, human and JSON command contracts | Provider file parsing, direct file mutations, provider-specific path assumptions outside provider public APIs |
| `core-runtime` | `src/core/config.ts`, `paths.ts`, `discovery.ts`, `models.ts`, `output.ts`, mutation engine, backup state, audit log, lock handling, vault metadata | Provider-specific config shapes and provider root conventions encoded inline in core modules |
| `provider-adapters` | `src/providers/*.ts`, provider root resolution, provider-specific parsing, normalized discovery items, warning mapping, toggle planning for supported providers | Owning shared backup, lock, audit, or restore semantics themselves |
| `verification-baseline` | `src/providers/registry.ts`, committed fixture assumptions, provider capability matrix, fixture validation used by `doctor` | Becoming a second source of live discovery logic or bypassing provider adapters |

Minimum rules:

- each context owns its state and public contracts;
- command entrypoints stay thin and delegate discovery or mutation semantics to `src/core` and `src/providers`;
- providers normalize their own file formats, but writes execute only through the shared mutation engine;
- no command or provider module may mutate provider-managed files behind the mutation engine's lock, fingerprint, backup, and audit rules.

## Integration Boundaries

| Boundary | Owner | Current contract |
| --- | --- | --- |
| Claude Code local config | `src/providers/claude.ts` | Reads `~/.claude/settings*.json`, `<project>/.claude/settings*.json`, `<project>/.claude/skills/*/SKILL.md`, and `<project>/.mcp.json`; verified write planning exists only for Claude skill, configured-MCP, and tool toggles |
| Codex local config | `src/providers/codex.ts` | Reads `~/.codex/config.toml`, `~/.codex/skills/`, and `<project>/.codex/skills/`; verified write planning exists for global and project skill toggles plus global configured-MCP toggles, while plugins remain unsupported |
| Cursor local config | `src/providers/cursor.ts` | Reads `~/.cursor/mcp.json`, `~/.cursor/skills-cursor/`, and `<cursor-root>/profiles/*/extensions.json`; discovery only, no write planning yet |
| AgentScope state root | `src/core/mutation-state.ts`, `mutation-lock.ts`, `mutation-vault.ts` | Owns `locks/`, `backups/`, `audit/`, and `vault/` under `appStateRoot`; this is the only place AgentScope persists its own operational state |
| Local SQLite-backed stores | `src/core/mutation-io.ts` | Mutations use `node:sqlite` with identifier validation and explicit transactions; SQLite values are treated as binary-safe mutation targets |

Boundary rules:

- do not expand discovery to undocumented provider roots without updating the provider contract and verification baseline;
- do not write directly into provider state from commands or tests;
- provider adapters may describe operations against files or SQLite-backed state, but the core runtime executes them;
- AgentScope state must stay separate from provider-managed files.

## Concurrency And Critical Sections

AgentScope uses one canonical guarded-write pattern for live mutation and restore:

1. build the provider-specific toggle plan;
2. capture source fingerprints for the affected targets;
3. acquire the AgentScope advisory mutation lock in `appStateRoot/locks/mutation.lock`;
4. re-check source fingerprints before writing;
5. persist backup entries before any live mutation;
6. apply structured operations atomically where possible;
7. append audit entries after success or guarded failure;
8. release the lock.

Allowed patterns:

- `acquireMutationLock(...)` is the only supported cross-process critical-section guard for AgentScope writes.
- `captureSourceFingerprints(...)` plus revalidation is the canonical drift check before apply.
- File writes go through atomic temp-path writes and rename behavior in `mutation-io.ts`.
- SQLite mutations execute inside explicit `BEGIN` / `COMMIT` transactions in `mutation-io.ts`.

Forbidden patterns:

- direct provider-file writes from `src/commands/*` or `src/providers/*`;
- ad hoc lock files outside `mutation-lock.ts`;
- retry loops that reapply provider writes after a failed guarded mutation without rebuilding the plan;
- mutating provider state first and capturing backup state later.

Idempotent recovery in AgentScope means one of two things:

- a failed guarded apply restores every completed target from the captured backup entries and reports `failed`;
- a user-triggered `restore <backup-id>` replays the saved pre-apply state through the same lock discipline and rolls back partially restored targets if restore itself fails.

AgentScope has no network-side transactions in the current package. The only transactional boundaries are local filesystem updates and SQLite item updates, both executed entirely inside the guarded mutation workflow.

## Failure Handling And Error Tracking

AgentScope has two distinct error-handling modes.

Discovery mode:

- provider read and parse problems become provider-scoped warnings in `runDiscovery(...)`;
- one provider failure must not hide healthy results from the others;
- `list` still exits `0` when it can return partial discovery with warnings;
- `doctor` is stricter and exits non-zero when fixture assumptions or required live provider inputs fail.

Mutation mode:

- unsupported or unimplemented provider writes return a blocked decision from the provider adapter;
- lock contention, fingerprint drift, missing vault entries, malformed backup IDs, and similar safety problems return explicit blocked or failed results rather than guessing;
- once a guarded apply has started, failures append a `failed-apply` audit entry and must leave provider-managed state rolled back or untouched;
- restore failures must attempt rollback to the pre-restore live snapshot before returning `failed`.

Audit and logging rules:

- the audit log under `appStateRoot/audit/log.jsonl` is the canonical record for successful apply, restore, and guarded failure events;
- provider modules should not invent their own persistent mutation logs;
- human-readable CLI output and JSON output must describe the same result state.

## Configuration Ownership

AgentScope has a layered configuration model rather than an environment-variable-first one.

Canonical owner layers:

1. `src/core/config.ts` owns config document parsing, schema version checks, precedence, and the public `AgentScopeConfig` shape.
2. `src/core/paths.ts` owns path normalization, `~` expansion, and default path resolution for `projectRoot`, `appStateRoot`, and `cursorRoot`.
3. Provider adapters own how those resolved roots map to provider-specific files and directories.

Current precedence:

1. built-in defaults
2. `~/.config/agentscope/config.json`
3. `<project>/.agentscope.json`
4. explicit CLI flag overrides

Ownership rules:

- defaults for AgentScope-managed roots live in `src/core/paths.ts`;
- schema validation and merge precedence live in `src/core/config.ts`;
- provider-owned file formats such as Claude settings JSON, Codex `config.toml`, and Cursor `mcp.json` are parsed by their provider adapters, not by the config loader;
- operational documentation should mirror this contract in [`../ops/config.md`](../ops/config.md).

Technical constraints:

- the current config contract is file-based JSON plus CLI flags, not `.env`-driven;
- unknown additive keys in AgentScope config documents are ignored, but unsupported future schema versions fail explicitly;
- provider roots may be overridden only through the documented config and CLI layers, not by hidden fallback scanning.
