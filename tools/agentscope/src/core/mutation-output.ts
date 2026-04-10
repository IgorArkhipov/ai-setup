import type {
  MutationOperation,
  MutationTarget,
  RestoreExecutionResult,
  ToggleExecutionResult,
} from "./mutation-models.js";

interface SerializedOperation {
  type: MutationOperation["type"];
  summary: string;
}

function describeTarget(target: MutationTarget): string {
  if (target.type === "path") {
    return target.path;
  }

  return [
    target.databasePath,
    target.tableName,
    `${target.keyColumn}=${target.keyValue}`,
    target.valueColumn,
  ].join("::");
}

function describeOperation(operation: MutationOperation): SerializedOperation {
  switch (operation.type) {
    case "createFile":
      return {
        type: operation.type,
        summary: `create file ${operation.path}`,
      };
    case "replaceJsonValue":
      return {
        type: operation.type,
        summary: `replace JSON value ${operation.path} at ${operation.jsonPath.join(".") || "<root>"}`,
      };
    case "updateJsonObjectEntry":
      return {
        type: operation.type,
        summary: `update JSON object entry ${operation.path} at ${operation.jsonPath.join(".")}.${operation.entryKey}`,
      };
    case "removeJsonObjectEntry":
      return {
        type: operation.type,
        summary: `remove JSON object entry ${operation.path} at ${operation.jsonPath.join(".")}.${operation.entryKey}`,
      };
    case "renamePath":
      return {
        type: operation.type,
        summary: `rename path ${operation.fromPath} -> ${operation.toPath}`,
      };
    case "deletePath":
      return {
        type: operation.type,
        summary: `delete path ${operation.path}`,
      };
    case "replaceSqliteItemTableValue":
      return {
        type: operation.type,
        summary: `replace SQLite value ${operation.databasePath} ${operation.tableName}.${operation.valueColumn} where ${operation.keyColumn}=${operation.keyValue}`,
      };
  }
}

export function renderToggleResultHuman(result: ToggleExecutionResult): string {
  const lines: string[] = [`status: ${result.status}`];

  lines.push(`item: ${result.selection.id}`);
  lines.push(`targetEnabled: ${result.targetEnabled}`);

  if ("reason" in result) {
    lines.push(`reason: ${result.reason}`);
  }

  if ("rollbackFailure" in result && result.rollbackFailure !== undefined) {
    lines.push(`rollbackFailure: ${result.rollbackFailure}`);
  }

  if ("backupId" in result) {
    lines.push(`backupId: ${result.backupId}`);
  }

  lines.push("operations:");
  if (result.operations.length === 0) {
    lines.push("- none");
  } else {
    for (const operation of result.operations.map(describeOperation)) {
      lines.push(`- ${operation.summary}`);
    }
  }

  lines.push("affectedTargets:");
  if (result.affectedTargets.length === 0) {
    lines.push("- none");
  } else {
    for (const target of result.affectedTargets) {
      lines.push(`- ${describeTarget(target)}`);
    }
  }

  if (result.status === "dry-run") {
    lines.push("writes: no writes were performed");
  }

  return lines.join("\n");
}

export function renderToggleResultJson(result: ToggleExecutionResult): string {
  return JSON.stringify(
    {
      ...result,
      operations: result.operations.map(describeOperation),
      affectedTargets: result.affectedTargets.map((target) => describeTarget(target)),
      ...(result.status === "dry-run" ? { writes: "no writes were performed" } : {}),
    },
    null,
    2,
  );
}

export function renderRestoreResultHuman(result: RestoreExecutionResult): string {
  const lines = [`status: ${result.status}`, `backupId: ${result.backupId}`];

  if ("reason" in result) {
    lines.push(`reason: ${result.reason}`);
  }

  if ("rollbackFailure" in result && result.rollbackFailure !== undefined) {
    lines.push(`rollbackFailure: ${result.rollbackFailure}`);
  }

  lines.push("affectedTargets:");
  if (result.affectedTargets.length === 0) {
    lines.push("- none");
  } else {
    for (const target of result.affectedTargets) {
      lines.push(`- ${describeTarget(target)}`);
    }
  }

  return lines.join("\n");
}

export function renderRestoreResultJson(result: RestoreExecutionResult): string {
  return JSON.stringify(
    {
      ...result,
      affectedTargets: result.affectedTargets.map((target) => describeTarget(target)),
    },
    null,
    2,
  );
}
