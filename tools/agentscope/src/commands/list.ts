import os from "node:os";
import { loadConfig, type AgentScopeConfigOverrides } from "../core/config.js";
import { runDiscovery } from "../core/discovery.js";
import { renderListHuman, renderListJson } from "../core/output.js";
import { claudeProvider } from "../providers/claude.js";
import { codexProvider } from "../providers/codex.js";
import { cursorProvider } from "../providers/cursor.js";

export interface ListCommandOptions extends AgentScopeConfigOverrides {
  cwd?: string;
  homeDir?: string;
  json?: boolean;
}

export interface ListCommandResult {
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

export function runList(options: ListCommandOptions = {}): ListCommandResult {
  const cwd = options.cwd ?? process.cwd();
  const homeDir = options.homeDir ?? os.homedir();
  const config = loadConfig({
    cwd,
    homeDir,
    overrides: definedOverrides(options),
  });
  const result = runDiscovery(
    [claudeProvider, codexProvider, cursorProvider],
    { config, homeDir },
  );

  return {
    exitCode: 0,
    output: options.json ? renderListJson(result) : renderListHuman(result),
  };
}
