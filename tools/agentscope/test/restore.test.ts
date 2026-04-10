import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { acquireMutationLock } from "../src/core/mutation-lock.js";
import { loadBackup } from "../src/core/mutation-state.js";
import { runRestore } from "../src/commands/restore.js";
import { runToggle } from "../src/commands/toggle.js";
import { createClaudeSandbox } from "./support/claude-sandbox.js";
import { createMutationSandbox } from "./support/mutation-sandbox.js";
import { fakeToggleIds, fakeToggleProvider } from "./support/fake-toggle-provider.js";

type RestoreSandbox =
  | ReturnType<typeof createMutationSandbox>
  | ReturnType<typeof createClaudeSandbox>;

const sandboxes: RestoreSandbox[] = [];

afterEach(() => {
  while (sandboxes.length > 0) {
    sandboxes.pop()?.cleanup();
  }
});

function fakeOptions(sandbox: RestoreSandbox) {
  return {
    cwd: sandbox.projectRoot,
    homeDir: sandbox.homeDir,
    projectRoot: sandbox.projectRoot,
    appStateRoot: sandbox.appStateRoot,
    cursorRoot: sandbox.cursorRoot,
  };
}

describe("runRestore", () => {
  it("restores a valid backup id and renders deterministic JSON", () => {
    const sandbox = createMutationSandbox();
    sandboxes.push(sandbox);

    const applied = runToggle({
      ...fakeOptions(sandbox),
      provider: "codex",
      kind: "plugin",
      layer: "project",
      id: fakeToggleIds.full,
      apply: true,
      now: () => new Date("2026-04-08T10:00:00.000Z"),
      generateBackupId: () => "backup-restore",
      providers: [fakeToggleProvider],
    });
    expect(applied.exitCode).toBe(0);
    expect(loadBackup(sandbox.appStateRoot, "backup-restore").manifest.backupId).toBe(
      "backup-restore",
    );

    const restored = runRestore({
      ...fakeOptions(sandbox),
      backupId: "backup-restore",
    });
    expect(restored.exitCode).toBe(0);
    expect(restored.output).toContain("status: restored");
    expect(restored.output).toContain("backupId: backup-restore");

    const json = runRestore({
      ...fakeOptions(sandbox),
      backupId: "backup-restore",
      json: true,
    });
    expect(JSON.parse(json.output)).toMatchObject({
      status: "restored",
      backupId: "backup-restore",
    });
  });

  it("rejects missing, malformed, missing-manifest, invalid-manifest, and locked restore input", () => {
    const sandbox = createMutationSandbox();
    sandboxes.push(sandbox);

    expect(runRestore(fakeOptions(sandbox))).toEqual({
      exitCode: 1,
      output: "missing backup id",
    });
    expect(
      JSON.parse(
        runRestore({
          ...fakeOptions(sandbox),
          json: true,
        }).output,
      ),
    ).toEqual({
      status: "failed",
      reason: "missing backup id",
    });

    expect(
      runRestore({
        ...fakeOptions(sandbox),
        backupId: "bad id",
      }),
    ).toMatchObject({
      exitCode: 1,
      output: expect.stringContaining("invalid backup id"),
    });

    expect(
      runRestore({
        ...fakeOptions(sandbox),
        backupId: "backup-missing",
      }),
    ).toMatchObject({
      exitCode: 1,
      output: expect.stringContaining("backup manifest not found"),
    });

    const invalidBackupRoot = path.join(
      sandbox.appStateRoot,
      "backups",
      "backup-invalid",
    );
    mkdirSync(invalidBackupRoot, { recursive: true });
    writeFileSync(
      path.join(invalidBackupRoot, "manifest.json"),
      JSON.stringify({ version: 1, backupId: "backup-invalid" }),
    );
    expect(
      runRestore({
        ...fakeOptions(sandbox),
        backupId: "backup-invalid",
      }),
    ).toMatchObject({
      exitCode: 1,
      output: expect.stringContaining("createdAt"),
    });

    runToggle({
      ...fakeOptions(sandbox),
      provider: "codex",
      kind: "plugin",
      layer: "project",
      id: fakeToggleIds.full,
      apply: true,
      now: () => new Date("2026-04-08T10:00:00.000Z"),
      generateBackupId: () => "backup-locked",
      providers: [fakeToggleProvider],
    });
    const lock = acquireMutationLock({
      appStateRoot: sandbox.appStateRoot,
      pid: 123,
      isProcessAlive: () => true,
    });
    expect(
      runRestore({
        ...fakeOptions(sandbox),
        backupId: "backup-locked",
        isProcessAlive: () => true,
      }),
    ).toMatchObject({
      exitCode: 1,
      output: expect.stringContaining("lock-contention"),
    });
    lock.release();
  });

  it("restores a real Claude skill backup", () => {
    const sandbox = createClaudeSandbox();
    sandboxes.push(sandbox);

    const applied = runToggle({
      ...fakeOptions(sandbox),
      provider: "claude",
      kind: "skill",
      layer: "project",
      id: "claude:project:skill:example-claude-skill",
      apply: true,
      now: () => new Date("2026-04-09T12:00:00.000Z"),
      generateBackupId: () => "backup-claude-skill",
    });
    expect(applied.exitCode).toBe(0);

    const restored = runRestore({
      ...fakeOptions(sandbox),
      backupId: "backup-claude-skill",
    });
    expect(restored.exitCode).toBe(0);
    expect(restored.output).toContain("backup-claude-skill");
  });
});
