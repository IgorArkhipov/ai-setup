import { buildDiscoveryInventorySummary } from "../core/discovery.js";
import type { DiscoveryItem, DiscoveryResult } from "../core/models.js";
import type { MutationOperation, ToggleExecutionResult } from "../core/mutation-models.js";
import type { WriteDiscoverySnapshotResult } from "../core/snapshots.js";
import type { DashboardStageChange, DashboardState } from "./state.js";

export interface DashboardPlanPreview {
  status: "planned" | "blocked" | "no-op" | "failed";
  targetEnabled: boolean;
  operations: string[];
  reason?: string;
}

export interface DashboardStagePreview extends DashboardStageChange {
  status: DashboardPlanPreview["status"] | "unknown";
  operations: string[];
  reason?: string;
}

export interface DashboardRenderInput {
  state: DashboardState;
  discovery: DiscoveryResult;
  items: DiscoveryItem[];
  selected?: DiscoveryItem | undefined;
  selectedPreview?: DashboardPlanPreview | undefined;
  stagedPreviews: DashboardStagePreview[];
  applyResults?: ToggleExecutionResult[] | undefined;
  snapshot?: WriteDiscoverySnapshotResult | undefined;
  message?: string | undefined;
}

function operationSummary(operation: MutationOperation): string {
  switch (operation.type) {
    case "createFile":
      return `create file ${operation.path}`;
    case "replaceJsonValue":
      return `replace JSON value ${operation.path} at ${operation.jsonPath.join(".") || "<root>"}`;
    case "updateJsonObjectEntry":
      return `update JSON object entry ${operation.path} at ${operation.jsonPath.join(".")}.${operation.entryKey}`;
    case "removeJsonObjectEntry":
      return `remove JSON object entry ${operation.path} at ${operation.jsonPath.join(".")}.${operation.entryKey}`;
    case "renamePath":
      return `rename path ${operation.fromPath} -> ${operation.toPath}`;
    case "deletePath":
      return `delete path ${operation.path}`;
    case "replaceSqliteItemTableValue":
      return `replace SQLite value ${operation.databasePath} ${operation.tableName}.${operation.valueColumn} where ${operation.keyColumn}=${operation.keyValue}`;
  }
}

function filtersLine(state: DashboardState): string {
  const filters = state.filters;

  return [
    `provider=${filters.provider ?? "all"}`,
    `layer=${filters.layer ?? "all"}`,
    `kind=${filters.kind ?? "all"}`,
    `category=${filters.category ?? "all"}`,
    `search=${filters.search ?? "<none>"}`,
  ].join(" ");
}

function renderPreview(lines: string[], preview: DashboardPlanPreview | undefined): void {
  lines.push("Toggle preview:");
  if (preview === undefined) {
    lines.push("- unavailable");
    return;
  }

  lines.push(`status: ${preview.status}`);
  lines.push(`targetEnabled: ${preview.targetEnabled}`);
  if (preview.reason !== undefined) {
    lines.push(`reason: ${preview.reason}`);
  }
  lines.push("operations:");
  if (preview.operations.length === 0) {
    lines.push("- none");
    return;
  }

  for (const operation of preview.operations) {
    lines.push(`- ${operation}`);
  }
}

export function previewFromToggleResult(result: ToggleExecutionResult): DashboardPlanPreview {
  return {
    status: result.status === "dry-run" || result.status === "applied" ? "planned" : result.status,
    targetEnabled: result.targetEnabled,
    operations: result.operations.map(operationSummary),
    ...("reason" in result ? { reason: result.reason } : {}),
  };
}

export function renderDashboard(input: DashboardRenderInput): string {
  const lines: string[] = ["AgentScope Dashboard"];
  const filteredInventory = buildDiscoveryInventorySummary(input.items, input.discovery.warnings);

  lines.push(`Project root: ${input.snapshot?.snapshot.projectRoot ?? "<live discovery>"}`);
  lines.push(`Filters: ${filtersLine(input.state)}`);

  if (input.message !== undefined) {
    lines.push(`Message: ${input.message}`);
  }

  lines.push("");
  lines.push("Inventory:");
  for (const provider of filteredInventory.providers) {
    lines.push(
      `- ${provider.provider}: available=${provider.totalAvailable}, active=${provider.totalActive}, warnings=${provider.warningCount}`,
    );
  }

  lines.push("");
  lines.push("Items:");
  if (input.items.length === 0) {
    lines.push("No dashboard items match the current filters.");
  } else {
    for (const item of input.items) {
      const marker = item.id === input.selected?.id ? "*" : "-";
      lines.push(
        `${marker} ${item.provider} ${item.layer} ${item.category} ${item.displayName} [enabled=${item.enabled}, mutability=${item.mutability}]`,
      );
      lines.push(`  id: ${item.id}`);
    }
  }

  lines.push("");
  lines.push("Selected item:");
  if (input.selected === undefined) {
    lines.push("- none");
  } else {
    lines.push(`id: ${input.selected.id}`);
    lines.push(`provider: ${input.selected.provider}`);
    lines.push(`kind: ${input.selected.kind}`);
    lines.push(`category: ${input.selected.category}`);
    lines.push(`layer: ${input.selected.layer}`);
    lines.push(`enabled: ${input.selected.enabled}`);
    lines.push(`mutability: ${input.selected.mutability}`);
    lines.push(`source: ${input.selected.sourcePath}`);
    lines.push(`state: ${input.selected.statePath}`);
  }

  lines.push("");
  renderPreview(lines, input.selectedPreview);

  lines.push("");
  lines.push("Staged changes:");
  if (input.stagedPreviews.length === 0) {
    lines.push("- none");
  } else {
    for (const staged of input.stagedPreviews) {
      lines.push(
        `- ${staged.provider} ${staged.layer} ${staged.kind} ${staged.id} -> enabled=${staged.targetEnabled}`,
      );
      lines.push(`  status: ${staged.status}`);
      if (staged.reason !== undefined) {
        lines.push(`  reason: ${staged.reason}`);
      }
      if (staged.operations.length === 0) {
        lines.push("  operations: none");
      } else {
        lines.push("  operations:");
        for (const operation of staged.operations) {
          lines.push(`  - ${operation}`);
        }
      }
    }
  }

  if (input.applyResults !== undefined) {
    lines.push("");
    lines.push("Dashboard apply:");
    if (input.applyResults.length === 0) {
      lines.push("- none");
    }
    for (const result of input.applyResults) {
      lines.push(`- ${result.selection.id}`);
      lines.push(`  status: ${result.status}`);
      if ("reason" in result) {
        lines.push(`  reason: ${result.reason}`);
      }
      if ("backupId" in result && result.backupId !== undefined) {
        lines.push(`  backupId: ${result.backupId}`);
      }
    }
  }

  if (input.snapshot !== undefined) {
    lines.push("");
    lines.push("Snapshot refreshed:");
    lines.push(`id: ${input.snapshot.snapshot.id}`);
    lines.push(`latest: ${input.snapshot.latestPath}`);
    lines.push(`history: ${input.snapshot.historyPath}`);
  }

  if (input.discovery.warnings.length > 0) {
    lines.push("");
    lines.push("Warnings:");
    for (const warning of input.discovery.warnings) {
      lines.push(
        `- ${warning.provider} ${warning.layer ?? "all"} ${warning.code}: ${warning.message}`,
      );
    }
  }

  return lines.join("\n");
}
