import type { AgentScopeConfig } from "./config.js";
import type {
  DiscoveryItem,
  DiscoveryKind,
  DiscoveryLayer,
  DiscoveryMutability,
  DiscoveryProvider,
} from "./models.js";

export interface SelectedItemIdentity {
  provider: DiscoveryProvider;
  kind: DiscoveryKind;
  layer: DiscoveryLayer;
  id: string;
  displayName: string;
  enabled: boolean;
  mutability: DiscoveryMutability;
  sourcePath: string;
  statePath: string;
}

export interface TogglePlanInput {
  config: AgentScopeConfig;
  homeDir: string;
  item: DiscoveryItem;
  targetEnabled: boolean;
}

export interface PathMutationTarget {
  type: "path";
  path: string;
}

export interface SqliteItemMutationTarget {
  type: "sqlite-item";
  databasePath: string;
  tableName: string;
  keyColumn: string;
  keyValue: string;
  valueColumn: string;
}

export type MutationTarget = PathMutationTarget | SqliteItemMutationTarget;

export interface CreateFileOperation {
  type: "createFile";
  path: string;
  content: Uint8Array;
}

export interface ReplaceJsonValueOperation {
  type: "replaceJsonValue";
  path: string;
  jsonPath: Array<string | number>;
  value: unknown;
}

export interface UpdateJsonObjectEntryOperation {
  type: "updateJsonObjectEntry";
  path: string;
  jsonPath: Array<string | number>;
  entryKey: string;
  value: unknown;
}

export interface RemoveJsonObjectEntryOperation {
  type: "removeJsonObjectEntry";
  path: string;
  jsonPath: Array<string | number>;
  entryKey: string;
}

export interface RenamePathOperation {
  type: "renamePath";
  fromPath: string;
  toPath: string;
}

export interface DeletePathOperation {
  type: "deletePath";
  path: string;
}

export interface ReplaceSqliteItemTableValueOperation {
  type: "replaceSqliteItemTableValue";
  databasePath: string;
  tableName: string;
  keyColumn: string;
  keyValue: string;
  valueColumn: string;
  value: Uint8Array;
}

export type MutationOperation =
  | CreateFileOperation
  | ReplaceJsonValueOperation
  | UpdateJsonObjectEntryOperation
  | RemoveJsonObjectEntryOperation
  | RenamePathOperation
  | DeletePathOperation
  | ReplaceSqliteItemTableValueOperation;

export interface PathSourceFingerprint {
  type: "path";
  path: string;
  exists: boolean;
  digest: string | null;
}

export interface SqliteItemSourceFingerprint {
  type: "sqlite-item";
  databasePath: string;
  tableName: string;
  keyColumn: string;
  keyValue: string;
  valueColumn: string;
  exists: boolean;
  digest: string | null;
}

export type SourceFingerprint = PathSourceFingerprint | SqliteItemSourceFingerprint;

interface InlineBackupPayload {
  storage: "inline";
  dataBase64: string;
  size: number;
}

interface BlobBackupPayload {
  storage: "blob";
  blobId: string;
  size: number;
}

export type BackupPayloadPointer = InlineBackupPayload | BlobBackupPayload;

export interface PathBackupEntry {
  entryId: string;
  target: PathMutationTarget;
  existed: boolean;
  pathKind: "file" | "directory" | null;
  payload: BackupPayloadPointer | null;
}

export interface SqliteItemBackupEntry {
  entryId: string;
  target: SqliteItemMutationTarget;
  existed: boolean;
  payload: BackupPayloadPointer | null;
}

export type BackupEntry = PathBackupEntry | SqliteItemBackupEntry;

export interface BackupManifest {
  version: 1;
  backupId: string;
  createdAt: string;
  selection: SelectedItemIdentity | null;
  targetEnabled: boolean | null;
  affectedTargets: MutationTarget[];
  entries: BackupEntry[];
}

export interface ApplyAuditEntry {
  version: 1;
  event: "apply";
  createdAt: string;
  backupId: string;
  selection: SelectedItemIdentity | null;
  targetEnabled: boolean;
  affectedTargets: MutationTarget[];
}

export interface RestoreAuditEntry {
  version: 1;
  event: "restore";
  createdAt: string;
  backupId: string;
  affectedTargets: MutationTarget[];
}

export interface FailedApplyAuditEntry {
  version: 1;
  event: "failed-apply";
  createdAt: string;
  selection: SelectedItemIdentity | null;
  targetEnabled: boolean;
  affectedTargets: MutationTarget[];
  reason: string;
  rollbackSucceeded: boolean;
  rollbackFailure: string | null;
  backupDeleted: boolean;
}

export type AuditEntry = ApplyAuditEntry | RestoreAuditEntry | FailedApplyAuditEntry;

export interface MutationPlan {
  selection: SelectedItemIdentity;
  targetEnabled: boolean;
  operations: MutationOperation[];
  affectedTargets: MutationTarget[];
  sourceFingerprints: SourceFingerprint[];
}

export interface MutationBlockedDecision {
  status: "blocked";
  selection: SelectedItemIdentity;
  targetEnabled: boolean;
  operations: MutationOperation[];
  affectedTargets: MutationTarget[];
  reason: string;
}

export interface PlannedToggleDecision {
  status: "planned";
  plan: MutationPlan;
}

export type TogglePlanDecision = MutationBlockedDecision | PlannedToggleDecision;

export interface ToggleDryRunResult {
  status: "dry-run";
  selection: SelectedItemIdentity;
  targetEnabled: boolean;
  operations: MutationOperation[];
  affectedTargets: MutationTarget[];
}

export interface ToggleNoOpResult {
  status: "no-op";
  selection: SelectedItemIdentity;
  targetEnabled: boolean;
  operations: MutationOperation[];
  affectedTargets: MutationTarget[];
}

export interface ToggleAppliedResult {
  status: "applied";
  selection: SelectedItemIdentity;
  targetEnabled: boolean;
  operations: MutationOperation[];
  affectedTargets: MutationTarget[];
  backupId: string;
}

export interface ToggleFailedResult {
  status: "failed";
  selection: SelectedItemIdentity;
  targetEnabled: boolean;
  operations: MutationOperation[];
  affectedTargets: MutationTarget[];
  reason: string;
  backupId?: string;
  rollbackFailure?: string;
}

export type ToggleExecutionResult =
  | MutationBlockedDecision
  | ToggleDryRunResult
  | ToggleNoOpResult
  | ToggleAppliedResult
  | ToggleFailedResult;

export interface RestoreSucceededResult {
  status: "restored";
  backupId: string;
  affectedTargets: MutationTarget[];
}

export interface RestoreFailedResult {
  status: "failed";
  backupId: string;
  affectedTargets: MutationTarget[];
  reason: string;
  rollbackFailure?: string;
}

export type RestoreExecutionResult = RestoreSucceededResult | RestoreFailedResult;

export function toSelectedItemIdentity(item: DiscoveryItem): SelectedItemIdentity {
  return {
    provider: item.provider,
    kind: item.kind,
    layer: item.layer,
    id: item.id,
    displayName: item.displayName,
    enabled: item.enabled,
    mutability: item.mutability,
    sourcePath: item.sourcePath,
    statePath: item.statePath,
  };
}
