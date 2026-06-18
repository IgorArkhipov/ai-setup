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

interface MutableCapabilityMatrixFixture {
  version?: unknown;
  providers?: Record<string, Record<string, unknown>>;
  notes?: Record<string, unknown>;
}

afterEach(() => {
  while (tempRoots.length > 0) {
    const root = tempRoots.pop();
    if (root !== undefined) {
      rmSync(root, { recursive: true, force: true });
    }
  }
});

function copyFixtures(): string {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), "agentscope-fixtures-"));
  tempRoots.push(tempRoot);
  cpSync(fixturesRoot, tempRoot, { recursive: true });
  return tempRoot;
}

function mutateCapabilityMatrix(mutate: (matrix: MutableCapabilityMatrixFixture) => void): string {
  const tempRoot = copyFixtures();
  const matrixPath = path.join(tempRoot, "capability-matrix.json");
  const matrix = JSON.parse(readFileSync(matrixPath, "utf8")) as MutableCapabilityMatrixFixture;
  mutate(matrix);
  writeFileSync(matrixPath, `${JSON.stringify(matrix, null, 2)}\n`, "utf8");
  return tempRoot;
}

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
    const tempRoot = mutateCapabilityMatrix((matrix) => {
      delete matrix.providers?.claude?.agents;
    });

    expect(validateCapabilityMatrix(tempRoot).issues).toContainEqual({
      providerId: "claude",
      field: "agents",
      message: "capability-matrix.json is missing claude.agents",
    });
  });

  it("reports capability matrices with invalid modern surface statuses", () => {
    const tempRoot = mutateCapabilityMatrix((matrix) => {
      if (matrix.providers?.cursor !== undefined) {
        matrix.providers.cursor.extensions = "installed";
      }
    });

    expect(validateCapabilityMatrix(tempRoot).issues).toContainEqual({
      providerId: "cursor",
      field: "extensions",
      message: "capability-matrix.json has an invalid cursor.extensions value",
    });
  });

  it("reports malformed capability matrix documents without throwing", () => {
    const tempRoot = copyFixtures();
    writeFileSync(path.join(tempRoot, "capability-matrix.json"), "{", "utf8");

    expect(validateCapabilityMatrix(tempRoot).issues[0]?.message).toContain(
      "capability-matrix.json must be valid JSON",
    );
  });

  it("reports missing capability matrix documents", () => {
    const tempRoot = copyFixtures();
    rmSync(path.join(tempRoot, "capability-matrix.json"));

    expect(validateCapabilityMatrix(tempRoot).issues).toEqual([
      {
        message: "capability-matrix.json is missing",
      },
    ]);
  });

  it("reports missing matrix sections, provider rows, and notes", () => {
    const tempRoot = copyFixtures();
    writeFileSync(
      path.join(tempRoot, "capability-matrix.json"),
      JSON.stringify(
        {
          version: 2,
          providers: {
            claude: "missing-row",
          },
          notes: {
            claude: "",
          },
        },
        null,
        2,
      ),
      "utf8",
    );

    expect(validateCapabilityMatrix(tempRoot).issues).toEqual(
      expect.arrayContaining([
        { message: "capability-matrix.json must use version 1" },
        {
          providerId: "claude",
          message: "capability-matrix.json is missing claude",
        },
        {
          providerId: "claude",
          message: "capability-matrix.json is missing note for claude",
        },
        {
          providerId: "codex",
          message: "capability-matrix.json is missing codex",
        },
        {
          providerId: "codex",
          message: "capability-matrix.json is missing note for codex",
        },
      ]),
    );
  });

  it("reports top-level capability matrix sections that are not objects", () => {
    const tempRoot = copyFixtures();
    writeFileSync(
      path.join(tempRoot, "capability-matrix.json"),
      JSON.stringify(
        {
          version: 1,
          providers: [],
          notes: [],
        },
        null,
        2,
      ),
      "utf8",
    );

    expect(validateCapabilityMatrix(tempRoot).issues).toEqual(
      expect.arrayContaining([
        { message: "capability-matrix.json must define providers" },
        { message: "capability-matrix.json must define notes" },
      ]),
    );
  });

  it("throws a combined error when callers load an invalid capability matrix", () => {
    const tempRoot = mutateCapabilityMatrix((matrix) => {
      delete matrix.providers?.codex?.hooks;
      if (matrix.notes !== undefined) {
        delete matrix.notes.codex;
      }
    });

    expect(() => loadCapabilityMatrix(tempRoot)).toThrow(
      "capability-matrix.json is missing codex.hooks; capability-matrix.json is missing note for codex",
    );
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
    const tempRoot = copyFixtures();
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

  it("rejects malformed Claude settings surfaces", () => {
    const tempRoot = copyFixtures();
    writeFileSync(
      path.join(tempRoot, "claude", "global", "settings.json"),
      JSON.stringify(
        {
          enabledPlugins: [],
          enabledMcpjsonServers: [],
          disabledMcpjsonServers: [],
          enableAllProjectMcpServers: "yes",
        },
        null,
        2,
      ),
      "utf8",
    );

    expect(validateProviderFixtures(tempRoot).issues).toEqual(
      expect.arrayContaining([
        {
          providerId: "claude",
          relativePath: "claude/global/settings.json",
          message: "enabledPlugins must be an object",
        },
        {
          providerId: "claude",
          relativePath: "claude/global/settings.json",
          message: "enabledMcpjsonServers must be an object",
        },
        {
          providerId: "claude",
          relativePath: "claude/global/settings.json",
          message: "disabledMcpjsonServers must be an object",
        },
        {
          providerId: "claude",
          relativePath: "claude/global/settings.json",
          message: "enableAllProjectMcpServers must be a boolean",
        },
      ]),
    );
  });

  it("rejects malformed Codex config plugin and MCP section headers", () => {
    const tempRoot = copyFixtures();
    writeFileSync(
      path.join(tempRoot, "codex", "global", "config.toml"),
      ["[plugins]", "[mcp_servers.]"].join("\n"),
      "utf8",
    );

    expect(validateProviderFixtures(tempRoot).issues).toEqual(
      expect.arrayContaining([
        {
          providerId: "codex",
          relativePath: "codex/global/config.toml",
          message: "line 1 must use [plugins.<id>] or [mcp_servers.<id>]",
        },
        {
          providerId: "codex",
          relativePath: "codex/global/config.toml",
          message: "line 2 must use [plugins.<id>] or [mcp_servers.<id>]",
        },
      ]),
    );
  });

  it("rejects malformed Cursor extension fixtures", () => {
    const tempRoot = copyFixtures();
    writeFileSync(
      path.join(tempRoot, "cursor", "root", "profiles", "default", "extensions.json"),
      JSON.stringify([null, { identifier: "cursor-tools" }, { identifier: { id: 42 } }], null, 2),
      "utf8",
    );

    expect(validateProviderFixtures(tempRoot).issues).toEqual(
      expect.arrayContaining([
        {
          providerId: "cursor",
          relativePath: "cursor/root/profiles/default/extensions.json",
          message: "extensions.json[0] must be an object",
        },
        {
          providerId: "cursor",
          relativePath: "cursor/root/profiles/default/extensions.json",
          message: "extensions.json[1].identifier must be an object",
        },
        {
          providerId: "cursor",
          relativePath: "cursor/root/profiles/default/extensions.json",
          message: "extensions.json[2].identifier.id must be a string",
        },
      ]),
    );
  });

  it("reports Cursor extension fixtures that are not valid JSON", () => {
    const tempRoot = copyFixtures();
    writeFileSync(
      path.join(tempRoot, "cursor", "root", "profiles", "default", "extensions.json"),
      "{",
      "utf8",
    );

    expect(validateProviderFixtures(tempRoot).issues[0]).toEqual({
      providerId: "cursor",
      relativePath: "cursor/root/profiles/default/extensions.json",
      message: expect.stringContaining("Cursor extensions.json must be valid JSON"),
    });
  });
});
