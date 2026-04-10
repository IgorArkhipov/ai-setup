import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { executeTogglePlan, restoreBackupById } from "../src/core/mutation-engine.js";
import { captureSourceFingerprint, dedupeMutationTargets } from "../src/core/mutation-io.js";
import { acquireMutationLock } from "../src/core/mutation-lock.js";
import { fakeToggleIds, fakeToggleProvider } from "./support/fake-toggle-provider.js";
import { createMutationSandbox } from "./support/mutation-sandbox.js";

const sandboxes: Array<ReturnType<typeof createMutationSandbox>> = [];

afterEach(() => {
  while (sandboxes.length > 0) {
    sandboxes.pop()?.cleanup();
  }
});

function planFor(sandbox: ReturnType<typeof createMutationSandbox>, itemId: string) {
  const discovery = fakeToggleProvider.discover({
    config: sandbox.config,
    homeDir: sandbox.homeDir,
  });
  const item = discovery.items.find((entry) => entry.id === itemId);
  if (item === undefined || fakeToggleProvider.planToggle === undefined) {
    throw new Error(`missing test item: ${itemId}`);
  }

  return fakeToggleProvider.planToggle({
    config: sandbox.config,
    homeDir: sandbox.homeDir,
    item,
    targetEnabled: !item.enabled,
  });
}

function addLargeTargetToPlan(
  sandbox: ReturnType<typeof createMutationSandbox>,
  decision: ReturnType<typeof planFor>,
  fileName = "zz-large.bin",
) {
  if (decision.status !== "planned") {
    throw new Error("expected planned decision");
  }

  const largePath = sandbox.pathFor(`.fake-toggle/files/${fileName}`);
  writeFileSync(largePath, Buffer.alloc(2048, 7));
  const largeTarget = {
    type: "path" as const,
    path: largePath,
  };
  decision.plan.affectedTargets = [...decision.plan.affectedTargets, largeTarget];
  decision.plan.sourceFingerprints = [
    ...decision.plan.sourceFingerprints,
    captureSourceFingerprint(largeTarget),
  ];

  const largeIndex = dedupeMutationTargets(decision.plan.affectedTargets).findIndex(
    (target) => target.type === "path" && target.path === largePath,
  );
  if (largeIndex === -1) {
    throw new Error("missing large target");
  }

  return {
    largePath,
    largeBlobPath: path.join(
      sandbox.appStateRoot,
      "backups",
      "backup-rollback",
      "blobs",
      `entry-${largeIndex + 1}.bin`,
    ),
  };
}

describe("mutation engine", () => {
  it("returns dry-run success without writing state", () => {
    const sandbox = createMutationSandbox();
    sandboxes.push(sandbox);

    const result = executeTogglePlan(
      planFor(sandbox, fakeToggleIds.full),
      {
        appStateRoot: sandbox.appStateRoot,
      },
      false,
    );

    expect(result).toMatchObject({
      status: "dry-run",
      selection: {
        id: fakeToggleIds.full,
      },
    });
    expect(sandbox.listBackupIds()).toEqual([]);
    expect(sandbox.readAuditLog()).toEqual([]);
  });

  it("returns an explicit no-op when the requested target already matches live state", () => {
    const sandbox = createMutationSandbox();
    sandboxes.push(sandbox);

    const result = executeTogglePlan(
      planFor(sandbox, fakeToggleIds.noop),
      {
        appStateRoot: sandbox.appStateRoot,
      },
      false,
    );

    expect(result).toMatchObject({
      status: "no-op",
      selection: {
        id: fakeToggleIds.noop,
      },
    });
    expect(sandbox.listBackupIds()).toEqual([]);
    expect(sandbox.readAuditLog()).toEqual([]);
  });

  it("blocks apply when source fingerprints drift", () => {
    const sandbox = createMutationSandbox();
    sandboxes.push(sandbox);
    const decision = planFor(sandbox, fakeToggleIds.full);
    writeFileSync(
      sandbox.pathFor(".fake-toggle/json/settings.json"),
      `${JSON.stringify({ feature: { enabled: "drifted", plugins: {} } }, null, 2)}\n`,
    );

    const result = executeTogglePlan(
      decision,
      {
        appStateRoot: sandbox.appStateRoot,
      },
      true,
    );

    expect(result).toMatchObject({
      status: "blocked",
      reason: expect.stringContaining("fingerprint-drift"),
    });
    expect(sandbox.listBackupIds()).toEqual([]);
  });

  it("blocks apply on lock contention", () => {
    const sandbox = createMutationSandbox();
    sandboxes.push(sandbox);
    const lock = acquireMutationLock({
      appStateRoot: sandbox.appStateRoot,
      pid: 100,
      isProcessAlive: () => true,
    });

    const blocked = executeTogglePlan(
      planFor(sandbox, fakeToggleIds.full),
      {
        appStateRoot: sandbox.appStateRoot,
        pid: 201,
        isProcessAlive: () => true,
      },
      true,
    );

    expect(blocked).toMatchObject({
      status: "blocked",
      reason: expect.stringContaining("lock-contention"),
    });

    lock.release();
  });

  it("applies a plan, creates a backup, and appends an audit entry", () => {
    const sandbox = createMutationSandbox();
    sandboxes.push(sandbox);

    const result = executeTogglePlan(
      planFor(sandbox, fakeToggleIds.full),
      {
        appStateRoot: sandbox.appStateRoot,
        now: () => new Date("2026-04-08T10:00:00.000Z"),
        generateBackupId: () => "backup-001",
      },
      true,
    );

    expect(result).toMatchObject({
      status: "applied",
      backupId: "backup-001",
    });
    expect(sandbox.listBackupIds()).toEqual(["backup-001"]);
    expect(sandbox.readAuditLog()).toEqual([
      expect.objectContaining({
        event: "apply",
        backupId: "backup-001",
      }),
    ]);
  });

  it("rolls back a failed apply after the audit flow starts", () => {
    const sandbox = createMutationSandbox();
    sandboxes.push(sandbox);
    const decision = planFor(sandbox, fakeToggleIds.full);
    const { largeBlobPath } = addLargeTargetToPlan(sandbox, decision);

    if (decision.status !== "planned") {
      throw new Error("expected planned decision");
    }
    decision.plan.operations.splice(1, 0, {
      type: "deletePath",
      path: largeBlobPath,
    });
    decision.plan.operations[2] = {
      type: "renamePath",
      fromPath: sandbox.pathFor(".fake-toggle/files/missing.txt"),
      toPath: sandbox.pathFor(".fake-toggle/files/unreachable.txt"),
    };

    const result = executeTogglePlan(
      decision,
      {
        appStateRoot: sandbox.appStateRoot,
        now: () => new Date("2026-04-08T10:00:00.000Z"),
        generateBackupId: () => "backup-rollback",
      },
      true,
    );

    expect(result).toMatchObject({
      status: "failed",
      reason: expect.stringContaining("missing.txt"),
    });
    expect(sandbox.listBackupIds()).toEqual([]);
    expect(
      sandbox.readJson<{ feature: { enabled: boolean } }>(".fake-toggle/json/settings.json").feature
        .enabled,
    ).toBe(false);
    expect(sandbox.readAuditLog()).toEqual([
      expect.objectContaining({
        event: "failed-apply",
        backupDeleted: true,
        rollbackSucceeded: true,
      }),
    ]);
  });

  it("surfaces rollback failure when a completed target cannot be restored", () => {
    const sandbox = createMutationSandbox();
    sandboxes.push(sandbox);
    const decision = planFor(sandbox, fakeToggleIds.full);
    const { largePath, largeBlobPath } = addLargeTargetToPlan(sandbox, decision);

    if (decision.status !== "planned") {
      throw new Error("expected planned decision");
    }
    decision.plan.operations.splice(
      0,
      0,
      {
        type: "deletePath",
        path: largePath,
      },
      {
        type: "deletePath",
        path: largeBlobPath,
      },
      {
        type: "renamePath",
        fromPath: sandbox.pathFor(".fake-toggle/files/missing.txt"),
        toPath: sandbox.pathFor(".fake-toggle/files/unreachable.txt"),
      },
    );

    const result = executeTogglePlan(
      decision,
      {
        appStateRoot: sandbox.appStateRoot,
        now: () => new Date("2026-04-08T10:00:00.000Z"),
        generateBackupId: () => "backup-rollback",
      },
      true,
    );

    expect(result).toMatchObject({
      status: "failed",
      reason: expect.stringContaining("missing.txt"),
      rollbackFailure: expect.stringContaining("backup blob not found"),
    });
    expect(sandbox.listBackupIds()).toEqual(["backup-rollback"]);
    expect(sandbox.readAuditLog()).toEqual([
      expect.objectContaining({
        event: "failed-apply",
        backupDeleted: false,
        rollbackSucceeded: false,
        rollbackFailure: expect.stringContaining("backup blob not found"),
      }),
    ]);
  });

  it("records failed-apply when guarded setup fails before mutations begin", () => {
    const sandbox = createMutationSandbox();
    sandboxes.push(sandbox);
    const blockedBackupPath = path.join(sandbox.appStateRoot, "backups", "backup-blocked");
    mkdirSync(path.join(sandbox.appStateRoot, "backups"), { recursive: true });
    writeFileSync(blockedBackupPath, "not a directory");

    const result = executeTogglePlan(
      planFor(sandbox, fakeToggleIds.full),
      {
        appStateRoot: sandbox.appStateRoot,
        now: () => new Date("2026-04-08T10:00:00.000Z"),
        generateBackupId: () => "backup-blocked",
      },
      true,
    );

    expect(result).toMatchObject({
      status: "failed",
      reason: expect.stringContaining("not a directory"),
    });
    expect(sandbox.readAuditLog()).toEqual([
      expect.objectContaining({
        event: "failed-apply",
        rollbackSucceeded: true,
        backupDeleted: false,
      }),
    ]);
  });

  it("restores a saved backup and reports invalid backup input", () => {
    const sandbox = createMutationSandbox();
    sandboxes.push(sandbox);
    const applied = executeTogglePlan(
      planFor(sandbox, fakeToggleIds.full),
      {
        appStateRoot: sandbox.appStateRoot,
        now: () => new Date("2026-04-08T10:00:00.000Z"),
        generateBackupId: () => "backup-restore",
      },
      true,
    );

    expect(applied).toMatchObject({
      status: "applied",
      backupId: "backup-restore",
    });

    const restored = restoreBackupById("backup-restore", {
      appStateRoot: sandbox.appStateRoot,
      now: () => new Date("2026-04-08T10:05:00.000Z"),
    });
    expect(restored).toEqual({
      status: "restored",
      backupId: "backup-restore",
      affectedTargets: expect.any(Array),
    });
    expect(
      sandbox.readJson<{ feature: { enabled: boolean } }>(".fake-toggle/json/settings.json").feature
        .enabled,
    ).toBe(false);

    expect(
      restoreBackupById("bad id", {
        appStateRoot: sandbox.appStateRoot,
      }),
    ).toMatchObject({
      status: "failed",
      reason: "invalid backup id: bad id",
    });
    expect(
      restoreBackupById("backup-missing", {
        appStateRoot: sandbox.appStateRoot,
      }),
    ).toMatchObject({
      status: "failed",
      reason: "backup manifest not found for backup-missing",
    });
  });

  it("rolls back partially restored targets when restore fails mid-flight", () => {
    const sandbox = createMutationSandbox();
    sandboxes.push(sandbox);
    const applied = executeTogglePlan(
      planFor(sandbox, fakeToggleIds.full),
      {
        appStateRoot: sandbox.appStateRoot,
        now: () => new Date("2026-04-08T10:00:00.000Z"),
        generateBackupId: () => "backup-restore-failure",
      },
      true,
    );
    expect(applied).toMatchObject({
      status: "applied",
      backupId: "backup-restore-failure",
    });

    const sqliteBeforeRestore = sandbox.readSqliteValue(".fake-toggle/sqlite/items.db", "feature");
    const manifestPath = path.join(
      sandbox.appStateRoot,
      "backups",
      "backup-restore-failure",
      "manifest.json",
    );
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
      entries: Array<{
        target: { type: "path" | "sqlite-item"; path?: string };
        payload: unknown;
      }>;
    };
    const settingsPath = sandbox.pathFor(".fake-toggle/json/settings.json");
    const settingsEntry = manifest.entries.find(
      (entry) => entry.target.type === "path" && entry.target.path === settingsPath,
    );
    if (settingsEntry === undefined) {
      throw new Error("missing settings backup entry");
    }
    settingsEntry.payload = {
      storage: "blob",
      blobId: "missing.bin",
      size: 512,
    };
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

    const restored = restoreBackupById("backup-restore-failure", {
      appStateRoot: sandbox.appStateRoot,
    });

    expect(restored).toMatchObject({
      status: "failed",
      reason: "backup blob not found: missing.bin",
    });
    expect(sandbox.readSqliteValue(".fake-toggle/sqlite/items.db", "feature")).toEqual(
      sqliteBeforeRestore,
    );
    expect(sandbox.readAuditLog()).toEqual([
      expect.objectContaining({
        event: "apply",
        backupId: "backup-restore-failure",
      }),
    ]);
  });
});
