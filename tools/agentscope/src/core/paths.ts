import { createHash } from "node:crypto";
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

function sanitizeProjectKeySegment(input: string): string {
  const slug = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug.length > 0 ? slug : "project";
}

export function getProjectSnapshotKey(projectRoot: string): string {
  const resolved = path.resolve(projectRoot);
  const baseName = path.basename(resolved);
  const slug = sanitizeProjectKeySegment(baseName);
  const hash = createHash("sha256").update(resolved).digest("hex").slice(0, 16);

  return `${slug}-${hash}`;
}

export function getProjectSnapshotsDir(appStateRoot: string, projectRoot: string): string {
  return path.join(appStateRoot, "snapshots", getProjectSnapshotKey(projectRoot));
}

export function getSnapshotHistoryDir(appStateRoot: string, projectRoot: string): string {
  return path.join(getProjectSnapshotsDir(appStateRoot, projectRoot), "history");
}

export function getLatestSnapshotPath(appStateRoot: string, projectRoot: string): string {
  return path.join(getProjectSnapshotsDir(appStateRoot, projectRoot), "latest.json");
}
