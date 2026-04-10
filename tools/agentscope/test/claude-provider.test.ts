import { existsSync, rmSync, writeFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import { runRestore } from "../src/commands/restore.js";
import { runToggle } from "../src/commands/toggle.js";
import { vaultDescriptor } from "../src/core/mutation-vault.js";
import { claudeProvider } from "../src/providers/claude.js";
import { createClaudeSandbox } from "./support/claude-sandbox.js";

const sandboxes: Array<ReturnType<typeof createClaudeSandbox>> = [];

function sandboxOptions(sandbox: ReturnType<typeof createClaudeSandbox>) {
  return {
    cwd: sandbox.projectRoot,
    homeDir: sandbox.homeDir,
    projectRoot: sandbox.projectRoot,
    appStateRoot: sandbox.appStateRoot,
    cursorRoot: sandbox.cursorRoot,
  };
}

afterEach(() => {
  while (sandboxes.length > 0) {
    sandboxes.pop()?.cleanup();
  }
});

describe("claude provider", () => {
  it("discovers live Claude items with canonical ids and writable state paths", () => {
    const sandbox = createClaudeSandbox();
    sandboxes.push(sandbox);

    const result = claudeProvider.discover({
      config: sandbox.config,
      homeDir: sandbox.homeDir,
    });

    expect(result.warnings).toEqual([]);
    expect(result.items).toContainEqual(
      expect.objectContaining({
        id: "claude:project:skill:example-claude-skill",
        enabled: true,
        mutability: "read-write",
        sourcePath: sandbox.projectPath(".claude/skills/example-claude-skill/SKILL.md"),
        statePath: sandbox.projectPath(".claude/skills/example-claude-skill"),
      }),
    );
    expect(result.items).toContainEqual(
      expect.objectContaining({
        id: "claude:project:configured-mcp:github",
        enabled: true,
        mutability: "read-write",
        sourcePath: sandbox.projectPath(".mcp.json"),
        statePath: sandbox.projectPath(".claude/settings.local.json"),
      }),
    );
    expect(result.items).toContainEqual(
      expect.objectContaining({
        id: "claude:project:tool:settings-local:local-shell",
        enabled: false,
        mutability: "read-write",
        statePath: sandbox.projectPath(".claude/settings.local.json"),
      }),
    );
  });

  it("disables a Claude skill into the vault and re-discovers it as disabled", () => {
    const sandbox = createClaudeSandbox();
    sandboxes.push(sandbox);
    const descriptor = vaultDescriptor({
      appStateRoot: sandbox.appStateRoot,
      provider: "claude",
      layer: "project",
      kind: "skill",
      itemId: "claude:project:skill:example-claude-skill",
    });

    const dryRun = runToggle({
      ...sandboxOptions(sandbox),
      provider: "claude",
      kind: "skill",
      layer: "project",
      id: "claude:project:skill:example-claude-skill",
    });
    expect(dryRun.exitCode).toBe(0);
    expect(dryRun.output).toContain("rename path");
    expect(dryRun.output).toContain(".claude/skills/example-claude-skill");
    expect(dryRun.output).toContain("/vault/claude/project/skill/");

    const applied = runToggle({
      ...sandboxOptions(sandbox),
      provider: "claude",
      kind: "skill",
      layer: "project",
      id: "claude:project:skill:example-claude-skill",
      apply: true,
      now: () => new Date("2026-04-09T10:00:00.000Z"),
      generateBackupId: () => "backup-skill-disable",
    });
    expect(applied.exitCode).toBe(0);
    expect(existsSync(sandbox.projectPath(".claude/skills/example-claude-skill"))).toBe(false);
    expect(existsSync(descriptor.vaultedPath)).toBe(true);
    expect(existsSync(descriptor.entryPath)).toBe(true);
    expect(sandbox.listBackupIds()).toEqual(["backup-skill-disable"]);
    expect(sandbox.readAuditLog()).toHaveLength(1);

    const rediscovered = claudeProvider.discover({
      config: sandbox.config,
      homeDir: sandbox.homeDir,
    });
    expect(rediscovered.items).toContainEqual(
      expect.objectContaining({
        id: "claude:project:skill:example-claude-skill",
        enabled: false,
        mutability: "read-write",
        statePath: descriptor.entryPath,
      }),
    );
  });

  it("re-enables a vaulted Claude skill and restores it through backup replay", () => {
    const sandbox = createClaudeSandbox();
    sandboxes.push(sandbox);

    const disabled = runToggle({
      ...sandboxOptions(sandbox),
      provider: "claude",
      kind: "skill",
      layer: "project",
      id: "claude:project:skill:example-claude-skill",
      apply: true,
      now: () => new Date("2026-04-09T10:00:00.000Z"),
      generateBackupId: () => "backup-skill-disable",
    });
    expect(disabled.exitCode).toBe(0);

    const enabled = runToggle({
      ...sandboxOptions(sandbox),
      provider: "claude",
      kind: "skill",
      layer: "project",
      id: "claude:project:skill:example-claude-skill",
      apply: true,
      now: () => new Date("2026-04-09T10:05:00.000Z"),
      generateBackupId: () => "backup-skill-enable",
    });
    expect(enabled.exitCode).toBe(0);
    expect(existsSync(sandbox.projectPath(".claude/skills/example-claude-skill"))).toBe(true);

    const restored = runRestore({
      ...sandboxOptions(sandbox),
      backupId: "backup-skill-disable",
    });
    expect(restored.exitCode).toBe(0);
    expect(existsSync(sandbox.projectPath(".claude/skills/example-claude-skill"))).toBe(true);
  });

  it("blocks skill enable when the vault manifest or vaulted directory is missing", () => {
    const sandbox = createClaudeSandbox();
    sandboxes.push(sandbox);
    const descriptor = vaultDescriptor({
      appStateRoot: sandbox.appStateRoot,
      provider: "claude",
      layer: "project",
      kind: "skill",
      itemId: "claude:project:skill:example-claude-skill",
    });

    runToggle({
      ...sandboxOptions(sandbox),
      provider: "claude",
      kind: "skill",
      layer: "project",
      id: "claude:project:skill:example-claude-skill",
      apply: true,
      now: () => new Date("2026-04-09T10:00:00.000Z"),
      generateBackupId: () => "backup-skill-disable",
    });

    rmSync(descriptor.vaultedPath, { recursive: true, force: true });
    const missingPayload = runToggle({
      ...sandboxOptions(sandbox),
      provider: "claude",
      kind: "skill",
      layer: "project",
      id: "claude:project:skill:example-claude-skill",
    });
    expect(missingPayload.exitCode).toBe(1);
    expect(missingPayload.output).toContain("missing-vault-payload");

    rmSync(descriptor.entryPath, { force: true });
    const missingManifest = claudeProvider.planToggle?.({
      config: sandbox.config,
      homeDir: sandbox.homeDir,
      item: {
        provider: "claude",
        kind: "skill",
        category: "skill",
        layer: "project",
        id: "claude:project:skill:example-claude-skill",
        displayName: "example-claude-skill",
        enabled: false,
        mutability: "read-write",
        sourcePath: sandbox.projectPath(".claude/skills/example-claude-skill/SKILL.md"),
        statePath: descriptor.entryPath,
      },
      targetEnabled: true,
    });
    expect(missingManifest).toMatchObject({
      status: "blocked",
      reason: expect.stringContaining("missing-vault-manifest"),
    });
  });

  it("plans configured MCP toggles with object-entry operations and bootstraps missing approval objects", () => {
    const sandbox = createClaudeSandbox();
    sandboxes.push(sandbox);

    const disabled = runToggle({
      ...sandboxOptions(sandbox),
      provider: "claude",
      kind: "mcp",
      layer: "project",
      id: "claude:project:configured-mcp:github",
      json: true,
    });
    expect(JSON.parse(disabled.output)).toMatchObject({
      status: "dry-run",
      operations: [{ type: "removeJsonObjectEntry" }, { type: "updateJsonObjectEntry" }],
    });

    writeFileSync(
      sandbox.projectPath(".claude/settings.local.json"),
      JSON.stringify(
        {
          enableAllProjectMcpServers: false,
          enabledPlugins: {
            "local-shell": false,
          },
        },
        null,
        2,
      ),
    );
    writeFileSync(
      sandbox.projectPath(".claude/settings.json"),
      JSON.stringify(
        {
          enabledPlugins: {
            github: true,
          },
        },
        null,
        2,
      ),
    );

    const bootstrapped = runToggle({
      ...sandboxOptions(sandbox),
      provider: "claude",
      kind: "mcp",
      layer: "project",
      id: "claude:project:configured-mcp:github",
      json: true,
    });
    expect(JSON.parse(bootstrapped.output)).toMatchObject({
      status: "dry-run",
      operations: [
        { type: "replaceJsonValue" },
        { type: "replaceJsonValue" },
        { type: "removeJsonObjectEntry" },
        { type: "updateJsonObjectEntry" },
      ],
    });
  });

  it("applies and restores configured MCP and tool toggles", () => {
    const sandbox = createClaudeSandbox();
    sandboxes.push(sandbox);

    const configuredMcp = runToggle({
      ...sandboxOptions(sandbox),
      provider: "claude",
      kind: "mcp",
      layer: "project",
      id: "claude:project:configured-mcp:github",
      apply: true,
      now: () => new Date("2026-04-09T11:00:00.000Z"),
      generateBackupId: () => "backup-mcp",
    });
    expect(configuredMcp.exitCode).toBe(0);
    expect(
      sandbox.readProjectJson<{
        enabledMcpjsonServers: Record<string, unknown>;
        disabledMcpjsonServers: Record<string, unknown>;
      }>(".claude/settings.local.json"),
    ).toMatchObject({
      enabledMcpjsonServers: {},
      disabledMcpjsonServers: {
        github: expect.any(Object),
      },
    });

    const restoredMcp = runRestore({
      ...sandboxOptions(sandbox),
      backupId: "backup-mcp",
    });
    expect(restoredMcp.exitCode).toBe(0);
    expect(
      sandbox.readProjectJson<{
        enabledMcpjsonServers: Record<string, unknown>;
      }>(".claude/settings.local.json"),
    ).toMatchObject({
      enabledMcpjsonServers: {
        github: expect.any(Object),
      },
    });

    const dryRunTool = runToggle({
      ...sandboxOptions(sandbox),
      provider: "claude",
      kind: "plugin",
      layer: "project",
      id: "claude:project:tool:settings-local:local-shell",
      json: true,
    });
    expect(JSON.parse(dryRunTool.output)).toMatchObject({
      status: "dry-run",
      operations: [
        {
          type: "replaceJsonValue",
          summary: expect.stringContaining("enabledPlugins.local-shell"),
        },
      ],
    });

    const tool = runToggle({
      ...sandboxOptions(sandbox),
      provider: "claude",
      kind: "plugin",
      layer: "project",
      id: "claude:project:tool:settings-local:local-shell",
      apply: true,
      now: () => new Date("2026-04-09T11:05:00.000Z"),
      generateBackupId: () => "backup-tool",
    });
    expect(tool.exitCode).toBe(0);
    expect(
      sandbox.readProjectJson<{ enabledPlugins: Record<string, boolean> }>(
        ".claude/settings.local.json",
      ).enabledPlugins["local-shell"],
    ).toBe(true);

    const restoredTool = runRestore({
      ...sandboxOptions(sandbox),
      backupId: "backup-tool",
    });
    expect(restoredTool.exitCode).toBe(0);
    expect(
      sandbox.readProjectJson<{ enabledPlugins: Record<string, boolean> }>(
        ".claude/settings.local.json",
      ).enabledPlugins["local-shell"],
    ).toBe(false);
  });

  it("applies and restores global Claude tool toggles", () => {
    const sandbox = createClaudeSandbox();
    sandboxes.push(sandbox);

    const dryRunTool = runToggle({
      ...sandboxOptions(sandbox),
      provider: "claude",
      kind: "plugin",
      layer: "global",
      id: "claude:global:tool:settings-local:project-auditor",
      json: true,
    });
    expect(JSON.parse(dryRunTool.output)).toMatchObject({
      status: "dry-run",
      operations: [
        {
          type: "replaceJsonValue",
          summary: expect.stringContaining("enabledPlugins.project-auditor"),
        },
      ],
    });

    const tool = runToggle({
      ...sandboxOptions(sandbox),
      provider: "claude",
      kind: "plugin",
      layer: "global",
      id: "claude:global:tool:settings-local:project-auditor",
      apply: true,
      now: () => new Date("2026-04-09T11:10:00.000Z"),
      generateBackupId: () => "backup-global-tool",
    });
    expect(tool.exitCode).toBe(0);
    expect(
      sandbox.readHomeJson<{ enabledPlugins: Record<string, boolean> }>(
        ".claude/settings.local.json",
      ).enabledPlugins["project-auditor"],
    ).toBe(false);

    const restoredTool = runRestore({
      ...sandboxOptions(sandbox),
      backupId: "backup-global-tool",
    });
    expect(restoredTool.exitCode).toBe(0);
    expect(
      sandbox.readHomeJson<{ enabledPlugins: Record<string, boolean> }>(
        ".claude/settings.local.json",
      ).enabledPlugins["project-auditor"],
    ).toBe(true);
  });

  it("plans the all-project-MCP flag as a standalone boolean toggle", () => {
    const sandbox = createClaudeSandbox();
    sandboxes.push(sandbox);

    const result = runToggle({
      ...sandboxOptions(sandbox),
      provider: "claude",
      kind: "mcp",
      layer: "project",
      id: "claude:project:configured-mcp:all-project-mcp-servers",
      json: true,
    });

    expect(JSON.parse(result.output)).toMatchObject({
      status: "dry-run",
      operations: [
        {
          type: "replaceJsonValue",
          summary: expect.stringContaining("enableAllProjectMcpServers"),
        },
      ],
    });
  });

  it("blocks unknown categories with an explicit reason", () => {
    const sandbox = createClaudeSandbox();
    sandboxes.push(sandbox);

    const result = claudeProvider.planToggle?.({
      config: sandbox.config,
      homeDir: sandbox.homeDir,
      item: {
        provider: "claude",
        kind: "plugin",
        category: "unknown" as never,
        layer: "project",
        id: "claude:project:tool:settings-local:local-shell",
        displayName: "local-shell",
        enabled: false,
        mutability: "read-write",
        sourcePath: sandbox.projectPath(".claude/settings.local.json"),
        statePath: sandbox.projectPath(".claude/settings.local.json"),
      },
      targetEnabled: true,
    });

    expect(result).toMatchObject({
      status: "blocked",
      reason: expect.stringContaining("unsupported category"),
    });
  });
});
