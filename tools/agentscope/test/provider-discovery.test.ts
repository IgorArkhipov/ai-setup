import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { AgentScopeConfig } from "../src/core/config.js";
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

    copyFixture("claude/global/settings.json", path.join(sandbox.homeDir, ".claude", "settings.json"));
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
    copyFixture(
      "claude/project/.mcp.json",
      path.join(sandbox.projectRoot, ".mcp.json"),
    );

    mkdirSync(path.join(sandbox.homeDir, ".agents", "skills", "ignored-skill"), {
      recursive: true,
    });
    writeFileSync(
      path.join(
        sandbox.homeDir,
        ".agents",
        "skills",
        "ignored-skill",
        "SKILL.md",
      ),
      "# Ignored Skill\n",
      { encoding: "utf8", flag: "w" },
    );
    mkdirSync(path.join(sandbox.homeDir, ".claude", "plugins"), {
      recursive: true,
    });
    writeFileSync(
      path.join(sandbox.homeDir, ".claude", "plugins", "ignored.txt"),
      "ignored",
      { encoding: "utf8", flag: "w" },
    );

    const result = claudeProvider.discover({
      config: sandbox.config,
      homeDir: sandbox.homeDir,
    });

    expect(result.warnings).toEqual([]);
    expect(result.items.map((item) => item.id)).toEqual([
      "claude:global:tool:settings:safe-shell",
      "claude:global:tool:settings:demo-formatter",
      "claude:global:tool:settings-local:project-auditor",
      "claude:project:tool:settings:github",
      "claude:project:configured-mcp:settings:enabled:github",
      "claude:project:tool:settings-local:local-shell",
      "claude:project:configured-mcp:settings-local:enabled:github",
      "claude:project:configured-mcp:settings-local:disabled:legacy-local",
      "claude:project:configured-mcp:settings-local:all-project-mcp-servers",
      "claude:project:skill:example-claude-skill",
      "claude:project:configured-mcp:mcp-json:github",
    ]);
  });

  it("turns malformed Claude files into warnings", () => {
    const sandbox = createSandbox();

    mkdirSync(path.join(sandbox.homeDir, ".claude"), { recursive: true });
    writeFileSync(
      path.join(sandbox.homeDir, ".claude", "settings.json"),
      "{ invalid json",
      { encoding: "utf8", flag: "w" },
    );
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

    copyFixture(
      "codex/global/config.toml",
      path.join(sandbox.homeDir, ".codex", "config.toml"),
    );
    copyFixture(
      "codex/global/skills",
      path.join(sandbox.homeDir, ".codex", "skills"),
    );
    copyFixture(
      "codex/project/.codex/skills",
      path.join(sandbox.projectRoot, ".codex", "skills"),
    );

    const result = codexProvider.discover({
      config: sandbox.config,
      homeDir: sandbox.homeDir,
    });

    expect(result.warnings).toEqual([]);
    expect(result.items.map((item) => `${item.id}:${item.mutability}`)).toEqual([
      "codex:global:skill:example-skill:read-only",
      "codex:project:skill:example-project-skill:read-only",
      "codex:global:configured-mcp:config:github:read-only",
      "codex:global:tool:plugin:safe-shell:unsupported",
    ]);
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
        '[mcp_servers.github]',
        'display_name = "GitHub"',
        "",
        '[plugins.safe-shell]',
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
        message: expect.stringContaining(
          path.join(sandbox.homeDir, ".codex", "skills"),
        ),
      },
    ]);
  });

  it("discovers Cursor skills, configured MCPs, and extensions from the configured root", () => {
    const sandbox = createSandbox();

    copyFixture(
      "cursor/global/skills-cursor",
      path.join(sandbox.homeDir, ".cursor", "skills-cursor"),
    );
    copyFixture(
      "cursor/global/mcp.json",
      path.join(sandbox.homeDir, ".cursor", "mcp.json"),
    );
    copyFixture(
      "cursor/root/profiles",
      path.join(sandbox.cursorRoot, "profiles"),
    );
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
    writeFileSync(
      path.join(sandbox.cursorRoot, "profiles", "default", "extensions.json"),
      "{}",
      { encoding: "utf8", flag: "w" },
    );

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

  it("keeps Cursor MCP and extension items when the skills root cannot be scanned", () => {
    const sandbox = createSandbox();

    mkdirSync(path.join(sandbox.homeDir, ".cursor"), { recursive: true });
    writeFileSync(
      path.join(sandbox.homeDir, ".cursor", "skills-cursor"),
      "not a directory",
      { encoding: "utf8", flag: "w" },
    );
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
        message: expect.stringContaining(
          path.join(sandbox.homeDir, ".cursor", "skills-cursor"),
        ),
      },
    ]);
  });
});
