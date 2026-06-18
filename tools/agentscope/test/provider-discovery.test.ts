import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { pathToFileURL } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import type { AgentScopeConfig } from "../src/core/config.js";
import { buildDiscoveryInventorySummary } from "../src/core/discovery.js";
import type { DiscoveryItem } from "../src/core/models.js";
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
  it("summarizes modern surface taxonomy buckets", () => {
    const modernItems: DiscoveryItem[] = [
      {
        provider: "claude",
        kind: "agent",
        category: "agent",
        layer: "global",
        id: "claude:global:agent:reviewer",
        displayName: "reviewer",
        enabled: true,
        mutability: "read-only",
        sourcePath: "/tmp/reviewer.md",
        statePath: "/tmp/reviewer.md",
      },
      {
        provider: "codex",
        kind: "hook",
        category: "hook",
        layer: "global",
        id: "codex:global:hook:hooks-json:PostToolUse",
        displayName: "PostToolUse",
        enabled: true,
        mutability: "read-only",
        sourcePath: "/tmp/hooks.json",
        statePath: "/tmp/hooks.json",
      },
      {
        provider: "cursor",
        kind: "setting",
        category: "provider-setting",
        layer: "project",
        id: "cursor:project:setting:permissions-json",
        displayName: ".cursor/permissions.json",
        enabled: true,
        mutability: "read-only",
        sourcePath: "/tmp/permissions.json",
        statePath: "/tmp/permissions.json",
      },
      {
        provider: "cursor",
        kind: "plugin",
        category: "plugin-manifest",
        layer: "global",
        id: "cursor:global:plugin-manifest:local:demo",
        displayName: "demo",
        enabled: true,
        mutability: "read-only",
        sourcePath: "/tmp/plugin.json",
        statePath: "/tmp/plugin.json",
      },
    ];

    const summary = buildDiscoveryInventorySummary(modernItems, []);

    expect(
      summary.providers.find((provider) => provider.provider === "claude")?.kinds.agent,
    ).toEqual({ available: 1, active: 1 });
    expect(summary.providers.find((provider) => provider.provider === "codex")?.kinds.hook).toEqual(
      { available: 1, active: 1 },
    );
    expect(
      summary.providers.find((provider) => provider.provider === "cursor")?.kinds.setting,
    ).toEqual({ available: 1, active: 1 });
    expect(
      summary.providers.find((provider) => provider.provider === "cursor")?.categories[
        "plugin-manifest"
      ],
    ).toEqual({ available: 1, active: 1 });
  });

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
      "claude:global:setting:settings",
      "claude:global:setting:settings-local",
      "claude:project:setting:settings",
      "claude:project:setting:settings-local",
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

  it("discovers Claude agents, hooks, and settings as read-only modern surfaces", () => {
    const sandbox = createSandbox();

    mkdirSync(path.join(sandbox.homeDir, ".claude", "agents"), { recursive: true });
    writeFileSync(
      path.join(sandbox.homeDir, ".claude", "agents", "reviewer-agent.md"),
      ["---", "name: reviewer", "description: Reviews changes", "---", "", "Review code."].join(
        "\n",
      ),
      { encoding: "utf8", flag: "w" },
    );
    mkdirSync(path.join(sandbox.projectRoot, ".claude", "agents"), { recursive: true });
    writeFileSync(
      path.join(sandbox.projectRoot, ".claude", "agents", "planner.md"),
      ["---", "name: planner", "description: Plans work", "---", "", "Plan work."].join("\n"),
      { encoding: "utf8", flag: "w" },
    );
    mkdirSync(path.join(sandbox.homeDir, ".claude"), { recursive: true });
    writeFileSync(
      path.join(sandbox.homeDir, ".claude", "settings.json"),
      JSON.stringify(
        {
          hooks: {
            PreToolUse: [
              {
                matcher: "*",
                hooks: [{ type: "command", command: "echo ok" }],
              },
            ],
          },
        },
        null,
        2,
      ),
      { encoding: "utf8", flag: "w" },
    );

    const result = claudeProvider.discover({
      config: sandbox.config,
      homeDir: sandbox.homeDir,
    });

    expect(result.warnings).toEqual([]);
    expect(result.items).toContainEqual(
      expect.objectContaining({
        id: "claude:global:agent:reviewer",
        kind: "agent",
        category: "agent",
        layer: "global",
        mutability: "read-only",
        displayName: "reviewer",
        sourcePath: path.join(sandbox.homeDir, ".claude", "agents", "reviewer-agent.md"),
      }),
    );
    expect(result.items).toContainEqual(
      expect.objectContaining({
        id: "claude:project:agent:planner",
        kind: "agent",
        category: "agent",
        layer: "project",
        mutability: "read-only",
      }),
    );
    expect(result.items).toContainEqual(
      expect.objectContaining({
        id: "claude:global:setting:settings",
        kind: "setting",
        category: "provider-setting",
        mutability: "read-only",
      }),
    );
    expect(result.items).toContainEqual(
      expect.objectContaining({
        id: "claude:global:hook:settings:PreToolUse",
        kind: "hook",
        category: "hook",
        mutability: "read-only",
      }),
    );

    const agentItem = result.items.find((item) => item.id === "claude:global:agent:reviewer");
    expect(agentItem).toBeDefined();
    expect(
      claudeProvider.planToggle?.({
        config: sandbox.config,
        homeDir: sandbox.homeDir,
        item: agentItem as DiscoveryItem,
        targetEnabled: false,
      }),
    ).toMatchObject({
      status: "blocked",
      reason: expect.stringContaining("read-only"),
      operations: [],
    });
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

    expect(result.items.map((item) => item.id)).toEqual([
      "claude:global:setting:settings",
      "claude:project:setting:settings-local",
    ]);
    expect(result.warnings.map((warning) => warning.code)).toEqual([
      "json-parse-error",
      "file-unreadable",
    ]);
  });

  it("discovers Codex skills, configured MCPs, and plugin config declarations", () => {
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
      "codex:global:setting:config-toml:read-only",
      "codex:global:configured-mcp:config:github:read-write",
      "codex:global:plugin-config:config:safe-shell:read-only",
    ]);
  });

  it("discovers Codex agents, hooks, and settings as read-only modern surfaces", () => {
    const sandbox = createSandbox();

    mkdirSync(path.join(sandbox.homeDir, ".codex", "agents"), { recursive: true });
    writeFileSync(
      path.join(sandbox.homeDir, ".codex", "agents", "reviewer-agent.toml"),
      ['name = "reviewer"', 'description = "Reviews changes"'].join("\n"),
      { encoding: "utf8", flag: "w" },
    );
    mkdirSync(path.join(sandbox.projectRoot, ".codex", "agents"), { recursive: true });
    writeFileSync(
      path.join(sandbox.projectRoot, ".codex", "agents", "planner.md"),
      ["---", "name: planner", "description: Plans work", "---", "", "Plan work."].join("\n"),
      { encoding: "utf8", flag: "w" },
    );
    mkdirSync(path.join(sandbox.homeDir, ".codex"), { recursive: true });
    writeFileSync(
      path.join(sandbox.homeDir, ".codex", "config.toml"),
      [
        "[plugins.safe-shell]",
        'display_name = "Safe Shell"',
        "",
        "[plugins.safe-shell.mcp_servers.github]",
        'command = "npx"',
        "",
        "[mcp_servers.github]",
        "",
        "[mcp_servers.github.tools.list_issues]",
        'approval_mode = "approve"',
        "",
        "[[hooks.PreToolUse]]",
        'matcher = "Bash"',
      ].join("\n"),
      { encoding: "utf8", flag: "w" },
    );
    writeFileSync(
      path.join(sandbox.homeDir, ".codex", "hooks.json"),
      JSON.stringify(
        {
          hooks: {
            PostToolUse: [{ command: "echo ok" }],
          },
        },
        null,
        2,
      ),
      { encoding: "utf8", flag: "w" },
    );

    const result = codexProvider.discover({
      config: sandbox.config,
      homeDir: sandbox.homeDir,
    });

    expect(result.warnings).toEqual([]);
    expect(result.items).toContainEqual(
      expect.objectContaining({
        id: "codex:global:agent:reviewer",
        kind: "agent",
        category: "agent",
        layer: "global",
        displayName: "reviewer",
        mutability: "read-only",
      }),
    );
    expect(result.items).toContainEqual(
      expect.objectContaining({
        id: "codex:project:agent:planner",
        kind: "agent",
        category: "agent",
        layer: "project",
        mutability: "read-only",
      }),
    );
    expect(result.items).toContainEqual(
      expect.objectContaining({
        id: "codex:global:setting:config-toml",
        kind: "setting",
        category: "provider-setting",
        mutability: "read-only",
      }),
    );
    expect(result.items).toContainEqual(
      expect.objectContaining({
        id: "codex:global:setting:hooks-json",
        kind: "setting",
        category: "provider-setting",
        mutability: "read-only",
      }),
    );
    expect(result.items).toContainEqual(
      expect.objectContaining({
        id: "codex:global:hook:hooks-json:PostToolUse",
        kind: "hook",
        category: "hook",
        mutability: "read-only",
      }),
    );
    expect(result.items).toContainEqual(
      expect.objectContaining({
        id: "codex:global:hook:config-toml:PreToolUse",
        kind: "hook",
        category: "hook",
        mutability: "read-only",
      }),
    );
    expect(result.items).toContainEqual(
      expect.objectContaining({
        id: "codex:global:plugin-config:config:safe-shell",
        kind: "plugin",
        category: "plugin-config",
        mutability: "read-only",
      }),
    );
    expect(result.items.map((item) => item.id)).not.toContain(
      "codex:global:plugin-config:config:safe-shell.mcp_servers.github",
    );

    const hookItem = result.items.find(
      (item) => item.id === "codex:global:hook:hooks-json:PostToolUse",
    );
    expect(hookItem).toBeDefined();
    expect(
      codexProvider.planToggle?.({
        config: sandbox.config,
        homeDir: sandbox.homeDir,
        item: hookItem as DiscoveryItem,
        targetEnabled: false,
      }),
    ).toMatchObject({
      status: "blocked",
      reason: expect.stringContaining("read-only"),
      operations: [],
    });
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
      "codex:global:setting:config-toml",
      "codex:global:configured-mcp:config:github",
      "codex:global:plugin-config:config:safe-shell",
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

  it("keeps Codex discovery scoped when a modern hooks file is unreadable", () => {
    const sandbox = createSandbox();

    mkdirSync(path.join(sandbox.homeDir, ".codex"), { recursive: true });
    writeFileSync(
      path.join(sandbox.homeDir, ".codex", "config.toml"),
      ["[mcp_servers.github]", 'command = "npx"'].join("\n"),
      { encoding: "utf8", flag: "w" },
    );
    mkdirSync(path.join(sandbox.homeDir, ".codex", "hooks.json"));

    const result = codexProvider.discover({
      config: sandbox.config,
      homeDir: sandbox.homeDir,
    });

    expect(result.items).toContainEqual(
      expect.objectContaining({
        id: "codex:global:configured-mcp:config:github",
      }),
    );
    expect(result.warnings).toContainEqual({
      provider: "codex",
      layer: "global",
      code: "file-unreadable",
      message: expect.stringContaining("hooks.json"),
    });
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

  it("discovers Cursor agents, hooks, settings, and local plugin manifests as read-only modern surfaces", () => {
    const sandbox = createSandbox();

    mkdirSync(path.join(sandbox.homeDir, ".cursor", "agents"), { recursive: true });
    writeFileSync(
      path.join(sandbox.homeDir, ".cursor", "agents", "reviewer-agent.md"),
      ["---", "name: reviewer", "description: Reviews changes", "---", "", "Review code."].join(
        "\n",
      ),
      { encoding: "utf8", flag: "w" },
    );
    mkdirSync(path.join(sandbox.projectRoot, ".cursor", "agents"), { recursive: true });
    writeFileSync(
      path.join(sandbox.projectRoot, ".cursor", "agents", "planner.md"),
      ["---", "name: planner", "description: Plans work", "---", "", "Plan work."].join("\n"),
      { encoding: "utf8", flag: "w" },
    );
    mkdirSync(path.join(sandbox.homeDir, ".cursor"), { recursive: true });
    writeFileSync(
      path.join(sandbox.homeDir, ".cursor", "hooks.json"),
      JSON.stringify(
        {
          version: 1,
          hooks: {
            beforeShellExecution: [{ command: "echo ok" }],
          },
        },
        null,
        2,
      ),
      { encoding: "utf8", flag: "w" },
    );
    writeFileSync(
      path.join(sandbox.projectRoot, ".cursor", "permissions.json"),
      JSON.stringify({ mcpAllowlist: ["filesystem"] }, null, 2),
      { encoding: "utf8", flag: "w" },
    );
    writeFileSync(
      path.join(sandbox.projectRoot, ".cursor", "sandbox.json"),
      JSON.stringify({ type: "workspace-write" }, null, 2),
      { encoding: "utf8", flag: "w" },
    );
    writeFileSync(
      path.join(sandbox.projectRoot, ".cursor", "cli.json"),
      JSON.stringify({ permissions: { allow: ["Read"] } }, null, 2),
      { encoding: "utf8", flag: "w" },
    );
    mkdirSync(path.join(sandbox.homeDir, ".cursor", "plugins", "local", "demo", ".cursor-plugin"), {
      recursive: true,
    });
    writeFileSync(
      path.join(
        sandbox.homeDir,
        ".cursor",
        "plugins",
        "local",
        "demo",
        ".cursor-plugin",
        "plugin.json",
      ),
      JSON.stringify({ name: "demo", version: "0.0.1" }, null, 2),
      { encoding: "utf8", flag: "w" },
    );

    const result = cursorProvider.discover({
      config: sandbox.config,
      homeDir: sandbox.homeDir,
    });

    expect(result.warnings).toEqual([]);
    expect(result.items).toContainEqual(
      expect.objectContaining({
        id: "cursor:global:agent:reviewer",
        kind: "agent",
        category: "agent",
        layer: "global",
        displayName: "reviewer",
        mutability: "read-only",
      }),
    );
    expect(result.items).toContainEqual(
      expect.objectContaining({
        id: "cursor:project:agent:planner",
        kind: "agent",
        category: "agent",
        layer: "project",
        mutability: "read-only",
      }),
    );
    expect(result.items).toContainEqual(
      expect.objectContaining({
        id: "cursor:global:setting:hooks-json",
        kind: "setting",
        category: "provider-setting",
        mutability: "read-only",
      }),
    );
    expect(result.items).toContainEqual(
      expect.objectContaining({
        id: "cursor:global:hook:hooks-json:beforeShellExecution",
        kind: "hook",
        category: "hook",
        mutability: "read-only",
      }),
    );
    expect(result.items).toContainEqual(
      expect.objectContaining({
        id: "cursor:project:setting:permissions-json",
        kind: "setting",
        category: "provider-setting",
        mutability: "read-only",
      }),
    );
    expect(result.items).toContainEqual(
      expect.objectContaining({
        id: "cursor:project:setting:sandbox-json",
        kind: "setting",
        category: "provider-setting",
        mutability: "read-only",
      }),
    );
    expect(result.items).toContainEqual(
      expect.objectContaining({
        id: "cursor:project:setting:cli-json",
        kind: "setting",
        category: "provider-setting",
        mutability: "read-only",
      }),
    );
    expect(result.items).toContainEqual(
      expect.objectContaining({
        id: "cursor:global:plugin-manifest:local:demo",
        kind: "plugin",
        category: "plugin-manifest",
        mutability: "read-only",
      }),
    );

    const settingItem = result.items.find(
      (item) => item.id === "cursor:project:setting:permissions-json",
    );
    expect(settingItem).toBeDefined();
    expect(
      cursorProvider.planToggle?.({
        config: sandbox.config,
        homeDir: sandbox.homeDir,
        item: settingItem as DiscoveryItem,
        targetEnabled: false,
      }),
    ).toMatchObject({
      status: "blocked",
      reason: expect.stringContaining("read-only"),
      operations: [],
    });
  });

  it("keeps Cursor discovery scoped when a modern hooks file is unreadable", () => {
    const sandbox = createSandbox();

    copyFixture("cursor/global/mcp.json", path.join(sandbox.homeDir, ".cursor", "mcp.json"));
    mkdirSync(path.join(sandbox.homeDir, ".cursor", "hooks.json"));

    const result = cursorProvider.discover({
      config: sandbox.config,
      homeDir: sandbox.homeDir,
    });

    expect(result.items).toContainEqual(
      expect.objectContaining({
        id: "cursor:global:configured-mcp:mcp-json:filesystem",
      }),
    );
    expect(result.warnings).toContainEqual({
      provider: "cursor",
      layer: "global",
      code: "file-unreadable",
      message: expect.stringContaining("hooks.json"),
    });
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
