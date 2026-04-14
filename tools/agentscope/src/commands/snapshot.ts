import os from "node:os";
import { type AgentScopeConfigOverrides, loadConfig } from "../core/config.js";
import { runDiscovery } from "../core/discovery.js";
import { renderSnapshotHuman, renderSnapshotJson } from "../core/output.js";
import { writeDiscoverySnapshot } from "../core/snapshots.js";
import { claudeProvider } from "../providers/claude.js";
import { codexProvider } from "../providers/codex.js";
import { cursorProvider } from "../providers/cursor.js";

export interface SnapshotCommandOptions extends AgentScopeConfigOverrides {
  cwd?: string;
  homeDir?: string;
  json?: boolean;
}

export interface SnapshotCommandResult {
  exitCode: number;
  output: string;
}

function definedOverrides(
  options: Pick<AgentScopeConfigOverrides, "projectRoot" | "appStateRoot" | "cursorRoot">,
): AgentScopeConfigOverrides {
  return {
    ...(options.projectRoot === undefined ? {} : { projectRoot: options.projectRoot }),
    ...(options.appStateRoot === undefined ? {} : { appStateRoot: options.appStateRoot }),
    ...(options.cursorRoot === undefined ? {} : { cursorRoot: options.cursorRoot }),
  };
}

export function runSnapshot(options: SnapshotCommandOptions = {}): SnapshotCommandResult {
  const cwd = options.cwd ?? process.cwd();
  const homeDir = options.homeDir ?? os.homedir();
  const config = loadConfig({
    cwd,
    homeDir,
    overrides: definedOverrides(options),
  });
  const discovery = runDiscovery([claudeProvider, codexProvider, cursorProvider], {
    config,
    homeDir,
  });
  const written = writeDiscoverySnapshot({
    appStateRoot: config.appStateRoot,
    projectRoot: config.projectRoot,
    items: discovery.items,
    warnings: discovery.warnings,
  });

  return {
    exitCode: discovery.warnings.length === 0 ? 0 : 1,
    output: options.json ? renderSnapshotJson(written) : renderSnapshotHuman(written),
  };
}
