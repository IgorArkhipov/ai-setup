import os from "node:os";
import path from "node:path";
import { loadConfig, type AgentScopeConfigOverrides } from "../core/config.js";
import { runDiscovery } from "../core/discovery.js";
import type { DiscoveryWarning } from "../core/models.js";
import { claudeProvider } from "../providers/claude.js";
import { codexProvider } from "../providers/codex.js";
import { cursorProvider } from "../providers/cursor.js";
import {
  loadCapabilityMatrix,
  validateProviderFixtures,
} from "../providers/registry.js";

export interface DoctorOptions extends AgentScopeConfigOverrides {
  cwd?: string;
  homeDir?: string;
}

export interface DoctorResult {
  exitCode: number;
  output: string;
}

function definedOverrides(
  options: Pick<
    AgentScopeConfigOverrides,
    "projectRoot" | "appStateRoot" | "cursorRoot"
  >,
): AgentScopeConfigOverrides {
  return {
    ...(options.projectRoot === undefined
      ? {}
      : { projectRoot: options.projectRoot }),
    ...(options.appStateRoot === undefined
      ? {}
      : { appStateRoot: options.appStateRoot }),
    ...(options.cursorRoot === undefined
      ? {}
      : { cursorRoot: options.cursorRoot }),
  };
}

function renderWarning(warning: DiscoveryWarning): string {
  const layer = warning.layer === undefined ? "" : ` ${warning.layer}`;
  return `- ${warning.provider}${layer} ${warning.code}: ${warning.message}`;
}

export function runDoctor(
  packageRoot: string,
  fixturesRoot: string,
  options: DoctorOptions = {},
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

  const cwd = options.cwd ?? process.cwd();
  const homeDir = options.homeDir ?? os.homedir();
  const config = loadConfig({
    cwd,
    homeDir,
    overrides: definedOverrides(options),
  });
  const discovery = runDiscovery(
    [claudeProvider, codexProvider, cursorProvider],
    { config, homeDir },
  );

  if (discovery.warnings.length > 0) {
    return {
      exitCode: 1,
      output: [
        "agentscope doctor: provider issues detected",
        "",
        ...discovery.warnings.map(renderWarning),
      ].join("\n"),
    };
  }

  return {
    exitCode: 0,
    output: [
      "OK",
      `package root: ${packageRoot}`,
      `fixtures root: ${fixturesRoot}`,
      `capability matrix: ${path.join(fixturesRoot, "capability-matrix.json")}`,
      `project root: ${config.projectRoot}`,
      `cursor root: ${config.cursorRoot}`,
      `items discovered: ${discovery.items.length}`,
    ].join("\n"),
  };
}
