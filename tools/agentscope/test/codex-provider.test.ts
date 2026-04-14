import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import { runRestore } from "../src/commands/restore.js";
import { runToggle } from "../src/commands/toggle.js";
import { vaultDescriptor } from "../src/core/mutation-vault.js";
import { codexProvider } from "../src/providers/codex.js";
import { createCodexSandbox } from "./support/codex-sandbox.js";

const sandboxes: Array<ReturnType<typeof createCodexSandbox>> = [];

function sandboxOptions(sandbox: ReturnType<typeof createCodexSandbox>) {
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

describe("codex provider", () => {
  it("discovers live Codex items with writable skills and configured MCPs", () => {
    const sandbox = createCodexSandbox();
    sandboxes.push(sandbox);

    const result = codexProvider.discover({
      config: sandbox.config,
      homeDir: sandbox.homeDir,
    });

    expect(result.warnings).toEqual([]);
    expect(result.items).toContainEqual(
      expect.objectContaining({
        id: "codex:global:skill:example-skill",
        enabled: true,
        mutability: "read-write",
        sourcePath: sandbox.homePath(".codex/skills/.system/example-skill/SKILL.md"),
        statePath: sandbox.homePath(".codex/skills/.system/example-skill"),
      }),
    );
    expect(result.items).toContainEqual(
      expect.objectContaining({
        id: "codex:project:skill:example-project-skill",
        enabled: true,
        mutability: "read-write",
        sourcePath: sandbox.projectPath(".codex/skills/example-project-skill/SKILL.md"),
        statePath: sandbox.projectPath(".codex/skills/example-project-skill"),
      }),
    );
    expect(result.items).toContainEqual(
      expect.objectContaining({
        id: "codex:global:configured-mcp:config:github",
        enabled: true,
        mutability: "read-write",
        sourcePath: sandbox.homePath(".codex/config.toml"),
        statePath: sandbox.homePath(".codex/config.toml"),
      }),
    );
    expect(result.items).toContainEqual(
      expect.objectContaining({
        id: "codex:global:tool:plugin:safe-shell",
        enabled: true,
        mutability: "unsupported",
      }),
    );
  });

  it("disables a global Codex skill into the vault and re-discovers it as disabled", () => {
    const sandbox = createCodexSandbox();
    sandboxes.push(sandbox);
    const descriptor = vaultDescriptor({
      appStateRoot: sandbox.appStateRoot,
      provider: "codex",
      layer: "global",
      kind: "skill",
      itemId: "codex:global:skill:example-skill",
    });

    const dryRun = runToggle({
      ...sandboxOptions(sandbox),
      provider: "codex",
      kind: "skill",
      layer: "global",
      id: "codex:global:skill:example-skill",
    });
    expect(dryRun.exitCode).toBe(0);
    expect(dryRun.output).toContain("rename path");
    expect(dryRun.output).toContain(".codex/skills/.system/example-skill");
    expect(dryRun.output).toContain("/vault/codex/global/skill/");

    const applied = runToggle({
      ...sandboxOptions(sandbox),
      provider: "codex",
      kind: "skill",
      layer: "global",
      id: "codex:global:skill:example-skill",
      apply: true,
      now: () => new Date("2026-04-13T10:00:00.000Z"),
      generateBackupId: () => "backup-codex-global-skill-disable",
    });
    expect(applied.exitCode).toBe(0);
    expect(existsSync(sandbox.homePath(".codex/skills/.system/example-skill"))).toBe(false);
    expect(existsSync(descriptor.vaultedPath)).toBe(true);
    expect(existsSync(descriptor.entryPath)).toBe(true);

    const rediscovered = codexProvider.discover({
      config: sandbox.config,
      homeDir: sandbox.homeDir,
    });
    expect(rediscovered.items).toContainEqual(
      expect.objectContaining({
        id: "codex:global:skill:example-skill",
        enabled: false,
        mutability: "read-write",
        statePath: descriptor.entryPath,
      }),
    );
  });

  it("restores a disabled project Codex skill from backup replay", () => {
    const sandbox = createCodexSandbox();
    sandboxes.push(sandbox);

    const applied = runToggle({
      ...sandboxOptions(sandbox),
      provider: "codex",
      kind: "skill",
      layer: "project",
      id: "codex:project:skill:example-project-skill",
      apply: true,
      now: () => new Date("2026-04-13T10:05:00.000Z"),
      generateBackupId: () => "backup-codex-project-skill-disable",
    });
    expect(applied.exitCode).toBe(0);
    expect(existsSync(sandbox.projectPath(".codex/skills/example-project-skill"))).toBe(false);

    const restored = runRestore({
      ...sandboxOptions(sandbox),
      backupId: "backup-codex-project-skill-disable",
    });
    expect(restored.exitCode).toBe(0);
    expect(existsSync(sandbox.projectPath(".codex/skills/example-project-skill"))).toBe(true);
  });

  it("disables and re-enables a Codex configured MCP without losing the original section bytes", () => {
    const sandbox = createCodexSandbox();
    sandboxes.push(sandbox);
    const originalConfig = sandbox.readHomeText(".codex/config.toml");
    const descriptor = vaultDescriptor({
      appStateRoot: sandbox.appStateRoot,
      provider: "codex",
      layer: "global",
      kind: "configured-mcp",
      itemId: "codex:global:configured-mcp:config:github",
    });

    const disabled = runToggle({
      ...sandboxOptions(sandbox),
      provider: "codex",
      kind: "mcp",
      layer: "global",
      id: "codex:global:configured-mcp:config:github",
      apply: true,
      now: () => new Date("2026-04-13T10:10:00.000Z"),
      generateBackupId: () => "backup-codex-mcp-disable",
    });
    expect(disabled.exitCode).toBe(0);
    expect(sandbox.readHomeText(".codex/config.toml")).not.toContain("[mcp_servers.github]");
    expect(existsSync(descriptor.payloadPath)).toBe(true);
    expect(existsSync(descriptor.entryPath)).toBe(true);

    const rediscovered = codexProvider.discover({
      config: sandbox.config,
      homeDir: sandbox.homeDir,
    });
    expect(rediscovered.items).toContainEqual(
      expect.objectContaining({
        id: "codex:global:configured-mcp:config:github",
        enabled: false,
        mutability: "read-write",
        statePath: descriptor.entryPath,
      }),
    );

    const enabled = runToggle({
      ...sandboxOptions(sandbox),
      provider: "codex",
      kind: "mcp",
      layer: "global",
      id: "codex:global:configured-mcp:config:github",
      apply: true,
      now: () => new Date("2026-04-13T10:15:00.000Z"),
      generateBackupId: () => "backup-codex-mcp-enable",
    });
    expect(enabled.exitCode).toBe(0);
    expect(sandbox.readHomeText(".codex/config.toml")).toBe(originalConfig);
    expect(existsSync(descriptor.payloadPath)).toBe(false);
    expect(existsSync(descriptor.entryPath)).toBe(false);
    expect(existsSync(descriptor.rootPath)).toBe(false);
  });

  it("preserves unrelated Codex config content and appends a re-enabled MCP section at end of file", () => {
    const sandbox = createCodexSandbox();
    sandboxes.push(sandbox);

    const originalConfig = [
      "[plugins.safe-shell]",
      "enabled = true",
      "",
      "[mcp_servers.github]",
      'command = "npx"',
      'args = ["-y", "@modelcontextprotocol/server-github"]',
      "",
      "[profiles.example]",
      'banner = """',
      "[not-a-header]",
      "still text",
      '"""',
      "",
      "[mcp_servers.filesystem]",
      'command = "npx"',
      'args = ["-y", "@modelcontextprotocol/server-filesystem"]',
      "",
    ].join("\n");
    const expectedDisabledConfig = [
      "[plugins.safe-shell]",
      "enabled = true",
      "",
      "[profiles.example]",
      'banner = """',
      "[not-a-header]",
      "still text",
      '"""',
      "",
      "[mcp_servers.filesystem]",
      'command = "npx"',
      'args = ["-y", "@modelcontextprotocol/server-filesystem"]',
      "",
    ].join("\n");
    const expectedReenabledConfig = [
      "[plugins.safe-shell]",
      "enabled = true",
      "",
      "[profiles.example]",
      'banner = """',
      "[not-a-header]",
      "still text",
      '"""',
      "",
      "[mcp_servers.filesystem]",
      'command = "npx"',
      'args = ["-y", "@modelcontextprotocol/server-filesystem"]',
      "",
      "[mcp_servers.github]",
      'command = "npx"',
      'args = ["-y", "@modelcontextprotocol/server-github"]',
      "",
    ].join("\n");
    writeFileSync(sandbox.homePath(".codex/config.toml"), originalConfig, "utf8");

    const disabled = runToggle({
      ...sandboxOptions(sandbox),
      provider: "codex",
      kind: "mcp",
      layer: "global",
      id: "codex:global:configured-mcp:config:github",
      apply: true,
      now: () => new Date("2026-04-13T10:16:00.000Z"),
      generateBackupId: () => "backup-codex-mcp-disable-multi",
    });
    expect(disabled.exitCode).toBe(0);
    expect(sandbox.readHomeText(".codex/config.toml")).toBe(expectedDisabledConfig);

    const enabled = runToggle({
      ...sandboxOptions(sandbox),
      provider: "codex",
      kind: "mcp",
      layer: "global",
      id: "codex:global:configured-mcp:config:github",
      apply: true,
      now: () => new Date("2026-04-13T10:17:00.000Z"),
      generateBackupId: () => "backup-codex-mcp-enable-multi",
    });
    expect(enabled.exitCode).toBe(0);
    expect(sandbox.readHomeText(".codex/config.toml")).toBe(expectedReenabledConfig);
  });

  it("preserves array-of-tables blocks when disabling and re-enabling a Codex configured MCP", () => {
    const sandbox = createCodexSandbox();
    sandboxes.push(sandbox);

    const originalConfig = [
      "[mcp_servers.github]",
      'command = "npx"',
      'args = ["-y", "@modelcontextprotocol/server-github"]',
      "",
      "[[profiles.example]]",
      'label = "first"',
      "",
      "[mcp_servers.filesystem]",
      'command = "npx"',
      'args = ["-y", "@modelcontextprotocol/server-filesystem"]',
      "",
    ].join("\n");
    const expectedDisabledConfig = [
      "[[profiles.example]]",
      'label = "first"',
      "",
      "[mcp_servers.filesystem]",
      'command = "npx"',
      'args = ["-y", "@modelcontextprotocol/server-filesystem"]',
      "",
    ].join("\n");
    const expectedReenabledConfig = [
      "[[profiles.example]]",
      'label = "first"',
      "",
      "[mcp_servers.filesystem]",
      'command = "npx"',
      'args = ["-y", "@modelcontextprotocol/server-filesystem"]',
      "",
      "[mcp_servers.github]",
      'command = "npx"',
      'args = ["-y", "@modelcontextprotocol/server-github"]',
      "",
    ].join("\n");
    writeFileSync(sandbox.homePath(".codex/config.toml"), originalConfig, "utf8");

    const disabled = runToggle({
      ...sandboxOptions(sandbox),
      provider: "codex",
      kind: "mcp",
      layer: "global",
      id: "codex:global:configured-mcp:config:github",
      apply: true,
      now: () => new Date("2026-04-13T10:17:10.000Z"),
      generateBackupId: () => "backup-codex-mcp-disable-array-of-tables",
    });
    expect(disabled.exitCode).toBe(0);
    expect(sandbox.readHomeText(".codex/config.toml")).toBe(expectedDisabledConfig);

    const enabled = runToggle({
      ...sandboxOptions(sandbox),
      provider: "codex",
      kind: "mcp",
      layer: "global",
      id: "codex:global:configured-mcp:config:github",
      apply: true,
      now: () => new Date("2026-04-13T10:17:20.000Z"),
      generateBackupId: () => "backup-codex-mcp-enable-array-of-tables",
    });
    expect(enabled.exitCode).toBe(0);
    expect(sandbox.readHomeText(".codex/config.toml")).toBe(expectedReenabledConfig);
  });

  it("recreates Codex config.toml from the vaulted section when the live config is missing during re-enable", () => {
    const sandbox = createCodexSandbox();
    sandboxes.push(sandbox);

    const disabled = runToggle({
      ...sandboxOptions(sandbox),
      provider: "codex",
      kind: "mcp",
      layer: "global",
      id: "codex:global:configured-mcp:config:github",
      apply: true,
      now: () => new Date("2026-04-13T10:18:00.000Z"),
      generateBackupId: () => "backup-codex-mcp-disable-missing-config",
    });
    expect(disabled.exitCode).toBe(0);

    rmSync(sandbox.homePath(".codex/config.toml"), { force: true });

    const enabled = runToggle({
      ...sandboxOptions(sandbox),
      provider: "codex",
      kind: "mcp",
      layer: "global",
      id: "codex:global:configured-mcp:config:github",
      apply: true,
      now: () => new Date("2026-04-13T10:19:00.000Z"),
      generateBackupId: () => "backup-codex-mcp-enable-missing-config",
    });
    expect(enabled.exitCode).toBe(0);
    expect(sandbox.readHomeText(".codex/config.toml")).toContain("[mcp_servers.github]");
    expect(sandbox.readHomeText(".codex/config.toml")).toContain(
      "@modelcontextprotocol/server-github",
    );
  });

  it("reduces a Codex config to an empty document when the disabled MCP was the only section", () => {
    const sandbox = createCodexSandbox();
    sandboxes.push(sandbox);

    const originalConfig = [
      "[mcp_servers.github]",
      'command = "npx"',
      'args = ["-y", "@modelcontextprotocol/server-github"]',
      "",
    ].join("\n");
    writeFileSync(sandbox.homePath(".codex/config.toml"), originalConfig, "utf8");

    const disabled = runToggle({
      ...sandboxOptions(sandbox),
      provider: "codex",
      kind: "mcp",
      layer: "global",
      id: "codex:global:configured-mcp:config:github",
      apply: true,
      now: () => new Date("2026-04-13T10:19:10.000Z"),
      generateBackupId: () => "backup-codex-mcp-disable-only-section",
    });
    expect(disabled.exitCode).toBe(0);
    expect(sandbox.readHomeText(".codex/config.toml")).toBe("");

    const enabled = runToggle({
      ...sandboxOptions(sandbox),
      provider: "codex",
      kind: "mcp",
      layer: "global",
      id: "codex:global:configured-mcp:config:github",
      apply: true,
      now: () => new Date("2026-04-13T10:19:20.000Z"),
      generateBackupId: () => "backup-codex-mcp-enable-only-section",
    });
    expect(enabled.exitCode).toBe(0);
    expect(sandbox.readHomeText(".codex/config.toml")).toBe(originalConfig);
  });

  it("preserves CRLF line endings while disabling and re-enabling a Codex configured MCP", () => {
    const sandbox = createCodexSandbox();
    sandboxes.push(sandbox);

    const originalConfig = [
      "[plugins.safe-shell]",
      "enabled = true",
      "",
      "[mcp_servers.github]",
      'command = "npx"',
      'args = ["-y", "@modelcontextprotocol/server-github"]',
      "",
      "[mcp_servers.filesystem]",
      'command = "npx"',
      'args = ["-y", "@modelcontextprotocol/server-filesystem"]',
      "",
    ].join("\r\n");
    const expectedDisabledConfig = [
      "[plugins.safe-shell]",
      "enabled = true",
      "",
      "[mcp_servers.filesystem]",
      'command = "npx"',
      'args = ["-y", "@modelcontextprotocol/server-filesystem"]',
      "",
    ].join("\r\n");
    const expectedReenabledConfig = [
      "[plugins.safe-shell]",
      "enabled = true",
      "",
      "[mcp_servers.filesystem]",
      'command = "npx"',
      'args = ["-y", "@modelcontextprotocol/server-filesystem"]',
      "",
      "[mcp_servers.github]",
      'command = "npx"',
      'args = ["-y", "@modelcontextprotocol/server-github"]',
      "",
    ].join("\r\n");
    writeFileSync(sandbox.homePath(".codex/config.toml"), originalConfig, "utf8");

    const disabled = runToggle({
      ...sandboxOptions(sandbox),
      provider: "codex",
      kind: "mcp",
      layer: "global",
      id: "codex:global:configured-mcp:config:github",
      apply: true,
      now: () => new Date("2026-04-13T10:19:30.000Z"),
      generateBackupId: () => "backup-codex-mcp-disable-crlf",
    });
    expect(disabled.exitCode).toBe(0);
    expect(sandbox.readHomeText(".codex/config.toml")).toBe(expectedDisabledConfig);

    const enabled = runToggle({
      ...sandboxOptions(sandbox),
      provider: "codex",
      kind: "mcp",
      layer: "global",
      id: "codex:global:configured-mcp:config:github",
      apply: true,
      now: () => new Date("2026-04-13T10:19:45.000Z"),
      generateBackupId: () => "backup-codex-mcp-enable-crlf",
    });
    expect(enabled.exitCode).toBe(0);
    expect(sandbox.readHomeText(".codex/config.toml")).toBe(expectedReenabledConfig);
  });

  it("blocks Codex plugins as unsupported", () => {
    const sandbox = createCodexSandbox();
    sandboxes.push(sandbox);

    const blocked = runToggle({
      ...sandboxOptions(sandbox),
      provider: "codex",
      kind: "plugin",
      layer: "global",
      id: "codex:global:tool:plugin:safe-shell",
    });

    expect(blocked.exitCode).toBe(1);
    expect(blocked.output).toContain("unsupported:");
  });

  it("blocks live disabled Codex configured MCPs that were not disabled through the AgentScope vault", () => {
    const sandbox = createCodexSandbox();
    sandboxes.push(sandbox);

    writeFileSync(
      sandbox.homePath(".codex/config.toml"),
      [
        "[mcp_servers.github]",
        "enabled = false",
        'command = "npx"',
        'args = ["-y", "@modelcontextprotocol/server-github"]',
        "",
      ].join("\n"),
      "utf8",
    );

    const discovered = codexProvider.discover({
      config: sandbox.config,
      homeDir: sandbox.homeDir,
    });
    const disabledItem = discovered.items.find(
      (item) => item.id === "codex:global:configured-mcp:config:github",
    );
    expect(disabledItem).toBeDefined();
    if (disabledItem === undefined) {
      throw new Error("expected to discover the disabled Codex MCP item");
    }

    const blocked = codexProvider.planToggle?.({
      config: sandbox.config,
      homeDir: sandbox.homeDir,
      item: disabledItem,
      targetEnabled: true,
    });

    expect(blocked).toMatchObject({
      status: "blocked",
      reason: expect.stringContaining("unsupported-live-disabled-section"),
    });
  });

  it("blocks Codex skill enable when the vaulted payload is missing or the live path already exists", () => {
    const sandbox = createCodexSandbox();
    sandboxes.push(sandbox);

    runToggle({
      ...sandboxOptions(sandbox),
      provider: "codex",
      kind: "skill",
      layer: "project",
      id: "codex:project:skill:example-project-skill",
      apply: true,
      now: () => new Date("2026-04-13T10:20:00.000Z"),
      generateBackupId: () => "backup-codex-project-skill-disable-blocked",
    });

    const descriptor = vaultDescriptor({
      appStateRoot: sandbox.appStateRoot,
      provider: "codex",
      layer: "project",
      kind: "skill",
      itemId: "codex:project:skill:example-project-skill",
    });
    rmSync(descriptor.vaultedPath, { recursive: true, force: true });

    const missingPayload = codexProvider.planToggle?.({
      config: sandbox.config,
      homeDir: sandbox.homeDir,
      item: {
        provider: "codex",
        kind: "skill",
        category: "skill",
        layer: "project",
        id: "codex:project:skill:example-project-skill",
        displayName: "example-project-skill",
        enabled: false,
        mutability: "read-write",
        sourcePath: sandbox.projectPath(".codex/skills/example-project-skill/SKILL.md"),
        statePath: descriptor.entryPath,
      },
      targetEnabled: true,
    });
    expect(missingPayload).toMatchObject({
      status: "blocked",
      reason: expect.stringContaining("missing-vault-payload"),
    });

    mkdirSync(descriptor.vaultedPath, { recursive: true });
    mkdirSync(sandbox.projectPath(".codex/skills/example-project-skill"), { recursive: true });
    writeFileSync(
      sandbox.projectPath(".codex/skills/example-project-skill/SKILL.md"),
      "# Example Project Skill\n",
      "utf8",
    );
    writeFileSync(`${descriptor.vaultedPath}/SKILL.md`, "# Example Project Skill\n", "utf8");

    const liveConflict = codexProvider.planToggle?.({
      config: sandbox.config,
      homeDir: sandbox.homeDir,
      item: {
        provider: "codex",
        kind: "skill",
        category: "skill",
        layer: "project",
        id: "codex:project:skill:example-project-skill",
        displayName: "example-project-skill",
        enabled: false,
        mutability: "read-write",
        sourcePath: sandbox.projectPath(".codex/skills/example-project-skill/SKILL.md"),
        statePath: descriptor.entryPath,
      },
      targetEnabled: true,
    });
    expect(liveConflict).toMatchObject({
      status: "blocked",
      reason: expect.stringContaining("live-path-conflict"),
    });
  });

  it("blocks Codex configured MCP enable when the vaulted payload is invalid or the live section already exists", () => {
    const sandbox = createCodexSandbox();
    sandboxes.push(sandbox);

    runToggle({
      ...sandboxOptions(sandbox),
      provider: "codex",
      kind: "mcp",
      layer: "global",
      id: "codex:global:configured-mcp:config:github",
      apply: true,
      now: () => new Date("2026-04-13T10:25:00.000Z"),
      generateBackupId: () => "backup-codex-mcp-disable-blocked",
    });

    const descriptor = vaultDescriptor({
      appStateRoot: sandbox.appStateRoot,
      provider: "codex",
      layer: "global",
      kind: "configured-mcp",
      itemId: "codex:global:configured-mcp:config:github",
    });
    const disabledItem = {
      provider: "codex" as const,
      kind: "mcp" as const,
      category: "configured-mcp" as const,
      layer: "global" as const,
      id: "codex:global:configured-mcp:config:github",
      displayName: "github",
      enabled: false,
      mutability: "read-write" as const,
      sourcePath: sandbox.homePath(".codex/config.toml"),
      statePath: descriptor.entryPath,
    };

    writeFileSync(descriptor.payloadPath, "[plugins.github]\nenabled = true\n", "utf8");
    const invalidPayload = codexProvider.planToggle?.({
      config: sandbox.config,
      homeDir: sandbox.homeDir,
      item: disabledItem,
      targetEnabled: true,
    });
    expect(invalidPayload).toMatchObject({
      status: "blocked",
      reason: expect.stringContaining("invalid-vault-payload"),
    });

    writeFileSync(
      descriptor.payloadPath,
      [
        "[mcp_servers.github]",
        'command = "npx"',
        'args = ["-y", "@modelcontextprotocol/server-github"]',
      ].join("\n"),
      "utf8",
    );
    writeFileSync(
      sandbox.homePath(".codex/config.toml"),
      ["[mcp_servers.github]", 'command = "npx"'].join("\n"),
      "utf8",
    );
    const liveConflict = codexProvider.planToggle?.({
      config: sandbox.config,
      homeDir: sandbox.homeDir,
      item: disabledItem,
      targetEnabled: true,
    });
    expect(liveConflict).toMatchObject({
      status: "blocked",
      reason: expect.stringContaining("live-section-conflict"),
    });
  });

  it("blocks Codex configured MCP planning when the selector is malformed or the live config is missing", () => {
    const sandbox = createCodexSandbox();
    sandboxes.push(sandbox);

    const malformedSelector = codexProvider.planToggle?.({
      config: sandbox.config,
      homeDir: sandbox.homeDir,
      item: {
        provider: "codex",
        kind: "mcp",
        category: "configured-mcp",
        layer: "global",
        id: "codex:global:configured-mcp:bad",
        displayName: "bad",
        enabled: true,
        mutability: "read-write",
        sourcePath: sandbox.homePath(".codex/config.toml"),
        statePath: sandbox.homePath(".codex/config.toml"),
      },
      targetEnabled: false,
    });
    expect(malformedSelector).toMatchObject({
      status: "blocked",
      reason: expect.stringContaining("not a Codex configured MCP"),
    });

    const missingConfig = codexProvider.planToggle?.({
      config: sandbox.config,
      homeDir: sandbox.homeDir,
      item: {
        provider: "codex",
        kind: "mcp",
        category: "configured-mcp",
        layer: "global",
        id: "codex:global:configured-mcp:config:github",
        displayName: "github",
        enabled: true,
        mutability: "read-write",
        sourcePath: sandbox.homePath(".codex/missing-config.toml"),
        statePath: sandbox.homePath(".codex/missing-config.toml"),
      },
      targetEnabled: false,
    });
    expect(missingConfig).toMatchObject({
      status: "blocked",
      reason: expect.stringContaining("missing-live-config"),
    });
  });

  it("blocks stale Codex configured MCP disable when vault state already exists", () => {
    const sandbox = createCodexSandbox();
    sandboxes.push(sandbox);

    runToggle({
      ...sandboxOptions(sandbox),
      provider: "codex",
      kind: "mcp",
      layer: "global",
      id: "codex:global:configured-mcp:config:github",
      apply: true,
      now: () => new Date("2026-04-13T10:30:00.000Z"),
      generateBackupId: () => "backup-codex-mcp-disable-stale",
    });

    const staleDisable = codexProvider.planToggle?.({
      config: sandbox.config,
      homeDir: sandbox.homeDir,
      item: {
        provider: "codex",
        kind: "mcp",
        category: "configured-mcp",
        layer: "global",
        id: "codex:global:configured-mcp:config:github",
        displayName: "github",
        enabled: true,
        mutability: "read-write",
        sourcePath: sandbox.homePath(".codex/config.toml"),
        statePath: sandbox.homePath(".codex/config.toml"),
      },
      targetEnabled: false,
    });

    expect(staleDisable).toMatchObject({
      status: "blocked",
      reason: expect.stringContaining("vault-conflict"),
    });
  });
});
