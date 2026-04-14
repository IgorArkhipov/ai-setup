import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it } from "vitest";
import { runToggle } from "../src/commands/toggle.js";
import { vaultDescriptor } from "../src/core/mutation-vault.js";
import { cursorProvider } from "../src/providers/cursor.js";
import { createCursorSandbox } from "./support/cursor-sandbox.js";

const sandboxes: Array<ReturnType<typeof createCursorSandbox>> = [];

function sandboxOptions(sandbox: ReturnType<typeof createCursorSandbox>) {
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

describe("cursor provider", () => {
  it("discovers live Cursor items with writable skills and configured MCPs", () => {
    const sandbox = createCursorSandbox();
    sandboxes.push(sandbox);

    const result = cursorProvider.discover({
      config: sandbox.config,
      homeDir: sandbox.homeDir,
    });

    expect(result.warnings).toEqual([]);
    expect(result.items).toContainEqual(
      expect.objectContaining({
        id: "cursor:global:skill:example-cursor-skill",
        enabled: true,
        mutability: "read-write",
        sourcePath: sandbox.homePath(".cursor/skills-cursor/example-cursor-skill/SKILL.md"),
        statePath: sandbox.homePath(".cursor/skills-cursor/example-cursor-skill"),
      }),
    );
    expect(result.items).toContainEqual(
      expect.objectContaining({
        id: "cursor:global:configured-mcp:mcp-json:filesystem",
        enabled: true,
        mutability: "read-write",
        sourcePath: sandbox.homePath(".cursor/mcp.json"),
        statePath: sandbox.cursorPath("workspaceStorage/sandbox-workspace/state.vscdb"),
      }),
    );
    expect(result.items).toContainEqual(
      expect.objectContaining({
        id: "cursor:global:tool:extension:cursor.example-extension",
        enabled: true,
        mutability: "unsupported",
      }),
    );
  });

  it("disables a Cursor skill into the vault and re-discovers it as disabled", () => {
    const sandbox = createCursorSandbox();
    sandboxes.push(sandbox);
    const descriptor = vaultDescriptor({
      appStateRoot: sandbox.appStateRoot,
      provider: "cursor",
      layer: "global",
      kind: "skill",
      itemId: "cursor:global:skill:example-cursor-skill",
    });

    const applied = runToggle({
      ...sandboxOptions(sandbox),
      provider: "cursor",
      kind: "skill",
      layer: "global",
      id: "cursor:global:skill:example-cursor-skill",
      apply: true,
      now: () => new Date("2026-04-13T18:00:00.000Z"),
      generateBackupId: () => "backup-cursor-skill-disable",
    });
    expect(applied.exitCode).toBe(0);
    expect(existsSync(sandbox.homePath(".cursor/skills-cursor/example-cursor-skill"))).toBe(false);
    expect(existsSync(descriptor.vaultedPath)).toBe(true);
    expect(existsSync(descriptor.entryPath)).toBe(true);

    const rediscovered = cursorProvider.discover({
      config: sandbox.config,
      homeDir: sandbox.homeDir,
    });
    expect(rediscovered.items).toContainEqual(
      expect.objectContaining({
        id: "cursor:global:skill:example-cursor-skill",
        enabled: false,
        mutability: "read-write",
        statePath: descriptor.entryPath,
      }),
    );
  });

  it("re-enables a vaulted Cursor skill through toggle apply", () => {
    const sandbox = createCursorSandbox();
    sandboxes.push(sandbox);

    const disabled = runToggle({
      ...sandboxOptions(sandbox),
      provider: "cursor",
      kind: "skill",
      layer: "global",
      id: "cursor:global:skill:example-cursor-skill",
      apply: true,
      now: () => new Date("2026-04-13T18:02:00.000Z"),
      generateBackupId: () => "backup-cursor-skill-disable",
    });
    expect(disabled.exitCode).toBe(0);

    const enabled = runToggle({
      ...sandboxOptions(sandbox),
      provider: "cursor",
      kind: "skill",
      layer: "global",
      id: "cursor:global:skill:example-cursor-skill",
      apply: true,
      now: () => new Date("2026-04-13T18:03:00.000Z"),
      generateBackupId: () => "backup-cursor-skill-enable",
    });
    expect(enabled.exitCode).toBe(0);
    expect(existsSync(sandbox.homePath(".cursor/skills-cursor/example-cursor-skill"))).toBe(true);
  });

  it("disables and re-enables a Cursor configured MCP through the vault", () => {
    const sandbox = createCursorSandbox();
    sandboxes.push(sandbox);
    const originalConfig = sandbox.readHomeText(".cursor/mcp.json");
    const descriptor = vaultDescriptor({
      appStateRoot: sandbox.appStateRoot,
      provider: "cursor",
      layer: "global",
      kind: "configured-mcp",
      itemId: "cursor:global:configured-mcp:mcp-json:filesystem",
    });

    const disabled = runToggle({
      ...sandboxOptions(sandbox),
      provider: "cursor",
      kind: "mcp",
      layer: "global",
      id: "cursor:global:configured-mcp:mcp-json:filesystem",
      apply: true,
      now: () => new Date("2026-04-13T18:05:00.000Z"),
      generateBackupId: () => "backup-cursor-mcp-disable",
    });
    expect(disabled.exitCode).toBe(0);
    expect(sandbox.readHomeText(".cursor/mcp.json")).not.toContain('"filesystem"');
    expect(existsSync(descriptor.payloadPath)).toBe(true);
    expect(existsSync(descriptor.entryPath)).toBe(true);

    const rediscovered = cursorProvider.discover({
      config: sandbox.config,
      homeDir: sandbox.homeDir,
    });
    expect(rediscovered.items).toContainEqual(
      expect.objectContaining({
        id: "cursor:global:configured-mcp:mcp-json:filesystem",
        enabled: false,
        mutability: "read-write",
        statePath: descriptor.entryPath,
      }),
    );

    const enabled = runToggle({
      ...sandboxOptions(sandbox),
      provider: "cursor",
      kind: "mcp",
      layer: "global",
      id: "cursor:global:configured-mcp:mcp-json:filesystem",
      apply: true,
      now: () => new Date("2026-04-13T18:10:00.000Z"),
      generateBackupId: () => "backup-cursor-mcp-enable",
    });
    expect(enabled.exitCode).toBe(0);
    expect(sandbox.readHomeText(".cursor/mcp.json")).toBe(originalConfig);
    expect(existsSync(descriptor.payloadPath)).toBe(false);
    expect(existsSync(descriptor.entryPath)).toBe(false);
    expect(existsSync(descriptor.rootPath)).toBe(false);
  });

  it("re-enables a live disabled Cursor configured MCP and clears workspace disabled state", () => {
    const sandbox = createCursorSandbox();
    sandboxes.push(sandbox);

    writeFileSync(
      sandbox.homePath(".cursor/mcp.json"),
      JSON.stringify(
        {
          mcpServers: {
            filesystem: {
              command: "npx",
              disabled: true,
            },
          },
        },
        null,
        2,
      ),
      "utf8",
    );
    sandbox.setWorkspaceDisabledServers(["user-filesystem"]);

    const applied = runToggle({
      ...sandboxOptions(sandbox),
      provider: "cursor",
      kind: "mcp",
      layer: "global",
      id: "cursor:global:configured-mcp:mcp-json:filesystem",
      apply: true,
      now: () => new Date("2026-04-13T18:15:00.000Z"),
      generateBackupId: () => "backup-cursor-live-disabled-mcp-enable",
    });
    expect(applied.exitCode).toBe(0);
    expect(sandbox.readHomeJson<Record<string, unknown>>(".cursor/mcp.json")).toEqual({
      mcpServers: {
        filesystem: {
          command: "npx",
        },
      },
    });
    expect(sandbox.readWorkspaceDisabledServers()).toEqual([]);
  });

  it("blocks configured-MCP planning when Cursor workspace state is malformed", () => {
    const sandbox = createCursorSandbox();
    sandboxes.push(sandbox);

    const databasePath = sandbox.cursorPath("workspaceStorage/sandbox-workspace/state.vscdb");
    const database = new DatabaseSync(databasePath);
    try {
      database
        .prepare("UPDATE ItemTable SET value = ? WHERE key = ?")
        .run('{"broken":true}', "cursor/disabledMcpServers");
    } finally {
      database.close();
    }

    const result = runToggle({
      ...sandboxOptions(sandbox),
      provider: "cursor",
      kind: "mcp",
      layer: "global",
      id: "cursor:global:configured-mcp:mcp-json:filesystem",
    });
    expect(result.exitCode).toBe(1);
    expect(result.output).toContain("invalid Cursor workspace state");
  });

  it("blocks enabling a Cursor configured MCP when neither vault nor live disabled state exists", () => {
    const sandbox = createCursorSandbox({ withWorkspaceState: false });
    sandboxes.push(sandbox);

    const decision = cursorProvider.planToggle?.({
      config: sandbox.config,
      homeDir: sandbox.homeDir,
      item: {
        provider: "cursor",
        kind: "mcp",
        category: "configured-mcp",
        layer: "global",
        id: "cursor:global:configured-mcp:mcp-json:filesystem",
        displayName: "filesystem",
        enabled: false,
        mutability: "read-write",
        sourcePath: sandbox.homePath(".cursor/mcp.json"),
        statePath: sandbox.homePath(".cursor/mcp.json"),
      },
      targetEnabled: true,
    });

    expect(decision).toMatchObject({
      status: "blocked",
      reason: expect.stringContaining("unsupported-live-disabled-entry"),
    });
  });

  it("blocks enabling a Cursor configured MCP when the vault manifest is missing", () => {
    const sandbox = createCursorSandbox({ withWorkspaceState: false });
    sandboxes.push(sandbox);

    writeFileSync(
      sandbox.homePath(".cursor/mcp.json"),
      JSON.stringify(
        {
          mcpServers: {},
        },
        null,
        2,
      ),
      "utf8",
    );

    const decision = cursorProvider.planToggle?.({
      config: sandbox.config,
      homeDir: sandbox.homeDir,
      item: {
        provider: "cursor",
        kind: "mcp",
        category: "configured-mcp",
        layer: "global",
        id: "cursor:global:configured-mcp:mcp-json:filesystem",
        displayName: "filesystem",
        enabled: false,
        mutability: "read-write",
        sourcePath: sandbox.homePath(".cursor/mcp.json"),
        statePath: sandbox.homePath(".missing-entry.json"),
      },
      targetEnabled: true,
    });

    expect(decision).toMatchObject({
      status: "blocked",
      reason: expect.stringContaining("missing-vault-manifest"),
    });
  });

  it("blocks enabling a Cursor configured MCP when the vaulted payload is missing", () => {
    const sandbox = createCursorSandbox({ withWorkspaceState: false });
    sandboxes.push(sandbox);
    const descriptor = vaultDescriptor({
      appStateRoot: sandbox.appStateRoot,
      provider: "cursor",
      layer: "global",
      kind: "configured-mcp",
      itemId: "cursor:global:configured-mcp:mcp-json:filesystem",
    });

    writeFileSync(
      sandbox.homePath(".cursor/mcp.json"),
      JSON.stringify(
        {
          mcpServers: {},
        },
        null,
        2,
      ),
      "utf8",
    );
    mkdirSync(descriptor.rootPath, { recursive: true });
    writeFileSync(
      descriptor.entryPath,
      Buffer.from(
        `${JSON.stringify(
          {
            version: 1,
            provider: "cursor",
            kind: "configured-mcp",
            layer: "global",
            itemId: "cursor:global:configured-mcp:mcp-json:filesystem",
            displayName: "filesystem",
            originalPath: sandbox.homePath(".cursor/mcp.json"),
            vaultedPath: descriptor.payloadPath,
            payloadKind: "json-payload",
          },
          null,
          2,
        )}\n`,
      ),
    );

    const decision = cursorProvider.planToggle?.({
      config: sandbox.config,
      homeDir: sandbox.homeDir,
      item: {
        provider: "cursor",
        kind: "mcp",
        category: "configured-mcp",
        layer: "global",
        id: "cursor:global:configured-mcp:mcp-json:filesystem",
        displayName: "filesystem",
        enabled: false,
        mutability: "read-write",
        sourcePath: sandbox.homePath(".cursor/mcp.json"),
        statePath: descriptor.entryPath,
      },
      targetEnabled: true,
    });

    expect(decision).toMatchObject({
      status: "blocked",
      reason: expect.stringContaining("missing-vault-payload"),
    });
  });
});
