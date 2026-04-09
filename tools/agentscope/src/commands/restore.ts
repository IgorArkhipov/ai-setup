import os from "node:os";
import { loadConfig, type AgentScopeConfigOverrides } from "../core/config.js";
import { restoreBackupById } from "../core/mutation-engine.js";
import {
  renderRestoreResultHuman,
  renderRestoreResultJson,
} from "../core/mutation-output.js";

export interface RestoreCommandOptions extends AgentScopeConfigOverrides {
  cwd?: string;
  homeDir?: string;
  backupId?: string;
  json?: boolean;
  now?: () => Date;
  generateBackupId?: () => string;
  pid?: number;
  isProcessAlive?: (pid: number) => boolean;
}

export interface RestoreCommandResult {
  exitCode: number;
  output: string;
}

function commandErrorOutput(json: boolean | undefined, reason: string): string {
  if (json !== true) {
    return reason;
  }

  return JSON.stringify(
    {
      status: "failed",
      reason,
    },
    null,
    2,
  );
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

export function runRestore(options: RestoreCommandOptions): RestoreCommandResult {
  if (options.backupId === undefined || options.backupId.length === 0) {
    return {
      exitCode: 1,
      output: commandErrorOutput(options.json, "missing backup id"),
    };
  }

  const cwd = options.cwd ?? process.cwd();
  const homeDir = options.homeDir ?? os.homedir();
  const config = loadConfig({
    cwd,
    homeDir,
    overrides: definedOverrides(options),
  });

  const result = restoreBackupById(options.backupId, {
    appStateRoot: config.appStateRoot,
    ...(options.now === undefined ? {} : { now: options.now }),
    ...(options.generateBackupId === undefined
      ? {}
      : { generateBackupId: options.generateBackupId }),
    ...(options.pid === undefined ? {} : { pid: options.pid }),
    ...(options.isProcessAlive === undefined
      ? {}
      : { isProcessAlive: options.isProcessAlive }),
  });

  return {
    exitCode: result.status === "restored" ? 0 : 1,
    output: options.json
      ? renderRestoreResultJson(result)
      : renderRestoreResultHuman(result),
  };
}
