import os from "node:os";
import { loadConfig, type AgentScopeConfigOverrides } from "../core/config.js";
import { runDiscovery, type ProviderModule } from "../core/discovery.js";
import { executeTogglePlan } from "../core/mutation-engine.js";
import {
  renderToggleResultHuman,
  renderToggleResultJson,
} from "../core/mutation-output.js";
import { claudeProvider } from "../providers/claude.js";
import { codexProvider } from "../providers/codex.js";
import { cursorProvider } from "../providers/cursor.js";

export interface ToggleCommandOptions extends AgentScopeConfigOverrides {
  cwd?: string;
  homeDir?: string;
  provider?: string;
  kind?: string;
  id?: string;
  layer?: string;
  apply?: boolean;
  json?: boolean;
  providers?: ProviderModule[];
  now?: () => Date;
  generateBackupId?: () => string;
  pid?: number;
  isProcessAlive?: (pid: number) => boolean;
}

export interface ToggleCommandResult {
  exitCode: number;
  output: string;
}

function commandErrorOutput(
  json: boolean | undefined,
  status: "blocked" | "failed",
  reason: string,
): string {
  if (json !== true) {
    return status === "blocked" ? `blocked: ${reason}` : reason;
  }

  return JSON.stringify(
    {
      status,
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

function missingSelectorMessage(options: ToggleCommandOptions): string | null {
  for (const field of ["provider", "kind", "id", "layer"] as const) {
    if (options[field] === undefined || options[field]?.length === 0) {
      return `missing required selector: --${field}`;
    }
  }

  return null;
}

function defaultProviders(): ProviderModule[] {
  return [claudeProvider, codexProvider, cursorProvider];
}

export function runToggle(options: ToggleCommandOptions): ToggleCommandResult {
  const missingSelector = missingSelectorMessage(options);
  if (missingSelector !== null) {
    return {
      exitCode: 1,
      output: commandErrorOutput(options.json, "failed", missingSelector),
    };
  }

  const cwd = options.cwd ?? process.cwd();
  const homeDir = options.homeDir ?? os.homedir();
  const config = loadConfig({
    cwd,
    homeDir,
    overrides: definedOverrides(options),
  });
  const providers = options.providers ?? defaultProviders();
  const discovery = runDiscovery(providers, { config, homeDir });
  const matches = discovery.items.filter((item) => {
    return (
      item.provider === options.provider &&
      item.kind === options.kind &&
      item.layer === options.layer &&
      item.id === options.id
    );
  });

  if (matches.length === 0) {
    return {
      exitCode: 1,
      output: commandErrorOutput(
        options.json,
        "blocked",
        `unknown selection for ${options.id}`,
      ),
    };
  }

  if (matches.length > 1) {
    return {
      exitCode: 1,
      output: commandErrorOutput(
        options.json,
        "blocked",
        `ambiguous selection for ${options.id}`,
      ),
    };
  }

  const selected = matches[0];
  if (selected === undefined) {
    return {
      exitCode: 1,
      output: commandErrorOutput(
        options.json,
        "blocked",
        `unknown selection for ${options.id}`,
      ),
    };
  }

  const provider = providers.find((entry) => entry.id === selected.provider);
  if (provider?.planToggle === undefined) {
    return {
      exitCode: 1,
      output: commandErrorOutput(
        options.json,
        "blocked",
        `unsupported provider planning for ${selected.provider}`,
      ),
    };
  }

  const result = executeTogglePlan(
    provider.planToggle({
      config,
      homeDir,
      item: selected,
      targetEnabled: !selected.enabled,
    }),
    {
      appStateRoot: config.appStateRoot,
      ...(options.now === undefined ? {} : { now: options.now }),
      ...(options.generateBackupId === undefined
        ? {}
        : { generateBackupId: options.generateBackupId }),
      ...(options.pid === undefined ? {} : { pid: options.pid }),
      ...(options.isProcessAlive === undefined
        ? {}
        : { isProcessAlive: options.isProcessAlive }),
    },
    options.apply === true,
  );

  return {
    exitCode:
      result.status === "blocked" || result.status === "failed" ? 1 : 0,
    output: options.json
      ? renderToggleResultJson(result)
      : renderToggleResultHuman(result),
  };
}
