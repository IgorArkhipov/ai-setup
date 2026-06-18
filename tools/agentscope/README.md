# AgentScope Discovery And Safe Mutation Foundation

[![CI](https://github.com/IgorArkhipov/ai-setup/actions/workflows/ci.yml/badge.svg)](https://github.com/IgorArkhipov/ai-setup/actions/workflows/ci.yml)
[![Coverage Target](https://img.shields.io/badge/coverage%20target-lines%2Fstatements%2Ffunctions%2080%25%2B-brightgreen)](https://github.com/IgorArkhipov/ai-setup/actions/workflows/ci.yml)

This directory is an isolated TypeScript sub-project.

## Provider Capability Matrix

| Provider | Skills | Configured MCPs | Modern config surfaces | Tools / Extensions | Reality check |
| --- | --- | --- | --- | --- | --- |
| Claude Code | read-write | read-write | agent files read-write; hooks/settings read-only | read-write | Verified end-to-end against fixture sandboxes for project skills, project `.mcp.json` approvals, settings-file tools, and agent file vault/restore. Hooks and settings files are discovered as read-only inventory. |
| Codex | read-write | read-write | agent files read-write; hooks/config read-only | read-only plugin config declarations | Verified end-to-end against fixture sandboxes for global and project skills, global `config.toml` `mcp_servers` sections, and agent file vault/restore. Hooks, config files, and plugin declarations are discovered as read-only inventory. |
| Cursor | read-write | read-write | agent files read-write; hooks/permissions/sandbox/CLI config read-only | read-only plugin manifests; unsupported extensions | Verified end-to-end against fixture sandboxes for global `skills-cursor` skills, global `mcp.json` servers with optional workspace disabled-server reconciliation, and agent file vault/restore. Hooks, permissions/sandbox/CLI config, and local plugin manifests are discovered as read-only inventory. Extensions remain visible but unsupported. |

## Fixtures

Sanitized examples live under `test/fixtures/` and are intentionally narrow. The integration test loads them and fails if the assumed file paths or file shapes drift.

## Commands

- `node dist/cli.js providers`
- `node dist/cli.js doctor --project-root <path> --app-state-root <path> --cursor-root <path>`
- `node dist/cli.js snapshot [--json] --project-root <path> --app-state-root <path> --cursor-root <path>`
- `node dist/cli.js list [--json] [--provider <id>] [--layer <global|project|all>] --project-root <path> --app-state-root <path> --cursor-root <path>`
- `node dist/cli.js toggle --provider <id> --kind <kind> --id <id> --layer <layer> [--json] [--apply] --project-root <path> --app-state-root <path> --cursor-root <path>`
- `node dist/cli.js restore <backup-id> [--json] --project-root <path> --app-state-root <path> --cursor-root <path>`
- `node dist/cli.js mcp --project-root <path> --app-state-root <path> --cursor-root <path>`

`doctor` treats committed fixture drift as fatal. Provider-local read and parse problems are reported separately so discovery can stay visible in `list`.

`snapshot` captures the current normalized discovery result into a project-scoped `latest.json` plus bounded history under `appStateRoot/snapshots/`. It persists provider warnings alongside the discovered items and returns a non-zero exit code when warnings are present, but it does not mutate any provider-managed files. If existing snapshot history for a project is malformed, AgentScope fails fast before writing a new snapshot; remove the malformed history file manually before retrying.

`toggle` is dry-run by default. It prints the selected item, target enabled state, planned operations, affected paths or stores, and an explicit line stating that no writes were performed. Add `--apply` to route the plan through the guarded mutation engine.

`restore` replays one saved backup by id through the same lock and low-level IO layer used by apply.

## Local MCP Server

`agentscope mcp` runs a local stdio MCP server. It writes MCP JSON-RPC traffic only to stdout, so client logs and errors must go to stderr. The server exposes these tools:

- `agentscope_get_inventory_summary`
- `agentscope_list_items`
- `agentscope_plan_toggle_item`
- `agentscope_apply_toggle_item`
- `agentscope_plan_toggle_items`
- `agentscope_apply_toggle_items`
- `agentscope_list_backups`
- `agentscope_restore_backup`
- `agentscope_run_doctor`

Read-only and plan tools do not mutate provider files. Apply tools require `requireConfirmation: true`; bulk apply also requires the reviewed `planFingerprint` and `maxItems` guard returned by `agentscope_plan_toggle_items`.

AgentScope does not install itself into Claude Code, Codex, Cursor, or any other client. Add the local server manually using the config mechanism for the client you want to use.

Claude Code example:

```json
{
  "mcpServers": {
    "agentscope": {
      "command": "node",
      "args": [
        "/absolute/path/to/tools/agentscope/dist/cli.js",
        "mcp",
        "--project-root",
        "/absolute/path/to/project",
        "--app-state-root",
        "/absolute/path/to/agentscope-state",
        "--cursor-root",
        "/absolute/path/to/Cursor/User"
      ]
    }
  }
}
```

Codex example:

```toml
[mcp_servers.agentscope]
command = "node"
args = [
  "/absolute/path/to/tools/agentscope/dist/cli.js",
  "mcp",
  "--project-root",
  "/absolute/path/to/project",
  "--app-state-root",
  "/absolute/path/to/agentscope-state",
  "--cursor-root",
  "/absolute/path/to/Cursor/User",
]
```

Cursor example:

```json
{
  "mcpServers": {
    "agentscope": {
      "command": "node",
      "args": [
        "/absolute/path/to/tools/agentscope/dist/cli.js",
        "mcp",
        "--project-root",
        "/absolute/path/to/project",
        "--app-state-root",
        "/absolute/path/to/agentscope-state",
        "--cursor-root",
        "/absolute/path/to/Cursor/User"
      ]
    }
  }
}
```

Useful natural-language workflows:

- "Ask AgentScope for an inventory summary and list all project skills."
- "Plan disabling this one Claude project skill, show me the operations, then apply it after I confirm."
- "Plan disabling all global skills, show blocked items and the fingerprint, then apply only if the item count is what I expect."
- "List recent AgentScope backups and restore this backup id."

## Mutation State

AgentScope persists guarded mutation state under `appStateRoot`:

- `locks/mutation.lock`
- `backups/<backup-id>/manifest.json`
- `backups/<backup-id>/blobs/*.bin`
- `audit/log.jsonl`
- `snapshots/<project-key>/latest.json`
- `snapshots/<project-key>/history/<snapshot-id>.json`
- `vault/<provider>/<layer>/<kind>/<safe-item-id>/entry.json` where `safe-item-id` is the URI-encoded item id
- `vault/<provider>/<layer>/<kind>/<safe-item-id>/payload/` for path-backed entries
- `vault/<provider>/<layer>/<kind>/<safe-item-id>/payload.json` for JSON-payload entries

Successful apply writes create a backup manifest and append an audit event. Restore keeps the backup in place and appends a restore event. Snapshot capture writes only under `snapshots/`. Dry runs and explicit no-ops do not create backups or audit entries.

## Runtime

- Minimum supported Node runtime: `>=25.9.0`
- SQLite-backed mutations use the built-in `node:sqlite` module

Claude, Codex, and Cursor have real dry-run, apply, and restore coverage for their supported writable slices. Agent files are writable through AgentScope-managed file-vault toggles: disabling moves the agent file into the AgentScope vault, and re-enabling restores it to its original provider path. Hooks, provider settings/config files, documented plugin manifests, and plugin config declarations remain visible as read-only inventory; toggle planning blocks them with no writes until provider-specific write planning is implemented safely. Cursor extensions remain visible but explicitly unsupported inventory.

AgentScope never follows provider `envFile` or `.env*` references during discovery. Those paths may appear as opaque provider configuration values, but the files are not read by AgentScope.

For Cursor configured MCPs, AgentScope accepts the observed `mcp.json` trailing-comma JSON shape during discovery and toggle planning, then rewrites the managed document as deterministic JSON on apply. When a matching Cursor workspace database exists for the selected project, AgentScope also reconciles the `cursor/disabledMcpServers` `ItemTable` key so the visible MCP state stays aligned with `mcp.json`.

For Codex configured MCPs, re-enable restores the disabled section content into the current `config.toml`, appending it at end-of-file when needed. AgentScope only re-enables Codex MCP sections that it previously disabled into the vault; a live `[mcp_servers.*]` section with `enabled = false` remains a discovered Codex state and is reported as blocked instead of being rewritten implicitly. Use `restore` when exact byte-for-byte recovery of the original file layout matters.

## Baseline Verification

- `npm run lint`
- `npm test`
- `npm run coverage`
- `npm run build`
