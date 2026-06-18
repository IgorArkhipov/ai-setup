import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  listProviders,
  loadCapabilityMatrix,
  validateCapabilityMatrix,
  validateProviderFixtures,
} from "../src/providers/registry.js";

const fixturesRoot = path.resolve(import.meta.dirname, "fixtures");
const tempRoots: string[] = [];

afterEach(() => {
  while (tempRoots.length > 0) {
    const root = tempRoots.pop();
    if (root !== undefined) {
      rmSync(root, { recursive: true, force: true });
    }
  }
});

describe("provider-capabilities", () => {
  it("loads the capability matrix for all tracked providers", () => {
    const matrix = loadCapabilityMatrix(fixturesRoot);

    expect(matrix.version).toBe(1);
    expect(Object.keys(matrix.providers)).toEqual(["claude", "codex", "cursor"]);
    expect(matrix.providers).toEqual({
      claude: {
        skills: "verified",
        configuredMcps: "verified",
        tools: "verified",
        agents: "verified",
        hooks: "read-only",
        providerSettings: "read-only",
        pluginConfigs: "unsupported",
        pluginManifests: "unsupported",
        extensions: "unsupported",
      },
      codex: {
        skills: "verified",
        configuredMcps: "verified",
        tools: "unsupported",
        agents: "verified",
        hooks: "read-only",
        providerSettings: "read-only",
        pluginConfigs: "read-only",
        pluginManifests: "unsupported",
        extensions: "unsupported",
      },
      cursor: {
        skills: "verified",
        configuredMcps: "verified",
        tools: "unsupported",
        agents: "verified",
        hooks: "read-only",
        providerSettings: "read-only",
        pluginConfigs: "unsupported",
        pluginManifests: "read-only",
        extensions: "unsupported",
      },
    });
  });

  it("reports stale capability matrices that omit modern surface fields", () => {
    const tempRoot = mkdtempSync(path.join(os.tmpdir(), "agentscope-fixtures-"));
    tempRoots.push(tempRoot);
    cpSync(fixturesRoot, tempRoot, { recursive: true });
    const matrixPath = path.join(tempRoot, "capability-matrix.json");
    const matrix = JSON.parse(readFileSync(matrixPath, "utf8"));
    delete matrix.providers.claude.agents;
    writeFileSync(matrixPath, `${JSON.stringify(matrix, null, 2)}\n`, "utf8");

    expect(validateCapabilityMatrix(tempRoot).issues).toContainEqual({
      providerId: "claude",
      field: "agents",
      message: "capability-matrix.json is missing claude.agents",
    });
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
    const matrixProviderIds = Object.keys(loadCapabilityMatrix(fixturesRoot).providers);

    expect(matrixProviderIds).toEqual(providerIds);
  });

  it("rejects Claude fixture plugin values that are not booleans", () => {
    const tempRoot = mkdtempSync(path.join(os.tmpdir(), "agentscope-fixtures-"));
    tempRoots.push(tempRoot);
    cpSync(fixturesRoot, tempRoot, { recursive: true });
    writeFileSync(
      path.join(tempRoot, "claude", "global", "settings.json"),
      JSON.stringify(
        {
          enabledPlugins: {
            "safe-shell": "yes",
          },
        },
        null,
        2,
      ),
      "utf8",
    );

    expect(validateProviderFixtures(tempRoot).issues).toContainEqual({
      providerId: "claude",
      relativePath: "claude/global/settings.json",
      message: "enabledPlugins.safe-shell must be a boolean",
    });
  });
});
