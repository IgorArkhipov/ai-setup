import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import type {
  BackupEntry,
  MutationOperation,
  MutationTarget,
  PathBackupEntry,
  SourceFingerprint,
  SqliteItemBackupEntry,
} from "./mutation-models.js";

interface DirectorySnapshot {
  kind: "directory";
  directories: string[];
  files: Array<{
    relativePath: string;
    dataBase64: string;
  }>;
}

export interface CapturedBackupEntry {
  entry: BackupEntry;
  blob: Uint8Array | null;
}

function sha256(input: Uint8Array | string): string {
  return createHash("sha256").update(input).digest("hex");
}

function deterministicJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function ensureParentDirectory(filePath: string): void {
  mkdirSync(path.dirname(filePath), { recursive: true });
}

function writeFileAtomic(targetPath: string, content: Uint8Array): void {
  ensureParentDirectory(targetPath);
  const tempRoot = mkdtempSync(path.join(path.dirname(targetPath), ".agentscope-"));
  const tempPath = path.join(tempRoot, path.basename(targetPath));

  try {
    writeFileSync(tempPath, content);
    renameSync(tempPath, targetPath);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

function readJsonDocument(filePath: string): unknown {
  const raw = readFileSync(filePath, "utf8");
  return JSON.parse(raw);
}

function assertObjectTarget(
  value: unknown,
  filePath: string,
  jsonPath: Array<string | number>,
): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(
      `${filePath} path ${jsonPath.join(".")} must resolve to a JSON object`,
    );
  }

  return value as Record<string, unknown>;
}

function resolveJsonPath(
  document: unknown,
  jsonPath: Array<string | number>,
  filePath: string,
): unknown {
  let current = document;

  for (const segment of jsonPath) {
    if (typeof segment === "number") {
      if (!Array.isArray(current) || segment < 0 || segment >= current.length) {
        throw new Error(`${filePath} path ${jsonPath.join(".")} is missing`);
      }
      current = current[segment];
      continue;
    }

    if (typeof current !== "object" || current === null || Array.isArray(current)) {
      throw new Error(`${filePath} path ${jsonPath.join(".")} is missing`);
    }

    if (!Object.hasOwn(current, segment)) {
      throw new Error(`${filePath} path ${jsonPath.join(".")} is missing`);
    }

    current = (current as Record<string, unknown>)[segment];
  }

  return current;
}

function updateJsonDocument(
  filePath: string,
  updater: (document: unknown) => unknown,
): void {
  const current = readJsonDocument(filePath);
  const updated = updater(current);
  writeFileAtomic(filePath, Buffer.from(deterministicJson(updated)));
}

function readDirectorySnapshot(targetPath: string): Uint8Array {
  const directories = new Set<string>(["."]);
  const files: DirectorySnapshot["files"] = [];
  const stack = [targetPath];

  while (stack.length > 0) {
    const current = stack.pop();
    if (current === undefined) {
      continue;
    }

    const relativeDirectory = path.relative(targetPath, current) || ".";
    directories.add(relativeDirectory);

    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const entryPath = path.join(current, entry.name);
      const relativePath = path.relative(targetPath, entryPath);

      if (entry.isDirectory()) {
        directories.add(relativePath);
        stack.push(entryPath);
        continue;
      }

      if (!entry.isFile()) {
        throw new Error(`Unsupported path snapshot entry: ${entryPath}`);
      }

      files.push({
        relativePath,
        dataBase64: Buffer.from(readFileSync(entryPath)).toString("base64"),
      });
    }
  }

  files.sort((left, right) => left.relativePath.localeCompare(right.relativePath));

  return Buffer.from(
    deterministicJson({
      kind: "directory",
      directories: [...directories].sort((left, right) => left.localeCompare(right)),
      files,
    } satisfies DirectorySnapshot),
  );
}

function restoreDirectorySnapshot(targetPath: string, payload: Uint8Array): void {
  const parsed = JSON.parse(Buffer.from(payload).toString("utf8")) as DirectorySnapshot;
  if (parsed.kind !== "directory" || !Array.isArray(parsed.directories) || !Array.isArray(parsed.files)) {
    throw new Error(`Invalid directory snapshot for ${targetPath}`);
  }

  rmSync(targetPath, { recursive: true, force: true });
  mkdirSync(targetPath, { recursive: true });

  for (const relativeDirectory of parsed.directories) {
    if (relativeDirectory === ".") {
      continue;
    }

    mkdirSync(path.join(targetPath, relativeDirectory), { recursive: true });
  }

  for (const file of parsed.files) {
    const filePath = path.join(targetPath, file.relativePath);
    ensureParentDirectory(filePath);
    writeFileSync(filePath, Buffer.from(file.dataBase64, "base64"));
  }
}

function readPathBytes(targetPath: string): { bytes: Uint8Array; pathKind: "file" | "directory" } {
  const stats = statSync(targetPath);
  if (stats.isDirectory()) {
    return {
      bytes: readDirectorySnapshot(targetPath),
      pathKind: "directory",
    };
  }

  if (!stats.isFile()) {
    throw new Error(`Unsupported path target: ${targetPath}`);
  }

  return {
    bytes: readFileSync(targetPath),
    pathKind: "file",
  };
}

function assertSqliteIdentifier(identifier: string, label: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(identifier)) {
    throw new Error(`invalid sqlite identifier for ${label}: ${identifier}`);
  }

  return identifier;
}

function sqliteSelectValue(target: Extract<MutationTarget, { type: "sqlite-item" }>): Uint8Array | null {
  if (!existsSync(target.databasePath)) {
    return null;
  }

  const tableName = assertSqliteIdentifier(target.tableName, "tableName");
  const keyColumn = assertSqliteIdentifier(target.keyColumn, "keyColumn");
  const valueColumn = assertSqliteIdentifier(target.valueColumn, "valueColumn");

  const db = new DatabaseSync(target.databasePath);
  try {
    const statement = db.prepare(
      `SELECT ${valueColumn} AS value FROM ${tableName} WHERE ${keyColumn} = ?`,
    );
    const row = statement.get(target.keyValue) as { value?: Uint8Array | Buffer } | undefined;
    if (row?.value === undefined) {
      return null;
    }

    return row.value instanceof Uint8Array ? row.value : Buffer.from(row.value);
  } finally {
    db.close();
  }
}

function sqliteReplaceValue(
  target: Extract<MutationTarget, { type: "sqlite-item" }>,
  value: Uint8Array,
): void {
  ensureParentDirectory(target.databasePath);
  const tableName = assertSqliteIdentifier(target.tableName, "tableName");
  const keyColumn = assertSqliteIdentifier(target.keyColumn, "keyColumn");
  const valueColumn = assertSqliteIdentifier(target.valueColumn, "valueColumn");
  const db = new DatabaseSync(target.databasePath);

  try {
    db.exec("BEGIN");
    db.prepare(
      `INSERT INTO ${tableName} (${keyColumn}, ${valueColumn})
       VALUES (?, ?)
       ON CONFLICT(${keyColumn})
       DO UPDATE SET ${valueColumn} = excluded.${valueColumn}`,
    ).run(target.keyValue, Buffer.from(value));
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  } finally {
    db.close();
  }
}

function sqliteDeleteValue(
  target: Extract<MutationTarget, { type: "sqlite-item" }>,
): void {
  if (!existsSync(target.databasePath)) {
    return;
  }

  const tableName = assertSqliteIdentifier(target.tableName, "tableName");
  const keyColumn = assertSqliteIdentifier(target.keyColumn, "keyColumn");

  const db = new DatabaseSync(target.databasePath);
  try {
    db.exec("BEGIN");
    db.prepare(`DELETE FROM ${tableName} WHERE ${keyColumn} = ?`).run(target.keyValue);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  } finally {
    db.close();
  }
}

function sqliteFingerprintDigest(
  target: Extract<MutationTarget, { type: "sqlite-item" }>,
  value: Uint8Array,
): string {
  return sha256(
    Buffer.concat([
      Buffer.from(target.databasePath),
      Buffer.from("\u0000"),
      Buffer.from(target.tableName),
      Buffer.from("\u0000"),
      Buffer.from(target.keyColumn),
      Buffer.from("\u0000"),
      Buffer.from(target.keyValue),
      Buffer.from("\u0000"),
      Buffer.from(target.valueColumn),
      Buffer.from("\u0000"),
      Buffer.from(value),
    ]),
  );
}

function restorePathEntry(entry: PathBackupEntry, payload: Uint8Array | null): void {
  if (!entry.existed) {
    rmSync(entry.target.path, { recursive: true, force: true });
    return;
  }

  if (payload === null) {
    throw new Error(`Missing backup payload for ${entry.target.path}`);
  }

  if (entry.pathKind === "directory") {
    restoreDirectorySnapshot(entry.target.path, payload);
    return;
  }

  if (entry.pathKind !== "file") {
    throw new Error(`Invalid path backup metadata for ${entry.target.path}`);
  }

  writeFileAtomic(entry.target.path, payload);
}

function restoreSqliteEntry(
  entry: SqliteItemBackupEntry,
  payload: Uint8Array | null,
): void {
  if (!entry.existed) {
    sqliteDeleteValue(entry.target);
    return;
  }

  if (payload === null) {
    throw new Error(`Missing SQLite backup payload for ${entry.target.databasePath}`);
  }

  sqliteReplaceValue(entry.target, payload);
}

export function mutationTargetKey(target: MutationTarget): string {
  if (target.type === "path") {
    return `path:${target.path}`;
  }

  return [
    "sqlite-item",
    target.databasePath,
    target.tableName,
    target.keyColumn,
    target.keyValue,
    target.valueColumn,
  ].join(":");
}

export function dedupeMutationTargets(targets: MutationTarget[]): MutationTarget[] {
  const unique = new Map<string, MutationTarget>();

  for (const target of targets) {
    unique.set(mutationTargetKey(target), target);
  }

  return [...unique.values()].sort((left, right) =>
    mutationTargetKey(left).localeCompare(mutationTargetKey(right)),
  );
}

export function captureSourceFingerprint(target: MutationTarget): SourceFingerprint {
  if (target.type === "path") {
    if (!existsSync(target.path)) {
      return {
        type: "path",
        path: target.path,
        exists: false,
        digest: null,
      };
    }

    const snapshot = readPathBytes(target.path);
    return {
      type: "path",
      path: target.path,
      exists: true,
      digest: sha256(snapshot.bytes),
    };
  }

  const value = sqliteSelectValue(target);
  return {
    type: "sqlite-item",
    databasePath: target.databasePath,
    tableName: target.tableName,
    keyColumn: target.keyColumn,
    keyValue: target.keyValue,
    valueColumn: target.valueColumn,
    exists: value !== null,
    digest: value === null ? null : sqliteFingerprintDigest(target, value),
  };
}

export function captureSourceFingerprints(targets: MutationTarget[]): SourceFingerprint[] {
  return dedupeMutationTargets(targets).map((target) => captureSourceFingerprint(target));
}

export function sourceFingerprintMatches(
  expected: SourceFingerprint,
  actual: SourceFingerprint,
): boolean {
  return JSON.stringify(expected) === JSON.stringify(actual);
}

export function captureBackupEntry(
  target: MutationTarget,
  entryId: string,
  inlineLimit = 1024,
): CapturedBackupEntry {
  if (target.type === "path") {
    if (!existsSync(target.path)) {
      return {
        entry: {
          entryId,
          target,
          existed: false,
          pathKind: null,
          payload: null,
        },
        blob: null,
      };
    }

    const snapshot = readPathBytes(target.path);
    const useInline = snapshot.bytes.byteLength <= inlineLimit;
    return {
      entry: {
        entryId,
        target,
        existed: true,
        pathKind: snapshot.pathKind,
        payload: useInline
          ? {
              storage: "inline",
              dataBase64: Buffer.from(snapshot.bytes).toString("base64"),
              size: snapshot.bytes.byteLength,
            }
          : {
              storage: "blob",
              blobId: `${entryId}.bin`,
              size: snapshot.bytes.byteLength,
            },
      },
      blob: useInline ? null : snapshot.bytes,
    };
  }

  const value = sqliteSelectValue(target);
  if (value === null) {
    return {
      entry: {
        entryId,
        target,
        existed: false,
        payload: null,
      },
      blob: null,
    };
  }

  const useInline = value.byteLength <= inlineLimit;
  return {
    entry: {
      entryId,
      target,
      existed: true,
      payload: useInline
        ? {
            storage: "inline",
            dataBase64: Buffer.from(value).toString("base64"),
            size: value.byteLength,
          }
        : {
            storage: "blob",
            blobId: `${entryId}.bin`,
            size: value.byteLength,
          },
    },
    blob: useInline ? null : value,
  };
}

export function readBackupPayload(
  entry: BackupEntry,
  readBlob: (blobId: string) => Uint8Array,
): Uint8Array | null {
  const payload = entry.payload;
  if (payload === null) {
    return null;
  }

  if (payload.storage === "inline") {
    return Buffer.from(payload.dataBase64, "base64");
  }

  return readBlob(payload.blobId);
}

export function restoreBackupEntry(
  entry: BackupEntry,
  readBlob: (blobId: string) => Uint8Array,
): void {
  if (entry.target.type === "path") {
    restorePathEntry(entry as PathBackupEntry, readBackupPayload(entry, readBlob));
    return;
  }

  restoreSqliteEntry(entry as SqliteItemBackupEntry, readBackupPayload(entry, readBlob));
}

export function applyMutationOperation(operation: MutationOperation): void {
  switch (operation.type) {
    case "createFile":
      writeFileAtomic(operation.path, operation.content);
      return;
    case "replaceJsonValue":
      updateJsonDocument(operation.path, (document) => {
        const parentPath = operation.jsonPath.slice(0, -1);
        const lastSegment = operation.jsonPath.at(-1);
        if (lastSegment === undefined) {
          return operation.value;
        }

        const parent = resolveJsonPath(document, parentPath, operation.path);
        if (typeof lastSegment === "number") {
          if (!Array.isArray(parent) || lastSegment < 0 || lastSegment >= parent.length) {
            throw new Error(
              `${operation.path} path ${operation.jsonPath.join(".")} is missing`,
            );
          }
          parent[lastSegment] = operation.value;
          return document;
        }

        const objectParent = assertObjectTarget(parent, operation.path, parentPath);
        objectParent[lastSegment] = operation.value;
        return document;
      });
      return;
    case "updateJsonObjectEntry":
      updateJsonDocument(operation.path, (document) => {
        const target = resolveJsonPath(document, operation.jsonPath, operation.path);
        const objectTarget = assertObjectTarget(target, operation.path, operation.jsonPath);
        objectTarget[operation.entryKey] = operation.value;
        return document;
      });
      return;
    case "removeJsonObjectEntry":
      updateJsonDocument(operation.path, (document) => {
        const target = resolveJsonPath(document, operation.jsonPath, operation.path);
        const objectTarget = assertObjectTarget(target, operation.path, operation.jsonPath);
        delete objectTarget[operation.entryKey];
        return document;
      });
      return;
    case "renamePath":
      ensureParentDirectory(operation.toPath);
      renameSync(operation.fromPath, operation.toPath);
      return;
    case "deletePath":
      if (existsSync(operation.path)) {
        rmSync(operation.path, { recursive: true, force: true });
      }
      return;
    case "replaceSqliteItemTableValue":
      sqliteReplaceValue(
        {
          type: "sqlite-item",
          databasePath: operation.databasePath,
          tableName: operation.tableName,
          keyColumn: operation.keyColumn,
          keyValue: operation.keyValue,
          valueColumn: operation.valueColumn,
        },
        operation.value,
      );
      return;
  }
}

export function createSqliteItemsDatabase(databasePath: string): void {
  ensureParentDirectory(databasePath);
  const db = new DatabaseSync(databasePath);
  try {
    db.exec(
      "CREATE TABLE IF NOT EXISTS items (key TEXT PRIMARY KEY, value BLOB NOT NULL)",
    );
  } finally {
    db.close();
  }
}

export function writeSqliteItemValue(databasePath: string, key: string, value: Uint8Array): void {
  createSqliteItemsDatabase(databasePath);
  sqliteReplaceValue(
    {
      type: "sqlite-item",
      databasePath,
      tableName: "items",
      keyColumn: "key",
      keyValue: key,
      valueColumn: "value",
    },
    value,
  );
}

export function readSqliteItemValue(databasePath: string, key: string): Uint8Array | null {
  return sqliteSelectValue({
    type: "sqlite-item",
    databasePath,
    tableName: "items",
    keyColumn: "key",
    keyValue: key,
    valueColumn: "value",
  });
}

export function createTempDirectory(prefix = "agentscope-io-"): string {
  return mkdtempSync(path.join(tmpdir(), prefix));
}
