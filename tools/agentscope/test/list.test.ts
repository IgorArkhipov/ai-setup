import path from "node:path";
import { describe, expect, it } from "vitest";
import { runList } from "../src/commands/list.js";

const runtimeRoot = path.resolve(import.meta.dirname, "fixtures", "runtime");

function runtimeOptions(overrides: {
  cursorRoot?: string;
  homeDir?: string;
  projectRoot?: string;
} = {}) {
  return {
    cwd: runtimeRoot,
    homeDir: overrides.homeDir ?? path.join(runtimeRoot, "home"),
    projectRoot: overrides.projectRoot ?? path.join(runtimeRoot, "project"),
    appStateRoot: path.join(runtimeRoot, "app-state"),
    cursorRoot: overrides.cursorRoot ?? path.join(runtimeRoot, "cursor", "User"),
  };
}

describe("runList", () => {
  it("renders human-readable output in stable sorted order", () => {
    const result = runList(runtimeOptions());

    expect(result.exitCode).toBe(0);
    expect(result.output).toContain("Discovered items:");
    expect(result.output.indexOf("claude global tool safe-shell")).toBeLessThan(
      result.output.indexOf("codex global skill example-skill"),
    );
    expect(result.output.indexOf("codex global skill example-skill")).toBeLessThan(
      result.output.indexOf("cursor global skill example-cursor-skill"),
    );
  });

  it("renders JSON output with separate items and warnings arrays", () => {
    const result = runList({
      ...runtimeOptions(),
      json: true,
    });
    const parsed = JSON.parse(result.output) as {
      items: Array<{ id: string }>;
      warnings: Array<{ code: string }>;
    };

    expect(result.exitCode).toBe(0);
    expect(parsed.warnings).toEqual([]);
    expect(parsed.items[0]).toMatchObject({
      provider: "claude",
      kind: "plugin",
      category: "tool",
      layer: "global",
      id: "claude:global:tool:settings-local:project-auditor",
      displayName: "project-auditor",
      enabled: true,
      mutability: "read-write",
      sourcePath: expect.stringContaining(".claude/settings.local.json"),
      statePath: expect.stringContaining(".claude/settings.local.json"),
    });
    expect(parsed.items.at(-1)?.id).toBe(
      "cursor:global:tool:extension:cursor.example-extension",
    );
  });

  it("prints an explicit empty result when no items exist", () => {
    const result = runList({
      cwd: runtimeRoot,
      homeDir: path.join(runtimeRoot, "empty-home"),
      projectRoot: path.join(runtimeRoot, "empty-project"),
      appStateRoot: path.join(runtimeRoot, "app-state"),
      cursorRoot: path.join(runtimeRoot, "empty-cursor", "User"),
    });

    expect(result.exitCode).toBe(0);
    expect(result.output).toBe("No discovered items.");
  });

  it("renders an explicit empty JSON result when no items exist", () => {
    const result = runList({
      cwd: runtimeRoot,
      homeDir: path.join(runtimeRoot, "empty-home"),
      projectRoot: path.join(runtimeRoot, "empty-project"),
      appStateRoot: path.join(runtimeRoot, "app-state"),
      cursorRoot: path.join(runtimeRoot, "empty-cursor", "User"),
      json: true,
    });

    expect(result.exitCode).toBe(0);
    expect(JSON.parse(result.output)).toEqual({
      items: [],
      warnings: [],
    });
  });

  it("keeps healthy providers visible when one provider warns", () => {
    const result = runList({
      ...runtimeOptions({
        cursorRoot: path.join(runtimeRoot, "missing-cursor", "User"),
      }),
    });

    expect(result.exitCode).toBe(0);
    expect(result.output).toContain("claude global tool safe-shell");
    expect(result.output).toContain("Warnings:");
    expect(result.output).toContain("cursor global missing-root");
  });

  it("renders JSON partial success with both items and warnings", () => {
    const result = runList({
      ...runtimeOptions({
        cursorRoot: path.join(runtimeRoot, "missing-cursor", "User"),
      }),
      json: true,
    });
    const parsed = JSON.parse(result.output) as {
      items: Array<{ provider: string; id: string }>;
      warnings: Array<{ provider: string; code: string }>;
    };

    expect(result.exitCode).toBe(0);
    expect(parsed.items.some((item) => item.provider === "claude")).toBe(true);
    expect(parsed.items.some((item) => item.provider === "codex")).toBe(true);
    expect(
      parsed.items.some(
        (item) => item.id === "cursor:global:configured-mcp:mcp-json:filesystem",
      ),
    ).toBe(true);
    expect(
      parsed.items.some(
        (item) => item.id === "cursor:global:tool:extension:cursor.example-extension",
      ),
    ).toBe(false);
    expect(parsed.warnings).toEqual([
      expect.objectContaining({
        provider: "cursor",
        code: "missing-root",
      }),
    ]);
  });

  it("filters items and warnings by provider and layer before rendering", () => {
    const result = runList({
      ...runtimeOptions({
        cursorRoot: path.join(runtimeRoot, "missing-cursor", "User"),
      }),
      provider: "claude",
      layer: "project",
      json: true,
    });
    const parsed = JSON.parse(result.output) as {
      items: Array<{ provider: string; layer: string; id: string }>;
      warnings: Array<{ provider: string }>;
    };

    expect(result.exitCode).toBe(0);
    expect(parsed.items).not.toHaveLength(0);
    expect(parsed.items.every((item) => item.provider === "claude")).toBe(true);
    expect(parsed.items.every((item) => item.layer === "project")).toBe(true);
    expect(parsed.items.map((item) => item.id)).toContain(
      "claude:project:configured-mcp:github",
    );
    expect(parsed.items.map((item) => item.id)).not.toContain(
      "claude:global:tool:settings-local:project-auditor",
    );
    expect(parsed.warnings).toEqual([]);
  });

  it("keeps both global and project items when layer is all", () => {
    const result = runList({
      ...runtimeOptions(),
      provider: "claude",
      layer: "all",
      json: true,
    });
    const parsed = JSON.parse(result.output) as {
      items: Array<{ layer: string; id: string }>;
      warnings: Array<{ provider: string }>;
    };

    expect(result.exitCode).toBe(0);
    expect(parsed.items.some((item) => item.layer === "global")).toBe(true);
    expect(parsed.items.some((item) => item.layer === "project")).toBe(true);
    expect(parsed.items.map((item) => item.id)).toContain(
      "claude:global:tool:settings-local:project-auditor",
    );
    expect(parsed.items.map((item) => item.id)).toContain(
      "claude:project:configured-mcp:github",
    );
    expect(parsed.warnings).toEqual([]);
  });

  it("rejects an invalid layer filter", () => {
    const result = runList({
      ...runtimeOptions(),
      layer: "workspace",
    });

    expect(result).toEqual({
      exitCode: 1,
      output: "invalid layer: expected global, project, or all",
    });
  });
});
