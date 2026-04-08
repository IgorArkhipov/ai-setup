import { describe, expect, it } from "vitest";
import {
  defaultCursorRoot,
  expandHomePath,
  normalizeAbsolutePath,
  resolveAppStateRoot,
  resolveCursorRoot,
  resolveProjectRoot,
} from "../src/core/paths.js";

describe("paths", () => {
  const cwd = "/workspace/project";
  const homeDir = "/Users/tester";

  it("expands tilde paths", () => {
    expect(expandHomePath("~/Library/Application Support", homeDir)).toBe(
      "/Users/tester/Library/Application Support",
    );
  });

  it("resolves the project root", () => {
    expect(
      resolveProjectRoot({
        cwd,
        homeDir,
        configuredProjectRoot: "../other-project",
      }),
    ).toBe("/workspace/other-project");
  });

  it("resolves the app-state root", () => {
    expect(
      resolveAppStateRoot({
        cwd,
        homeDir,
        configuredAppStateRoot: "~/agent-state",
      }),
    ).toBe("/Users/tester/agent-state");
  });

  it("uses the default app-state root when no override is set", () => {
    expect(
      resolveAppStateRoot({
        cwd,
        homeDir,
      }),
    ).toBe("/Users/tester/.config/agentscope");
  });

  it("uses the macOS Cursor default root", () => {
    expect(defaultCursorRoot(homeDir)).toBe(
      "/Users/tester/Library/Application Support/Cursor/User",
    );
  });

  it("prefers an explicit Cursor root override", () => {
    expect(
      resolveCursorRoot({
        cwd,
        homeDir,
        configuredCursorRoot: "/tmp/cursor-root",
      }),
    ).toBe("/tmp/cursor-root");
  });

  it("normalizes already-expanded absolute paths", () => {
    expect(
      normalizeAbsolutePath("/Users/tester/Library/../Library/Cursor", {
        cwd,
        homeDir,
      }),
    ).toBe("/Users/tester/Library/Cursor");
  });
});
