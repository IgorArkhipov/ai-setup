import { acquireMutationLock, type MutationLockOptions } from "./mutation-lock.js";
import {
  appendAuditEntry,
  deleteBackup,
  initializeMutationState,
  loadBackup,
  persistBackup,
} from "./mutation-state.js";
import {
  applyMutationOperation,
  captureBackupEntry,
  captureSourceFingerprint,
  dedupeMutationTargets,
  mutationTargetKey,
  restoreBackupEntry,
  sourceFingerprintMatches,
} from "./mutation-io.js";
import type {
  BackupEntry,
  FailedApplyAuditEntry,
  MutationBlockedDecision,
  MutationOperation,
  MutationPlan,
  MutationTarget,
  RestoreExecutionResult,
  ToggleExecutionResult,
  TogglePlanDecision,
} from "./mutation-models.js";

export interface MutationEngineOptions extends Pick<MutationLockOptions, "isProcessAlive" | "pid"> {
  appStateRoot: string;
  now?: () => Date;
  generateBackupId?: () => string;
}

function failedAuditEntry(
  options: MutationEngineOptions,
  plan: MutationPlan,
  reason: string,
  rollbackSucceeded: boolean,
  rollbackFailure: string | null,
  backupDeleted: boolean,
): FailedApplyAuditEntry {
  const now = options.now ?? (() => new Date());

  return {
    version: 1,
    event: "failed-apply",
    createdAt: now().toISOString(),
    selection: plan.selection,
    targetEnabled: plan.targetEnabled,
    affectedTargets: plan.affectedTargets,
    reason,
    rollbackSucceeded,
    rollbackFailure,
    backupDeleted,
  };
}

function asBlocked(
  plan: MutationPlan,
  reason: string,
): MutationBlockedDecision {
  return {
    status: "blocked",
    selection: plan.selection,
    targetEnabled: plan.targetEnabled,
    operations: plan.operations,
    affectedTargets: plan.affectedTargets,
    reason,
  };
}

function rollbackEntries(
  entries: Array<Parameters<typeof restoreBackupEntry>[0]>,
  readBlob: Parameters<typeof restoreBackupEntry>[1],
): { rollbackSucceeded: boolean; rollbackFailure: string | null } {
  try {
    for (const entry of entries) {
      restoreBackupEntry(entry, readBlob);
    }

    return {
      rollbackSucceeded: true,
      rollbackFailure: null,
    };
  } catch (error) {
    return {
      rollbackSucceeded: false,
      rollbackFailure: error instanceof Error ? error.message : String(error),
    };
  }
}

function mutationTargetsForOperation(operation: MutationOperation): MutationTarget[] {
  switch (operation.type) {
    case "createFile":
    case "replaceJsonValue":
    case "updateJsonObjectEntry":
    case "removeJsonObjectEntry":
    case "deletePath":
      return [
        {
          type: "path",
          path: operation.path,
        },
      ];
    case "renamePath":
      return [
        {
          type: "path",
          path: operation.toPath,
        },
        {
          type: "path",
          path: operation.fromPath,
        },
      ];
    case "replaceSqliteItemTableValue":
      return [
        {
          type: "sqlite-item",
          databasePath: operation.databasePath,
          tableName: operation.tableName,
          keyColumn: operation.keyColumn,
          keyValue: operation.keyValue,
          valueColumn: operation.valueColumn,
        },
      ];
  }
}

function rollbackEntriesForCompletedOperations(
  manifestEntries: BackupEntry[],
  completedOperations: MutationOperation[],
): BackupEntry[] {
  const entriesByTarget = new Map(
    manifestEntries.map((entry) => [mutationTargetKey(entry.target), entry]),
  );
  const rollbackEntries: BackupEntry[] = [];
  const seenKeys = new Set<string>();

  for (const operation of [...completedOperations].reverse()) {
    for (const target of mutationTargetsForOperation(operation)) {
      const key = mutationTargetKey(target);
      if (seenKeys.has(key)) {
        continue;
      }

      seenKeys.add(key);
      const entry = entriesByTarget.get(key);
      if (entry !== undefined) {
        rollbackEntries.push(entry);
      }
    }
  }

  return rollbackEntries;
}

export function executeTogglePlan(
  decision: TogglePlanDecision,
  options: MutationEngineOptions,
  apply: boolean,
): ToggleExecutionResult {
  initializeMutationState(options.appStateRoot);

  if (decision.status === "blocked") {
    return decision;
  }

  const plan = decision.plan;
  if (plan.operations.length === 0) {
    return {
      status: "no-op",
      selection: plan.selection,
      targetEnabled: plan.targetEnabled,
      operations: plan.operations,
      affectedTargets: plan.affectedTargets,
    };
  }

  if (!apply) {
    return {
      status: "dry-run",
      selection: plan.selection,
      targetEnabled: plan.targetEnabled,
      operations: plan.operations,
      affectedTargets: plan.affectedTargets,
    };
  }

  let lock: ReturnType<typeof acquireMutationLock> | null = null;

  try {
    lock = acquireMutationLock({
      appStateRoot: options.appStateRoot,
      ...(options.now === undefined ? {} : { now: options.now }),
      ...(options.pid === undefined ? {} : { pid: options.pid }),
      ...(options.isProcessAlive === undefined
        ? {}
        : { isProcessAlive: options.isProcessAlive }),
    });
  } catch (error) {
    return asBlocked(
      plan,
      `lock-contention: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  let manifest: ReturnType<typeof persistBackup> | null = null;
  const completedOperations: MutationOperation[] = [];

  try {

    for (const expected of plan.sourceFingerprints) {
      const actual = captureSourceFingerprint(
        expected.type === "path"
          ? {
              type: "path",
              path: expected.path,
            }
          : {
              type: "sqlite-item",
              databasePath: expected.databasePath,
              tableName: expected.tableName,
              keyColumn: expected.keyColumn,
              keyValue: expected.keyValue,
              valueColumn: expected.valueColumn,
            },
      );

      if (!sourceFingerprintMatches(expected, actual)) {
        return asBlocked(
          plan,
          `fingerprint-drift: ${JSON.stringify(actual)}`,
        );
      }
    }

    const capturedEntries = dedupeMutationTargets(plan.affectedTargets).map(
      (target, index) => captureBackupEntry(target, `entry-${index + 1}`),
    );
    manifest = persistBackup({
      appStateRoot: options.appStateRoot,
      selection: plan.selection,
      targetEnabled: plan.targetEnabled,
      affectedTargets: plan.affectedTargets,
      capturedEntries,
      ...(options.now === undefined ? {} : { now: options.now }),
      ...(options.generateBackupId === undefined
        ? {}
        : { generateBackupId: options.generateBackupId }),
    });
    const persistedManifest = manifest;

    try {
      for (const operation of plan.operations) {
        applyMutationOperation(operation);
        completedOperations.push(operation);
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      const rollbackState = rollbackEntries(
        rollbackEntriesForCompletedOperations(persistedManifest.entries, completedOperations),
        (blobId) => loadBackup(options.appStateRoot, persistedManifest.backupId).readBlob(blobId),
      );
      if (rollbackState.rollbackSucceeded) {
        deleteBackup(options.appStateRoot, persistedManifest.backupId);
      }

      appendAuditEntry(
        options.appStateRoot,
        failedAuditEntry(
          options,
          plan,
          reason,
          rollbackState.rollbackSucceeded,
          rollbackState.rollbackFailure,
          rollbackState.rollbackSucceeded,
        ),
      );

      const failed = {
        status: "failed",
        selection: plan.selection,
        targetEnabled: plan.targetEnabled,
        operations: plan.operations,
        affectedTargets: plan.affectedTargets,
        reason,
      } as const;
      if (rollbackState.rollbackFailure !== null) {
        return {
          ...failed,
          rollbackFailure: rollbackState.rollbackFailure,
        };
      }

      return failed;
    }

    appendAuditEntry(options.appStateRoot, {
      version: 1,
      event: "apply",
      createdAt: persistedManifest.createdAt,
      backupId: persistedManifest.backupId,
      selection: plan.selection,
      targetEnabled: plan.targetEnabled,
      affectedTargets: plan.affectedTargets,
    });

    return {
      status: "applied",
      selection: plan.selection,
      targetEnabled: plan.targetEnabled,
      operations: plan.operations,
      affectedTargets: plan.affectedTargets,
      backupId: persistedManifest.backupId,
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    let backupDeleted = false;

    if (manifest !== null && completedOperations.length === 0) {
      deleteBackup(options.appStateRoot, manifest.backupId);
      backupDeleted = true;
    }

    appendAuditEntry(
      options.appStateRoot,
      failedAuditEntry(
        options,
        plan,
        reason,
        true,
        null,
        backupDeleted,
      ),
    );

    return {
      status: "failed",
      selection: plan.selection,
      targetEnabled: plan.targetEnabled,
      operations: plan.operations,
      affectedTargets: plan.affectedTargets,
      reason,
    };
  } finally {
    lock?.release();
  }
}

function validateBackupId(backupId: string): boolean {
  return /^[a-z0-9][a-z0-9-]{2,127}$/i.test(backupId);
}

export function restoreBackupById(
  backupId: string,
  options: MutationEngineOptions,
): RestoreExecutionResult {
  initializeMutationState(options.appStateRoot);

  if (!validateBackupId(backupId)) {
    return {
      status: "failed",
      backupId,
      affectedTargets: [],
      reason: `invalid backup id: ${backupId}`,
    };
  }

  let loaded: ReturnType<typeof loadBackup>;
  try {
    loaded = loadBackup(options.appStateRoot, backupId);
  } catch (error) {
    return {
      status: "failed",
      backupId,
      affectedTargets: [],
      reason: error instanceof Error ? error.message : String(error),
    };
  }

  let lock: ReturnType<typeof acquireMutationLock> | null = null;
  try {
    lock = acquireMutationLock({
      appStateRoot: options.appStateRoot,
      ...(options.now === undefined ? {} : { now: options.now }),
      ...(options.pid === undefined ? {} : { pid: options.pid }),
      ...(options.isProcessAlive === undefined
        ? {}
        : { isProcessAlive: options.isProcessAlive }),
    });
  } catch (error) {
    return {
      status: "failed",
      backupId,
      affectedTargets: loaded.manifest.affectedTargets,
      reason: `lock-contention: ${error instanceof Error ? error.message : String(error)}`,
    };
  }

  try {
    const rollbackEntriesSnapshot = dedupeMutationTargets(
      loaded.manifest.entries.map((entry) => entry.target),
    ).map((target, index) => captureBackupEntry(target, `rollback-${index + 1}`));

    try {
      for (const entry of [...loaded.manifest.entries].reverse()) {
        restoreBackupEntry(entry, loaded.readBlob);
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      const rollbackState = rollbackEntries(
        rollbackEntriesSnapshot.map((snapshot) => snapshot.entry).reverse(),
        (blobId) => {
          const snapshot = rollbackEntriesSnapshot.find(
            (entry) => entry.entry.payload?.storage === "blob" && entry.entry.payload.blobId === blobId,
          );

          if (snapshot?.blob === null || snapshot === undefined) {
            throw new Error(`rollback snapshot blob not found: ${blobId}`);
          }

          return snapshot.blob;
        },
      );

      const failed = {
        status: "failed",
        backupId,
        affectedTargets: loaded.manifest.affectedTargets,
        reason,
      } as const;
      if (rollbackState.rollbackFailure !== null) {
        return {
          ...failed,
          rollbackFailure: rollbackState.rollbackFailure,
        };
      }

      return failed;
    }

    appendAuditEntry(options.appStateRoot, {
      version: 1,
      event: "restore",
      createdAt: (options.now ?? (() => new Date()))().toISOString(),
      backupId,
      affectedTargets: loaded.manifest.affectedTargets,
    });

    return {
      status: "restored",
      backupId,
      affectedTargets: loaded.manifest.affectedTargets,
    };
  } finally {
    lock?.release();
  }
}
