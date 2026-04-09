import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import {
  applyMutationOperation,
  captureBackupEntry,
  captureSourceFingerprint,
  createSqliteItemsDatabase,
  readBackupPayload,
  readSqliteItemValue,
  restoreBackupEntry,
  writeSqliteItemValue,
} from "../src/core/mutation-io.js";
import { createMutationSandbox } from "./support/mutation-sandbox.js";

const sandboxes: Array<ReturnType<typeof createMutationSandbox>> = [];

afterEach(() => {
  while (sandboxes.length > 0) {
    sandboxes.pop()?.cleanup();
  }
});

describe("mutation io", () => {
  it("applies every supported mutation operation and updates fingerprints", () => {
    const sandbox = createMutationSandbox();
    sandboxes.push(sandbox);
    const generatedPath = sandbox.pathFor(".fake-toggle/generated/enabled.txt");
    const settingsPath = sandbox.pathFor(".fake-toggle/json/settings.json");
    const originalPath = sandbox.pathFor(".fake-toggle/files/original-name.txt");
    const renamedPath = sandbox.pathFor(".fake-toggle/files/renamed-name.txt");
    const deletedPath = sandbox.pathFor(".fake-toggle/files/delete-me.txt");
    const sqlitePath = sandbox.pathFor(".fake-toggle/sqlite/items.db");

    const beforeFingerprint = captureSourceFingerprint({
      type: "path",
      path: settingsPath,
    });
    const beforeSqliteFingerprint = captureSourceFingerprint({
      type: "sqlite-item",
      databasePath: sqlitePath,
      tableName: "items",
      keyColumn: "key",
      keyValue: "feature",
      valueColumn: "value",
    });

    applyMutationOperation({
      type: "createFile",
      path: generatedPath,
      content: new TextEncoder().encode("enabled\n"),
    });
    applyMutationOperation({
      type: "replaceJsonValue",
      path: settingsPath,
      jsonPath: ["feature", "enabled"],
      value: true,
    });
    applyMutationOperation({
      type: "updateJsonObjectEntry",
      path: settingsPath,
      jsonPath: ["feature", "plugins"],
      entryKey: "demo",
      value: { enabled: true },
    });
    applyMutationOperation({
      type: "removeJsonObjectEntry",
      path: settingsPath,
      jsonPath: ["feature", "plugins"],
      entryKey: "legacy",
    });
    applyMutationOperation({
      type: "renamePath",
      fromPath: originalPath,
      toPath: renamedPath,
    });
    applyMutationOperation({
      type: "deletePath",
      path: deletedPath,
    });
    applyMutationOperation({
      type: "replaceSqliteItemTableValue",
      databasePath: sqlitePath,
      tableName: "items",
      keyColumn: "key",
      keyValue: "feature",
      valueColumn: "value",
      value: Uint8Array.from([1, 2, 3, 4]),
    });

    expect(readFileSync(generatedPath, "utf8")).toBe("enabled\n");
    expect(sandbox.readJson<{ feature: { enabled: boolean; plugins: Record<string, unknown> } }>(
      ".fake-toggle/json/settings.json",
    )).toEqual({
      feature: {
        enabled: true,
        plugins: {
          demo: {
            enabled: true,
          },
        },
      },
    });
    expect(existsSync(originalPath)).toBe(false);
    expect(readFileSync(renamedPath, "utf8")).toBe("original name\n");
    expect(existsSync(deletedPath)).toBe(false);
    expect(readSqliteItemValue(sqlitePath, "feature")).toEqual(Uint8Array.from([1, 2, 3, 4]));

    expect(captureSourceFingerprint({ type: "path", path: settingsPath })).not.toEqual(
      beforeFingerprint,
    );
    expect(
      captureSourceFingerprint({
        type: "sqlite-item",
        databasePath: sqlitePath,
        tableName: "items",
        keyColumn: "key",
        keyValue: "feature",
        valueColumn: "value",
      }),
    ).not.toEqual(beforeSqliteFingerprint);
  });

  it("preserves byte-for-byte equality for binary file backups and restore", () => {
    const sandbox = createMutationSandbox();
    sandboxes.push(sandbox);
    const binaryPath = sandbox.pathFor(".fake-toggle/files/binary.bin");
    const original = Uint8Array.from([0, 255, 1, 128, 7, 42]);
    writeFileSync(binaryPath, original);

    const captured = captureBackupEntry(
      {
        type: "path",
        path: binaryPath,
      },
      "entry-1",
    );

    writeFileSync(binaryPath, Uint8Array.from([9, 9, 9]));
    restoreBackupEntry(captured.entry, (blobId) => {
      if (captured.entry.payload?.storage !== "blob" || captured.blob === null) {
        throw new Error(`unexpected blob request: ${blobId}`);
      }

      return captured.blob;
    });

    expect(readFileSync(binaryPath)).toEqual(Buffer.from(original));
    expect(
      readBackupPayload(captured.entry, (blobId) => {
        if (captured.entry.payload?.storage !== "blob" || captured.blob === null) {
          throw new Error(`unexpected blob request: ${blobId}`);
        }

        return captured.blob;
      }),
    ).toEqual(Buffer.from(original));
  });

  it("restores SQLite values from backup snapshots", () => {
    const sandbox = createMutationSandbox();
    sandboxes.push(sandbox);
    const sqlitePath = sandbox.pathFor(".fake-toggle/sqlite/roundtrip.db");
    createSqliteItemsDatabase(sqlitePath);
    writeSqliteItemValue(sqlitePath, "feature", Uint8Array.from([10, 11, 12]));

    const captured = captureBackupEntry(
      {
        type: "sqlite-item",
        databasePath: sqlitePath,
        tableName: "items",
        keyColumn: "key",
        keyValue: "feature",
        valueColumn: "value",
      },
      "entry-1",
    );

    writeSqliteItemValue(sqlitePath, "feature", Uint8Array.from([1, 2]));
    restoreBackupEntry(captured.entry, (blobId) => {
      if (captured.entry.payload?.storage !== "blob" || captured.blob === null) {
        throw new Error(`unexpected blob request: ${blobId}`);
      }

      return captured.blob;
    });

    expect(readSqliteItemValue(sqlitePath, "feature")).toEqual(
      Uint8Array.from([10, 11, 12]),
    );
  });

  it("rejects unsafe SQLite identifiers", () => {
    const sandbox = createMutationSandbox();
    sandboxes.push(sandbox);
    const sqlitePath = sandbox.pathFor(".fake-toggle/sqlite/unsafe.db");
    createSqliteItemsDatabase(sqlitePath);

    expect(() =>
      captureSourceFingerprint({
        type: "sqlite-item",
        databasePath: sqlitePath,
        tableName: "items; DROP TABLE items;--",
        keyColumn: "key",
        keyValue: "feature",
        valueColumn: "value",
      }),
    ).toThrow("invalid sqlite identifier");

    expect(() =>
      applyMutationOperation({
        type: "replaceSqliteItemTableValue",
        databasePath: sqlitePath,
        tableName: "items",
        keyColumn: "key",
        keyValue: "feature",
        valueColumn: "value); DELETE FROM items;--",
        value: Uint8Array.from([1, 2, 3]),
      }),
    ).toThrow("invalid sqlite identifier");
  });
});
