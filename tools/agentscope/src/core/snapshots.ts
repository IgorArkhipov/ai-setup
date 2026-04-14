import { randomBytes } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import {
  buildDiscoveryInventorySummary,
  sortDiscoveryItems,
  sortDiscoveryWarnings,
} from "./discovery.js";
import {
  categoryOrder,
  type DiscoveryInventorySummary,
  type DiscoveryItem,
  type DiscoveryKind,
  type DiscoveryLayer,
  type DiscoveryWarning,
  kindOrder,
  layerOrder,
  providerOrder,
} from "./models.js";
import { getLatestSnapshotPath, getSnapshotHistoryDir } from "./paths.js";

const snapshotVersion = 1;
const defaultMaxHistory = 20;

export interface DiscoverySnapshotV1 {
  version: 1;
  id: string;
  capturedAt: string;
  projectRoot: string;
  items: DiscoveryItem[];
  warnings: DiscoveryWarning[];
  inventory: DiscoveryInventorySummary;
}

export interface BuildDiscoverySnapshotInput {
  projectRoot: string;
  items: DiscoveryItem[];
  warnings: DiscoveryWarning[];
  capturedAt?: string;
  id?: string;
}

export interface WriteDiscoverySnapshotInput extends BuildDiscoverySnapshotInput {
  appStateRoot: string;
  maxHistory?: number;
  randomSuffix?: string;
}

export interface WriteDiscoverySnapshotResult {
  snapshot: DiscoverySnapshotV1;
  latestPath: string;
  historyPath: string;
}

interface SnapshotHistoryEntry {
  entry: string;
  snapshot: DiscoverySnapshotV1;
}

function buildSnapshotId(capturedAt: string, randomSuffix?: string): string {
  const timestamp = new Date(capturedAt).getTime();
  const suffix = randomSuffix ?? randomBytes(3).toString("hex");

  return `snap-${timestamp}-${suffix}`;
}

function deterministicJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function writeFileAtomic(targetPath: string, content: string): void {
  mkdirSync(path.dirname(targetPath), { recursive: true });
  const tempRoot = mkdtempSync(path.join(path.dirname(targetPath), ".agentscope-snapshot-"));
  const tempPath = path.join(tempRoot, path.basename(targetPath));

  try {
    writeFileSync(tempPath, content, "utf8");
    renameSync(tempPath, targetPath);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

function validateSnapshotId(value: unknown): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error("snapshot id must be a non-empty string");
  }

  return value;
}

function validateSnapshotIsoDate(value: unknown): string {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
    throw new Error("snapshot capturedAt must be a valid ISO timestamp");
  }

  return value;
}

function validateSnapshotProjectRoot(value: unknown): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error("snapshot projectRoot must be a non-empty string");
  }

  return value;
}

function validateDiscoveryKind(value: unknown): DiscoveryKind {
  if (typeof value !== "string" || !kindOrder.includes(value as DiscoveryKind)) {
    throw new Error("snapshot item kind is invalid");
  }

  return value as DiscoveryKind;
}

function validateDiscoveryLayer(value: unknown): DiscoveryLayer {
  if (typeof value !== "string" || !layerOrder.includes(value as DiscoveryLayer)) {
    throw new Error("snapshot item layer is invalid");
  }

  return value as DiscoveryLayer;
}

function validateDiscoveryCategory(value: unknown): DiscoveryItem["category"] {
  if (typeof value !== "string" || !categoryOrder.includes(value as DiscoveryItem["category"])) {
    throw new Error("snapshot item category is invalid");
  }

  return value as DiscoveryItem["category"];
}

function validateMutability(value: unknown): DiscoveryItem["mutability"] {
  if (value === "read-write" || value === "read-only" || value === "unsupported") {
    return value;
  }

  throw new Error("snapshot item mutability is invalid");
}

function parseSnapshotItem(value: unknown): DiscoveryItem {
  if (!isRecord(value)) {
    throw new Error("snapshot item must be an object");
  }

  if (
    typeof value.provider !== "string" ||
    !providerOrder.includes(value.provider as DiscoveryItem["provider"])
  ) {
    throw new Error("snapshot item provider is invalid");
  }

  if (
    typeof value.id !== "string" ||
    typeof value.displayName !== "string" ||
    typeof value.enabled !== "boolean" ||
    typeof value.sourcePath !== "string" ||
    typeof value.statePath !== "string"
  ) {
    throw new Error("snapshot item is missing required fields");
  }

  return {
    provider: value.provider as DiscoveryItem["provider"],
    kind: validateDiscoveryKind(value.kind),
    category: validateDiscoveryCategory(value.category),
    layer: validateDiscoveryLayer(value.layer),
    id: value.id,
    displayName: value.displayName,
    enabled: value.enabled,
    mutability: validateMutability(value.mutability),
    sourcePath: value.sourcePath,
    statePath: value.statePath,
  };
}

function parseSnapshotWarning(value: unknown): DiscoveryWarning {
  if (!isRecord(value)) {
    throw new Error("snapshot warning must be an object");
  }

  if (
    typeof value.provider !== "string" ||
    !providerOrder.includes(value.provider as DiscoveryWarning["provider"])
  ) {
    throw new Error("snapshot warning provider is invalid");
  }

  if (typeof value.code !== "string" || typeof value.message !== "string") {
    throw new Error("snapshot warning is missing required fields");
  }

  if (value.layer !== undefined && !layerOrder.includes(value.layer as DiscoveryLayer)) {
    throw new Error("snapshot warning layer is invalid");
  }

  return {
    provider: value.provider as DiscoveryWarning["provider"],
    ...(value.layer === undefined ? {} : { layer: value.layer as DiscoveryLayer }),
    code: value.code,
    message: value.message,
  };
}

function parseSnapshot(raw: string): DiscoverySnapshotV1 {
  const parsed = JSON.parse(raw) as unknown;
  if (!isRecord(parsed)) {
    throw new Error("snapshot must be a JSON object");
  }

  if (parsed.version !== snapshotVersion) {
    throw new Error(`unsupported snapshot schema version: ${JSON.stringify(parsed.version)}`);
  }

  if (
    !Array.isArray(parsed.items) ||
    !Array.isArray(parsed.warnings) ||
    !isRecord(parsed.inventory)
  ) {
    throw new Error("snapshot does not match version 1 shape");
  }

  const items = sortDiscoveryItems(parsed.items.map(parseSnapshotItem));
  const warnings = sortDiscoveryWarnings(parsed.warnings.map(parseSnapshotWarning));
  const inventory = buildDiscoveryInventorySummary(items, warnings);

  if (!isDeepStrictEqual(parsed.inventory, inventory)) {
    throw new Error("snapshot inventory does not match items and warnings");
  }

  return {
    version: 1,
    id: validateSnapshotId(parsed.id),
    capturedAt: validateSnapshotIsoDate(parsed.capturedAt),
    projectRoot: path.resolve(validateSnapshotProjectRoot(parsed.projectRoot)),
    items,
    warnings,
    inventory,
  };
}

function parseSnapshotFile(filePath: string): DiscoverySnapshotV1 {
  try {
    return parseSnapshot(readFileSync(filePath, "utf8"));
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`invalid snapshot file ${filePath}: ${detail}`);
  }
}

function readHistoryEntries(historyDir: string): SnapshotHistoryEntry[] {
  if (!existsSync(historyDir)) {
    return [];
  }

  return readdirSync(historyDir)
    .filter((entry) => entry.endsWith(".json"))
    .map((entry) => ({
      entry,
      snapshot: parseSnapshotFile(path.join(historyDir, entry)),
    }))
    .sort((left, right) => {
      return (
        new Date(right.snapshot.capturedAt).getTime() - new Date(left.snapshot.capturedAt).getTime()
      );
    });
}

function validateMaxHistory(value: number | undefined): number {
  if (value === undefined) {
    return defaultMaxHistory;
  }

  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`snapshot maxHistory must be a positive integer: ${value}`);
  }

  return value;
}

export function buildDiscoverySnapshot(input: BuildDiscoverySnapshotInput): DiscoverySnapshotV1 {
  const capturedAt = input.capturedAt ?? new Date().toISOString();
  const items = sortDiscoveryItems(input.items);
  const warnings = sortDiscoveryWarnings(input.warnings);

  return {
    version: 1,
    id: input.id ?? buildSnapshotId(capturedAt),
    capturedAt,
    projectRoot: path.resolve(input.projectRoot),
    items,
    warnings,
    inventory: buildDiscoveryInventorySummary(items, warnings),
  };
}

export function writeDiscoverySnapshot(
  input: WriteDiscoverySnapshotInput,
): WriteDiscoverySnapshotResult {
  const capturedAt = input.capturedAt ?? new Date().toISOString();
  const maxHistory = validateMaxHistory(input.maxHistory);
  const latestPath = getLatestSnapshotPath(input.appStateRoot, input.projectRoot);
  const historyDir = getSnapshotHistoryDir(input.appStateRoot, input.projectRoot);
  const currentHistory = readHistoryEntries(historyDir);
  const snapshot = buildDiscoverySnapshot({
    projectRoot: input.projectRoot,
    items: input.items,
    warnings: input.warnings,
    capturedAt,
    id: buildSnapshotId(capturedAt, input.randomSuffix),
  });
  const historyPath = path.join(historyDir, `${snapshot.id}.json`);
  const payload = deterministicJson(snapshot);

  mkdirSync(historyDir, { recursive: true });
  writeFileAtomic(historyPath, payload);

  const staleEntries = [
    ...currentHistory,
    {
      entry: path.basename(historyPath),
      snapshot,
    },
  ]
    .sort((left, right) => {
      return (
        new Date(right.snapshot.capturedAt).getTime() - new Date(left.snapshot.capturedAt).getTime()
      );
    })
    .slice(maxHistory);

  for (const stale of staleEntries) {
    rmSync(path.join(historyDir, stale.entry), { force: true });
  }

  writeFileAtomic(latestPath, payload);

  return {
    snapshot,
    latestPath,
    historyPath,
  };
}

export function loadLatestDiscoverySnapshot(input: {
  appStateRoot: string;
  projectRoot: string;
}): DiscoverySnapshotV1 | null {
  const latestPath = getLatestSnapshotPath(input.appStateRoot, input.projectRoot);
  if (!existsSync(latestPath)) {
    return null;
  }

  return parseSnapshotFile(latestPath);
}

export function listSnapshotHistory(input: {
  appStateRoot: string;
  projectRoot: string;
}): DiscoverySnapshotV1[] {
  return readHistoryEntries(getSnapshotHistoryDir(input.appStateRoot, input.projectRoot)).map(
    (entry) => entry.snapshot,
  );
}
