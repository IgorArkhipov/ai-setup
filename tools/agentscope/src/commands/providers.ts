import {
  listProviders,
  loadCapabilityMatrix,
} from "../providers/registry.js";

export function renderProviders(fixturesRoot: string): string {
  const matrix = loadCapabilityMatrix(fixturesRoot);
  const lines = ["Provider capability matrix (fixture-backed baseline)", ""];

  for (const provider of listProviders()) {
    const capabilities = matrix.providers[provider.id];

    lines.push(`${provider.name} (${provider.id})`);
    lines.push(`  skills:          ${capabilities.skills}`);
    lines.push(`  configured MCPs: ${capabilities.configuredMcps}`);
    lines.push(`  tools/extensions: ${capabilities.tools}`);
    lines.push(`  note:            ${matrix.notes[provider.id]}`);
    lines.push("");
  }

  return lines.join("\n").trimEnd();
}
