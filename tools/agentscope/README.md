# AgentScope Bootstrap Spike

This directory is an isolated TypeScript sub-project.

## Provider Capability Matrix

| Provider | Skills | Configured MCPs | Tools / Extensions | Reality check |
| --- | --- | --- | --- | --- |
| Claude | not-yet-sampled | observed-shape | observed-shape | Fixture covers `settings.json`, `.claude/settings.local.json`, and project `.mcp.json` field shapes only. |
| Codex | observed-shape | observed-shape | observed-shape | Fixture covers `config.toml` plugin and `mcp_servers` sections plus global and project `SKILL.md` roots. |
| Cursor | not-yet-sampled | shell-only | shell-only | Fixture only locks JSON object shells for `settings.json` and `globalStorage/storage.json`; live profile and workspace data still need later discovery work. |

## Fixtures

Sanitized examples live under `test/fixtures/` and are intentionally narrow. The integration test loads them and fails if the assumed file paths or file shapes drift.

## Baseline Commands

- `npm test -- provider-capabilities`
- `npm run build`
- `node dist/cli.js providers`
- `node dist/cli.js doctor`
