import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { resolveAppStateRoot, resolveCursorRoot, resolveProjectRoot } from "./paths.js";

export interface AgentScopeConfigOverrides {
  appStateRoot?: string;
  cursorRoot?: string;
  projectRoot?: string;
}

interface AgentScopeConfigDocument {
  version?: number;
  appStateRoot?: string;
  cursorRoot?: string;
  projectRoot?: string;
}

export interface AgentScopeConfig {
  version: 1;
  appStateRoot: string;
  cursorRoot: string;
  projectRoot: string;
  configPaths: {
    userConfigPath: string;
    projectConfigPath: string;
  };
}

export interface LoadConfigOptions {
  cwd: string;
  homeDir: string;
  overrides?: AgentScopeConfigOverrides;
  fileExists?: (filePath: string) => boolean;
  readFile?: (filePath: string) => string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseConfigDocument(raw: string, label: string): AgentScopeConfigDocument {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`${label} must be valid JSON: ${detail}`);
  }

  if (!isRecord(parsed)) {
    throw new Error(`${label} must be a JSON object`);
  }

  const version = parsed.version;
  if (version !== undefined) {
    if (typeof version !== "number" || !Number.isInteger(version)) {
      throw new Error(`${label} version must be an integer`);
    }

    if (version > 1) {
      throw new Error(`Unsupported agentscope config schema version: ${version}`);
    }
  }

  const document: AgentScopeConfigDocument = {};

  if (typeof parsed.projectRoot === "string") {
    document.projectRoot = parsed.projectRoot;
  }

  if (typeof parsed.appStateRoot === "string") {
    document.appStateRoot = parsed.appStateRoot;
  }

  if (typeof parsed.cursorRoot === "string") {
    document.cursorRoot = parsed.cursorRoot;
  }

  if (version !== undefined) {
    document.version = version;
  }

  return document;
}

function loadOptionalConfigDocument(
  filePath: string,
  label: string,
  options: Required<Pick<LoadConfigOptions, "fileExists" | "readFile">>,
): AgentScopeConfigDocument {
  if (!options.fileExists(filePath)) {
    return {};
  }

  return parseConfigDocument(options.readFile(filePath), label);
}

export function loadConfig(options: LoadConfigOptions): AgentScopeConfig {
  const readFile = options.readFile ?? ((filePath: string) => readFileSync(filePath, "utf8"));
  const fileExists = options.fileExists ?? ((filePath: string) => existsSync(filePath));
  const pathOptions = { cwd: options.cwd, homeDir: options.homeDir };
  const overrides = options.overrides ?? {};

  const defaults: AgentScopeConfigDocument = {
    version: 1,
    projectRoot: options.cwd,
  };

  const userConfigPath = path.resolve(options.homeDir, ".config", "agentscope", "config.json");
  const userConfig = loadOptionalConfigDocument(userConfigPath, userConfigPath, {
    fileExists,
    readFile,
  });

  const projectConfigLookupRoot = resolveProjectRoot({
    ...pathOptions,
    configuredProjectRoot: overrides.projectRoot ?? userConfig.projectRoot ?? defaults.projectRoot,
  });
  const projectConfigPath = path.join(projectConfigLookupRoot, ".agentscope.json");
  const projectConfig = loadOptionalConfigDocument(projectConfigPath, projectConfigPath, {
    fileExists,
    readFile,
  });

  const merged = {
    ...defaults,
    ...userConfig,
    ...projectConfig,
    ...overrides,
  };

  return {
    version: 1,
    projectRoot: resolveProjectRoot({
      ...pathOptions,
      configuredProjectRoot: merged.projectRoot,
    }),
    appStateRoot: resolveAppStateRoot({
      ...pathOptions,
      configuredAppStateRoot: merged.appStateRoot,
    }),
    cursorRoot: resolveCursorRoot({
      ...pathOptions,
      configuredCursorRoot: merged.cursorRoot,
    }),
    configPaths: {
      userConfigPath,
      projectConfigPath,
    },
  };
}
