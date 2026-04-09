---
status: ready
---

# Spec: First End-To-End Provider Validation With Claude

Brief: [Feature 003 brief](./brief.md)

## Scope

In scope:
- Verify the Claude provider as the first fully validated AgentScope integration.
- Claude discovery across skills, configured MCPs, and tools in both global and project layers.
- Claude toggle planning with correct structured plans for each supported item kind.
- Shared hidden backup/vault primitives for skill toggles.
- Claude skill toggles via the vault flow for both global and project scopes.
- Claude configured MCP and tool toggles via Claude settings JSON mutations.
- End-to-end verification: discover, plan, apply, verify, restore, verify.

Out of scope:
- Codex or Cursor provider toggle implementation.
- Dashboard UI, snapshot, or MCP server changes.
- Plugin install or uninstall workflows.
- Discovery outside the Claude roots listed in this spec.

Affected modules:
- `tools/agentscope/src/providers`
- `tools/agentscope/src/core`
- `tools/agentscope/test`

## Requirements

### 1. Claude root resolution

The Claude provider must resolve global and project roots for:
- settings files at `~/.claude/settings.json`, `~/.claude/settings.local.json`, `<project>/.claude/settings.json`, and `<project>/.claude/settings.local.json`
- project-local skills from `<project>/.claude/skills/*/SKILL.md`

The provider must not treat `~/.agents/skills/*/SKILL.md` as a Claude discovery root. It must not scan `~/.claude/plugins/` as a live configuration source.

### 2. Claude discovery verification

Claude discovery must produce correct, stable items for:
- **Skills:** discovered from `<project>/.claude/skills/*/SKILL.md`. Each skill must have a stable `id` derived from its directory name, `kind` of `skill`, `category` of `skill`, and `layer` of `project`.
- **Configured MCPs:** discovered from `<project>/.mcp.json` and the Claude approval keys `enabledMcpjsonServers`, `disabledMcpjsonServers`, and `enableAllProjectMcpServers` in Claude settings JSON. Each configured MCP must have `kind` of `mcp` and `category` of `configured-mcp`.
- **Tools:** discovered from the `enabledPlugins` object in Claude settings JSON. Each tool must have `kind` of `plugin` and `category` of `tool`.

Every discovered item must expose: `provider`, `kind`, `category`, `layer`, `id`, `displayName`, `enabled`, `mutability`, `sourcePath`, and `statePath`. `mutability` must be `read-write` when the toggle path is verified, `read-only` when not yet verified for mutation, or `unsupported` when safe mutation is not possible. Stable inputs must produce stable item IDs across repeated discovery runs.

### 3. Shared hidden backup/vault primitives

The core mutation layer must support vault-based disable and enable operations for skill toggles.

Vault operations must:
- move a file or directory from a live provider path into an AgentScope-managed vault location under the app-state root
- preserve metadata (original path, provider, kind, layer, item ID) to make the operation deterministic and reversible
- restore the original file or directory from the vault to the live provider path when re-enabling
- work for whole directories (skills) and extracted config payloads (configured MCP definitions)
- integrate with the existing backup manifest, advisory locking, and audit-log infrastructure

Vault entries must remain restorable across process restarts until explicitly cleaned up.

### 4. Claude skill toggles

Claude skills must support verified enable and disable through the vault flow.

For Claude in this feature, the supported skill root is project-local only: `<project>/.claude/skills/*/SKILL.md`. The spec does not define a global Claude skill discovery root, so global-skill independence is not an active implementation concern for this feature even though vault metadata may still retain the `layer` field.

Disabling a Claude skill must move the skill directory out of the live Claude skills root into the vault area, record the vault entry in the backup manifest, and append an audit-log entry.

Enabling a previously disabled Claude skill must restore the skill directory from the vault to the live Claude skills root, remove the vault manifest entry, and append an audit-log entry.

Disabled project skills must remain discoverable through AgentScope with the same stable item ID and `enabled: false` state so the toggle flow can re-enable them by ID after a disable operation or process restart.

After a skill toggle, re-running discovery must reflect the new enabled state.

### 5. Claude settings-JSON toggles (configured MCPs and tools)

Claude configured MCP and tool toggles must produce structured plans that mutate Claude settings JSON.

In this feature, `enabledMcpjsonServers` and `disabledMcpjsonServers` are object-valued maps keyed by server ID. The keyed object shape is required so the shared JSON mutation vocabulary can address one configured MCP deterministically.

Configured MCP disable must produce a `removeJsonObjectEntry` from `enabledMcpjsonServers` (when the server key is present there) and an `updateJsonObjectEntry` into `disabledMcpjsonServers`. Configured MCP enable must produce a `removeJsonObjectEntry` from `disabledMcpjsonServers` and an `updateJsonObjectEntry` into `enabledMcpjsonServers`.

Tool disable must set the tool's key to `false` in the `enabledPlugins` object via `replaceJsonValue`. Tool enable must set the tool's key to `true` in `enabledPlugins` via `replaceJsonValue`.

Toggle plans must respect the layer: a project-scoped item is toggled in the project-scoped settings file, a global-scoped item in the global settings file.

### 6. End-to-end apply and restore

At least one Claude flow must be verified end-to-end:
1. discover a writable Claude item
2. produce a dry-run toggle plan
3. apply through the shared mutation engine (advisory lock, fingerprint check, backup, atomic write, audit log)
4. verify on-disk Claude configuration reflects the toggled state
5. restore the backup
6. verify the original on-disk state is recovered

This verification must cover at least one configured MCP toggle and at least one skill toggle.

The shared mutation engine must handle Claude provider plans without Claude-specific code in the engine itself.

## States and error handling

This feature has no interactive loading state.

Discovery success: Claude provider is inspected across both layers; items are returned with correct mutability and enabled state.

Empty: Claude provider is inspected but returns zero items for the selected scope; commands print an explicit empty result and exit `0`.

Partial-success: some Claude slices return items while others emit warnings due to unreadable or malformed files; healthy slices still appear in output; commands exit `0`.

Dry-run success: a supported Claude selection resolves to a toggle plan; planned operations and affected paths are shown; no files are written.

Apply success: advisory lock acquired, fingerprint checks pass, backups and audit records persisted, live Claude files updated atomically, backup ID returned.

Restore success: backup entry valid, advisory lock acquired, original Claude state restored atomically, restored paths reported.

No-op: the requested target state already matches; command prints `no-op` and exits `0`.

Blocked: the item is `read-only`, `unsupported`, unknown, or ambiguous; or fingerprint drifted; or lock unavailable; or vault entry missing for re-enable. Command exits non-zero without partial mutation.

Fatal-error: invalid CLI usage; command exits non-zero without partial results.

Condition handling:
- Unreadable or malformed Claude settings file: discovery emits a provider-scoped warning and continues for other slices.
- Missing vault entry on re-enable: toggle is blocked with an explicit reason.
- Missing Claude skills root: skill discovery returns zero items without a warning.
- Absent `.mcp.json`: configured MCP discovery returns zero items without a warning.

## Invariants

- The Claude provider describes planned operations; the shared mutation engine enforces safety.
- A single Claude slice failure must not abort discovery for other Claude slices or other providers.
- Stable Claude inputs must produce stable item IDs and stable output ordering.
- Vault-based toggles are reversible: disabling then re-enabling must recover the original state.
- No live mutation occurs without a prior backup record and advisory lock.
- Fingerprint drift blocks apply instead of guessing over concurrent user changes.
- Failed mutation attempts do not leave Claude-managed files partially written.
- Vault entries remain restorable across process restarts.
- Claude toggle plans respect layer boundaries: a project-scoped item is toggled in project-scoped config, never global config.

## Implementation constraints

- Keep Claude-specific logic in `src/providers/claude.ts`; do not scatter it across core modules.
- Vault primitives belong in `src/core/mutations.ts` or a dedicated core module, not in the provider.
- Do not add Codex or Cursor writable toggle paths in this feature.
- Do not add dashboard, snapshot, or MCP server code in this feature.
- Prefer temp-directory and fixture-based tests; do not read from or write to real home-directory agent config in automated tests.

## Acceptance criteria

1. Claude discovery returns normalized items for skills, configured MCPs, and tools with correct `kind`, `category`, `layer`, `mutability`, `enabled`, `sourcePath`, and `statePath`.
2. Claude items have stable IDs across repeated discovery runs when the underlying provider files have not changed.
3. `agentscope list --provider claude --layer all --json` returns Claude items across both layers with a separate `warnings` array.
4. `agentscope toggle claude skill <id> --layer project` without `--apply` prints a dry-run plan showing the vault move operation without mutating files. With `--apply`, it moves the skill directory into the vault, creates a backup, and returns a backup ID. Re-running discovery after disable shows the same skill ID with `enabled: false`; after restoring the backup, discovery shows the skill as present and enabled.
5. `agentscope toggle claude mcp <id> --layer project --apply` mutates Claude settings JSON to toggle the configured MCP state, creates a backup, and returns a backup ID. Re-running discovery reflects the new state; after restoring, the original state is recovered.
6. Claude tool toggles produce `replaceJsonValue` operations that set the tool's key in `enabledPlugins` to `false` (disable) or `true` (enable).
7. A `read-only` or `unsupported` Claude item cannot be applied and produces a non-zero exit with the blocking reason.
8. If the current file fingerprint drifts between planning and apply, the mutation aborts and leaves Claude config unchanged.
9. Vault entries persist across process restarts and remain restorable until explicitly cleaned up.
10. Automated tests cover the full discover, plan, apply, verify, restore, verify cycle for at least one Claude configured MCP and at least one Claude skill.
