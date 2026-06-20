import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runDashboard } from "../src/commands/dashboard.js";
import type { ProviderModule } from "../src/core/discovery.js";
import { getLatestSnapshotPath } from "../src/core/paths.js";
import { createMutationSandbox, type MutationSandbox } from "./support/mutation-sandbox.js";

const runtimeRoot = path.resolve(import.meta.dirname, "fixtures", "runtime");
const sandboxes: MutationSandbox[] = [];

afterEach(() => {
  while (sandboxes.length > 0) {
    sandboxes.pop()?.cleanup();
  }
});

function runtimeOptions() {
  return {
    cwd: runtimeRoot,
    homeDir: path.join(runtimeRoot, "home"),
    projectRoot: path.join(runtimeRoot, "project"),
    appStateRoot: path.join(runtimeRoot, "app-state"),
    cursorRoot: path.join(runtimeRoot, "cursor", "User"),
  };
}

function writeTextFile(filePath: string, content: string): void {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, content, "utf8");
}

describe("runDashboard", () => {
  it("renders deterministic inventory, details, and dry-run preview", () => {
    const result = runDashboard({
      ...runtimeOptions(),
      provider: "claude",
      category: "skill",
      select: "claude:project:skill:example-claude-skill",
    });

    expect(result.exitCode).toBe(0);
    expect(result.output).toContain("AgentScope Dashboard");
    expect(result.output).toContain("Filters: provider=claude");
    expect(result.output).toContain("Inventory:");
    expect(result.output).toContain("Items:");
    expect(result.output).toContain("Selected item:");
    expect(result.output).toContain("id: claude:project:skill:example-claude-skill");
    expect(result.output).toContain("Toggle preview:");
    expect(result.output).toContain("status: planned");
  });

  it("renders blocked previews for read-only dashboard selections", () => {
    const result = runDashboard({
      ...runtimeOptions(),
      provider: "codex",
      category: "plugin-config",
      select: "codex:global:plugin-config:config:safe-shell",
    });

    expect(result.exitCode).toBe(0);
    expect(result.output).toContain("Toggle preview:");
    expect(result.output).toContain("status: blocked");
    expect(result.output).toContain("read-only:");
  });

  it("filters provider warnings with the dashboard filters", () => {
    const providers: ProviderModule[] = [
      {
        id: "claude",
        discover: () => ({
          items: [],
          warnings: [
            {
              provider: "claude",
              layer: "project",
              code: "kept-warning",
              message: "kept",
            },
          ],
        }),
      },
      {
        id: "cursor",
        discover: () => ({
          items: [],
          warnings: [
            {
              provider: "cursor",
              layer: "global",
              code: "dropped-warning",
              message: "dropped",
            },
          ],
        }),
      },
    ];

    const result = runDashboard({
      ...runtimeOptions(),
      provider: "claude",
      layer: "project",
      providers,
    });

    expect(result.exitCode).toBe(0);
    expect(result.output).toContain("kept-warning");
    expect(result.output).not.toContain("dropped-warning");
  });

  it("blocks staged apply without confirmation", () => {
    const sandbox = createMutationSandbox();
    sandboxes.push(sandbox);
    const originalPath = path.join(sandbox.projectRoot, ".claude", "agents", "reviewer-agent.md");
    writeTextFile(
      originalPath,
      ["---", "name: reviewer", "description: Reviews changes", "---", "", "Review."].join("\n"),
    );

    const result = runDashboard({
      cwd: sandbox.projectRoot,
      homeDir: sandbox.homeDir,
      projectRoot: sandbox.projectRoot,
      appStateRoot: sandbox.appStateRoot,
      cursorRoot: sandbox.cursorRoot,
      stage: ["claude|agent|project|claude:project:agent:reviewer|false"],
      apply: true,
    });

    expect(result.exitCode).toBe(1);
    expect(result.output).toContain("confirmation required");
    expect(existsSync(originalPath)).toBe(true);
  });

  it("applies staged changes through the mutation engine and writes a fresh snapshot", () => {
    const sandbox = createMutationSandbox();
    sandboxes.push(sandbox);
    const originalPath = path.join(sandbox.projectRoot, ".claude", "agents", "reviewer-agent.md");
    writeTextFile(
      originalPath,
      ["---", "name: reviewer", "description: Reviews changes", "---", "", "Review."].join("\n"),
    );

    const result = runDashboard({
      cwd: sandbox.projectRoot,
      homeDir: sandbox.homeDir,
      projectRoot: sandbox.projectRoot,
      appStateRoot: sandbox.appStateRoot,
      cursorRoot: sandbox.cursorRoot,
      stage: ["claude|agent|project|claude:project:agent:reviewer|false"],
      apply: true,
      confirm: true,
      now: () => new Date("2026-06-20T10:00:00.000Z"),
      generateBackupId: () => "dashboard-agent-disable",
      snapshotCapturedAt: "2026-06-20T10:00:01.000Z",
      snapshotRandomSuffix: "dash01",
    });

    expect(result.exitCode).toBe(0);
    expect(result.output).toContain("Dashboard apply:");
    expect(result.output).toContain("status: applied");
    expect(result.output).toContain("backupId: dashboard-agent-disable");
    expect(result.output).toContain("Snapshot refreshed:");
    expect(existsSync(originalPath)).toBe(false);
    expect(sandbox.listBackupIds()).toEqual(["dashboard-agent-disable"]);
    const latestPath = getLatestSnapshotPath(sandbox.appStateRoot, sandbox.projectRoot);
    expect(JSON.parse(readFileSync(latestPath, "utf8"))).toMatchObject({
      id: expect.stringMatching(/^snap-\d+-dash01$/),
      projectRoot: sandbox.projectRoot,
    });
  });

  it("refreshes JSON selected item and preview after applying the selected item", () => {
    const sandbox = createMutationSandbox();
    sandboxes.push(sandbox);
    const originalPath = path.join(sandbox.projectRoot, ".claude", "agents", "reviewer-agent.md");
    writeTextFile(
      originalPath,
      ["---", "name: reviewer", "description: Reviews changes", "---", "", "Review."].join("\n"),
    );

    const result = runDashboard({
      cwd: sandbox.projectRoot,
      homeDir: sandbox.homeDir,
      projectRoot: sandbox.projectRoot,
      appStateRoot: sandbox.appStateRoot,
      cursorRoot: sandbox.cursorRoot,
      json: true,
      select: "claude:project:agent:reviewer",
      stage: ["claude|agent|project|claude:project:agent:reviewer|false"],
      apply: true,
      confirm: true,
      now: () => new Date("2026-06-20T10:00:00.000Z"),
      generateBackupId: () => "dashboard-selected-agent-disable",
      snapshotCapturedAt: "2026-06-20T10:00:01.000Z",
      snapshotRandomSuffix: "dash02",
    });
    const parsed = JSON.parse(result.output);

    expect(result.exitCode).toBe(0);
    expect(parsed.selected).toMatchObject({
      id: "claude:project:agent:reviewer",
      enabled: false,
    });
    expect(parsed.selectedPreview).toMatchObject({
      status: "planned",
      targetEnabled: true,
    });
    expect(parsed.items).toContainEqual(
      expect.objectContaining({
        id: "claude:project:agent:reviewer",
        enabled: false,
      }),
    );
  });

  it("does not write a snapshot when staged items are blocked", () => {
    const sandbox = createMutationSandbox();
    sandboxes.push(sandbox);

    const result = runDashboard({
      cwd: sandbox.projectRoot,
      homeDir: sandbox.homeDir,
      projectRoot: sandbox.projectRoot,
      appStateRoot: sandbox.appStateRoot,
      cursorRoot: sandbox.cursorRoot,
      stage: ["claude|agent|project|claude:project:agent:missing|false"],
      apply: true,
      confirm: true,
    });

    expect(result.exitCode).toBe(1);
    expect(result.output).toContain("unknown selection for claude:project:agent:missing");
    expect(existsSync(path.join(sandbox.appStateRoot, "snapshots"))).toBe(false);
  });

  it("renders explicit empty dashboard results", () => {
    const sandbox = createMutationSandbox();
    sandboxes.push(sandbox);
    rmSync(sandbox.homeDir, { recursive: true, force: true });
    mkdirSync(sandbox.homeDir, { recursive: true });

    const result = runDashboard({
      cwd: sandbox.projectRoot,
      homeDir: sandbox.homeDir,
      projectRoot: sandbox.projectRoot,
      appStateRoot: sandbox.appStateRoot,
      cursorRoot: sandbox.cursorRoot,
      provider: "cursor",
      search: "nothing-here",
    });

    expect(result.exitCode).toBe(0);
    expect(result.output).toContain("No dashboard items match the current filters.");
  });
});
