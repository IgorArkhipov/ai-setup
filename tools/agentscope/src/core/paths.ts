import path from "node:path";

export interface PathResolutionOptions {
  cwd: string;
  homeDir: string;
}

export function expandHomePath(inputPath: string, homeDir: string): string {
  if (inputPath === "~") {
    return homeDir;
  }

  if (inputPath.startsWith("~/")) {
    return path.join(homeDir, inputPath.slice(2));
  }

  return inputPath;
}

export function normalizeAbsolutePath(inputPath: string, options: PathResolutionOptions): string {
  const expanded = expandHomePath(inputPath, options.homeDir);
  return path.normalize(path.isAbsolute(expanded) ? expanded : path.resolve(options.cwd, expanded));
}

export function resolveProjectRoot(
  options: PathResolutionOptions & {
    configuredProjectRoot?: string | undefined;
  },
): string {
  return normalizeAbsolutePath(options.configuredProjectRoot ?? options.cwd, options);
}

export function resolveAppStateRoot(
  options: PathResolutionOptions & {
    configuredAppStateRoot?: string | undefined;
  },
): string {
  return options.configuredAppStateRoot === undefined
    ? path.resolve(options.homeDir, ".config", "agentscope")
    : normalizeAbsolutePath(options.configuredAppStateRoot, options);
}

export function defaultCursorRoot(homeDir: string): string {
  return path.resolve(homeDir, "Library", "Application Support", "Cursor", "User");
}

export function resolveCursorRoot(
  options: PathResolutionOptions & {
    configuredCursorRoot?: string | undefined;
  },
): string {
  return options.configuredCursorRoot === undefined
    ? defaultCursorRoot(options.homeDir)
    : normalizeAbsolutePath(options.configuredCursorRoot, options);
}
