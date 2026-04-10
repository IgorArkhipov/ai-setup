import { describe, expect, it } from "vitest";
import type { DiscoveryResult } from "../src/core/models.js";
import { renderListHuman, renderListJson } from "../src/core/output.js";

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
});
