# AgentScope Discovery And Safe Mutation Foundation

[![CI](https://github.com/IgorArkhipov/ai-setup/actions/workflows/ci.yml/badge.svg)](https://github.com/IgorArkhipov/ai-setup/actions/workflows/ci.yml)
[![Coverage Target](https://img.shields.io/badge/coverage%20target-lines%2Fstatements%2Ffunctions%2080%25%2B-brightgreen)](https://github.com/IgorArkhipov/ai-setup/actions/workflows/ci.yml)

This directory is an isolated TypeScript sub-project.

## Provider Capability Matrix

| Provider | Skills | Configured MCPs | Tools / Extensions | Reality check |
| --- | --- | --- | --- | --- |
| Claude Code | read-write | read-write | read-write | Verified end-to-end against fixture sandboxes for project skills, project `.mcp.json` approvals, and settings-file tools. |
| Codex | read-write | read-write | unsupported | Verified end-to-end against fixture sandboxes for global and project skills plus global `config.toml` `mcp_servers` sections. Plugins remain visible but unsupported. |
| Cursor | read-only | read-only | read-only | Fixture covers `~/.cursor/skills-cursor`, `~/.cursor/mcp.json`, and profile `extensions.json` metadata. |

## Fixtures

Sanitized examples live under `test/fixtures/` and are intentionally narrow. The integration test loads them and fails if the assumed file paths or file shapes drift.

## Commands

- `node dist/cli.js providers`
- `node dist/cli.js doctor --project-root <path> --app-state-root <path> --cursor-root <path>`
- `node dist/cli.js list [--json] [--provider <id>] [--layer <global|project|all>] --project-root <path> --app-state-root <path> --cursor-root <path>`
- `node dist/cli.js toggle --provider <id> --kind <kind> --id <id> --layer <layer> [--json] [--apply] --project-root <path> --app-state-root <path> --cursor-root <path>`
- `node dist/cli.js restore <backup-id> [--json] --project-root <path> --app-state-root <path> --cursor-root <path>`

`doctor` treats committed fixture drift as fatal. Provider-local read and parse problems are reported separately so discovery can stay visible in `list`.

`toggle` is dry-run by default. It prints the selected item, target enabled state, planned operations, affected paths or stores, and an explicit line stating that no writes were performed. Add `--apply` to route the plan through the guarded mutation engine.

`restore` replays one saved backup by id through the same lock and low-level IO layer used by apply.

## Mutation State

AgentScope persists guarded mutation state under `appStateRoot`:

- `locks/mutation.lock`
- `backups/<backup-id>/manifest.json`
- `backups/<backup-id>/blobs/*.bin`
- `audit/log.jsonl`
- `vault/<provider>/<layer>/<kind>/<safe-item-id>/entry.json` where `safe-item-id` is the URI-encoded item id
- `vault/<provider>/<layer>/<kind>/<safe-item-id>/payload/` for path-backed entries
- `vault/<provider>/<layer>/<kind>/<safe-item-id>/payload.json` for JSON-payload entries

Successful apply writes create a backup manifest and append an audit event. Restore keeps the backup in place and appends a restore event. Dry runs and explicit no-ops do not create backups or audit entries.

## Runtime

- Minimum supported Node runtime: `>=25.9.0`
- SQLite-backed mutations use the built-in `node:sqlite` module

Claude and Codex have real dry-run, apply, and restore coverage for their supported writable slices. Codex plugins and all Cursor items still expose discovery-only or explicitly unsupported inventory until provider-specific write planning is implemented safely.

For Codex configured MCPs, re-enable restores the disabled section content into the current `config.toml`, appending it at end-of-file when needed. AgentScope only re-enables Codex MCP sections that it previously disabled into the vault; a live `[mcp_servers.*]` section with `enabled = false` remains a discovered Codex state and is reported as blocked instead of being rewritten implicitly. Use `restore` when exact byte-for-byte recovery of the original file layout matters.

## Baseline Verification

- `npm run lint`
- `npm test`
- `npm run coverage`
- `npm run build`
