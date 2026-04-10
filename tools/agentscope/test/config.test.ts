import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/core/config.js";

function createFileReaders(files: Record<string, string>) {
  return {
    fileExists(filePath: string): boolean {
      return Object.hasOwn(files, filePath);
    },
    readFile(filePath: string): string {
      const value = files[filePath];
      if (value === undefined) {
        throw new Error(`missing test file: ${filePath}`);
      }

      return value;
    },
  };
}

describe("loadConfig", () => {
  const cwd = "/workspace/project";
  const homeDir = "/Users/tester";

  it("uses defaults when no config files exist", () => {
    const config = loadConfig({
      cwd,
      homeDir,
      ...createFileReaders({}),
    });

    expect(config.projectRoot).toBe(cwd);
    expect(config.appStateRoot).toBe("/Users/tester/.config/agentscope");
    expect(config.cursorRoot).toBe("/Users/tester/Library/Application Support/Cursor/User");
  });

  it("lets user config override defaults", () => {
    const userConfigPath = path.join(homeDir, ".config", "agentscope", "config.json");
    const config = loadConfig({
      cwd,
      homeDir,
      ...createFileReaders({
        [userConfigPath]: JSON.stringify({
          projectRoot: "~/custom-project",
          appStateRoot: "~/agent-state",
          cursorRoot: "~/CursorOverride",
        }),
      }),
    });

    expect(config.projectRoot).toBe("/Users/tester/custom-project");
    expect(config.appStateRoot).toBe("/Users/tester/agent-state");
    expect(config.cursorRoot).toBe("/Users/tester/CursorOverride");
  });

  it("lets project config override user config", () => {
    const userConfigPath = path.join(homeDir, ".config", "agentscope", "config.json");
    const projectConfigPath = path.join(cwd, ".agentscope.json");
    const config = loadConfig({
      cwd,
      homeDir,
      ...createFileReaders({
        [userConfigPath]: JSON.stringify({
          projectRoot: cwd,
          appStateRoot: "~/agent-state",
          cursorRoot: "~/CursorOverride",
        }),
        [projectConfigPath]: JSON.stringify({
          appStateRoot: "./project-state",
          cursorRoot: "./CursorProject",
        }),
      }),
    });

    expect(config.appStateRoot).toBe("/workspace/project/project-state");
    expect(config.cursorRoot).toBe("/workspace/project/CursorProject");
  });

  it("lets CLI overrides win over file config in exact precedence order", () => {
    const userConfigPath = path.join(homeDir, ".config", "agentscope", "config.json");
    const overriddenProjectRoot = "/workspace/override-project";
    const overriddenProjectConfigPath = path.join(overriddenProjectRoot, ".agentscope.json");
    const config = loadConfig({
      cwd,
      homeDir,
      overrides: {
        projectRoot: overriddenProjectRoot,
        appStateRoot: "/tmp/cli-state",
        cursorRoot: "/tmp/cli-cursor",
      },
      ...createFileReaders({
        [userConfigPath]: JSON.stringify({
          projectRoot: "/workspace/user-project",
          appStateRoot: "/tmp/user-state",
          cursorRoot: "/tmp/user-cursor",
        }),
        [overriddenProjectConfigPath]: JSON.stringify({
          appStateRoot: "/tmp/project-state",
          cursorRoot: "/tmp/project-cursor",
        }),
      }),
    });

    expect(config.projectRoot).toBe(overriddenProjectRoot);
    expect(config.appStateRoot).toBe("/tmp/cli-state");
    expect(config.cursorRoot).toBe("/tmp/cli-cursor");
    expect(config.configPaths.projectConfigPath).toBe(overriddenProjectConfigPath);
  });

  it("rejects a future major schema version", () => {
    const userConfigPath = path.join(homeDir, ".config", "agentscope", "config.json");

    expect(() =>
      loadConfig({
        cwd,
        homeDir,
        ...createFileReaders({
          [userConfigPath]: JSON.stringify({
            version: 2,
          }),
        }),
      }),
    ).toThrow("Unsupported agentscope config schema version: 2");
  });

  it("ignores unknown additive keys", () => {
    const userConfigPath = path.join(homeDir, ".config", "agentscope", "config.json");
    const config = loadConfig({
      cwd,
      homeDir,
      ...createFileReaders({
        [userConfigPath]: JSON.stringify({
          projectRoot: "/workspace/from-user",
          unknownFutureKey: {
            keep: "ignored",
          },
        }),
      }),
    });

    expect(config.projectRoot).toBe("/workspace/from-user");
  });
});
