import { existsSync, readdirSync, readFileSync, type Dirent } from "node:fs";
import path from "node:path";
import type { ProviderModule } from "../core/discovery.js";
import type {
  DiscoveryItem,
  DiscoveryResult,
  DiscoveryWarning,
} from "../core/models.js";

interface ParsedCodexEntry {
  id: string;
  enabled?: boolean;
  displayName?: string;
}

export interface ParsedCodexConfig {
  mcpServers: ParsedCodexEntry[];
  plugins: ParsedCodexEntry[];
}

type CodexSectionKind = "mcp_servers" | "plugins";

function stripComment(line: string): string {
  const hashIndex = line.indexOf("#");
  return hashIndex === -1 ? line : line.slice(0, hashIndex);
}

function parseSectionHeader(
  line: string,
  lineNumber: number,
): { kind: CodexSectionKind; id: string } {
  const match = line.match(/^\[(plugins|mcp_servers)\.(.+)\]$/);
  if (match === null) {
    throw new Error(
      `line ${lineNumber} must use [plugins.<id>] or [mcp_servers.<id>]`,
    );
  }

  const [, kind, rawId] = match;
  if (kind === undefined || rawId === undefined) {
    throw new Error(`line ${lineNumber} must include a section identifier`);
  }
  const trimmedId = rawId.trim();
  const quotedId = trimmedId.match(/^"(.+)"$/);
  const id = quotedId?.[1] ?? trimmedId;

  if (id.length === 0) {
    throw new Error(`line ${lineNumber} must include a section identifier`);
  }

  return {
    kind: kind as CodexSectionKind,
    id,
  };
}

function parseStringValue(value: string): string | undefined {
  const match = value.match(/^"(.*)"$/);
  return match?.[1];
}

export function parseCodexConfig(raw: string): ParsedCodexConfig {
  const plugins = new Map<string, ParsedCodexEntry>();
  const mcpServers = new Map<string, ParsedCodexEntry>();
  let currentSection: { kind: CodexSectionKind; id: string } | null = null;

  for (const [index, rawLine] of raw.split(/\r?\n/).entries()) {
    const lineNumber = index + 1;
    const line = stripComment(rawLine).trim();

    if (line.length === 0) {
      continue;
    }

    if (line.startsWith("[plugins") || line.startsWith("[mcp_servers")) {
      currentSection = parseSectionHeader(line, lineNumber);
      const bucket =
        currentSection.kind === "plugins" ? plugins : mcpServers;

      if (!bucket.has(currentSection.id)) {
        bucket.set(currentSection.id, { id: currentSection.id });
      }

      continue;
    }

    if (line.startsWith("[")) {
      currentSection = null;
      continue;
    }

    if (currentSection === null) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) {
      throw new Error(`line ${lineNumber} must use key = value inside sections`);
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    const bucket = currentSection.kind === "plugins" ? plugins : mcpServers;
    const entry = bucket.get(currentSection.id);

    if (entry === undefined) {
      throw new Error(`line ${lineNumber} references an unknown section`);
    }

    if (key === "enabled") {
      if (value === "true") {
        entry.enabled = true;
      } else if (value === "false") {
        entry.enabled = false;
      } else {
        throw new Error(`line ${lineNumber} enabled must be true or false`);
      }
    }

    if (key === "name" || key === "display_name") {
      const parsed = parseStringValue(value);
      if (parsed === undefined) {
        throw new Error(`line ${lineNumber} ${key} must be a quoted string`);
      }

      entry.displayName = parsed;
    }
  }

  return {
    mcpServers: [...mcpServers.values()],
    plugins: [...plugins.values()],
  };
}

function pushWarning(
  warnings: DiscoveryWarning[],
  layer: "global" | "project",
  code: string,
  message: string,
): void {
  warnings.push({
    provider: "codex",
    layer,
    code,
    message,
  });
}

function discoverSkillFiles(
  rootPath: string,
  layer: "global" | "project",
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
        layer,
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
        const idPrefix = layer === "global" ? "codex:global:skill:" : "codex:project:skill:";
        const displayName = path.basename(path.dirname(entryPath));
        items.push({
          provider: "codex",
          kind: "skill",
          category: "skill",
          layer,
          id: `${idPrefix}${displayName}`,
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

export const codexProvider: ProviderModule = {
  id: "codex",
  discover(input): DiscoveryResult {
    const items: DiscoveryItem[] = [];
    const warnings: DiscoveryWarning[] = [];

    items.push(
      ...discoverSkillFiles(
        path.join(input.homeDir, ".codex", "skills"),
        "global",
        warnings,
      ),
    );
    items.push(
      ...discoverSkillFiles(
        path.join(input.config.projectRoot, ".codex", "skills"),
        "project",
        warnings,
      ),
    );

    const configPath = path.join(input.homeDir, ".codex", "config.toml");
    if (!existsSync(configPath)) {
      return { items, warnings };
    }

    let raw: string;
    try {
      raw = readFileSync(configPath, "utf8");
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      pushWarning(
        warnings,
        "global",
        "file-unreadable",
        `${configPath} could not be read: ${detail}`,
      );
      return { items, warnings };
    }

    let parsed: ParsedCodexConfig;
    try {
      parsed = parseCodexConfig(raw);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      pushWarning(
        warnings,
        "global",
        "toml-parse-error",
        `${configPath} could not be parsed: ${detail}`,
      );
      return { items, warnings };
    }

    items.push(
      ...parsed.mcpServers.map((server) => ({
        provider: "codex" as const,
        kind: "mcp" as const,
        category: "configured-mcp" as const,
        layer: "global" as const,
        id: `codex:global:configured-mcp:config:${server.id}`,
        displayName: server.displayName ?? server.id,
        enabled: server.enabled ?? true,
        mutability: "read-only" as const,
        sourcePath: configPath,
        statePath: configPath,
      })),
    );
    items.push(
      ...parsed.plugins.map((plugin) => ({
        provider: "codex" as const,
        kind: "plugin" as const,
        category: "tool" as const,
        layer: "global" as const,
        id: `codex:global:tool:plugin:${plugin.id}`,
        displayName: plugin.displayName ?? plugin.id,
        enabled: plugin.enabled ?? true,
        mutability: "unsupported" as const,
        sourcePath: configPath,
        statePath: configPath,
      })),
    );

    return { items, warnings };
  },
};
