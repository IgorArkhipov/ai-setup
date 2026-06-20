import os from "node:os";
import { type AgentScopeConfigOverrides, loadConfig } from "../core/config.js";
import { runDiscovery } from "../core/discovery.js";
import {
  categoryOrder,
  type DiscoveryCategory,
  type DiscoveryKind,
  kindOrder,
} from "../core/models.js";
import { renderListHuman, renderListJson } from "../core/output.js";
import { claudeProvider } from "../providers/claude.js";
import { codexProvider } from "../providers/codex.js";
import { cursorProvider } from "../providers/cursor.js";

export interface ListCommandOptions extends AgentScopeConfigOverrides {
  cwd?: string;
  homeDir?: string;
  json?: boolean;
  provider?: string;
  layer?: string;
  kind?: string;
  category?: string;
}

export interface ListCommandResult {
  exitCode: number;
  output: string;
}

const supportedLayers = new Set(["global", "project", "all"]);
const supportedKinds = new Set<DiscoveryKind>(kindOrder);
const supportedCategories = new Set<DiscoveryCategory>(categoryOrder);

function invalidLayerResult(json: boolean | undefined): ListCommandResult {
  const reason = "invalid layer: expected global, project, or all";
  return {
    exitCode: 1,
    output: json ? JSON.stringify({ status: "failed", reason }, null, 2) : reason,
  };
}

function invalidKindResult(json: boolean | undefined): ListCommandResult {
  const reason = "invalid kind: expected skill, mcp, plugin, agent, hook, or setting";
  return {
    exitCode: 1,
    output: json ? JSON.stringify({ status: "failed", reason }, null, 2) : reason,
  };
}

function invalidCategoryResult(json: boolean | undefined): ListCommandResult {
  const reason =
    "invalid category: expected skill, configured-mcp, tool, agent, hook, provider-setting, plugin-config, or plugin-manifest";
  return {
    exitCode: 1,
    output: json ? JSON.stringify({ status: "failed", reason }, null, 2) : reason,
  };
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

export function runList(options: ListCommandOptions = {}): ListCommandResult {
  if (options.layer !== undefined && !supportedLayers.has(options.layer)) {
    return invalidLayerResult(options.json);
  }

  if (options.kind !== undefined && !supportedKinds.has(options.kind as DiscoveryKind)) {
    return invalidKindResult(options.json);
  }

  if (
    options.category !== undefined &&
    !supportedCategories.has(options.category as DiscoveryCategory)
  ) {
    return invalidCategoryResult(options.json);
  }

  const cwd = options.cwd ?? process.cwd();
  const homeDir = options.homeDir ?? os.homedir();
  const config = loadConfig({
    cwd,
    homeDir,
    overrides: definedOverrides(options),
  });
  const result = runDiscovery([claudeProvider, codexProvider, cursorProvider], { config, homeDir });
  const filtered = {
    items: result.items.filter((item) => {
      return (
        (options.provider === undefined || item.provider === options.provider) &&
        (options.layer === undefined || options.layer === "all" || item.layer === options.layer) &&
        (options.kind === undefined || item.kind === options.kind) &&
        (options.category === undefined || item.category === options.category)
      );
    }),
    warnings: result.warnings.filter((warning) => {
      return (
        (options.provider === undefined || warning.provider === options.provider) &&
        (options.layer === undefined ||
          options.layer === "all" ||
          warning.layer === undefined ||
          warning.layer === options.layer)
      );
    }),
  };

  return {
    exitCode: 0,
    output: options.json ? renderListJson(filtered) : renderListHuman(filtered),
  };
}
