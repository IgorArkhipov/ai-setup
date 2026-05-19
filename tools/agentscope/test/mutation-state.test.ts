import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { captureBackupEntry } from "../src/core/mutation-io.js";
import { acquireMutationLock } from "../src/core/mutation-lock.js";
import {
  appendAuditEntry,
  initializeMutationState,
  listBackupManifests,
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

function writeBackupManifest(
  sandbox: ReturnType<typeof createMutationSandbox>,
  backupId: string,
  manifest: Record<string, unknown>,
): string {
  const backupRoot = path.join(sandbox.appStateRoot, "backups", backupId);
  mkdirSync(path.join(backupRoot, "blobs"), { recursive: true });
  writeFileSync(path.join(backupRoot, "manifest.json"), JSON.stringify(manifest, null, 2));

  return backupRoot;
}

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
    writeBackupManifest(sandbox, "backup-bad", { version: 1, backupId: "backup-bad" });

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
    writeBackupManifest(sandbox, "backup-blob", {
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
    });

    expect(() => loadBackup(sandbox.appStateRoot, "backup-blob").readBlob("../escape.bin")).toThrow(
      "invalid blob id",
    );
  });

  it("rejects missing blob files referenced by valid manifests", () => {
    const sandbox = createMutationSandbox();
    sandboxes.push(sandbox);
    const target = {
      type: "path",
      path: sandbox.pathFor(".fake-toggle/files/original-name.txt"),
    };

    writeBackupManifest(sandbox, "backup-missing-blob", {
      version: 1,
      backupId: "backup-missing-blob",
      createdAt: "2026-04-08T10:00:00.000Z",
      affectedTargets: [target],
      entries: [
        {
          entryId: "entry-1",
          target,
          existed: true,
          pathKind: "file",
          payload: {
            storage: "blob",
            blobId: "missing.bin",
            size: 10,
          },
        },
      ],
    });

    expect(() =>
      loadBackup(sandbox.appStateRoot, "backup-missing-blob").readBlob("missing.bin"),
    ).toThrow("backup blob not found: missing.bin");
  });

  it("loads sqlite-item backup entries with inline payloads", () => {
    const sandbox = createMutationSandbox();
    sandboxes.push(sandbox);
    const target = {
      type: "sqlite-item",
      databasePath: sandbox.pathFor(".fake-toggle/state.sqlite"),
      tableName: "ItemTable",
      keyColumn: "key",
      keyValue: "mcp",
      valueColumn: "value",
    };

    writeBackupManifest(sandbox, "backup-sqlite-inline", {
      version: 1,
      backupId: "backup-sqlite-inline",
      createdAt: "2026-04-08T10:00:00.000Z",
      targetEnabled: null,
      affectedTargets: [target],
      entries: [
        {
          entryId: "entry-sqlite",
          target,
          existed: true,
          payload: {
            storage: "inline",
            dataBase64: Buffer.from("original").toString("base64"),
            size: 8,
          },
        },
      ],
    });

    expect(loadBackup(sandbox.appStateRoot, "backup-sqlite-inline").manifest).toEqual({
      version: 1,
      backupId: "backup-sqlite-inline",
      createdAt: "2026-04-08T10:00:00.000Z",
      selection: null,
      targetEnabled: null,
      affectedTargets: [target],
      entries: [
        {
          entryId: "entry-sqlite",
          target,
          existed: true,
          payload: {
            storage: "inline",
            dataBase64: Buffer.from("original").toString("base64"),
            size: 8,
          },
        },
      ],
    });
  });

  it("loads selected path directory backup entries without payloads", () => {
    const sandbox = createMutationSandbox();
    sandboxes.push(sandbox);
    const target = {
      type: "path",
      path: sandbox.pathFor(".fake-toggle/files"),
    };
    const selection = {
      provider: "fake-toggle",
      kind: "setting",
      layer: "project",
      id: "fake-toggle:setting:project:files",
      displayName: "Fake files",
      enabled: false,
      mutability: "mutable",
      sourcePath: sandbox.projectRoot,
      statePath: sandbox.appStateRoot,
    };

    writeBackupManifest(sandbox, "backup-selected-directory", {
      version: 1,
      backupId: "backup-selected-directory",
      createdAt: "2026-04-08T10:00:00.000Z",
      selection,
      targetEnabled: false,
      affectedTargets: [target],
      entries: [
        {
          entryId: "entry-directory",
          target,
          existed: true,
          pathKind: "directory",
          payload: null,
        },
      ],
    });

    expect(loadBackup(sandbox.appStateRoot, "backup-selected-directory").manifest).toEqual({
      version: 1,
      backupId: "backup-selected-directory",
      createdAt: "2026-04-08T10:00:00.000Z",
      selection,
      targetEnabled: false,
      affectedTargets: [target],
      entries: [
        {
          entryId: "entry-directory",
          target,
          existed: true,
          pathKind: "directory",
          payload: null,
        },
      ],
    });
  });

  it("returns no backup manifests when state has not been initialized", () => {
    const sandbox = createMutationSandbox();
    sandboxes.push(sandbox);

    expect(listBackupManifests(sandbox.appStateRoot)).toEqual([]);
  });

  it("lists backup manifests with deterministic newest-first ordering", () => {
    const sandbox = createMutationSandbox();
    sandboxes.push(sandbox);
    const target = {
      type: "path",
      path: sandbox.pathFor(".fake-toggle/files/original-name.txt"),
    };

    writeBackupManifest(sandbox, "backup-b", {
      version: 1,
      backupId: "backup-b",
      createdAt: "2026-04-08T10:00:00.000Z",
      affectedTargets: [target],
      entries: [
        {
          entryId: "entry-b",
          target,
          existed: false,
          pathKind: null,
          payload: null,
        },
      ],
    });
    writeBackupManifest(sandbox, "backup-a", {
      version: 1,
      backupId: "backup-a",
      createdAt: "2026-04-08T10:00:00.000Z",
      affectedTargets: [target],
      entries: [
        {
          entryId: "entry-a",
          target,
          existed: false,
          pathKind: null,
          payload: null,
        },
      ],
    });
    writeBackupManifest(sandbox, "backup-latest", {
      version: 1,
      backupId: "backup-latest",
      createdAt: "2026-04-08T10:01:00.000Z",
      affectedTargets: [target],
      entries: [
        {
          entryId: "entry-latest",
          target,
          existed: false,
          pathKind: null,
          payload: null,
        },
      ],
    });

    expect(listBackupManifests(sandbox.appStateRoot).map((manifest) => manifest.backupId)).toEqual([
      "backup-latest",
      "backup-a",
      "backup-b",
    ]);
  });
});
