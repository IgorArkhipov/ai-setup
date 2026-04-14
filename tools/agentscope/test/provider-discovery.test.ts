import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { pathToFileURL } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import type { AgentScopeConfig } from "../src/core/config.js";
import { serializeVaultEntry, vaultDescriptor } from "../src/core/mutation-vault.js";
import { claudeProvider } from "../src/providers/claude.js";
import { codexProvider } from "../src/providers/codex.js";
import { cursorProvider } from "../src/providers/cursor.js";

const tempRoots: string[] = [];
const fixturesRoot = path.resolve(import.meta.dirname, "fixtures");

function createSandbox(): {
  homeDir: string;
  projectRoot: string;
  cursorRoot: string;
  config: AgentScopeConfig;
} {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), "agentscope-provider-"));
  tempRoots.push(tempRoot);

  const homeDir = path.join(tempRoot, "home");
  const projectRoot = path.join(tempRoot, "project");
  const cursorRoot = path.join(tempRoot, "cursor", "User");

  mkdirSync(homeDir, { recursive: true });
  mkdirSync(projectRoot, { recursive: true });
  mkdirSync(cursorRoot, { recursive: true });

  return {
    homeDir,
    projectRoot,
    cursorRoot,
    config: {
      version: 1,
      projectRoot,
      appStateRoot: path.join(tempRoot, "app-state"),
      cursorRoot,
      configPaths: {
        userConfigPath: path.join(homeDir, ".config", "agentscope", "config.json"),
        projectConfigPath: path.join(projectRoot, ".agentscope.json"),
      },
    },
  };
}

function copyFixture(relativePath: string, targetPath: string): void {
  mkdirSync(path.dirname(targetPath), { recursive: true });
  cpSync(path.join(fixturesRoot, relativePath), targetPath, { recursive: true });
}

function writeCursorWorkspaceState(
  sandbox: ReturnType<typeof createSandbox>,
  rawValue: string,
): string {
  const workspaceRoot = path.join(sandbox.cursorRoot, "workspaceStorage", "sandbox-workspace");
  const databasePath = path.join(workspaceRoot, "state.vscdb");

  mkdirSync(workspaceRoot, { recursive: true });
  writeFileSync(
    path.join(workspaceRoot, "workspace.json"),
    JSON.stringify(
      {
        folder: pathToFileURL(sandbox.projectRoot).toString(),
      },
      null,
      2,
    ),
    "utf8",
  );

  const database = new DatabaseSync(databasePath);
  try {
    database.exec(
      "CREATE TABLE IF NOT EXISTS ItemTable (key TEXT PRIMARY KEY, value BLOB NOT NULL)",
    );
    database
      .prepare(
        "INSERT INTO ItemTable (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      )
      .run("cursor/disabledMcpServers", rawValue);
  } finally {
    database.close();
  }

  return databasePath;
}

afterEach(() => {
  while (tempRoots.length > 0) {
    const target = tempRoots.pop();
    if (target !== undefined) {
      rmSync(target, { recursive: true, force: true });
    }
  }
});

describe("provider discovery", () => {
  it("discovers Claude settings, skills, configured MCPs, and tools", () => {
    const sandbox = createSandbox();

    copyFixture(
      "claude/global/settings.json",
      path.join(sandbox.homeDir, ".claude", "settings.json"),
    );
    copyFixture(
      "claude/global/settings.local.json",
      path.join(sandbox.homeDir, ".claude", "settings.local.json"),
    );
    copyFixture(
      "claude/project/.claude/settings.json",
      path.join(sandbox.projectRoot, ".claude", "settings.json"),
    );
    copyFixture(
      "claude/project/.claude/settings.local.json",
      path.join(sandbox.projectRoot, ".claude", "settings.local.json"),
    );
    copyFixture(
      "claude/project/.claude/skills/example-claude-skill",
      path.join(sandbox.projectRoot, ".claude", "skills", "example-claude-skill"),
    );
    copyFixture("claude/project/.mcp.json", path.join(sandbox.projectRoot, ".mcp.json"));

    mkdirSync(path.join(sandbox.homeDir, ".agents", "skills", "ignored-skill"), {
      recursive: true,
    });
    writeFileSync(
      path.join(sandbox.homeDir, ".agents", "skills", "ignored-skill", "SKILL.md"),
      "# Ignored Skill\n",
      { encoding: "utf8", flag: "w" },
    );
    mkdirSync(path.join(sandbox.homeDir, ".claude", "plugins"), {
      recursive: true,
    });
    writeFileSync(path.join(sandbox.homeDir, ".claude", "plugins", "ignored.txt"), "ignored", {
      encoding: "utf8",
      flag: "w",
    });

    const result = claudeProvider.discover({
      config: sandbox.config,
      homeDir: sandbox.homeDir,
    });

    expect(result.warnings).toEqual([]);
    expect(result.items.map((item) => item.id)).toEqual([
      "claude:global:tool:settings:safe-shell",
      "claude:global:tool:settings:demo-formatter",
      "claude:global:tool:settings-local:project-auditor",
      "claude:project:skill:example-claude-skill",
      "claude:project:configured-mcp:github",
      "claude:project:configured-mcp:all-project-mcp-servers",
      "claude:project:tool:settings:github",
      "claude:project:tool:settings-local:local-shell",
    ]);
    expect(result.items).toContainEqual(
      expect.objectContaining({
        id: "claude:project:skill:example-claude-skill",
        enabled: true,
        mutability: "read-write",
        sourcePath: path.join(
          sandbox.projectRoot,
          ".claude",
          "skills",
          "example-claude-skill",
          "SKILL.md",
        ),
        statePath: path.join(sandbox.projectRoot, ".claude", "skills", "example-claude-skill"),
      }),
    );
    expect(result.items).toContainEqual(
      expect.objectContaining({
        id: "claude:project:configured-mcp:github",
        enabled: true,
        mutability: "read-write",
        sourcePath: path.join(sandbox.projectRoot, ".mcp.json"),
        statePath: path.join(sandbox.projectRoot, ".claude", "settings.local.json"),
      }),
    );
  });

  it("turns malformed Claude files into warnings", () => {
    const sandbox = createSandbox();

    mkdirSync(path.join(sandbox.homeDir, ".claude"), { recursive: true });
    writeFileSync(path.join(sandbox.homeDir, ".claude", "settings.json"), "{ invalid json", {
      encoding: "utf8",
      flag: "w",
    });
    mkdirSync(path.join(sandbox.projectRoot, ".claude", "settings.local.json"), {
      recursive: true,
    });

    const result = claudeProvider.discover({
      config: sandbox.config,
      homeDir: sandbox.homeDir,
    });

    expect(result.items).toEqual([]);
    expect(result.warnings.map((warning) => warning.code)).toEqual([
      "json-parse-error",
      "file-unreadable",
    ]);
  });

  it("discovers Codex skills, configured MCPs, and plugins", () => {
    const sandbox = createSandbox();

    copyFixture("codex/global/config.toml", path.join(sandbox.homeDir, ".codex", "config.toml"));
    copyFixture("codex/global/skills", path.join(sandbox.homeDir, ".codex", "skills"));
    copyFixture("codex/project/.codex/skills", path.join(sandbox.projectRoot, ".codex", "skills"));

    const result = codexProvider.discover({
      config: sandbox.config,
      homeDir: sandbox.homeDir,
    });

    expect(result.warnings).toEqual([]);
    expect(result.items.map((item) => `${item.id}:${item.mutability}`)).toEqual([
      "codex:global:skill:example-skill:read-write",
      "codex:project:skill:example-project-skill:read-write",
      "codex:global:configured-mcp:config:github:read-write",
      "codex:global:tool:plugin:safe-shell:unsupported",
    ]);
  });

  it("discovers disabled Codex skills and configured MCPs from vault state", () => {
    const sandbox = createSandbox();

    copyFixture("codex/global/config.toml", path.join(sandbox.homeDir, ".codex", "config.toml"));
    copyFixture("codex/project/.codex/skills", path.join(sandbox.projectRoot, ".codex", "skills"));

    const skillDescriptor = vaultDescriptor({
      appStateRoot: sandbox.config.appStateRoot,
      provider: "codex",
      layer: "global",
      kind: "skill",
      itemId: "codex:global:skill:example-skill",
    });
    mkdirSync(skillDescriptor.rootPath, { recursive: true });
    copyFixture("codex/global/skills/.system/example-skill", skillDescriptor.vaultedPath);
    writeFileSync(
      skillDescriptor.entryPath,
      serializeVaultEntry({
        version: 1,
        provider: "codex",
        kind: "skill",
        layer: "global",
        itemId: "codex:global:skill:example-skill",
        displayName: "example-skill",
        originalPath: path.join(sandbox.homeDir, ".codex", "skills", ".system", "example-skill"),
        vaultedPath: skillDescriptor.vaultedPath,
        payloadKind: "path",
      }),
    );

    const mcpDescriptor = vaultDescriptor({
      appStateRoot: sandbox.config.appStateRoot,
      provider: "codex",
      layer: "global",
      kind: "configured-mcp",
      itemId: "codex:global:configured-mcp:config:disabled-github",
    });
    mkdirSync(mcpDescriptor.rootPath, { recursive: true });
    writeFileSync(
      mcpDescriptor.payloadPath,
      ["[mcp_servers.disabled-github]", 'command = "npx"'].join("\n"),
      "utf8",
    );
    writeFileSync(
      mcpDescriptor.entryPath,
      serializeVaultEntry({
        version: 1,
        provider: "codex",
        kind: "configured-mcp",
        layer: "global",
        itemId: "codex:global:configured-mcp:config:disabled-github",
        displayName: "disabled-github",
        originalPath: path.join(sandbox.homeDir, ".codex", "config.toml"),
        vaultedPath: mcpDescriptor.payloadPath,
        payloadKind: "text-payload",
      }),
    );

    const result = codexProvider.discover({
      config: sandbox.config,
      homeDir: sandbox.homeDir,
    });

    expect(result.warnings).toEqual([]);
    expect(result.items).toContainEqual(
      expect.objectContaining({
        id: "codex:global:skill:example-skill",
        enabled: false,
        mutability: "read-write",
        statePath: skillDescriptor.entryPath,
      }),
    );
    expect(result.items).toContainEqual(
      expect.objectContaining({
        id: "codex:global:configured-mcp:config:disabled-github",
        enabled: false,
        mutability: "read-write",
        statePath: mcpDescriptor.entryPath,
      }),
    );
  });

  it("turns malformed Codex config into warnings", () => {
    const sandbox = createSandbox();

    mkdirSync(path.join(sandbox.homeDir, ".codex"), { recursive: true });
    writeFileSync(
      path.join(sandbox.homeDir, ".codex", "config.toml"),
      "[plugins]\nenabled = true\n",
      { encoding: "utf8", flag: "w" },
    );

    const result = codexProvider.discover({
      config: sandbox.config,
      homeDir: sandbox.homeDir,
    });

    expect(result.items).toEqual([]);
    expect(result.warnings).toEqual([
      {
        provider: "codex",
        layer: "global",
        code: "toml-parse-error",
        message: expect.stringContaining("config.toml could not be parsed"),
      },
    ]);
  });

  it("keeps Codex config items when the skills root cannot be scanned", () => {
    const sandbox = createSandbox();

    mkdirSync(path.join(sandbox.homeDir, ".codex"), { recursive: true });
    writeFileSync(
      path.join(sandbox.homeDir, ".codex", "config.toml"),
      [
        "[mcp_servers.github]",
        'display_name = "GitHub"',
        "",
        "[plugins.safe-shell]",
        'display_name = "Safe Shell"',
        "",
      ].join("\n"),
      { encoding: "utf8", flag: "w" },
    );
    writeFileSync(path.join(sandbox.homeDir, ".codex", "skills"), "not a directory", {
      encoding: "utf8",
      flag: "w",
    });

    const result = codexProvider.discover({
      config: sandbox.config,
      homeDir: sandbox.homeDir,
    });

    expect(result.items.map((item) => item.id)).toEqual([
      "codex:global:configured-mcp:config:github",
      "codex:global:tool:plugin:safe-shell",
    ]);
    expect(result.warnings).toEqual([
      {
        provider: "codex",
        layer: "global",
        code: "file-unreadable",
        message: expect.stringContaining(path.join(sandbox.homeDir, ".codex", "skills")),
      },
    ]);
  });

  it("warns when Codex live and vaulted entries conflict", () => {
    const sandbox = createSandbox();

    copyFixture("codex/global/config.toml", path.join(sandbox.homeDir, ".codex", "config.toml"));
    copyFixture("codex/global/skills", path.join(sandbox.homeDir, ".codex", "skills"));

    const skillDescriptor = vaultDescriptor({
      appStateRoot: sandbox.config.appStateRoot,
      provider: "codex",
      layer: "global",
      kind: "skill",
      itemId: "codex:global:skill:example-skill",
    });
    mkdirSync(skillDescriptor.rootPath, { recursive: true });
    copyFixture("codex/global/skills/.system/example-skill", skillDescriptor.vaultedPath);
    writeFileSync(
      skillDescriptor.entryPath,
      serializeVaultEntry({
        version: 1,
        provider: "codex",
        kind: "skill",
        layer: "global",
        itemId: "codex:global:skill:example-skill",
        displayName: "example-skill",
        originalPath: path.join(sandbox.homeDir, ".codex", "skills", ".system", "example-skill"),
        vaultedPath: skillDescriptor.vaultedPath,
        payloadKind: "path",
      }),
    );

    const result = codexProvider.discover({
      config: sandbox.config,
      homeDir: sandbox.homeDir,
    });

    expect(
      result.items.filter((item) => item.id === "codex:global:skill:example-skill"),
    ).toHaveLength(1);
    expect(result.warnings).toContainEqual({
      provider: "codex",
      layer: "global",
      code: "conflicting-state",
      message: expect.stringContaining("live and vaulted copies both exist"),
    });
  });

  it("warns when a vaulted Codex skill is missing its payload directory", () => {
    const sandbox = createSandbox();

    const skillDescriptor = vaultDescriptor({
      appStateRoot: sandbox.config.appStateRoot,
      provider: "codex",
      layer: "global",
      kind: "skill",
      itemId: "codex:global:skill:example-skill",
    });
    mkdirSync(skillDescriptor.rootPath, { recursive: true });
    writeFileSync(
      skillDescriptor.entryPath,
      serializeVaultEntry({
        version: 1,
        provider: "codex",
        kind: "skill",
        layer: "global",
        itemId: "codex:global:skill:example-skill",
        displayName: "example-skill",
        originalPath: path.join(sandbox.homeDir, ".codex", "skills", ".system", "example-skill"),
        vaultedPath: skillDescriptor.vaultedPath,
        payloadKind: "path",
      }),
    );

    const result = codexProvider.discover({
      config: sandbox.config,
      homeDir: sandbox.homeDir,
    });

    expect(result.items.map((item) => item.id)).not.toContain("codex:global:skill:example-skill");
    expect(result.warnings).toContainEqual({
      provider: "codex",
      layer: "global",
      code: "missing-vault-payload",
      message: expect.stringContaining(skillDescriptor.vaultedPath),
    });
  });

  it("warns when vaulted Codex configured MCP entries use an invalid payload kind or payload shape", () => {
    const sandbox = createSandbox();

    const wrongKindDescriptor = vaultDescriptor({
      appStateRoot: sandbox.config.appStateRoot,
      provider: "codex",
      layer: "global",
      kind: "configured-mcp",
      itemId: "codex:global:configured-mcp:config:wrong-kind",
    });
    mkdirSync(wrongKindDescriptor.rootPath, { recursive: true });
    writeFileSync(
      wrongKindDescriptor.entryPath,
      serializeVaultEntry({
        version: 1,
        provider: "codex",
        kind: "configured-mcp",
        layer: "global",
        itemId: "codex:global:configured-mcp:config:wrong-kind",
        displayName: "wrong-kind",
        originalPath: path.join(sandbox.homeDir, ".codex", "config.toml"),
        vaultedPath: wrongKindDescriptor.payloadPath,
        payloadKind: "json-payload",
      }),
    );

    const invalidPayloadDescriptor = vaultDescriptor({
      appStateRoot: sandbox.config.appStateRoot,
      provider: "codex",
      layer: "global",
      kind: "configured-mcp",
      itemId: "codex:global:configured-mcp:config:invalid-payload",
    });
    mkdirSync(invalidPayloadDescriptor.rootPath, { recursive: true });
    writeFileSync(
      invalidPayloadDescriptor.payloadPath,
      "[plugins.invalid-payload]\nenabled = true\n",
      "utf8",
    );
    writeFileSync(
      invalidPayloadDescriptor.entryPath,
      serializeVaultEntry({
        version: 1,
        provider: "codex",
        kind: "configured-mcp",
        layer: "global",
        itemId: "codex:global:configured-mcp:config:invalid-payload",
        displayName: "invalid-payload",
        originalPath: path.join(sandbox.homeDir, ".codex", "config.toml"),
        vaultedPath: invalidPayloadDescriptor.payloadPath,
        payloadKind: "text-payload",
      }),
    );

    const result = codexProvider.discover({
      config: sandbox.config,
      homeDir: sandbox.homeDir,
    });

    expect(result.items.map((item) => item.id)).not.toContain(
      "codex:global:configured-mcp:config:wrong-kind",
    );
    expect(result.items.map((item) => item.id)).not.toContain(
      "codex:global:configured-mcp:config:invalid-payload",
    );
    expect(result.warnings).toContainEqual({
      provider: "codex",
      layer: "global",
      code: "invalid-shape",
      message: expect.stringContaining("payloadKind text-payload"),
    });
    expect(result.warnings).toContainEqual({
      provider: "codex",
      layer: "global",
      code: "invalid-shape",
      message: expect.stringContaining(
        "must contain exactly one matching [mcp_servers.invalid-payload] section",
      ),
    });
  });

  it("discovers Cursor skills, configured MCPs, and extensions from the configured root", () => {
    const sandbox = createSandbox();

    copyFixture(
      "cursor/global/skills-cursor",
      path.join(sandbox.homeDir, ".cursor", "skills-cursor"),
    );
    copyFixture("cursor/global/mcp.json", path.join(sandbox.homeDir, ".cursor", "mcp.json"));
    copyFixture("cursor/root/profiles", path.join(sandbox.cursorRoot, "profiles"));
    mkdirSync(
      path.join(
        sandbox.homeDir,
        "Library",
        "Application Support",
        "Cursor",
        "User",
        "profiles",
        "wrong",
      ),
      { recursive: true },
    );
    writeFileSync(
      path.join(
        sandbox.homeDir,
        "Library",
        "Application Support",
        "Cursor",
        "User",
        "profiles",
        "wrong",
        "extensions.json",
      ),
      JSON.stringify([{ identifier: { id: "ignored.default-root" } }]),
      { encoding: "utf8", flag: "w" },
    );

    const result = cursorProvider.discover({
      config: sandbox.config,
      homeDir: sandbox.homeDir,
    });

    expect(result.warnings).toEqual([]);
    expect(result.items.map((item) => item.id)).toEqual([
      "cursor:global:skill:example-cursor-skill",
      "cursor:global:configured-mcp:mcp-json:filesystem",
      "cursor:global:tool:extension:cursor.example-extension",
    ]);
  });

  it("discovers disabled Cursor skills and configured MCPs from vault state", () => {
    const sandbox = createSandbox();

    const skillDescriptor = vaultDescriptor({
      appStateRoot: sandbox.config.appStateRoot,
      provider: "cursor",
      layer: "global",
      kind: "skill",
      itemId: "cursor:global:skill:example-cursor-skill",
    });
    mkdirSync(skillDescriptor.rootPath, { recursive: true });
    copyFixture("cursor/global/skills-cursor/example-cursor-skill", skillDescriptor.vaultedPath);
    writeFileSync(
      skillDescriptor.entryPath,
      serializeVaultEntry({
        version: 1,
        provider: "cursor",
        kind: "skill",
        layer: "global",
        itemId: "cursor:global:skill:example-cursor-skill",
        displayName: "example-cursor-skill",
        originalPath: path.join(
          sandbox.homeDir,
          ".cursor",
          "skills-cursor",
          "example-cursor-skill",
        ),
        vaultedPath: skillDescriptor.vaultedPath,
        payloadKind: "path",
      }),
    );

    const mcpDescriptor = vaultDescriptor({
      appStateRoot: sandbox.config.appStateRoot,
      provider: "cursor",
      layer: "global",
      kind: "configured-mcp",
      itemId: "cursor:global:configured-mcp:mcp-json:filesystem",
    });
    mkdirSync(mcpDescriptor.rootPath, { recursive: true });
    writeFileSync(
      mcpDescriptor.payloadPath,
      JSON.stringify(
        {
          command: "npx",
        },
        null,
        2,
      ),
      "utf8",
    );
    writeFileSync(
      mcpDescriptor.entryPath,
      serializeVaultEntry({
        version: 1,
        provider: "cursor",
        kind: "configured-mcp",
        layer: "global",
        itemId: "cursor:global:configured-mcp:mcp-json:filesystem",
        displayName: "filesystem",
        originalPath: path.join(sandbox.homeDir, ".cursor", "mcp.json"),
        vaultedPath: mcpDescriptor.payloadPath,
        payloadKind: "json-payload",
      }),
    );

    const result = cursorProvider.discover({
      config: sandbox.config,
      homeDir: sandbox.homeDir,
    });

    expect(result.warnings).toEqual([]);
    expect(result.items).toContainEqual(
      expect.objectContaining({
        id: "cursor:global:skill:example-cursor-skill",
        enabled: false,
        mutability: "read-write",
        statePath: skillDescriptor.entryPath,
      }),
    );
    expect(result.items).toContainEqual(
      expect.objectContaining({
        id: "cursor:global:configured-mcp:mcp-json:filesystem",
        enabled: false,
        mutability: "read-write",
        statePath: mcpDescriptor.entryPath,
      }),
    );
  });

  it("warns when live and vaulted Cursor skill state conflict", () => {
    const sandbox = createSandbox();

    copyFixture(
      "cursor/global/skills-cursor",
      path.join(sandbox.homeDir, ".cursor", "skills-cursor"),
    );

    const descriptor = vaultDescriptor({
      appStateRoot: sandbox.config.appStateRoot,
      provider: "cursor",
      layer: "global",
      kind: "skill",
      itemId: "cursor:global:skill:example-cursor-skill",
    });
    mkdirSync(descriptor.rootPath, { recursive: true });
    copyFixture("cursor/global/skills-cursor/example-cursor-skill", descriptor.vaultedPath);
    writeFileSync(
      descriptor.entryPath,
      serializeVaultEntry({
        version: 1,
        provider: "cursor",
        kind: "skill",
        layer: "global",
        itemId: "cursor:global:skill:example-cursor-skill",
        displayName: "example-cursor-skill",
        originalPath: path.join(
          sandbox.homeDir,
          ".cursor",
          "skills-cursor",
          "example-cursor-skill",
        ),
        vaultedPath: descriptor.vaultedPath,
        payloadKind: "path",
      }),
    );

    const result = cursorProvider.discover({
      config: sandbox.config,
      homeDir: sandbox.homeDir,
    });

    expect(result.items).toContainEqual(
      expect.objectContaining({
        id: "cursor:global:skill:example-cursor-skill",
        enabled: true,
      }),
    );
    expect(result.warnings).toContainEqual({
      provider: "cursor",
      layer: "global",
      code: "conflicting-state",
      message: expect.stringContaining("live and vaulted copies both exist"),
    });
  });

  it("warns on invalid Cursor configured MCP vault payloads", () => {
    const sandbox = createSandbox();

    const wrongKindDescriptor = vaultDescriptor({
      appStateRoot: sandbox.config.appStateRoot,
      provider: "cursor",
      layer: "global",
      kind: "configured-mcp",
      itemId: "cursor:global:configured-mcp:mcp-json:wrong-kind",
    });
    mkdirSync(wrongKindDescriptor.rootPath, { recursive: true });
    writeFileSync(
      wrongKindDescriptor.entryPath,
      serializeVaultEntry({
        version: 1,
        provider: "cursor",
        kind: "configured-mcp",
        layer: "global",
        itemId: "cursor:global:configured-mcp:mcp-json:wrong-kind",
        displayName: "wrong-kind",
        originalPath: path.join(sandbox.homeDir, ".cursor", "mcp.json"),
        vaultedPath: wrongKindDescriptor.payloadPath,
        payloadKind: "text-payload",
      }),
    );

    const invalidPayloadDescriptor = vaultDescriptor({
      appStateRoot: sandbox.config.appStateRoot,
      provider: "cursor",
      layer: "global",
      kind: "configured-mcp",
      itemId: "cursor:global:configured-mcp:mcp-json:invalid-payload",
    });
    mkdirSync(invalidPayloadDescriptor.rootPath, { recursive: true });
    writeFileSync(invalidPayloadDescriptor.payloadPath, "[]", "utf8");
    writeFileSync(
      invalidPayloadDescriptor.entryPath,
      serializeVaultEntry({
        version: 1,
        provider: "cursor",
        kind: "configured-mcp",
        layer: "global",
        itemId: "cursor:global:configured-mcp:mcp-json:invalid-payload",
        displayName: "invalid-payload",
        originalPath: path.join(sandbox.homeDir, ".cursor", "mcp.json"),
        vaultedPath: invalidPayloadDescriptor.payloadPath,
        payloadKind: "json-payload",
      }),
    );

    const result = cursorProvider.discover({
      config: sandbox.config,
      homeDir: sandbox.homeDir,
    });

    expect(result.items.map((item) => item.id)).not.toContain(
      "cursor:global:configured-mcp:mcp-json:wrong-kind",
    );
    expect(result.items.map((item) => item.id)).not.toContain(
      "cursor:global:configured-mcp:mcp-json:invalid-payload",
    );
    expect(result.warnings).toContainEqual({
      provider: "cursor",
      layer: "global",
      code: "invalid-shape",
      message: expect.stringContaining("payloadKind json-payload"),
    });
    expect(result.warnings).toContainEqual({
      provider: "cursor",
      layer: "global",
      code: "invalid-shape",
      message: expect.stringContaining("must contain a JSON object payload"),
    });
  });

  it("parses Cursor mcp.json with trailing commas and respects workspace disabled state", () => {
    const sandbox = createSandbox();

    mkdirSync(path.join(sandbox.homeDir, ".cursor"), { recursive: true });
    writeFileSync(
      path.join(sandbox.homeDir, ".cursor", "mcp.json"),
      [
        "{",
        '  "mcpServers": {',
        '    "filesystem": {',
        '      "command": "npx",',
        "    },",
        "  },",
        "}",
      ].join("\n"),
      "utf8",
    );
    const databasePath = writeCursorWorkspaceState(sandbox, JSON.stringify(["user-filesystem"]));

    const result = cursorProvider.discover({
      config: sandbox.config,
      homeDir: sandbox.homeDir,
    });

    expect(result.warnings).toEqual([]);
    expect(result.items).toContainEqual(
      expect.objectContaining({
        id: "cursor:global:configured-mcp:mcp-json:filesystem",
        enabled: false,
        mutability: "read-write",
        statePath: databasePath,
      }),
    );
  });

  it("returns no Cursor tool items and no warning when no extension metadata exists", () => {
    const sandbox = createSandbox();

    mkdirSync(path.join(sandbox.cursorRoot, "profiles"), { recursive: true });

    const result = cursorProvider.discover({
      config: sandbox.config,
      homeDir: sandbox.homeDir,
    });

    expect(result.items).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it("warns when the configured Cursor root is missing", () => {
    const sandbox = createSandbox();

    const result = cursorProvider.discover({
      config: {
        ...sandbox.config,
        cursorRoot: path.join(sandbox.cursorRoot, "missing"),
      },
      homeDir: sandbox.homeDir,
    });

    expect(result.items).toEqual([]);
    expect(result.warnings).toEqual([
      {
        provider: "cursor",
        layer: "global",
        code: "missing-root",
        message: `Cursor root is missing or unreadable: ${path.join(
          sandbox.cursorRoot,
          "missing",
        )}`,
      },
    ]);
  });

  it("turns malformed Cursor files into warnings", () => {
    const sandbox = createSandbox();

    mkdirSync(path.join(sandbox.homeDir, ".cursor"), { recursive: true });
    writeFileSync(path.join(sandbox.homeDir, ".cursor", "mcp.json"), "{", {
      encoding: "utf8",
      flag: "w",
    });
    mkdirSync(path.join(sandbox.cursorRoot, "profiles", "default"), {
      recursive: true,
    });
    writeFileSync(path.join(sandbox.cursorRoot, "profiles", "default", "extensions.json"), "{}", {
      encoding: "utf8",
      flag: "w",
    });

    const result = cursorProvider.discover({
      config: sandbox.config,
      homeDir: sandbox.homeDir,
    });

    expect(result.items).toEqual([]);
    expect(result.warnings.map((warning) => warning.code)).toEqual([
      "json-parse-error",
      "invalid-shape",
    ]);
  });

  it("warns when Cursor workspace disabled-server state is malformed", () => {
    const sandbox = createSandbox();

    copyFixture("cursor/global/mcp.json", path.join(sandbox.homeDir, ".cursor", "mcp.json"));
    writeCursorWorkspaceState(sandbox, '{"broken":true}');

    const result = cursorProvider.discover({
      config: sandbox.config,
      homeDir: sandbox.homeDir,
    });

    expect(result.items.map((item) => item.id)).toContain(
      "cursor:global:configured-mcp:mcp-json:filesystem",
    );
    expect(result.warnings).toContainEqual({
      provider: "cursor",
      layer: "global",
      code: "invalid-shape",
      message: expect.stringContaining("cursor/disabledMcpServers"),
    });
  });

  it("keeps Cursor MCP and extension items when the skills root cannot be scanned", () => {
    const sandbox = createSandbox();

    mkdirSync(path.join(sandbox.homeDir, ".cursor"), { recursive: true });
    writeFileSync(path.join(sandbox.homeDir, ".cursor", "skills-cursor"), "not a directory", {
      encoding: "utf8",
      flag: "w",
    });
    writeFileSync(
      path.join(sandbox.homeDir, ".cursor", "mcp.json"),
      JSON.stringify({
        mcpServers: {
          filesystem: {
            command: "npx",
          },
        },
      }),
      { encoding: "utf8", flag: "w" },
    );
    mkdirSync(path.join(sandbox.cursorRoot, "profiles", "default"), {
      recursive: true,
    });
    writeFileSync(
      path.join(sandbox.cursorRoot, "profiles", "default", "extensions.json"),
      JSON.stringify([{ identifier: { id: "cursor.example-extension" } }]),
      { encoding: "utf8", flag: "w" },
    );

    const result = cursorProvider.discover({
      config: sandbox.config,
      homeDir: sandbox.homeDir,
    });

    expect(result.items.map((item) => item.id)).toEqual([
      "cursor:global:configured-mcp:mcp-json:filesystem",
      "cursor:global:tool:extension:cursor.example-extension",
    ]);
    expect(result.warnings).toEqual([
      {
        provider: "cursor",
        layer: "global",
        code: "file-unreadable",
        message: expect.stringContaining(path.join(sandbox.homeDir, ".cursor", "skills-cursor")),
      },
    ]);
  });
});
