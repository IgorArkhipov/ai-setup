import {
  capabilityFieldLabels,
  capabilityFields,
  listProviders,
  loadCapabilityMatrix,
} from "../providers/registry.js";

function renderCapabilityLine(label: string, status: string): string {
  const fieldLabel = `${label}:`;
  const paddedLabel = fieldLabel.length >= 17 ? `${fieldLabel} ` : fieldLabel.padEnd(17);

  return `  ${paddedLabel}${status}`;
}

export function renderProviders(fixturesRoot: string): string {
  const matrix = loadCapabilityMatrix(fixturesRoot);
  const lines = ["Supported providers", ""];

  for (const provider of listProviders()) {
    const capabilities = matrix.providers[provider.id];

    lines.push(`${provider.name} (${provider.id})`);
    for (const field of capabilityFields) {
      lines.push(renderCapabilityLine(capabilityFieldLabels[field], capabilities[field]));
    }
    lines.push(`  note:            ${matrix.notes[provider.id]}`);
    lines.push("");
  }

  return lines.join("\n").trimEnd();
}
