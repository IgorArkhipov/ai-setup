import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import type {
  AuditEntry,
  BackupEntry,
  BackupManifest,
  MutationTarget,
  SelectedItemIdentity,
} from "./mutation-models.js";
import type { CapturedBackupEntry } from "./mutation-io.js";

export interface MutationStateOptions {
  appStateRoot: string;
  now?: () => Date;
  generateBackupId?: () => string;
}

export interface PersistBackupInput {
  appStateRoot: string;
  selection: SelectedItemIdentity | null;
  targetEnabled: boolean | null;
  affectedTargets: MutationTarget[];
  capturedEntries: CapturedBackupEntry[];
  now?: () => Date;
  generateBackupId?: () => string;
}

export interface LoadedBackup {
  manifest: BackupManifest;
  readBlob: (blobId: string) => Uint8Array;
}

function ensureStateDirectories(appStateRoot: string): void {
  mkdirSync(path.join(appStateRoot, "locks"), { recursive: true });
  mkdirSync(path.join(appStateRoot, "backups"), { recursive: true });
  mkdirSync(path.join(appStateRoot, "audit"), { recursive: true });
}

function validateSelection(value: unknown): SelectedItemIdentity | null {
  if (value === null) {
    return null;
  }

  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("backup manifest selection must be an object or null");
  }

  const selection = value as Record<string, unknown>;
  for (const key of [
    "provider",
    "kind",
    "layer",
    "id",
    "displayName",
    "sourcePath",
    "statePath",
    "mutability",
  ] as const) {
    if (typeof selection[key] !== "string") {
      throw new Error(`backup manifest selection.${key} must be a string`);
    }
  }

  if (typeof selection.enabled !== "boolean") {
    throw new Error("backup manifest selection.enabled must be a boolean");
  }

  return selection as unknown as SelectedItemIdentity;
}

function validateTarget(value: unknown): MutationTarget {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("backup manifest target must be an object");
  }

  const target = value as Record<string, unknown>;
  if (target.type === "path" && typeof target.path === "string") {
    return {
      type: "path",
      path: target.path,
    };
  }

  if (
    target.type === "sqlite-item" &&
    typeof target.databasePath === "string" &&
    typeof target.tableName === "string" &&
    typeof target.keyColumn === "string" &&
    typeof target.keyValue === "string" &&
    typeof target.valueColumn === "string"
  ) {
    return {
      type: "sqlite-item",
      databasePath: target.databasePath,
      tableName: target.tableName,
      keyColumn: target.keyColumn,
      keyValue: target.keyValue,
      valueColumn: target.valueColumn,
    };
  }

  throw new Error("backup manifest target shape is invalid");
}

function validateEntry(value: unknown): BackupEntry {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("backup manifest entry must be an object");
  }

  const entry = value as Record<string, unknown>;
  if (typeof entry.entryId !== "string") {
    throw new Error("backup manifest entry.entryId must be a string");
  }

  if (typeof entry.existed !== "boolean") {
    throw new Error("backup manifest entry.existed must be a boolean");
  }

  const target = validateTarget(entry.target);
  const payloadValue = entry.payload;
  let payload: BackupEntry["payload"];
  if (payloadValue === null) {
    payload = null;
  } else if (
    typeof payloadValue === "object" &&
    payloadValue !== null &&
    !Array.isArray(payloadValue) &&
    typeof (payloadValue as Record<string, unknown>).storage === "string"
  ) {
    const rawPayload = payloadValue as Record<string, unknown>;
    if (
      rawPayload.storage === "inline" &&
      typeof rawPayload.dataBase64 === "string" &&
      typeof rawPayload.size === "number"
    ) {
      payload = {
        storage: "inline",
        dataBase64: rawPayload.dataBase64,
        size: rawPayload.size,
      };
    } else if (
      rawPayload.storage === "blob" &&
      typeof rawPayload.blobId === "string" &&
      typeof rawPayload.size === "number"
    ) {
      payload = {
        storage: "blob",
        blobId: rawPayload.blobId,
        size: rawPayload.size,
      };
    } else {
      throw new Error("backup manifest entry payload is invalid");
    }
  } else {
    throw new Error("backup manifest entry payload is invalid");
  }

  if (target.type === "path") {
    const pathKind =
      entry.pathKind === "file" || entry.pathKind === "directory"
        ? entry.pathKind
        : entry.pathKind === null
          ? null
          : undefined;

    if (pathKind === undefined) {
      throw new Error("backup manifest path entry pathKind is invalid");
    }

    return {
      entryId: entry.entryId,
      target,
      existed: entry.existed,
      pathKind,
      payload,
    };
  }

  return {
    entryId: entry.entryId,
    target,
    existed: entry.existed,
    payload,
  };
}

function validateManifest(raw: string): BackupManifest {
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  if (parsed.version !== 1) {
    throw new Error("backup manifest version must be 1");
  }

  if (typeof parsed.backupId !== "string" || parsed.backupId.length === 0) {
    throw new Error("backup manifest backupId must be a non-empty string");
  }

  if (typeof parsed.createdAt !== "string" || parsed.createdAt.length === 0) {
    throw new Error("backup manifest createdAt must be a non-empty string");
  }

  if (!Array.isArray(parsed.affectedTargets)) {
    throw new Error("backup manifest affectedTargets must be an array");
  }

  if (!Array.isArray(parsed.entries) || parsed.entries.length === 0) {
    throw new Error("backup manifest entries must be a non-empty array");
  }

  return {
    version: 1,
    backupId: parsed.backupId,
    createdAt: parsed.createdAt,
    selection: validateSelection(parsed.selection ?? null),
    targetEnabled:
      typeof parsed.targetEnabled === "boolean" ? parsed.targetEnabled : null,
    affectedTargets: parsed.affectedTargets.map((target) => validateTarget(target)),
    entries: parsed.entries.map((entry) => validateEntry(entry)),
  };
}

function assertValidBlobId(blobId: string): void {
  if (!/^[A-Za-z0-9._-]+$/.test(blobId)) {
    throw new Error(`invalid blob id: ${blobId}`);
  }
}

export function initializeMutationState(appStateRoot: string): void {
  ensureStateDirectories(appStateRoot);
}

export function persistBackup(
  input: PersistBackupInput,
): BackupManifest {
  ensureStateDirectories(input.appStateRoot);
  const now = input.now ?? (() => new Date());
  const generateBackupId =
    input.generateBackupId ??
    (() => `backup-${now().toISOString().replaceAll(/[:.]/g, "-")}`);
  const backupId = generateBackupId();
  const backupRoot = path.join(input.appStateRoot, "backups", backupId);
  const blobsRoot = path.join(backupRoot, "blobs");
  mkdirSync(blobsRoot, { recursive: true });

  const manifest: BackupManifest = {
    version: 1,
    backupId,
    createdAt: now().toISOString(),
    selection: input.selection,
    targetEnabled: input.targetEnabled,
    affectedTargets: input.affectedTargets,
    entries: input.capturedEntries.map((captured) => captured.entry),
  };

  for (const captured of input.capturedEntries) {
    const payload = captured.entry.payload;
    if (payload?.storage === "blob") {
      if (captured.blob === null) {
        throw new Error(`missing blob payload for ${captured.entry.entryId}`);
      }

      writeFileSync(path.join(blobsRoot, payload.blobId), captured.blob);
    }
  }

  writeFileSync(
    path.join(backupRoot, "manifest.json"),
    JSON.stringify(manifest, null, 2),
    { encoding: "utf8" },
  );

  return manifest;
}

export function deleteBackup(appStateRoot: string, backupId: string): void {
  rmSync(path.join(appStateRoot, "backups", backupId), {
    recursive: true,
    force: true,
  });
}

export function loadBackup(appStateRoot: string, backupId: string): LoadedBackup {
  const backupRoot = path.join(appStateRoot, "backups", backupId);
  const manifestPath = path.join(backupRoot, "manifest.json");

  if (!existsSync(manifestPath)) {
    throw new Error(`backup manifest not found for ${backupId}`);
  }

  const manifest = validateManifest(readFileSync(manifestPath, "utf8"));

  return {
    manifest,
    readBlob(blobId: string): Uint8Array {
      assertValidBlobId(blobId);
      const blobPath = path.join(backupRoot, "blobs", blobId);
      if (!existsSync(blobPath)) {
        throw new Error(`backup blob not found: ${blobId}`);
      }

      return readFileSync(blobPath);
    },
  };
}

export function appendAuditEntry(
  appStateRoot: string,
  entry: AuditEntry,
): void {
  ensureStateDirectories(appStateRoot);
  const auditPath = path.join(appStateRoot, "audit", "log.jsonl");
  writeFileSync(auditPath, `${JSON.stringify(entry)}\n`, {
    encoding: "utf8",
    flag: "a",
  });
}
