import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  listProviders,
  loadCapabilityMatrix,
  validateProviderFixtures,
} from "../src/providers/registry.js";

const fixturesRoot = path.resolve(import.meta.dirname, "fixtures");

describe("provider-capabilities", () => {
  it("loads the capability matrix for all tracked providers", () => {
    const matrix = loadCapabilityMatrix(fixturesRoot);

    expect(matrix.version).toBe(1);
    expect(Object.keys(matrix.providers)).toEqual(["claude", "codex", "cursor"]);
  });

  it("locks the expected provider fixture files and shapes", () => {
    const report = validateProviderFixtures(fixturesRoot);

    expect(report.checkedFiles).toEqual([
      "claude/global/settings.json",
      "claude/global/settings.local.json",
      "claude/project/.claude/settings.json",
      "claude/project/.claude/settings.local.json",
      "claude/project/.claude/skills/example-claude-skill/SKILL.md",
      "claude/project/.mcp.json",
      "codex/global/config.toml",
      "codex/global/skills/.system/example-skill/SKILL.md",
      "codex/project/.codex/skills/example-project-skill/SKILL.md",
      "cursor/global/skills-cursor/example-cursor-skill/SKILL.md",
      "cursor/global/mcp.json",
      "cursor/root/profiles/default/extensions.json",
    ]);
    expect(report.issues).toEqual([]);
  });

  it("keeps the capability matrix aligned with the provider registry", () => {
    const providerIds = listProviders().map((provider) => provider.id);
    const matrixProviderIds = Object.keys(
      loadCapabilityMatrix(fixturesRoot).providers,
    );

    expect(matrixProviderIds).toEqual(providerIds);
  });
});
