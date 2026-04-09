import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { ProviderModule } from "../src/core/discovery.js";
import { runToggle } from "../src/commands/toggle.js";
import { createMutationSandbox } from "./support/mutation-sandbox.js";
import { fakeToggleIds, fakeToggleProvider } from "./support/fake-toggle-provider.js";

const sandboxes: Array<ReturnType<typeof createMutationSandbox>> = [];
const runtimeRoot = path.resolve(import.meta.dirname, "fixtures", "runtime");

afterEach(() => {
  while (sandboxes.length > 0) {
    sandboxes.pop()?.cleanup();
  }
});

function fakeOptions(
  sandbox: ReturnType<typeof createMutationSandbox>,
  id = fakeToggleIds.full,
) {
  return {
    cwd: sandbox.projectRoot,
    homeDir: sandbox.homeDir,
    projectRoot: sandbox.projectRoot,
    appStateRoot: sandbox.appStateRoot,
    cursorRoot: sandbox.cursorRoot,
    provider: "codex",
    kind: "plugin",
    layer: "project",
    id,
    providers: [fakeToggleProvider],
  };
}

describe("runToggle", () => {
  it("rejects missing selector flags", () => {
    const sandbox = createMutationSandbox();
    sandboxes.push(sandbox);

    expect(
      runToggle({
        cwd: sandbox.projectRoot,
        homeDir: sandbox.homeDir,
        projectRoot: sandbox.projectRoot,
        appStateRoot: sandbox.appStateRoot,
        cursorRoot: sandbox.cursorRoot,
      }),
    ).toEqual({
      exitCode: 1,
      output: "missing required selector: --provider",
    });

    expect(
      JSON.parse(
        runToggle({
          cwd: sandbox.projectRoot,
          homeDir: sandbox.homeDir,
          projectRoot: sandbox.projectRoot,
          appStateRoot: sandbox.appStateRoot,
          cursorRoot: sandbox.cursorRoot,
          json: true,
        }).output,
      ),
    ).toEqual({
      status: "failed",
      reason: "missing required selector: --provider",
    });
  });

  it("rejects unknown and ambiguous selections", () => {
    const sandbox = createMutationSandbox();
    sandboxes.push(sandbox);

    expect(
      runToggle({
        ...fakeOptions(sandbox),
        id: "codex:project:tool:missing",
      }),
    ).toEqual({
      exitCode: 1,
      output: "blocked: unknown selection for codex:project:tool:missing",
    });

    const duplicateItem = fakeToggleProvider.discover({
      config: sandbox.config,
      homeDir: sandbox.homeDir,
    }).items[0];
    if (duplicateItem === undefined) {
      throw new Error("missing duplicate item");
    }

    const duplicateProvider: ProviderModule = {
      id: "codex",
      discover() {
        return {
          items: [duplicateItem],
          warnings: [],
        };
      },
    };

    expect(
      runToggle({
        ...fakeOptions(sandbox),
        providers: [fakeToggleProvider, duplicateProvider],
      }),
    ).toEqual({
      exitCode: 1,
      output: `blocked: ambiguous selection for ${fakeToggleIds.full}`,
    });

    expect(
      JSON.parse(
        runToggle({
          ...fakeOptions(sandbox),
          id: "codex:project:tool:missing",
          json: true,
        }).output,
      ),
    ).toEqual({
      status: "blocked",
      reason: "unknown selection for codex:project:tool:missing",
    });
  });

  it("blocks real read-only selections from production providers", () => {
    const result = runToggle({
      cwd: runtimeRoot,
      homeDir: path.join(runtimeRoot, "home"),
      projectRoot: path.join(runtimeRoot, "project"),
      appStateRoot: path.join(runtimeRoot, "app-state"),
      cursorRoot: path.join(runtimeRoot, "cursor", "User"),
      provider: "claude",
      kind: "skill",
      layer: "project",
      id: "claude:project:skill:example-claude-skill",
    });

    expect(result.exitCode).toBe(1);
    expect(result.output).toContain("status: blocked");
    expect(result.output).toContain("read-only:");
  });

  it("blocks real unsupported selections from production providers", () => {
    const result = runToggle({
      cwd: runtimeRoot,
      homeDir: path.join(runtimeRoot, "home"),
      projectRoot: path.join(runtimeRoot, "project"),
      appStateRoot: path.join(runtimeRoot, "app-state"),
      cursorRoot: path.join(runtimeRoot, "cursor", "User"),
      provider: "codex",
      kind: "plugin",
      layer: "global",
      id: "codex:global:tool:plugin:safe-shell",
    });

    expect(result.exitCode).toBe(1);
    expect(result.output).toContain("status: blocked");
    expect(result.output).toContain("unsupported:");
  });

  it("supports fake-provider dry-run, no-op, apply, and JSON output", () => {
    const sandbox = createMutationSandbox();
    sandboxes.push(sandbox);

    const dryRun = runToggle(fakeOptions(sandbox));
    expect(dryRun.exitCode).toBe(0);
    expect(dryRun.output).toContain("status: dry-run");
    expect(dryRun.output).toContain("no writes were performed");
    expect(sandbox.listBackupIds()).toEqual([]);
    expect(sandbox.readAuditLog()).toEqual([]);

    const noOp = runToggle(fakeOptions(sandbox, fakeToggleIds.noop));
    expect(noOp).toMatchObject({
      exitCode: 0,
      output: expect.stringContaining("status: no-op"),
    });
    expect(sandbox.listBackupIds()).toEqual([]);
    expect(sandbox.readAuditLog()).toEqual([]);

    const noOpApply = runToggle({
      ...fakeOptions(sandbox, fakeToggleIds.noop),
      apply: true,
    });
    expect(noOpApply).toMatchObject({
      exitCode: 0,
      output: expect.stringContaining("status: no-op"),
    });
    expect(sandbox.listBackupIds()).toEqual([]);
    expect(sandbox.readAuditLog()).toEqual([]);

    const apply = runToggle({
      ...fakeOptions(sandbox),
      apply: true,
      now: () => new Date("2026-04-08T10:00:00.000Z"),
      generateBackupId: () => "backup-toggle",
    });
    expect(apply.exitCode).toBe(0);
    expect(apply.output).toContain("status: applied");
    expect(apply.output).toContain("backupId: backup-toggle");

    const json = runToggle({
      ...fakeOptions(sandbox),
      json: true,
    });
    expect(JSON.parse(json.output)).toMatchObject({
      status: "dry-run",
    });
  });
});
