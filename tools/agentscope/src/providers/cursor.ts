import { existsSync, readdirSync, readFileSync, type Dirent } from "node:fs";
import path from "node:path";
import type { ProviderModule } from "../core/discovery.js";
import type {
  DiscoveryItem,
  DiscoveryResult,
  DiscoveryWarning,
} from "../core/models.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pushWarning(
  warnings: DiscoveryWarning[],
  code: string,
  message: string,
): void {
  warnings.push({
    provider: "cursor",
    layer: "global",
    code,
    message,
  });
}

function discoverSkills(
  rootPath: string,
  warnings: DiscoveryWarning[],
): DiscoveryItem[] {
  if (!existsSync(rootPath)) {
    return [];
  }

  const items: DiscoveryItem[] = [];
  const stack = [rootPath];

  while (stack.length > 0) {
    const current = stack.pop();
    if (current === undefined) {
      continue;
    }

    let entries: Dirent[];
    try {
      entries = readdirSync(current, { withFileTypes: true });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      pushWarning(
        warnings,
        "file-unreadable",
        `${current} could not be read: ${detail}`,
      );
      continue;
    }

    for (const entry of entries) {
      const entryPath = path.join(current, entry.name);

      if (entry.isDirectory()) {
        stack.push(entryPath);
        continue;
      }

      if (entry.isFile() && entry.name === "SKILL.md") {
        const displayName = path.basename(path.dirname(entryPath));
        items.push({
          provider: "cursor",
          kind: "skill",
          category: "skill",
          layer: "global",
          id: `cursor:global:skill:${displayName}`,
          displayName,
          enabled: true,
          mutability: "read-only",
          sourcePath: entryPath,
          statePath: entryPath,
        });
      }
    }
  }

  return items;
}

function discoverMcp(
  mcpPath: string,
  warnings: DiscoveryWarning[],
): DiscoveryItem[] {
  if (!existsSync(mcpPath)) {
    return [];
  }

  let raw: string;
  try {
    raw = readFileSync(mcpPath, "utf8");
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    pushWarning(warnings, "file-unreadable", `${mcpPath} could not be read: ${detail}`);
    return [];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    pushWarning(warnings, "json-parse-error", `${mcpPath} is not valid JSON: ${detail}`);
    return [];
  }

  if (!isRecord(parsed) || !isRecord(parsed.mcpServers)) {
    pushWarning(
      warnings,
      "invalid-shape",
      `${mcpPath} must define an object-valued mcpServers`,
    );
    return [];
  }

  return Object.keys(parsed.mcpServers).map((serverId) => ({
    provider: "cursor",
    kind: "mcp",
    category: "configured-mcp",
    layer: "global",
    id: `cursor:global:configured-mcp:mcp-json:${serverId}`,
    displayName: serverId,
    enabled: true,
    mutability: "read-only",
    sourcePath: mcpPath,
    statePath: mcpPath,
  }));
}

function discoverExtensions(
  cursorRoot: string,
  warnings: DiscoveryWarning[],
): DiscoveryItem[] {
  if (!existsSync(cursorRoot)) {
    pushWarning(
      warnings,
      "missing-root",
      `Cursor root is missing or unreadable: ${cursorRoot}`,
    );
    return [];
  }

  const profilesRoot = path.join(cursorRoot, "profiles");
  if (!existsSync(profilesRoot)) {
    return [];
  }

  const items: DiscoveryItem[] = [];

  try {
    for (const profileEntry of readdirSync(profilesRoot, { withFileTypes: true })) {
      if (!profileEntry.isDirectory()) {
        continue;
      }

      const extensionsPath = path.join(
        profilesRoot,
        profileEntry.name,
        "extensions.json",
      );

      if (!existsSync(extensionsPath)) {
        continue;
      }

      let raw: string;
      try {
        raw = readFileSync(extensionsPath, "utf8");
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        pushWarning(
          warnings,
          "file-unreadable",
          `${extensionsPath} could not be read: ${detail}`,
        );
        continue;
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        pushWarning(
          warnings,
          "json-parse-error",
          `${extensionsPath} is not valid JSON: ${detail}`,
        );
        continue;
      }

      if (!Array.isArray(parsed)) {
        pushWarning(
          warnings,
          "invalid-shape",
          `${extensionsPath} must be an array`,
        );
        continue;
      }

      for (const [index, entry] of parsed.entries()) {
        if (!isRecord(entry) || !isRecord(entry.identifier) || typeof entry.identifier.id !== "string") {
          pushWarning(
            warnings,
            "invalid-shape",
            `${extensionsPath}[${index}] must include identifier.id as a string`,
          );
          continue;
        }

        items.push({
          provider: "cursor",
          kind: "plugin",
          category: "tool",
          layer: "global",
          id: `cursor:global:tool:extension:${entry.identifier.id}`,
          displayName: entry.identifier.id,
          enabled: true,
          mutability: "read-only",
          sourcePath: extensionsPath,
          statePath: extensionsPath,
        });
      }
    }
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    pushWarning(
      warnings,
      "file-unreadable",
      `${profilesRoot} could not be read: ${detail}`,
    );
  }

  return items;
}

export const cursorProvider: ProviderModule = {
  id: "cursor",
  discover(input): DiscoveryResult {
    const warnings: DiscoveryWarning[] = [];
    const items: DiscoveryItem[] = [];

    items.push(
      ...discoverSkills(
        path.join(input.homeDir, ".cursor", "skills-cursor"),
        warnings,
      ),
    );
    items.push(
      ...discoverMcp(path.join(input.homeDir, ".cursor", "mcp.json"), warnings),
    );
    items.push(...discoverExtensions(input.config.cursorRoot, warnings));

    return { items, warnings };
  },
};
