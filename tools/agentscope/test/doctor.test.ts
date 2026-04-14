import { cpSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runDoctor } from "../src/commands/doctor.js";
import { renderProviders } from "../src/commands/providers.js";

const packageRoot = path.resolve(import.meta.dirname, "..");
const fixturesRoot = path.resolve(import.meta.dirname, "fixtures");
const runtimeRoot = path.join(fixturesRoot, "runtime");
const tempDirs: string[] = [];

function runtimeOptions() {
  return {
    cwd: runtimeRoot,
    homeDir: path.join(runtimeRoot, "home"),
    projectRoot: path.join(runtimeRoot, "project"),
    appStateRoot: path.join(runtimeRoot, "app-state"),
    cursorRoot: path.join(runtimeRoot, "cursor", "User"),
  };
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const target = tempDirs.pop();
    if (target !== undefined) {
      rmSync(target, { recursive: true, force: true });
    }
  }
});

describe("doctor and providers commands", () => {
  it("returns OK when fixtures and local inputs are valid", () => {
    const result = runDoctor(packageRoot, fixturesRoot, runtimeOptions());

    expect(result.exitCode).toBe(0);
    expect(result.output).toContain("OK");
    expect(result.output).toContain(`project root: ${path.join(runtimeRoot, "project")}`);
  });

  it("returns non-zero when a required fixture file is missing", () => {
    const tempRoot = mkdtempSync(path.join(os.tmpdir(), "agentscope-fixtures-"));
    tempDirs.push(tempRoot);
    cpSync(fixturesRoot, tempRoot, { recursive: true });
    rmSync(path.join(tempRoot, "claude", "global", "settings.json"));

    const result = runDoctor(packageRoot, tempRoot, runtimeOptions());

    expect(result.exitCode).toBe(1);
    expect(result.output).toContain("fixture validation failed");
    expect(result.output).toContain("claude/global/settings.json");
  });

  it("returns non-zero when a fixture shape is invalid", () => {
    const tempRoot = mkdtempSync(path.join(os.tmpdir(), "agentscope-fixtures-"));
    tempDirs.push(tempRoot);
    cpSync(fixturesRoot, tempRoot, { recursive: true });
    writeFileSync(
      path.join(tempRoot, "cursor", "global", "mcp.json"),
      '{"mcpServers": []}',
      "utf8",
    );

    const result = runDoctor(packageRoot, tempRoot, runtimeOptions());

    expect(result.exitCode).toBe(1);
    expect(result.output).toContain("cursor/global/mcp.json");
  });

  it("reports provider-scoped issues for broken local inputs", () => {
    const result = runDoctor(packageRoot, fixturesRoot, {
      ...runtimeOptions(),
      cursorRoot: path.join(runtimeRoot, "missing-cursor", "User"),
    });

    expect(result.exitCode).toBe(1);
    expect(result.output).toContain("provider issues detected");
    expect(result.output).toContain("cursor global missing-root");
  });

  it("prints the supported providers in deterministic order", () => {
    const output = renderProviders(fixturesRoot);
    const claudeBlock = output.match(/Claude Code \(claude\)[\s\S]*?(?=\n\n[A-Z]|\s*$)/)?.[0];
    const codexBlock = output.match(/Codex \(codex\)[\s\S]*?(?=\n\n[A-Z]|\s*$)/)?.[0];
    const cursorBlock = output.match(/Cursor \(cursor\)[\s\S]*?(?=\n\n[A-Z]|\s*$)/)?.[0];

    expect(output.indexOf("Claude Code (claude)")).toBeLessThan(output.indexOf("Codex (codex)"));
    expect(output.indexOf("Codex (codex)")).toBeLessThan(output.indexOf("Cursor (cursor)"));
    expect(claudeBlock).toContain("skills:          verified");
    expect(claudeBlock).toContain("configured MCPs: verified");
    expect(claudeBlock).toContain("tools/extensions: verified");
    expect(codexBlock).toContain("skills:          verified");
    expect(codexBlock).toContain("configured MCPs: verified");
    expect(codexBlock).toContain("tools/extensions: unsupported");
    expect(cursorBlock).toContain("skills:          read-only");
    expect(cursorBlock).toContain("configured MCPs: read-only");
    expect(cursorBlock).toContain("tools/extensions: read-only");
  });
});
