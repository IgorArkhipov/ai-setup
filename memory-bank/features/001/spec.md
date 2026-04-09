---
status: implemented-verified
---

# Spec: Trusted Multi-Provider Discovery Foundation

Brief: [Feature 001 brief](./brief.md)

## Scope

In scope:
- Build the first read-only AgentScope discovery foundation in `tools/agentscope/`.
- Support three providers: Claude Code, Codex, and Cursor.
- Discover items from global and project layers where the provider exposes them.
- Normalize discovery into one shared item model and one shared warning model.
- Ship three CLI commands: `providers`, `doctor`, and `list`.
- Surface partial-failure warnings without hiding healthy-provider results.

Out of scope:
- Any mutation flow: toggle, apply, restore, backup, audit log, or locking.
- Snapshot storage, dashboard UI, or MCP server support.
- Plugin or extension install/uninstall workflows.
- Discovery outside the provider roots listed in this spec.

Affected modules:
- `tools/agentscope/src/core`
- `tools/agentscope/src/providers`
- `tools/agentscope/src/commands`

## Requirements

### 1. Provider baseline and fixture lock

The feature must keep a committed capability baseline for Claude Code, Codex, and Cursor under `tools/agentscope/test/fixtures/`.

`tools/agentscope/README.md` must include a provider capability matrix with one row per provider and explicit statuses from `verified | read-only | unsupported | needs-verification` for:
- skills
- configured MCPs
- tools or extensions

`agentscope doctor` must validate that the required fixture files exist and that these fixture checks pass:
- Claude fixture JSON files are objects, and when present the keys `enabledPlugins`, `enabledMcpjsonServers`, `disabledMcpjsonServers`, and `enableAllProjectMcpServers` have the expected container types.
- Codex `config.toml` contains parseable `[mcp_servers.*]` and `[plugins.*]` section headers when those sections are present.
- Cursor MCP fixture JSON is an object with an object-valued `mcpServers` key.
- Cursor extension fixture data, when present, is a JSON array of objects with `identifier.id` string values.

### 2. Shared config and path resolution

Discovery must load config in this precedence order:
1. built-in defaults
2. `~/.config/agentscope/config.json`
3. `<project>/.agentscope.json`
4. CLI flag overrides

Config loading must reject an unsupported future major schema version and must ignore unknown additive keys.

Path helpers must support:
- `~` expansion
- absolute-path normalization
- project-root resolution
- app-state root resolution
- Cursor root overrides, with macOS default `~/Library/Application Support/Cursor/User/`

In this feature, `appStateRoot` is resolved for AgentScope-managed config and state concerns only. Provider discovery continues to read provider-specific inputs from the provider roots listed in this spec, not from `appStateRoot`.

### 3. Normalized discovery model

Every discovered item must expose:
- `provider`
- `kind`
- `category`
- `layer`
- `id`
- `displayName`
- `enabled`
- `mutability`
- `sourcePath`
- `statePath`

`kind` is provider-native and must stay one of `skill | mcp | plugin`.

`category` is user-facing and must stay one of `skill | configured-mcp | tool`.

`mutability` must stay one of `read-write | read-only | unsupported`, even though this feature itself is read-only.

`id` must be stable across repeated discovery runs when the underlying provider item has not moved.

### 4. Provider discovery scope

Claude Code discovery must:
- read `~/.claude/settings.json` when present
- read `~/.claude/settings.local.json` when present
- read `<project>/.claude/settings.json` when present
- read `<project>/.claude/settings.local.json` when present
- discover project skills from `<project>/.claude/skills/*/SKILL.md`
- discover configured MCPs from `<project>/.mcp.json` and the Claude approval keys `enabledMcpjsonServers`, `disabledMcpjsonServers`, and `enableAllProjectMcpServers`
- discover Claude `tool` items from the `enabledPlugins` object in Claude settings JSON
- not treat `~/.agents/skills/*/SKILL.md` as a Claude discovery root
- not scan `~/.claude/plugins/` as a live configuration source

Codex discovery must:
- discover global skills from `~/.codex/skills/`
- discover project skills from `<project>/.codex/skills/`
- discover configured MCPs from `~/.codex/config.toml`
- discover Codex `tool` items from `[plugins.*]` sections in `~/.codex/config.toml`
- treat plugin lifecycle management as unsupported

Cursor discovery must:
- resolve its root from config override first, then from the macOS default root
- discover global skills from `~/.cursor/skills-cursor`
- discover configured MCPs from `~/.cursor/mcp.json`
- discover installed extensions as `tool` items from `<cursor-root>/profiles/*/extensions.json`
- report a provider warning when the configured Cursor root is missing or unreadable

If a provider does not expose a project layer for an item category, discovery must return zero items for that slice and must not emit a warning. If Cursor has no `profiles/*/extensions.json` files, it must return zero Cursor `tool` items and must not emit a warning.

### 5. Command behavior

`agentscope providers` must print the supported provider list and capability-matrix summary.

`agentscope doctor` must print `OK` when all required discovery inputs are readable and structurally valid. It must print provider-scoped issues and exit non-zero when a required fixture assumption or required live discovery input fails.

`agentscope list` must support:
- human-readable output
- JSON output

Both `list` output modes must include provider warnings. JSON mode must return discovered items and warnings as separate arrays.

List results must be ordered by `provider`, then `layer`, then `category`, then `id`.

## States and error handling

This feature has no interactive loading state.

Success state:
- at least one provider is inspected
- discovered items are returned in stable order
- warnings may be empty

Empty state:
- no items are discovered
- commands print an explicit empty result instead of blank output

Partial-success state:
- one or more providers return items or an empty slice
- one or more providers also emit warnings
- a provider may still contribute healthy items from one slice while also emitting warnings for another slice
- `list` still exits `0`

Fatal-error state:
- CLI usage is invalid, including missing command, unknown command, or invalid flags
- config schema version is unsupported
- command exits non-zero and does not print partial results

Provider warnings must be emitted for:
- unreadable files
- malformed JSON or TOML
- missing configured provider roots
- unsupported file shapes that violate the committed fixture assumptions

Condition handling by command:
- `list`: provider file read or parse failures are warnings only; discovery must continue for other providers and exit `0`.
- `list`: a missing optional provider slice, such as an absent project layer or absent Cursor extensions metadata, is not a warning.
- `doctor`: missing required fixture files or fixture-shape mismatches are fatal and must make the command exit non-zero.
- `doctor`: a missing or malformed real local provider input outside the committed fixture set is not a fatal fixture failure, but it must be reported as a provider issue in the command output and still exit non-zero when it leaves required live discovery inputs unreadable or structurally invalid.

Each warning must include:
- `provider`
- `layer` when known
- machine-readable `code`
- human-readable `message`

## Invariants

- Discovery is read-only and must not modify provider-managed files.
- A single provider failure must not abort discovery for other providers.
- Healthy-provider results must remain visible when another provider is broken.
- Stable inputs must produce stable item IDs and stable output ordering.
- Human and JSON output must describe the same items and the same warnings.

## Implementation constraints

- Keep command entrypoints thin; provider-specific logic belongs in `src/providers`.
- Keep shared orchestration, config, and path handling in `src/core`.
- Do not add mutation code, dashboard code, snapshot code, or MCP-server code in this feature.
- Do not expand provider scope beyond Claude Code, Codex, and Cursor.
- Do not rely on undocumented provider roots when a verified root is already listed in this spec.

## Acceptance criteria

1. A fixture-backed integration test fails when a required provider fixture path or required file shape changes.
2. Config tests prove the precedence order `defaults < user config < project config < CLI flags`.
3. Path tests cover `~` expansion, project-root resolution, app-state root resolution, and Cursor default-root resolution on macOS.
4. `agentscope list --json` returns normalized items with all required fields and a separate `warnings` array.
5. A malformed or unreadable provider slice produces a provider-scoped warning, while healthy providers and healthy slices still appear in `list` output.
6. `agentscope doctor` exits non-zero when a required discovery assumption fails.
7. `agentscope providers` prints Claude Code, Codex, and Cursor in a deterministic order.
8. When no discoverable items exist for the selected scope, `agentscope list` prints an explicit empty result and exits `0`.
9. Invalid CLI usage, including missing command, unknown command, and invalid flags, exits non-zero without partial output.

## Revision After Feature 003 Planning

- Feature 001 remains a verified read-only discovery foundation.
- Later Claude writable-toggle planning in feature 003 exposed one compatibility revision to the Claude fixture contract from Requirement 1: `enabledMcpjsonServers` and `disabledMcpjsonServers` should be treated as object-valued maps keyed by server ID when the Claude fixture baseline is next regenerated, rather than as array-oriented approval lists.
- This revision does not change feature 001's normalized item model, warning model, command behavior, or read-only scope. It only narrows the Claude fixture-shape expectation so future writable Claude planning can use keyed JSON object-entry mutations without conflicting with the earlier fixture contract.
