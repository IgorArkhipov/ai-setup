# AgentScope Discovery Foundation

This directory is an isolated TypeScript sub-project.

## Provider Capability Matrix

| Provider | Skills | Configured MCPs | Tools / Extensions | Reality check |
| --- | --- | --- | --- | --- |
| Claude Code | read-only | read-only | read-only | Fixture covers Claude settings JSON, project `.mcp.json`, and project `.claude/skills/*/SKILL.md`. |
| Codex | read-only | read-only | read-only | Fixture covers `config.toml` plugin and `mcp_servers` sections plus global and project skill roots. |
| Cursor | read-only | read-only | read-only | Fixture covers `~/.cursor/skills-cursor`, `~/.cursor/mcp.json`, and profile `extensions.json` metadata. |

## Fixtures

Sanitized examples live under `test/fixtures/` and are intentionally narrow. The integration test loads them and fails if the assumed file paths or file shapes drift.

## Commands

- `node dist/cli.js providers`
- `node dist/cli.js doctor --project-root <path> --app-state-root <path> --cursor-root <path>`
- `node dist/cli.js list [--json] --project-root <path> --app-state-root <path> --cursor-root <path>`

`doctor` treats committed fixture drift as fatal. Provider-local read and parse problems are reported separately so discovery can stay visible in `list`.

## Baseline Verification

- `npm test -- test/provider-capabilities.test.ts`
- `npm run build`
