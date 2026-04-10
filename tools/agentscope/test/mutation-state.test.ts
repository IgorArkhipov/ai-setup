import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { captureBackupEntry } from "../src/core/mutation-io.js";
import { acquireMutationLock } from "../src/core/mutation-lock.js";
import {
  appendAuditEntry,
  initializeMutationState,
  loadBackup,
  persistBackup,
} from "../src/core/mutation-state.js";
import { createMutationSandbox } from "./support/mutation-sandbox.js";

const sandboxes: Array<ReturnType<typeof createMutationSandbox>> = [];

afterEach(() => {
  while (sandboxes.length > 0) {
    sandboxes.pop()?.cleanup();
  }
});

describe("mutation state", () => {
  it("creates state directories, persists backups, reloads manifests, and appends audit logs", () => {
    const sandbox = createMutationSandbox();
    sandboxes.push(sandbox);
    initializeMutationState(sandbox.appStateRoot);

    expect(existsSync(path.join(sandbox.appStateRoot, "locks"))).toBe(true);
    expect(existsSync(path.join(sandbox.appStateRoot, "backups"))).toBe(true);
    expect(existsSync(path.join(sandbox.appStateRoot, "audit"))).toBe(true);

    const generatedPath = sandbox.pathFor(".fake-toggle/files/original-name.txt");
    const captured = captureBackupEntry(
      {
        type: "path",
        path: generatedPath,
      },
      "entry-1",
      1,
    );
    const manifest = persistBackup({
      appStateRoot: sandbox.appStateRoot,
      selection: null,
      targetEnabled: true,
      affectedTargets: [
        {
          type: "path",
          path: generatedPath,
        },
      ],
      capturedEntries: [captured],
      now: () => new Date("2026-04-08T10:00:00.000Z"),
      generateBackupId: () => "backup-001",
    });

    expect(manifest.backupId).toBe("backup-001");
    expect(
      existsSync(path.join(sandbox.appStateRoot, "backups", "backup-001", "manifest.json")),
    ).toBe(true);
    expect(
      existsSync(path.join(sandbox.appStateRoot, "backups", "backup-001", "blobs", "entry-1.bin")),
    ).toBe(true);

    const loaded = loadBackup(sandbox.appStateRoot, "backup-001");
    expect(loaded.manifest).toMatchObject({
      backupId: "backup-001",
      createdAt: "2026-04-08T10:00:00.000Z",
    });

    appendAuditEntry(sandbox.appStateRoot, {
      version: 1,
      event: "apply",
      createdAt: "2026-04-08T10:00:01.000Z",
      backupId: "backup-001",
      selection: null,
      targetEnabled: true,
      affectedTargets: manifest.affectedTargets,
    });
    appendAuditEntry(sandbox.appStateRoot, {
      version: 1,
      event: "restore",
      createdAt: "2026-04-08T10:00:02.000Z",
      backupId: "backup-001",
      affectedTargets: manifest.affectedTargets,
    });

    expect(sandbox.readAuditLog()).toEqual([
      {
        version: 1,
        event: "apply",
        createdAt: "2026-04-08T10:00:01.000Z",
        backupId: "backup-001",
        selection: null,
        targetEnabled: true,
        affectedTargets: manifest.affectedTargets,
      },
      {
        version: 1,
        event: "restore",
        createdAt: "2026-04-08T10:00:02.000Z",
        backupId: "backup-001",
        affectedTargets: manifest.affectedTargets,
      },
    ]);
  });

  it("rejects invalid manifests during restore lookup", () => {
    const sandbox = createMutationSandbox();
    sandboxes.push(sandbox);
    const backupRoot = path.join(sandbox.appStateRoot, "backups", "backup-bad");
    mkdirSync(backupRoot, { recursive: true });
    writeFileSync(
      path.join(backupRoot, "manifest.json"),
      JSON.stringify({ version: 1, backupId: "backup-bad" }),
    );

    expect(() => loadBackup(sandbox.appStateRoot, "backup-bad")).toThrow(
      "backup manifest createdAt must be a non-empty string",
    );
  });

  it("acquires the advisory lock and rejects lock contention with a live owner", () => {
    const sandbox = createMutationSandbox();
    sandboxes.push(sandbox);
    const lock = acquireMutationLock({
      appStateRoot: sandbox.appStateRoot,
      now: () => new Date("2026-04-08T10:00:00.000Z"),
      pid: 123,
      isProcessAlive: () => true,
    });

    expect(
      JSON.parse(readFileSync(path.join(sandbox.appStateRoot, "locks", "mutation.lock"), "utf8")),
    ).toEqual({
      pid: 123,
      acquiredAt: "2026-04-08T10:00:00.000Z",
    });

    expect(() =>
      acquireMutationLock({
        appStateRoot: sandbox.appStateRoot,
        pid: 456,
        isProcessAlive: () => true,
      }),
    ).toThrow("mutation lock is already held by pid 123");

    lock.release();
    expect(existsSync(path.join(sandbox.appStateRoot, "locks", "mutation.lock"))).toBe(false);
  });

  it("reclaims a stale advisory lock from a dead process", () => {
    const sandbox = createMutationSandbox();
    sandboxes.push(sandbox);
    mkdirSync(path.join(sandbox.appStateRoot, "locks"), { recursive: true });
    writeFileSync(
      path.join(sandbox.appStateRoot, "locks", "mutation.lock"),
      JSON.stringify({
        pid: 123,
        acquiredAt: "2026-04-08T10:00:00.000Z",
      }),
    );

    const lock = acquireMutationLock({
      appStateRoot: sandbox.appStateRoot,
      now: () => new Date("2026-04-08T10:05:00.000Z"),
      pid: 456,
      isProcessAlive: () => false,
    });

    expect(
      JSON.parse(readFileSync(path.join(sandbox.appStateRoot, "locks", "mutation.lock"), "utf8")),
    ).toEqual({
      pid: 456,
      acquiredAt: "2026-04-08T10:05:00.000Z",
    });

    lock.release();
  });

  it("rejects invalid blob ids loaded from a manifest", () => {
    const sandbox = createMutationSandbox();
    sandboxes.push(sandbox);
    const backupRoot = path.join(sandbox.appStateRoot, "backups", "backup-blob");
    mkdirSync(path.join(backupRoot, "blobs"), { recursive: true });
    writeFileSync(
      path.join(backupRoot, "manifest.json"),
      JSON.stringify(
        {
          version: 1,
          backupId: "backup-blob",
          createdAt: "2026-04-08T10:00:00.000Z",
          selection: null,
          targetEnabled: true,
          affectedTargets: [
            {
              type: "path",
              path: sandbox.pathFor(".fake-toggle/files/original-name.txt"),
            },
          ],
          entries: [
            {
              entryId: "entry-1",
              target: {
                type: "path",
                path: sandbox.pathFor(".fake-toggle/files/original-name.txt"),
              },
              existed: true,
              pathKind: "file",
              payload: {
                storage: "blob",
                blobId: "../escape.bin",
                size: 10,
              },
            },
          ],
        },
        null,
        2,
      ),
    );

    expect(() => loadBackup(sandbox.appStateRoot, "backup-blob").readBlob("../escape.bin")).toThrow(
      "invalid blob id",
    );
  });
});
