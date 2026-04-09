---
status: implemented-verified
---

# Trusted Multi-Provider Discovery Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first read-only `agentscope` discovery flow for Claude Code, Codex, and Cursor, with normalized item and warning models plus `providers`, `doctor`, and `list` commands that keep healthy-provider results visible during partial failures.

**Architecture:** Keep shared schema, config loading, path resolution, sorting, and output formatting in `tools/agentscope/src/core`, and move provider-specific file reading and normalization into one module per provider under `tools/agentscope/src/providers`. The CLI entrypoint remains thin and delegates to command modules, while command modules delegate to shared orchestration so `providers`, `doctor`, and `list` all describe the same provider capability baseline and discovery semantics.

**Tech Stack:** TypeScript, Node.js built-ins, `cac`, `vitest`

---

## Orchestration And Dependencies

**Recommended pattern:** single agent for Tasks 1-3, then sequential provider work for Tasks 4-6 after the shared model and config/path helpers are stable, then single agent again for Tasks 7-8 to unify command behavior and verification.

**Why this order works:**
- Tasks 1-3 define fixture expectations, config precedence, path helpers, normalized types, and provider contracts that every later task depends on.
- Tasks 4-6 should run sequentially because they extend the same provider-discovery test surface and shared fixture tree; finishing Claude first establishes the pattern that Codex and Cursor then follow.
- Tasks 7-8 need all providers implemented so command output, warning aggregation, sorting, and acceptance coverage can be verified end-to-end.

## Grounding

Current project state in `tools/agentscope`:
- `src/cli.ts` wires only `providers` and `doctor`.
- `src/commands/providers.ts` and `src/commands/doctor.ts` are thin wrappers around fixture-backed helpers.
- `src/providers/registry.ts` currently mixes provider registry data with fixture validation and still uses old capability statuses (`observed-shape`, `shell-only`, `not-yet-sampled`).
- There is no `src/core` directory yet.
- Tests currently consist of `test/provider-capabilities.test.ts`.
- Fixtures exist under `test/fixtures/`, but they only cover the bootstrap baseline and do not yet match the provider roots and file shapes required by the feature spec.

Grounding conclusions:
- The feature is feasible in the current sub-project without changing the broader Rails app.
- No conflicting changes are currently staged under `tools/agentscope`; the dirty worktree is confined to `memory-bank/features/*`.
- `dist/` is generated output and should not be edited directly.

## Planned File Structure

**Create:**
- `tools/agentscope/src/core/config.ts`
- `tools/agentscope/src/core/discovery.ts`
- `tools/agentscope/src/core/models.ts`
- `tools/agentscope/src/core/output.ts`
- `tools/agentscope/src/core/paths.ts`
- `tools/agentscope/src/commands/list.ts`
- `tools/agentscope/src/providers/claude.ts`
- `tools/agentscope/src/providers/codex.ts`
- `tools/agentscope/src/providers/cursor.ts`
- `tools/agentscope/test/config.test.ts`
- `tools/agentscope/test/codex-config.test.ts`
- `tools/agentscope/test/discovery.test.ts`
- `tools/agentscope/test/doctor.test.ts`
- `tools/agentscope/test/list.test.ts`
- `tools/agentscope/test/output.test.ts`
- `tools/agentscope/test/paths.test.ts`
- `tools/agentscope/test/provider-discovery.test.ts`
- Fixture files required by the new discovery baseline, including additional Claude settings fixtures and Cursor MCP/extensions fixtures under `tools/agentscope/test/fixtures/`
- Controlled CLI runtime fixtures under `tools/agentscope/test/fixtures/runtime/` for `doctor` and `list` happy-path verification

**Modify:**
- `tools/agentscope/src/cli.ts`
- `tools/agentscope/src/commands/doctor.ts`
- `tools/agentscope/src/commands/providers.ts`
- `tools/agentscope/src/providers/registry.ts`
- `tools/agentscope/README.md`
- `tools/agentscope/test/provider-capabilities.test.ts`
- `tools/agentscope/test/fixtures/capability-matrix.json`
- Existing bootstrap fixture files whose paths or shapes no longer match the spec

## Task 1: Replace The Bootstrap Fixture Baseline With The Spec Baseline

**Files:**
- Modify: `tools/agentscope/src/providers/registry.ts`
- Modify: `tools/agentscope/test/provider-capabilities.test.ts`
- Modify: `tools/agentscope/test/fixtures/capability-matrix.json`
- Modify/Create: `tools/agentscope/test/fixtures/claude/**/*`
- Modify/Create: `tools/agentscope/test/fixtures/codex/**/*`
- Modify/Create: `tools/agentscope/test/fixtures/cursor/**/*`
- Modify: `tools/agentscope/README.md`

- [ ] **Step 1: Rewrite the capability status vocabulary to match the spec**

Update `CapabilityStatus` and the capability-matrix validation in `src/providers/registry.ts` so every provider row uses only `verified | read-only | unsupported | needs-verification`, and rename any field labels that still encode the bootstrap terminology.

- [ ] **Step 2: Expand the fixture manifest to the required provider roots**

Replace the current fixture list in `src/providers/registry.ts` with fixture paths that mirror the feature scope:
- Claude global and project settings JSON fixtures, Claude project skill fixtures under `.claude/skills/*/SKILL.md`, and project `.mcp.json`
- Codex global `config.toml`, global skill fixture, and project skill fixture
- Cursor global skill fixtures under `skills-cursor/*/SKILL.md`, global `mcp.json`, and at least one `profiles/*/extensions.json` fixture

Do not keep bootstrap-only fixture roots such as Cursor `storage.json` if they are no longer part of the discovery contract.

- [ ] **Step 3: Tighten the fixture validators to the required shapes**

Make the registry validators enforce exactly the structural assumptions from the spec:
- Claude fixture JSON files must parse as objects; when present, `enabledPlugins`, `enabledMcpjsonServers`, `disabledMcpjsonServers`, and `enableAllProjectMcpServers` must have object/array/boolean container types as appropriate
- Claude and Cursor `SKILL.md` fixtures must stay non-empty markdown files with a top-level heading so skill discovery roots are locked to real skill-shaped files
- Codex `config.toml` must expose parseable `[mcp_servers.*]` and `[plugins.*]` headers when those sections are present
- Cursor `mcp.json` must be an object with object-valued `mcpServers`
- Cursor `extensions.json`, when present, must be an array of objects whose `identifier.id` values are strings

- [ ] **Step 4: Refresh the committed fixtures**

Create or update the fixture payloads under `test/fixtures/` so they satisfy the new validators and mirror the provider roots that live discovery will use later. Keep fixtures intentionally minimal and sanitized.

- [ ] **Step 5: Rewrite the capability matrix fixture and README table**

Align `test/fixtures/capability-matrix.json` and the provider capability matrix in `README.md` with the new status vocabulary and the actual state of the baseline:
- Claude: skills `read-only`, configured MCPs `read-only`, tools `read-only`
- Codex: skills `read-only`, configured MCPs `read-only`, tools `read-only`
- Cursor: skills `read-only`, configured MCPs `read-only`, tools `read-only`

Use the same status labels in both places.

- [ ] **Step 6: Lock the new baseline in tests**

Update `test/provider-capabilities.test.ts` so it asserts the exact checked fixture paths and confirms the registry and matrix stay aligned after the fixture refresh.

- [ ] **Step 7: Verify the fixture baseline**

Run: `npm test -- test/provider-capabilities.test.ts`

Expected:
- PASS
- the checked fixture list matches the new spec-backed paths

- [ ] **Step 8: Commit**

```bash
git add tools/agentscope/src/providers/registry.ts tools/agentscope/test/provider-capabilities.test.ts tools/agentscope/test/fixtures tools/agentscope/README.md
git commit -m "feat: lock provider discovery fixture baseline"
```

## Task 2: Add Shared Config Loading And Path Resolution

**Files:**
- Create: `tools/agentscope/src/core/config.ts`
- Create: `tools/agentscope/src/core/paths.ts`
- Create: `tools/agentscope/test/config.test.ts`
- Create: `tools/agentscope/test/paths.test.ts`

- [ ] **Step 1: Define the config schema and precedence rules**

Implement `src/core/config.ts` with:
- a versioned config type for built-in defaults, user config, project config, and CLI overrides
- a loader that merges in this order: defaults < `~/.config/agentscope/config.json` < `<project>/.agentscope.json` < CLI flags
- explicit CLI override support for `--project-root <path>`, `--app-state-root <path>`, and `--cursor-root <path>` so command-level discovery can override file-based config deterministically
- rejection of unsupported future major schema versions
- tolerance for unknown additive keys

Do not couple config loading to any provider-specific discovery logic.

- [ ] **Step 2: Implement path helpers**

Implement `src/core/paths.ts` with helpers for:
- `~` expansion
- absolute-path normalization
- project-root resolution
- app-state root resolution for the `agentscope` config directory
- Cursor root resolution using config override first and macOS default `~/Library/Application Support/Cursor/User/` second

Keep these helpers deterministic and pure so tests can inject fake home/project roots.

- [ ] **Step 3: Write config precedence tests first**

Create `test/config.test.ts` to prove:
- defaults are used when no config files exist
- user config overrides defaults
- project config overrides user config
- `--project-root`, `--app-state-root`, and `--cursor-root` override file-based config in that exact precedence order
- a future major schema version throws a fatal error
- unknown additive keys are ignored rather than rejected

- [ ] **Step 4: Write path helper tests**

Create `test/paths.test.ts` to cover:
- `~` expansion
- project-root resolution
- app-state root resolution
- macOS Cursor default-root resolution
- config override precedence for Cursor root
- absolute normalization of already-expanded paths

- [ ] **Step 5: Verify the shared core**

Run: `npm test -- test/config.test.ts test/paths.test.ts`

Expected:
- PASS
- config precedence matches the spec exactly
- Cursor root resolution is stable on macOS

- [ ] **Step 6: Commit**

```bash
git add tools/agentscope/src/core/config.ts tools/agentscope/src/core/paths.ts tools/agentscope/test/config.test.ts tools/agentscope/test/paths.test.ts
git commit -m "feat: add shared config and path resolution"
```

## Task 3: Introduce The Normalized Discovery Model And Shared Orchestrator

**Files:**
- Create: `tools/agentscope/src/core/models.ts`
- Create: `tools/agentscope/src/core/discovery.ts`
- Create: `tools/agentscope/src/core/output.ts`
- Create: `tools/agentscope/test/discovery.test.ts`
- Create: `tools/agentscope/test/output.test.ts`
- Modify: `tools/agentscope/src/providers/registry.ts`

- [ ] **Step 1: Define the normalized item and warning models**

Implement `src/core/models.ts` with explicit types for:
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

Also define the warning model with:
- `provider`
- optional `layer`
- machine-readable `code`
- human-readable `message`

Keep `kind` limited to `skill | mcp | plugin`, `category` limited to `skill | configured-mcp | tool`, and `mutability` limited to `read-write | read-only | unsupported`.

For Cursor extension discovery, normalize installed extensions as `kind: "plugin"` and `category: "tool"` so the provider-specific extension concept fits the shared model without inventing a fourth `kind`.

- [ ] **Step 2: Write failing discovery and output tests first**

Create `test/discovery.test.ts` and `test/output.test.ts` to cover:
- merged `items` and `warnings` from multiple provider stubs
- healthy-provider results surviving when one provider stub fails
- stable ordering by `provider`, then `layer`, then `category`, then `id`
- human and JSON output rendering from the same normalized input without drift

- [ ] **Step 3: Add provider contracts and stable sorting**

In `src/core/discovery.ts`, define the provider discovery contract each provider module must implement:
- receive resolved config and project context
- return `{ items, warnings }`
- never throw for provider-scoped file read or parse failures that should surface as warnings in `list`

Add one sorter that orders results by `provider`, then `layer`, then `category`, then `id`.

- [ ] **Step 4: Add aggregation helpers for partial-success behavior**

Still in `src/core/discovery.ts`, implement an orchestration helper that runs all enabled providers, merges their `items` and `warnings`, preserves healthy-provider results when another provider fails, and reserves thrown errors only for fatal command-level problems such as invalid CLI flags or unsupported config schema versions.

- [ ] **Step 5: Add shared output formatting helpers**

Implement `src/core/output.ts` so human-readable and JSON `list` output are generated from the same normalized data shape, preventing drift between display modes.

- [ ] **Step 6: Update provider registry responsibility**

Trim `src/providers/registry.ts` so it owns provider metadata, fixture validation, and capability-matrix loading, but does not become the discovery orchestrator itself. Discovery wiring should live in `src/core/discovery.ts`.

- [ ] **Step 7: Verify the normalized discovery core**

Run: `npm test -- test/provider-capabilities.test.ts test/discovery.test.ts test/output.test.ts`

Expected:
- PASS
- provider registry changes do not break the fixture baseline
- aggregation and output helpers preserve partial-success semantics and stable ordering

- [ ] **Step 8: Commit**

```bash
git add tools/agentscope/src/core/models.ts tools/agentscope/src/core/discovery.ts tools/agentscope/src/core/output.ts tools/agentscope/src/providers/registry.ts tools/agentscope/test/discovery.test.ts tools/agentscope/test/output.test.ts
git commit -m "feat: add normalized discovery core"
```

## Task 4: Implement Claude Code Discovery

**Files:**
- Create: `tools/agentscope/src/providers/claude.ts`
- Create/Modify: `tools/agentscope/test/fixtures/claude/**/*`
- Create/Modify: `tools/agentscope/test/provider-discovery.test.ts`

- [ ] **Step 1: Write Claude discovery tests first**

Add Claude cases to `test/provider-discovery.test.ts` for:
- reading global `settings.json` and `settings.local.json` when present
- reading project `.claude/settings.json` and `.claude/settings.local.json` when present
- discovering project skills from `<project>/.claude/skills/*/SKILL.md`
- discovering configured MCPs from `<project>/.mcp.json` plus Claude approval keys
- discovering `tool` items from `enabledPlugins`
- ignoring `~/.agents/skills/*/SKILL.md`
- ignoring `~/.claude/plugins/` as a live config source
- turning malformed JSON or unreadable files into Claude-scoped warnings

- [ ] **Step 2: Implement the Claude provider**

Create `src/providers/claude.ts` with read-only discovery for the allowed roots only. Normalize all discovered skills, configured MCPs, and tools into the shared item model, and emit warning codes for unreadable files, malformed JSON, or unsupported fixture shapes.

- [ ] **Step 3: Stabilize Claude item IDs**

Build IDs from provider, layer, category, and provider-native identifiers so repeated discovery runs produce the same IDs when file locations stay unchanged.

- [ ] **Step 4: Verify Claude discovery**

Run: `npm test -- test/provider-discovery.test.ts`

Expected:
- PASS for the Claude-focused cases
- malformed fixture variants surface warnings instead of aborting discovery

- [ ] **Step 5: Commit**

```bash
git add tools/agentscope/src/providers/claude.ts tools/agentscope/test/provider-discovery.test.ts tools/agentscope/test/fixtures/claude
git commit -m "feat: add claude discovery provider"
```

## Task 5: Implement Codex Discovery

**Files:**
- Create: `tools/agentscope/src/providers/codex.ts`
- Create: `tools/agentscope/test/codex-config.test.ts`
- Create/Modify: `tools/agentscope/test/fixtures/codex/**/*`
- Modify: `tools/agentscope/test/provider-discovery.test.ts`

- [ ] **Step 1: Add Codex provider and parser tests first**

Extend `test/provider-discovery.test.ts` and create `test/codex-config.test.ts` for:
- global skills from `~/.codex/skills/`
- project skills from `<project>/.codex/skills/`
- configured MCPs from `~/.codex/config.toml`
- tools from `[plugins.*]` sections in `config.toml`
- unsupported plugin lifecycle management still represented as normalized `tool` items with `mutability: "unsupported"`
- malformed or unreadable TOML surfaced as Codex warnings
- parser behavior for valid section headers, malformed headers, and files with missing optional sections

- [ ] **Step 2: Implement and unit-test a narrow TOML section parser without adding dependencies**

Inside `src/providers/codex.ts`, parse only the shapes this feature needs:
- section headers for `[mcp_servers.*]`
- section headers for `[plugins.*]`
- enabled flags and display metadata if present

Avoid bringing in a TOML package unless the user later asks for it.

- [ ] **Step 3: Verify the TOML parser in isolation**

Run: `npm test -- test/codex-config.test.ts`

Expected:
- PASS
- valid and malformed `config.toml` fixtures are classified deterministically before the provider wiring depends on them

- [ ] **Step 4: Implement the Codex provider**

Normalize skill, configured MCP, and tool slices from the verified Codex roots, return zero items without warnings for absent optional slices, and return warnings for malformed or unreadable required inputs.

- [ ] **Step 5: Verify Codex discovery**

Run: `npm test -- test/codex-config.test.ts test/provider-discovery.test.ts`

Expected:
- PASS for the Codex-focused cases
- plugin lifecycle mutability is reported as `unsupported`

- [ ] **Step 6: Commit**

```bash
git add tools/agentscope/src/providers/codex.ts tools/agentscope/test/codex-config.test.ts tools/agentscope/test/provider-discovery.test.ts tools/agentscope/test/fixtures/codex
git commit -m "feat: add codex discovery provider"
```

## Task 6: Implement Cursor Discovery

**Files:**
- Create: `tools/agentscope/src/providers/cursor.ts`
- Create/Modify: `tools/agentscope/test/fixtures/cursor/**/*`
- Modify: `tools/agentscope/test/provider-discovery.test.ts`

- [ ] **Step 1: Add Cursor-first tests**

Extend `test/provider-discovery.test.ts` with Cursor cases for:
- skill discovery from `~/.cursor/skills-cursor`
- configured MCP discovery from `~/.cursor/mcp.json`
- installed extensions discovery from `<cursor-root>/profiles/*/extensions.json`
- root override precedence over the macOS default path
- zero `tool` items and no warning when no `profiles/*/extensions.json` files exist
- provider warning when the configured Cursor root is missing or unreadable
- malformed `mcp.json` or `extensions.json` surfaced as Cursor warnings

- [ ] **Step 2: Implement the Cursor provider**

Create `src/providers/cursor.ts` so it:
- resolves the Cursor root through `src/core/paths.ts`
- scans only the supported roots from the spec
- normalizes discovered skills, configured MCPs, and extensions into the shared item model, using `kind: "plugin"` and `category: "tool"` for installed extensions
- reports missing/unreadable configured roots as provider warnings without aborting other providers

- [ ] **Step 3: Verify Cursor discovery**

Run: `npm test -- test/provider-discovery.test.ts`

Expected:
- PASS for the Cursor-focused cases
- absent extensions metadata yields an empty slice, not a warning

- [ ] **Step 4: Commit**

```bash
git add tools/agentscope/src/providers/cursor.ts tools/agentscope/test/provider-discovery.test.ts tools/agentscope/test/fixtures/cursor
git commit -m "feat: add cursor discovery provider"
```

## Task 7: Wire The `list`, `providers`, And `doctor` Commands

**Files:**
- Create: `tools/agentscope/src/commands/list.ts`
- Modify: `tools/agentscope/src/commands/providers.ts`
- Modify: `tools/agentscope/src/commands/doctor.ts`
- Modify: `tools/agentscope/src/cli.ts`
- Create: `tools/agentscope/test/list.test.ts`
- Create: `tools/agentscope/test/doctor.test.ts`
- Create/Modify: `tools/agentscope/test/fixtures/runtime/**/*`
- Modify: `tools/agentscope/README.md`

- [ ] **Step 1: Add failing command tests**

Create `test/list.test.ts` and `test/doctor.test.ts` covering:
- `list` human-readable output
- `list --json` output with separate `items` and `warnings` arrays
- stable ordering by `provider`, then `layer`, then `category`, then `id`
- explicit empty result output when no items exist
- partial-success behavior where one provider warns and others still appear
- `list` and `doctor` accepting `--project-root`, `--app-state-root`, and `--cursor-root` overrides while command tests set `HOME` to a fixture-backed sandbox
- `doctor` returning `OK` when fixtures and local inputs are structurally valid
- `doctor` exiting non-zero for missing fixture files or fixture-shape mismatches
- `providers` printing Claude Code, Codex, and Cursor in deterministic order with matrix summary

- [ ] **Step 2: Implement `list`**

Create `src/commands/list.ts` and wire it from `src/cli.ts`. Support:
- human output
- `--json`
- `--project-root <path>`
- `--app-state-root <path>`
- `--cursor-root <path>`
- provider warning rendering in both modes
- empty-state messaging
- fatal non-zero exits only for invalid arguments or unsupported config schema versions

- [ ] **Step 3: Upgrade `providers`**

Update `src/commands/providers.ts` so the command prints the supported providers and capability-matrix summary using the new capability status vocabulary and deterministic provider order.

- [ ] **Step 4: Upgrade `doctor`**

Update `src/commands/doctor.ts` so it:
- still validates required fixture existence and shape as fatal checks
- also inspects real local provider inputs and reports provider-scoped issues for missing or malformed local files
- supports the same `--project-root`, `--app-state-root`, and `--cursor-root` overrides used by `list`, while command tests can set `HOME` to isolate global provider roots from the real machine
- prints `OK` only when required discovery inputs are readable and structurally valid

Local provider file problems should appear in output as provider issues. They are not fixture-assumption failures, but `doctor` should still exit non-zero when a required live discovery input is missing, unreadable, or malformed.

- [ ] **Step 5: Update README command docs**

Refresh `tools/agentscope/README.md` to describe the three supported commands, the provider capability matrix, and the distinction between fatal fixture failures and warning-only provider issues.

- [ ] **Step 6: Verify command behavior**

Run:
- `npm test -- test/list.test.ts test/doctor.test.ts`
- `npm run build`
- `node dist/cli.js providers`
- `HOME="$PWD/test/fixtures/runtime/home" node dist/cli.js doctor --project-root "$PWD/test/fixtures/runtime/project" --cursor-root "$PWD/test/fixtures/runtime/cursor/User" --app-state-root "$PWD/test/fixtures/runtime/app-state"`

Expected:
- tests PASS
- build succeeds
- `providers` lists Claude Code, Codex, and Cursor in deterministic order
- `doctor` prints `OK` for the controlled fixture-backed happy path instead of depending on the real local machine state

- [ ] **Step 7: Commit**

```bash
git add tools/agentscope/src/commands/list.ts tools/agentscope/src/commands/providers.ts tools/agentscope/src/commands/doctor.ts tools/agentscope/src/cli.ts tools/agentscope/test/list.test.ts tools/agentscope/test/doctor.test.ts tools/agentscope/test/fixtures/runtime tools/agentscope/README.md
git commit -m "feat: add discovery commands"
```

## Task 8: Add End-To-End Acceptance Coverage And Final Verification

**Files:**
- Modify: `tools/agentscope/test/provider-discovery.test.ts`
- Modify: `tools/agentscope/test/list.test.ts`
- Modify: `tools/agentscope/test/doctor.test.ts`
- Modify: `tools/agentscope/test/provider-capabilities.test.ts`

- [ ] **Step 1: Map the acceptance criteria to tests**

Confirm the test suite covers:
- fixture-backed integration failure when required fixture paths or shapes drift
- config precedence
- path helpers
- normalized `list --json` items plus separate `warnings`
- malformed provider file warning with healthy-provider results preserved
- `doctor` non-zero exit on failed discovery assumptions
- deterministic `providers` order
- explicit empty result with exit `0`
- invalid CLI usage exiting non-zero without partial output

- [ ] **Step 2: Fill any remaining coverage gaps**

If one of the acceptance criteria is still only implied rather than directly asserted, add the missing focused assertion to the smallest existing test file instead of creating redundant coverage.

- [ ] **Step 3: Run the full verification suite**

Run:
- `npm test`
- `npm run build`

Expected:
- PASS
- `dist/` regenerates cleanly from `src/`
- all acceptance criteria are exercised by committed tests

- [ ] **Step 4: Commit**

```bash
git add tools/agentscope/test tools/agentscope/src tools/agentscope/README.md
git commit -m "test: verify discovery foundation acceptance criteria"
```

## Spec Coverage Check

- Requirement 1, provider baseline and fixture lock: Tasks 1, 7, 8
- Requirement 2, shared config and path resolution: Task 2
- Requirement 3, normalized discovery model: Task 3
- Requirement 4, provider discovery scope: Tasks 4, 5, 6
- Requirement 5, command behavior: Task 7
- Error handling and invariants: Tasks 3, 4, 5, 6, 7, 8
- Acceptance criteria 1-9: Tasks 1, 2, 7, 8

## Grounding Review

- `tools/agentscope/src/core` does not exist yet, so creating it is required and does not conflict with current structure.
- `tools/agentscope/src/providers/registry.ts` is the current home for provider metadata and fixture validation, so Task 1 and Task 3 correctly stage changes there before provider modules branch out.
- `tools/agentscope/src/cli.ts` already owns command registration, so Task 7 is the right point to add `list` rather than creating a second entrypoint.
- `tools/agentscope/test/provider-capabilities.test.ts` is the current baseline lock, so expanding it first prevents silent fixture drift while new behavior lands.
- `tools/agentscope/test/fixtures/cursor/global/settings.json` and `tools/agentscope/test/fixtures/cursor/global/storage.json` reflect bootstrap assumptions, so replacing or retiring them is necessary to match the feature spec's Cursor roots.

0 issues, the original plan was ready for implementation and the resulting implementation is now verified.

## Verified Implementation Alignment

- The implementation has been verified with the full `tools/agentscope` test suite and `npm run build`.
- `doctor` behavior is intentionally stricter than the original Task 7 wording implied: provider-scoped local input problems are reported separately from fixture failures, but still exit non-zero when they break required live discovery assumptions.
- CLI invalid-usage handling is now explicit and verified: missing command, unknown command, and invalid flags all exit non-zero without partial output.
- Partial-success behavior is verified at the provider-slice level, not only at the whole-provider level: a provider can emit warnings for one unreadable or malformed slice while still contributing healthy items from another slice.
- `appStateRoot` is resolved and overrideable in config/path handling for AgentScope-managed state concerns in this feature, but provider discovery does not treat it as a provider discovery root.
- Review-driven coverage additions now lock the clarified behavior in tests, including CLI misuse cases, JSON empty/partial-success output, path helper coverage for app-state resolution, and provider scan-failure preservation.

## Revision After Feature 003 Planning

- **Task 1 compatibility revision:** if the Claude fixture baseline is regenerated or tightened again, `enabledMcpjsonServers` and `disabledMcpjsonServers` should be treated as object-valued maps keyed by server ID rather than array-oriented approval lists. Feature 003's writable Claude MCP planning depends on keyed JSON object-entry mutations, so the older fixture-shape assumption should not be carried forward unchanged.
- **Task 3 follow-on note:** the normalized discovery model, warning model, and slice-level orchestration from feature 001 remain valid. The later conflict was not in the shared-model code that shipped; it was in the initial plan's assumption that future Claude writable work could reuse the discovery-era fixture contract without revisiting the provider-native approval-key shape.
