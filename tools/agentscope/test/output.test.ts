import { describe, expect, it } from "vitest";
import type { DiscoveryResult } from "../src/core/models.js";
import {
  renderListHuman,
  renderListJson,
  renderSnapshotHuman,
  renderSnapshotJson,
} from "../src/core/output.js";
import type { WriteDiscoverySnapshotResult } from "../src/core/snapshots.js";

const result: DiscoveryResult = {
  items: [
    {
      provider: "claude",
      kind: "skill",
      category: "skill",
      layer: "project",
      id: "claude:project:skill:example",
      displayName: "Example Skill",
      enabled: true,
      mutability: "read-only",
      sourcePath: "/workspace/project/.claude/skills/example/SKILL.md",
      statePath: "/workspace/project/.claude/skills/example/SKILL.md",
    },
  ],
  warnings: [
    {
      provider: "cursor",
      layer: "global",
      code: "missing-root",
      message: "Cursor root is missing",
    },
  ],
};

const snapshotResult: WriteDiscoverySnapshotResult = {
  snapshot: {
    version: 1,
    id: "snap-1776072000000-abc123",
    capturedAt: "2026-04-13T12:00:00.000Z",
    projectRoot: "/workspace/project",
    items: result.items,
    warnings: result.warnings,
    inventory: {
      providers: [
        {
          provider: "claude",
          totalAvailable: 1,
          totalActive: 1,
          warningCount: 0,
          kinds: {
            skill: { available: 1, active: 1 },
            mcp: { available: 0, active: 0 },
            plugin: { available: 0, active: 0 },
          },
          categories: {
            skill: { available: 1, active: 1 },
            "configured-mcp": { available: 0, active: 0 },
            tool: { available: 0, active: 0 },
          },
          layers: {
            global: { available: 0, active: 0 },
            project: { available: 1, active: 1 },
          },
        },
        {
          provider: "codex",
          totalAvailable: 0,
          totalActive: 0,
          warningCount: 0,
          kinds: {
            skill: { available: 0, active: 0 },
            mcp: { available: 0, active: 0 },
            plugin: { available: 0, active: 0 },
          },
          categories: {
            skill: { available: 0, active: 0 },
            "configured-mcp": { available: 0, active: 0 },
            tool: { available: 0, active: 0 },
          },
          layers: {
            global: { available: 0, active: 0 },
            project: { available: 0, active: 0 },
          },
        },
        {
          provider: "cursor",
          totalAvailable: 0,
          totalActive: 0,
          warningCount: 1,
          kinds: {
            skill: { available: 0, active: 0 },
            mcp: { available: 0, active: 0 },
            plugin: { available: 0, active: 0 },
          },
          categories: {
            skill: { available: 0, active: 0 },
            "configured-mcp": { available: 0, active: 0 },
            tool: { available: 0, active: 0 },
          },
          layers: {
            global: { available: 0, active: 0 },
            project: { available: 0, active: 0 },
          },
        },
      ],
    },
  },
  latestPath: "/state/snapshots/project/latest.json",
  historyPath: "/state/snapshots/project/history/snap-1776072000000-abc123.json",
};

describe("output", () => {
  it("renders human output from normalized data", () => {
    expect(renderListHuman(result)).toBe(`Discovered items:

- claude project skill Example Skill
  id: claude:project:skill:example
  enabled: true
  mutability: read-only
  source: /workspace/project/.claude/skills/example/SKILL.md
  state: /workspace/project/.claude/skills/example/SKILL.md

Warnings:

- cursor global missing-root: Cursor root is missing`);
  });

  it("renders JSON output from the same normalized data", () => {
    const parsed = JSON.parse(renderListJson(result)) as DiscoveryResult;

    expect(parsed).toEqual(result);
  });

  it("renders human snapshot output from the persisted payload", () => {
    expect(renderSnapshotHuman(snapshotResult)).toBe(`Snapshot saved: snap-1776072000000-abc123
Latest path: /state/snapshots/project/latest.json
History path: /state/snapshots/project/history/snap-1776072000000-abc123.json
Captured at: 2026-04-13T12:00:00.000Z
Project root: /workspace/project
Inventory semantics: available=discovered in the current scope, active=currently enabled within that scope.
Providers:
  - claude: available=1, active=1, warnings=0
  - codex: available=0, active=0, warnings=0
  - cursor: available=0, active=0, warnings=1

Warnings:
- cursor global missing-root: Cursor root is missing`);
  });

  it("renders JSON snapshot output from the same persisted payload", () => {
    const parsed = JSON.parse(renderSnapshotJson(snapshotResult)) as WriteDiscoverySnapshotResult;

    expect(parsed).toEqual(snapshotResult);
  });
});
