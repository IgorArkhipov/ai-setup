import type { DiscoveryResult } from "./models.js";
import type { WriteDiscoverySnapshotResult } from "./snapshots.js";

function renderWarningLabel(warning: DiscoveryResult["warnings"][number]): string {
  const layer = warning.layer === undefined ? "" : ` ${warning.layer}`;
  return `${warning.provider}${layer} ${warning.code}: ${warning.message}`;
}

export function renderListHuman(result: DiscoveryResult): string {
  const lines: string[] = [];

  if (result.items.length === 0) {
    lines.push("No discovered items.");
  } else {
    lines.push("Discovered items:");
    lines.push("");

    for (const item of result.items) {
      lines.push(`- ${item.provider} ${item.layer} ${item.category} ${item.displayName}`);
      lines.push(`  id: ${item.id}`);
      lines.push(`  enabled: ${item.enabled}`);
      lines.push(`  mutability: ${item.mutability}`);
      lines.push(`  source: ${item.sourcePath}`);
      lines.push(`  state: ${item.statePath}`);
    }
  }

  if (result.warnings.length > 0) {
    lines.push("");
    lines.push("Warnings:");
    lines.push("");

    for (const warning of result.warnings) {
      lines.push(`- ${renderWarningLabel(warning)}`);
    }
  }

  return lines.join("\n").trimEnd();
}

export function renderListJson(result: DiscoveryResult): string {
  return JSON.stringify(
    {
      items: result.items,
      warnings: result.warnings,
    },
    null,
    2,
  );
}

function renderProviderSnapshotSummary(
  provider: WriteDiscoverySnapshotResult["snapshot"]["inventory"]["providers"][number],
): string {
  return `  - ${provider.provider}: available=${provider.totalAvailable}, active=${provider.totalActive}, warnings=${provider.warningCount}`;
}

export function renderSnapshotHuman(result: WriteDiscoverySnapshotResult): string {
  const lines = [
    `Snapshot saved: ${result.snapshot.id}`,
    `Latest path: ${result.latestPath}`,
    `History path: ${result.historyPath}`,
    `Captured at: ${result.snapshot.capturedAt}`,
    `Project root: ${result.snapshot.projectRoot}`,
    "Inventory semantics: available=discovered in the current scope, active=currently enabled within that scope.",
    "Providers:",
    ...result.snapshot.inventory.providers.map(renderProviderSnapshotSummary),
  ];

  if (result.snapshot.warnings.length > 0) {
    lines.push("");
    lines.push("Warnings:");
    for (const warning of result.snapshot.warnings) {
      lines.push(`- ${renderWarningLabel(warning)}`);
    }
  }

  return lines.join("\n");
}

export function renderSnapshotJson(result: WriteDiscoverySnapshotResult): string {
  return JSON.stringify(result, null, 2);
}
