import path from "node:path";
import {
  loadCapabilityMatrix,
  validateProviderFixtures,
} from "../providers/registry.js";

export interface DoctorResult {
  exitCode: number;
  output: string;
}

export function runDoctor(
  packageRoot: string,
  fixturesRoot: string,
): DoctorResult {
  loadCapabilityMatrix(fixturesRoot);
  const report = validateProviderFixtures(fixturesRoot);

  if (report.issues.length > 0) {
    const lines = ["agentscope doctor: fixture validation failed", ""];

    for (const issue of report.issues) {
      lines.push(
        `- ${issue.providerId} ${issue.relativePath}: ${issue.message}`,
      );
    }

    return { exitCode: 1, output: lines.join("\n") };
  }

  const lines = [
    "agentscope doctor: ok",
    `package root: ${packageRoot}`,
    `fixtures root: ${fixturesRoot}`,
    `fixture files checked: ${report.checkedFiles.length}`,
    `capability matrix: ${path.join(fixturesRoot, "capability-matrix.json")}`,
  ];

  return { exitCode: 0, output: lines.join("\n") };
}
