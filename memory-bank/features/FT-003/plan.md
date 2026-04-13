---
title: "FT-003 Legacy Plan"
doc_kind: feature
doc_function: archive
purpose: "Archived pre-migration execution script for FT-003. Retained for historical detail only; use `implementation-plan.md` for the governed execution document."
derived_from:
  - implementation-plan.md
status: archived
audience: humans_and_agents
---

# Claude Provider End-To-End Validation Implementation Plan

Archived migration note: this file is retained only as the original execution script. The active governed execution document is [`implementation-plan.md`](./implementation-plan.md).

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Claude the first real writable provider in `tools/agentscope` by shipping grounded discovery, dry-run/apply/restore flows, and verification for Claude skills, configured MCPs, and tools.

**Architecture:** Keep Claude-specific parsing, normalization, and `planToggle(...)` logic in `tools/agentscope/src/providers/claude.ts`. Reuse the generic mutation engine from feature 002 for apply and restore, and add one provider-neutral vault helper module under `tools/agentscope/src/core` that computes vault paths, serializes vault entry manifests, and reloads disabled-skill metadata after restart. Treat project `.mcp.json` plus Claude settings approval keys as one canonical configured-MCP discovery surface, add the missing `list` filters required by the acceptance CLI, and plan skill toggles as ordinary `renamePath` / `createFile` / `deletePath` operations so the engine stays provider-agnostic.

**Tech Stack:** TypeScript, Node.js built-ins, `cac`, `vitest`

---

## Verified Outcome

- Feature 003 is implemented and verified in `tools/agentscope` with the full `npm test` suite and `npm run build`.
- Claude is now the first writable provider with verified discovery, dry-run, apply, and restore coverage for project skills, project configured MCPs, and global plus project tools.
- The final implementation includes review-driven hardening beyond the original task wording: explicit `list --layer` validation, safe handling of malformed vault directory names, explicit blocking for unsupported toggle categories, stricter Claude fixture validation for non-boolean `enabledPlugins` entries, and extra verified coverage for `--layer all` plus global Claude tool apply and restore.
- The checkbox tasks below are preserved as the original execution script; the alignment section at the end records the verified implementation deltas that landed after review.

## Orchestration And Dependencies

**Recommended pattern:** single agent, strictly sequential across Tasks 1-5.

**Why this order works:**
- Task 1 fixes the Claude discovery contract and the `list` CLI acceptance path that every later verification step depends on.
- Task 2 adds the shared vault metadata layer that Task 3 needs for real skill enable/disable planning.
- Task 3 validates the first real Claude apply/restore flow on filesystem-backed skills before JSON-backed Claude toggles build on the same command and restore path.
- Task 4 depends on the normalized Claude settings model from Task 1 and the grounded fixture/sandbox helpers from Task 2.
- Task 5 should run only after all Claude item kinds are writable so the README, command surface, and final acceptance suite describe the shipped behavior instead of a partial state.

## Original Grounding

Historical pre-implementation project state in `tools/agentscope`:
- `src/providers/claude.ts` already resolves `~/.claude/settings.json`, `~/.claude/settings.local.json`, `<project>/.claude/settings.json`, `<project>/.claude/settings.local.json`, `<project>/.claude/skills/*/SKILL.md`, and `<project>/.mcp.json`, but it still marks every Claude item `read-only` and returns only blocked toggle plans.
- `src/core/mutation-engine.ts`, `src/core/mutation-io.ts`, `src/core/mutation-state.ts`, `src/commands/toggle.ts`, and `src/commands/restore.ts` already handle dry-run, guarded apply, backup persistence, audit logging, and restore for generic path and JSON operations.
- `src/commands/list.ts` and `src/cli.ts` do not yet support the `--provider` and `--layer` filters that acceptance criterion 3 expects.
- `test/provider-discovery.test.ts`, `test/list.test.ts`, `test/toggle.test.ts`, `test/restore.test.ts`, and the Claude fixtures under `test/fixtures/claude/**` already cover the discovery-only Claude baseline and the fake-provider mutation engine.
- There is no current core module for persistent vault metadata, and there is no test helper that copies Claude fixtures into a temp sandbox for real Claude apply/restore flows.
- `dist/` is generated output and should not be edited directly.

Grounding conclusions:
- The feature fits the existing thin-command plus focused-core architecture; no new top-level subsystem or new CLI command is needed.
- The narrowest shared abstraction is one dedicated `src/core/mutation-vault.ts` module. The engine can stay provider-agnostic because the actual writes can still be expressed with existing mutation operations.
- A dedicated `test/support/claude-sandbox.ts` helper is justified because the new acceptance flows need temp copies of Claude home/project fixtures and must not mutate committed runtime fixtures in place.

## Planned File Structure

**Create:**
- `tools/agentscope/src/core/mutation-vault.ts`
- `tools/agentscope/test/mutation-vault.test.ts`
- `tools/agentscope/test/claude-provider.test.ts`
- `tools/agentscope/test/support/claude-sandbox.ts`

**Modify:**
- `tools/agentscope/src/providers/claude.ts`
- `tools/agentscope/src/commands/list.ts`
- `tools/agentscope/src/cli.ts`
- `tools/agentscope/test/provider-discovery.test.ts`
- `tools/agentscope/test/list.test.ts`
- `tools/agentscope/test/toggle.test.ts`
- `tools/agentscope/test/restore.test.ts`
- `tools/agentscope/test/cli.test.ts`
- `tools/agentscope/test/fixtures/claude/**/*`
- `tools/agentscope/test/fixtures/runtime/project/.claude/**/*`
- `tools/agentscope/test/fixtures/runtime/project/.mcp.json`
- `tools/agentscope/test/fixtures/runtime/home/.claude/**/*`
- `tools/agentscope/README.md`

## Task 1: Normalize Claude Discovery And Add Filterable `list`

**Files:**
- Modify: `tools/agentscope/src/providers/claude.ts`
- Modify: `tools/agentscope/src/commands/list.ts`
- Modify: `tools/agentscope/src/cli.ts`
- Modify: `tools/agentscope/test/provider-discovery.test.ts`
- Modify: `tools/agentscope/test/list.test.ts`
- Modify: `tools/agentscope/test/cli.test.ts`
- Modify: `tools/agentscope/test/fixtures/claude/**/*`
- Modify: `tools/agentscope/test/fixtures/runtime/project/.claude/**/*`
- Modify: `tools/agentscope/test/fixtures/runtime/project/.mcp.json`
- Modify: `tools/agentscope/test/fixtures/runtime/home/.claude/**/*`

- [ ] **Step 1: Write the failing discovery and CLI filter tests**

Add expectations that lock the new Claude contract:

```ts
expect(parsed.items).toContainEqual(
  expect.objectContaining({
    id: "claude:project:configured-mcp:github",
    provider: "claude",
    kind: "mcp",
    category: "configured-mcp",
    layer: "project",
    enabled: true,
    mutability: "read-only",
    sourcePath: expect.stringContaining(".mcp.json"),
    statePath: expect.stringContaining(".claude/settings.local.json"),
  }),
);
```

```ts
const exitCode = runCli([
  "list",
  "--provider", "claude",
  "--layer", "all",
  "--json",
  "--project-root", path.join(runtimeRoot, "project"),
  "--app-state-root", path.join(runtimeRoot, "app-state"),
  "--cursor-root", path.join(runtimeRoot, "cursor", "User"),
], { packageRoot, stdout, stderr });
```

- [ ] **Step 2: Add `list` filtering before output rendering**

Extend `runList(...)` and the `list` command wiring so the CLI supports `--provider <id>` and `--layer <global|project|all>`. Filter both items and warnings before calling the existing renderers.

```ts
const filtered = {
  items: result.items.filter((item) => {
    return (options.provider === undefined || item.provider === options.provider) &&
      (options.layer === undefined || options.layer === "all" || item.layer === options.layer);
  }),
  warnings: result.warnings.filter((warning) => {
    return (options.provider === undefined || warning.provider === options.provider) &&
      (options.layer === undefined || options.layer === "all" || warning.layer === undefined || warning.layer === options.layer);
  }),
};
```

- [ ] **Step 3: Rework Claude settings parsing to match the spec’s writable model**

The current parser treats `enabledMcpjsonServers` and `disabledMcpjsonServers` as string arrays, but requirement 5 expects object-entry mutations. Change the fixtures and parser so those keys are object-valued maps keyed by server id.

```ts
interface ClaudeSettings {
  enabledPlugins?: Record<string, boolean>;
  enabledMcpjsonServers?: Record<string, unknown>;
  disabledMcpjsonServers?: Record<string, unknown>;
  enableAllProjectMcpServers?: boolean;
}
```

- [ ] **Step 4: Emit canonical live Claude items with stable IDs and real mutability**

Refactor `src/providers/claude.ts` so:
- tool IDs stay stable and independent of enabled state, for example `claude:project:tool:settings-local:local-shell`
- project configured MCPs are emitted once per `.mcp.json` server id, for example `claude:project:configured-mcp:github`
- the `enableAllProjectMcpServers` flag remains a separate project configured-MCP item, for example `claude:project:configured-mcp:all-project-mcp-servers`
- skill items keep `sourcePath` on `SKILL.md`, but use the skill directory as `statePath` because the toggle target is the whole directory
- tool items keep the existing normalized shape `kind: "plugin"` and `category: "tool"` while their IDs and `statePath` values are stabilized
- keep all Claude items `read-only` in this task; flip skills to `read-write` in Task 3, configured MCPs in Task 4, and tools in Task 5 only when `planToggle(...)` can actually produce real plans for those item kinds

```ts
return {
  provider: "claude",
  kind: "skill",
  category: "skill",
  layer: "project",
  id: `claude:project:skill:${entry.name}`,
  displayName: entry.name,
  enabled: true,
  mutability: "read-only",
  sourcePath: path.join(skillDir, "SKILL.md"),
  statePath: skillDir,
};
```

- [ ] **Step 5: Update Claude fixtures to the canonical shapes**

Refresh the Claude settings fixtures so project configured MCP approval data uses object-valued maps, update `tools/agentscope/test/fixtures/runtime/project/.mcp.json` alongside the runtime Claude settings fixtures, and align all expectations to the new stable IDs while Claude items remain `read-only` until later tasks land writable planning support.

- [ ] **Step 6: Verify the normalized discovery baseline**

Run:
- `npm test -- test/provider-discovery.test.ts test/list.test.ts test/cli.test.ts`
- `npm run build`

Expected:
- PASS
- `list --provider claude --layer all --json` works through the real CLI wiring
- Claude discovery emits canonical tool, configured-MCP, and skill items with stable IDs, corrected `statePath` values, and still-accurate `read-only` mutability before the writable planning tasks land

- [ ] **Step 7: Commit**

```bash
git add tools/agentscope/src/providers/claude.ts tools/agentscope/src/commands/list.ts tools/agentscope/src/cli.ts tools/agentscope/test/provider-discovery.test.ts tools/agentscope/test/list.test.ts tools/agentscope/test/cli.test.ts tools/agentscope/test/fixtures/claude tools/agentscope/test/fixtures/runtime/home/.claude tools/agentscope/test/fixtures/runtime/project/.claude tools/agentscope/test/fixtures/runtime/project/.mcp.json
git commit -m "feat: normalize claude discovery and list filters"
```

## Task 2: Add Shared Vault Metadata Primitives

**Files:**
- Create: `tools/agentscope/src/core/mutation-vault.ts`
- Create: `tools/agentscope/test/mutation-vault.test.ts`
- Create: `tools/agentscope/test/support/claude-sandbox.ts`

- [ ] **Step 1: Write the failing vault and sandbox tests**

Create `test/mutation-vault.test.ts` and `test/support/claude-sandbox.ts`.

The tests must cover:
- deterministic vault path generation from provider, category, layer, and item id
- manifest round-trip across a fresh process boundary
- separate path-backed and JSON-payload-backed vault entry shapes
- stable loading of only the requested provider/category/layer slice
- a temp Claude sandbox that copies sanitized home/project fixtures without mutating committed fixture directories

- [ ] **Step 2: Define the shared vault entry model and layout**

In `src/core/mutation-vault.ts`, add the persistent metadata shape and deterministic layout under `appStateRoot`:

```ts
export interface VaultEntry {
  version: 1;
  provider: "claude";
  kind: "skill" | "configured-mcp";
  layer: "global" | "project";
  itemId: string;
  displayName: string;
  originalPath: string;
  vaultedPath: string;
  payloadKind: "path" | "json-payload";
}
```

Use:
- `vault/<provider>/<layer>/<kind>/<safe-item-id>/entry.json`
- `vault/<provider>/<layer>/<kind>/<safe-item-id>/payload.json` only when `payloadKind === "json-payload"`

- [ ] **Step 3: Implement pure helpers instead of direct provider writes**

Expose helpers that the Claude provider can call without putting vault layout logic in the provider:
- `vaultDescriptor(...)` returning the manifest path and vaulted payload path
- `serializeVaultEntry(...)` returning `Uint8Array` for `createFile`
- `loadVaultEntries(...)` returning parsed manifests plus their `entryPath` for discovery

Keep this module read-only except for serialization. The actual file mutations should still happen through planned mutation operations.

- [ ] **Step 4: Add the Claude sandbox helper**

Implement `test/support/claude-sandbox.ts` so later command tests can do:

```ts
const sandbox = createClaudeSandbox();
runToggle({
  cwd: sandbox.projectRoot,
  homeDir: sandbox.homeDir,
  projectRoot: sandbox.projectRoot,
  appStateRoot: sandbox.appStateRoot,
  cursorRoot: sandbox.cursorRoot,
  // ...
});
```

The helper should copy Claude fixtures into temp `homeDir` and `projectRoot`, expose simple file readers, and clean itself up in `afterEach`.

- [ ] **Step 5: Verify the vault primitives**

Run:
- `npm test -- test/mutation-vault.test.ts`

Expected:
- PASS
- vault manifests survive a reload from disk
- path-backed and payload-backed entries both serialize deterministically
- the sandbox helper isolates real Claude apply tests from committed fixtures

- [ ] **Step 6: Commit**

```bash
git add tools/agentscope/src/core/mutation-vault.ts tools/agentscope/test/mutation-vault.test.ts tools/agentscope/test/support/claude-sandbox.ts
git commit -m "feat: add shared vault metadata primitives"
```

## Task 3: Implement Claude Skill Discovery And Vault-Backed Skill Toggles

**Files:**
- Modify: `tools/agentscope/src/providers/claude.ts`
- Create: `tools/agentscope/test/claude-provider.test.ts`
- Modify: `tools/agentscope/test/toggle.test.ts`
- Modify: `tools/agentscope/test/restore.test.ts`

- [ ] **Step 1: Write the failing real-Claude skill tests**

Add focused tests for:
- discovery of a live Claude skill as `enabled: true`
- disable dry-run showing `renamePath` plus vault-manifest creation
- disable apply moving the skill directory into the vault and appending an audit entry
- post-disable rediscovery showing the same skill id with `enabled: false`
- enable apply restoring the skill directory from the vault
- blocked enable when the vault manifest or vaulted directory is missing
- restore-by-backup recovering the original live skill state after a disable apply

```ts
expect(result.output).toContain("rename path");
expect(result.output).toContain(".claude/skills/example-claude-skill");
expect(result.output).toContain("/vault/claude/project/skill/");
```

- [ ] **Step 2: Surface disabled Claude skills from vault metadata**

In `src/providers/claude.ts`, load project-layer Claude skill vault entries and emit disabled skill items with the same stable id and `enabled: false`.

In the same task, switch both live and vaulted project-skill items to `mutability: "read-write"` because this is the first task where Claude `planToggle(...)` can produce real, verified skill plans.

```ts
items.push({
  provider: "claude",
  kind: "skill",
  category: "skill",
  layer: entry.layer,
  id: entry.itemId,
  displayName: entry.displayName,
  enabled: false,
  mutability: "read-write",
  sourcePath: path.join(entry.originalPath, "SKILL.md"),
  statePath: entry.entryPath,
});
```

- [ ] **Step 3: Plan skill disable through ordinary path operations**

For an enabled skill:
- compute the vault directory and manifest path through `mutation-vault.ts`
- plan `renamePath` from the live skill directory into the vault directory
- plan `createFile` for the vault manifest
- include the live directory, vault directory, and vault manifest in `affectedTargets`

```ts
operations: [
  { type: "renamePath", fromPath: skillDir, toPath: descriptor.vaultedPath },
  { type: "createFile", path: descriptor.entryPath, content: serializeVaultEntry(entry) },
]
```

- [ ] **Step 4: Plan skill enable from the vault back to the live root**

For a disabled skill:
- load the vault manifest
- block if the vaulted directory or manifest is missing
- block if the live skill directory already exists
- plan `renamePath` from the vaulted directory back to the original live directory
- plan `deletePath` for the vault manifest

```ts
operations: [
  { type: "renamePath", fromPath: entry.vaultedPath, toPath: entry.originalPath },
  { type: "deletePath", path: descriptor.entryPath },
]
```

- [ ] **Step 5: Verify the skill flow**

Run:
- `npm test -- test/claude-provider.test.ts test/toggle.test.ts test/restore.test.ts`
- `npm run build`

Expected:
- PASS
- disabling a Claude skill moves the directory into the AgentScope vault and keeps it re-discoverable as disabled
- enabling the same skill restores the directory to `.claude/skills`
- restoring the saved backup returns the sandbox to the original on-disk state

- [ ] **Step 6: Commit**

```bash
git add tools/agentscope/src/providers/claude.ts tools/agentscope/test/claude-provider.test.ts tools/agentscope/test/toggle.test.ts tools/agentscope/test/restore.test.ts
git commit -m "feat: add claude skill vault toggles"
```

## Task 4: Implement Claude Configured-MCP Discovery And Toggle Planning

**Files:**
- Modify: `tools/agentscope/src/providers/claude.ts`
- Modify: `tools/agentscope/test/claude-provider.test.ts`
- Modify: `tools/agentscope/test/toggle.test.ts`
- Modify: `tools/agentscope/test/restore.test.ts`
- Modify: `tools/agentscope/test/list.test.ts`
- Modify: `tools/agentscope/test/fixtures/claude/**/*`
- Modify: `tools/agentscope/test/fixtures/runtime/project/.mcp.json`

- [ ] **Step 1: Write the failing configured-MCP tests**

Add tests that lock:
- one canonical configured-MCP item per `.mcp.json` server id
- stable id `claude:project:configured-mcp:<serverId>`
- enabled state driven by object-valued `enabledMcpjsonServers` / `disabledMcpjsonServers`
- bootstrap operations for missing approval objects in an existing settings file before entry-level mutations run
- dry-run plans using `removeJsonObjectEntry` and `updateJsonObjectEntry`
- apply plus restore for at least one project configured MCP
- a separate project item for `enableAllProjectMcpServers`

```ts
expect(JSON.parse(result.output)).toMatchObject({
  status: "dry-run",
  operations: [
    { type: "removeJsonObjectEntry" },
    { type: "updateJsonObjectEntry" },
  ],
});
```

- [ ] **Step 2: Canonicalize configured-MCP discovery from `.mcp.json` plus settings approval keys**

Refactor `claude.ts` so project configured MCP discovery:
- starts from `Object.entries(parsed.mcpServers)` in `<project>/.mcp.json`
- picks the effective approval source in this order: `settings.local.json`, then `settings.json`, then the default writable target `settings.local.json`
- sets `enabled` from the effective approval object
- keeps `sourcePath` on `.mcp.json`
- sets `statePath` to the Claude settings file that will actually be mutated

In the same task, switch these canonical configured-MCP items to `mutability: "read-write"` because this task is where verified Claude planning support first exists for them.

```ts
const effectiveSettingsPath =
  projectLocalHas(serverId) ? projectLocalPath :
  projectSettingsHas(serverId) ? projectSettingsPath :
  projectLocalPath;
```

- [ ] **Step 3: Plan server-key enable and disable with the spec’s JSON object-entry operations**

For a server-backed configured MCP item:
- disable: remove the server key from `enabledMcpjsonServers` when present, then write the server payload into `disabledMcpjsonServers`
- enable: remove the server key from `disabledMcpjsonServers`, then write the server payload into `enabledMcpjsonServers`
- if `statePath` does not exist yet, create it with a minimal JSON object instead of trying to mutate a missing file
- if the settings file exists but either approval object is missing, prepend `replaceJsonValue` bootstrap operations that materialize `enabledMcpjsonServers` and `disabledMcpjsonServers` as `{}` before any entry-level mutation runs

```ts
[
  { type: "replaceJsonValue", path: statePath, jsonPath: ["enabledMcpjsonServers"], value: {} },
  { type: "replaceJsonValue", path: statePath, jsonPath: ["disabledMcpjsonServers"], value: {} },
  { type: "removeJsonObjectEntry", path: statePath, jsonPath: ["enabledMcpjsonServers"], entryKey: serverId },
  { type: "updateJsonObjectEntry", path: statePath, jsonPath: ["disabledMcpjsonServers"], entryKey: serverId, value: mcpPayload },
]
```

Only emit the bootstrap `replaceJsonValue` operations when the target object is actually missing. Do not overwrite an existing approval object just to keep the operation list uniform.

- [ ] **Step 4: Plan the `enableAllProjectMcpServers` flag as its own boolean toggle**

For the special project item, use `replaceJsonValue` on `enableAllProjectMcpServers` in the same preferred project settings file.

```ts
{
  type: "replaceJsonValue",
  path: statePath,
  jsonPath: ["enableAllProjectMcpServers"],
  value: targetEnabled,
}
```

- [ ] **Step 5: Verify the configured-MCP flow**

Run:
- `npm test -- test/claude-provider.test.ts test/list.test.ts test/toggle.test.ts test/restore.test.ts`
- `npm run build`

Expected:
- PASS
- configured MCP discovery is canonical instead of duplicated between settings files and `.mcp.json`
- dry-run shows the object-entry operations named in the spec
- apply and restore succeed for at least one project configured MCP

- [ ] **Step 6: Commit**

```bash
git add tools/agentscope/src/providers/claude.ts tools/agentscope/test/claude-provider.test.ts tools/agentscope/test/list.test.ts tools/agentscope/test/toggle.test.ts tools/agentscope/test/restore.test.ts tools/agentscope/test/fixtures/claude tools/agentscope/test/fixtures/runtime/project/.mcp.json
git commit -m "feat: add claude configured mcp toggles"
```

## Task 5: Implement Claude Tool Toggles And Final Acceptance Coverage

**Files:**
- Modify: `tools/agentscope/src/providers/claude.ts`
- Modify: `tools/agentscope/test/claude-provider.test.ts`
- Modify: `tools/agentscope/test/toggle.test.ts`
- Modify: `tools/agentscope/test/list.test.ts`
- Modify: `tools/agentscope/test/restore.test.ts`
- Modify: `tools/agentscope/README.md`

- [ ] **Step 1: Write the failing Claude tool tests**

Add tests that lock:
- tool discovery keeps per-settings-file stable ids
- dry-run plans use `replaceJsonValue` against `enabledPlugins.<toolId>`
- apply updates the Claude settings file and restore returns it to the original value

```ts
expect(JSON.parse(result.output)).toMatchObject({
  status: "dry-run",
  operations: [
    { type: "replaceJsonValue", summary: expect.stringContaining("enabledPlugins.github") },
  ],
});
```

- [ ] **Step 2: Implement the tool branch in `planToggle(...)`**

For tool items discovered from `enabledPlugins`, emit one `replaceJsonValue` operation against the item’s own `statePath`.

In the same task, switch Claude tool items to `mutability: "read-write"` because this is the first task where the provider can produce a real tool toggle plan instead of a blocked decision.

```ts
return {
  status: "planned",
  plan: {
    selection,
    targetEnabled,
    operations: [
      {
        type: "replaceJsonValue",
        path: item.statePath,
        jsonPath: ["enabledPlugins", item.displayName],
        value: targetEnabled,
      },
    ],
    affectedTargets: [{ type: "path", path: item.statePath }],
    sourceFingerprints: captureSourceFingerprints([{ type: "path", path: item.statePath }]),
  },
};
```

- [ ] **Step 3: Update the README to describe Claude as the first writable provider**

Refresh:
- the provider capability matrix so Claude shows `read-write` for supported skills, configured MCPs, and tools
- the `list` command docs to include `--provider` and `--layer`
- the mutation-state section to mention hidden vault metadata under `appStateRoot/vault/`
- the runtime summary so it no longer says real providers are still blocked

- [ ] **Step 4: Run the final acceptance suite**

Run:
- `npm test -- test/mutation-vault.test.ts test/claude-provider.test.ts test/provider-discovery.test.ts test/list.test.ts test/toggle.test.ts test/restore.test.ts test/cli.test.ts`
- `npm test`
- `npm run build`

Expected:
- PASS
- Claude is the first provider with real end-to-end apply and restore coverage
- `list`, `toggle`, and `restore` all work against the Claude fixture sandboxes without touching real user config

- [ ] **Step 5: Commit**

```bash
git add tools/agentscope/src/providers/claude.ts tools/agentscope/test/claude-provider.test.ts tools/agentscope/test/list.test.ts tools/agentscope/test/toggle.test.ts tools/agentscope/test/restore.test.ts tools/agentscope/README.md
git commit -m "feat: validate claude as first writable provider"
```

## Spec Coverage Check

- Requirement 1, Claude root resolution: Task 1
- Requirement 2, Claude discovery verification: Tasks 1, 3, 4, 5
- Requirement 3, shared hidden backup/vault primitives: Task 2
- Requirement 4, Claude skill toggles: Task 3
- Requirement 5, Claude settings-JSON toggles: Tasks 4, 5
- Requirement 6, end-to-end apply and restore: Tasks 3, 4, 5
- States, error handling, and invariants: Tasks 1, 2, 3, 4, 5
- Acceptance criteria 1-10: Tasks 1, 3, 4, 5

## Verified Implementation Alignment

- Task 1 now keeps all Claude items `read-only` while it stabilizes IDs, `statePath` values, fixture shapes, and `list` filters. Skills, configured MCPs, and tools each become `read-write` only in the task where `planToggle(...)` gains real support for that item kind.
- The feature spec and the plan now agree that disabled project skills remain discoverable with the same stable item ID and `enabled: false` state so they can be re-enabled through the toggle flow after disable or restart.
- Claude has no global skill discovery root in this feature, so the skill-toggle work is scoped to project skills only even though vault metadata can still retain the `layer` field for determinism.
- Task 4 now treats `enabledMcpjsonServers` and `disabledMcpjsonServers` as object-valued maps keyed by server id and explicitly bootstraps missing files or missing approval objects before entry-level mutations run.
- Runtime `tools/agentscope/test/fixtures/runtime/project/.mcp.json` updates are now listed anywhere configured-MCP discovery or acceptance behavior changes.
- No further architectural blockers remain: the existing shared mutation engine already supports the path and JSON operations this feature needs, so the remaining work was provider planning, vault metadata, CLI filtering, and verification rather than engine surgery.
- Review-driven follow-up changes also touched files outside the original task breakdown, including `tools/agentscope/src/providers/registry.ts`, `tools/agentscope/test/provider-capabilities.test.ts`, `tools/agentscope/test/doctor.test.ts`, and `tools/agentscope/test/fixtures/capability-matrix.json`, so fixture validation and provider summaries stay aligned with the shipped writable Claude surface.
- `list` validation is stricter than the original draft: the final implementation supports `--layer global|project|all` and rejects invalid layer values explicitly instead of returning an empty success result.
- Vault storage is now explicitly defined as `vault/<provider>/<layer>/<kind>/<safe-item-id>/...`, where `safe-item-id` is URI-encoded on disk. Discovery ignores malformed encoded vault directory names rather than failing the whole Claude vault slice.
- `claude.ts` now blocks unsupported internal toggle categories explicitly instead of relying only on compile-time exhaustiveness.
- Verified tool coverage is broader than the original Task 5 minimum: the final suite covers apply and restore for both project and global Claude tools.
- Final verification for the shipped implementation includes `npm test`, `npm run build`, an internal code-review pass, and a Claude Code MCP review, with no remaining blocking findings after the review-driven follow-up fixes.
