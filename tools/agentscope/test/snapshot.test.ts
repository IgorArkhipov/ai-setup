import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadConfig } from "../src/core/config.js";
import { runDiscovery } from "../src/core/discovery.js";
import { getLatestSnapshotPath, getSnapshotHistoryDir } from "../src/core/paths.js";
import {
  listSnapshotHistory,
  loadLatestDiscoverySnapshot,
  writeDiscoverySnapshot,
} from "../src/core/snapshots.js";
import { claudeProvider } from "../src/providers/claude.js";
import { codexProvider } from "../src/providers/codex.js";
import { cursorProvider } from "../src/providers/cursor.js";

const runtimeRoot = path.resolve(import.meta.dirname, "fixtures", "runtime");
const tempRoots: string[] = [];

function createTempRoot(): string {
  const root = mkdtempSync(path.join(tmpdir(), "agentscope-snapshot-test-"));
  tempRoots.push(root);
  return root;
}

function runtimeDiscovery(appStateRoot: string) {
  const homeDir = path.join(runtimeRoot, "home");
  const config = loadConfig({
    cwd: runtimeRoot,
    homeDir,
    overrides: {
      projectRoot: path.join(runtimeRoot, "project"),
      appStateRoot,
      cursorRoot: path.join(runtimeRoot, "cursor", "User"),
    },
  });

  return {
    config,
    homeDir,
    discovery: runDiscovery([claudeProvider, codexProvider, cursorProvider], {
      config,
      homeDir,
    }),
  };
}

afterEach(() => {
  for (const root of tempRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("snapshots", () => {
  it("writes and reloads a validated discovery snapshot", () => {
    const appStateRoot = createTempRoot();
    const { config, discovery } = runtimeDiscovery(appStateRoot);
    const written = writeDiscoverySnapshot({
      appStateRoot,
      projectRoot: config.projectRoot,
      items: discovery.items,
      warnings: discovery.warnings,
      capturedAt: "2026-04-13T12:00:00.000Z",
      randomSuffix: "abc123",
    });
    const latest = loadLatestDiscoverySnapshot({
      appStateRoot,
      projectRoot: config.projectRoot,
    });

    expect(written.snapshot.id).toBe("snap-1776081600000-abc123");
    expect(written.snapshot.inventory.providers).toEqual([
      expect.objectContaining({
        provider: "claude",
        totalAvailable: discovery.items.filter((item) => item.provider === "claude").length,
        totalActive: discovery.items.filter((item) => item.provider === "claude" && item.enabled)
          .length,
      }),
      expect.objectContaining({
        provider: "codex",
        totalAvailable: discovery.items.filter((item) => item.provider === "codex").length,
        totalActive: discovery.items.filter((item) => item.provider === "codex" && item.enabled)
          .length,
      }),
      expect.objectContaining({
        provider: "cursor",
        totalAvailable: discovery.items.filter((item) => item.provider === "cursor").length,
        totalActive: discovery.items.filter((item) => item.provider === "cursor" && item.enabled)
          .length,
      }),
    ]);
    expect(latest).toEqual(written.snapshot);
    expect(existsSync(written.historyPath)).toBe(true);
    expect(existsSync(written.latestPath)).toBe(true);
  });

  it("keeps only the newest bounded history entries", () => {
    const appStateRoot = createTempRoot();
    const { config, discovery } = runtimeDiscovery(appStateRoot);

    writeDiscoverySnapshot({
      appStateRoot,
      projectRoot: config.projectRoot,
      items: discovery.items,
      warnings: discovery.warnings,
      capturedAt: "2026-04-13T10:00:00.000Z",
      randomSuffix: "old001",
      maxHistory: 2,
    });
    writeDiscoverySnapshot({
      appStateRoot,
      projectRoot: config.projectRoot,
      items: discovery.items,
      warnings: discovery.warnings,
      capturedAt: "2026-04-13T11:00:00.000Z",
      randomSuffix: "mid001",
      maxHistory: 2,
    });
    const latestWrite = writeDiscoverySnapshot({
      appStateRoot,
      projectRoot: config.projectRoot,
      items: discovery.items,
      warnings: discovery.warnings,
      capturedAt: "2026-04-13T12:00:00.000Z",
      randomSuffix: "new001",
      maxHistory: 2,
    });

    expect(
      listSnapshotHistory({
        appStateRoot,
        projectRoot: config.projectRoot,
      }).map((snapshot) => snapshot.id),
    ).toEqual(["snap-1776081600000-new001", "snap-1776078000000-mid001"]);
    expect(existsSync(latestWrite.latestPath)).toBe(true);
    expect(
      existsSync(
        path.join(
          getSnapshotHistoryDir(appStateRoot, config.projectRoot),
          "snap-1776074400000-old001.json",
        ),
      ),
    ).toBe(false);
  });

  it("rejects malformed latest snapshots on read", () => {
    const appStateRoot = createTempRoot();
    const projectRoot = path.join(runtimeRoot, "project");
    const latestPath = getLatestSnapshotPath(appStateRoot, projectRoot);
    mkdirSync(path.dirname(latestPath), { recursive: true });
    writeFileSync(
      latestPath,
      JSON.stringify(
        {
          version: 1,
          id: "snap-invalid",
          capturedAt: "2026-04-13T12:00:00.000Z",
          projectRoot,
          items: [],
          warnings: [],
          inventory: { providers: [] },
        },
        null,
        2,
      ),
      "utf8",
    );

    expect(() =>
      loadLatestDiscoverySnapshot({
        appStateRoot,
        projectRoot,
      }),
    ).toThrow("snapshot inventory does not match items and warnings");
  });

  it("fails before writing when existing history is malformed", () => {
    const appStateRoot = createTempRoot();
    const { config, discovery } = runtimeDiscovery(appStateRoot);
    const historyDir = getSnapshotHistoryDir(appStateRoot, config.projectRoot);
    mkdirSync(historyDir, { recursive: true });
    writeFileSync(path.join(historyDir, "broken.json"), "{not-valid-json}", "utf8");
    const expectedHistoryPath = path.join(historyDir, "snap-1776081600000-abc123.json");

    expect(() =>
      writeDiscoverySnapshot({
        appStateRoot,
        projectRoot: config.projectRoot,
        items: discovery.items,
        warnings: discovery.warnings,
        capturedAt: "2026-04-13T12:00:00.000Z",
        randomSuffix: "abc123",
      }),
    ).toThrow("broken.json");
    expect(existsSync(expectedHistoryPath)).toBe(false);
    expect(existsSync(path.join(historyDir, "broken.json"))).toBe(true);
  });

  it("rejects malformed history during history listing", () => {
    const appStateRoot = createTempRoot();
    const projectRoot = path.join(runtimeRoot, "project");
    const historyDir = getSnapshotHistoryDir(appStateRoot, projectRoot);
    mkdirSync(historyDir, { recursive: true });
    writeFileSync(path.join(historyDir, "broken.json"), "{not-valid-json}", "utf8");

    expect(() =>
      listSnapshotHistory({
        appStateRoot,
        projectRoot,
      }),
    ).toThrow("broken.json");
  });

  it("rejects a non-positive history retention value", () => {
    const appStateRoot = createTempRoot();
    const { config, discovery } = runtimeDiscovery(appStateRoot);

    expect(() =>
      writeDiscoverySnapshot({
        appStateRoot,
        projectRoot: config.projectRoot,
        items: discovery.items,
        warnings: discovery.warnings,
        maxHistory: 0,
      }),
    ).toThrow("snapshot maxHistory must be a positive integer");
  });
});
