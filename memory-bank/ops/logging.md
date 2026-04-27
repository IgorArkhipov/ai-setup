---
title: Logging And Detection
doc_kind: engineering
doc_function: canonical
purpose: Canonical operational guide for AgentScope runtime logs and agent-side log detection. Read this when investigating local AgentScope command runs, looking for generated logs, or deciding whether a missing log directory is expected.
derived_from:
  - ../dna/governance.md
  - config.md
  - development.md
status: active
audience: humans_and_agents
---

# Logging And Detection

AgentScope has two different operational evidence streams:

1. durable AgentScope-owned audit state under the configured `appStateRoot`;
2. local command-run logs under the repository-local `./tmp/logs` directory.

When chat shorthand refers to AgentScope "internal logs", map that to AgentScope-owned audit state. When it refers to "external logs" or command-run logs, map that to repo-local operational evidence under `./tmp/logs`.

This document owns the operational convention for the second stream. It does not replace the audit contract described in [config.md](config.md).

## Log Location

Repository-local AgentScope operation logs belong under:

```text
./tmp/logs
```

The path is relative to the repository root, not to `tools/agentscope`.

Current expectations:

- `./tmp/logs` may not exist in a fresh checkout;
- absence of `./tmp/logs` means no repo-local operation logs are currently available;
- `tmp` is ignored by git, so these logs are local operational evidence and not source artifacts;
- do not create or commit placeholder files just to make the directory visible.

## Detection Procedure For Agents

When investigating AgentScope behavior, use this order:

1. Check whether `./tmp/logs` exists.
2. If it does not exist, report that no repo-local operation logs are present.
3. If it exists, list log files by most recent modification time before reading content.
4. Inspect only the log files relevant to the command, provider, or timestamp under investigation.
5. Prefer the smallest useful excerpt when reporting findings.

Do not assume a missing `./tmp/logs` directory is a failure. It is an expected state until an operation or wrapper writes logs there.

## Relationship To Audit State

AgentScope audit entries live under `appStateRoot`, currently documented in [config.md](config.md) as:

```text
~/.config/agentscope/audit/log.jsonl
```

Use the audit log when investigating guarded mutations, restore behavior, backup ids, or state transitions that AgentScope owns. Use `./tmp/logs` when investigating local command execution, test harness output, wrapper output, or transient diagnostics captured during development.

If both streams exist, treat them as complementary:

- audit state is the durable record of AgentScope-owned mutations;
- `./tmp/logs` is local runtime evidence for a specific repository working copy;
- code and tests remain the source of truth for implemented behavior.

## Handling Log Content

Operational logs may contain local paths, provider configuration names, command arguments, and excerpts of failure output.

Rules:

- do not read or use `.env*` files while looking for logs;
- do not paste large logs into governed documents or handoff notes;
- redact secrets, tokens, private keys, and personal access credentials if they appear in a log excerpt;
- prefer timestamps, command names, provider ids, backup ids, and error codes over full raw payloads;
- never treat log-only observations as canonical product or architecture intent.

## Troubleshooting Guidance

When `./tmp/logs` is absent:

- state that no repo-local logs were found;
- continue with command output, tests, code inspection, and AgentScope audit state as appropriate;
- avoid inventing a log path or creating the directory unless the current task explicitly requires a command to emit logs.

When `./tmp/logs` is present but empty:

- state that the log directory exists but contains no files relevant to the investigation;
- check whether the command being investigated writes logs at all;
- fall back to direct command reproduction when safe.

When logs are present:

- correlate by timestamp first;
- then correlate by command, provider, project root, or backup id;
- cite file names and short excerpts in findings;
- keep raw logs local unless the user explicitly asks for an artifact.
