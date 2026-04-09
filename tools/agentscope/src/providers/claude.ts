import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import type { ProviderModule } from "../core/discovery.js";
import type {
  DiscoveryItem,
  DiscoveryLayer,
  DiscoveryResult,
  DiscoveryWarning,
} from "../core/models.js";
import {
  toSelectedItemIdentity,
  type TogglePlanDecision,
  type TogglePlanInput,
} from "../core/mutation-models.js";

interface ClaudeSettings {
  enabledPlugins?: Record<string, boolean>;
  enabledMcpjsonServers?: string[];
  disabledMcpjsonServers?: string[];
  enableAllProjectMcpServers?: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pushWarning(
  warnings: DiscoveryWarning[],
  layer: DiscoveryLayer | undefined,
  code: string,
  message: string,
): void {
  warnings.push(
    layer === undefined
      ? {
          provider: "claude",
          code,
          message,
        }
      : {
          provider: "claude",
          layer,
          code,
          message,
        },
  );
}

function readOptionalFile(filePath: string): string | null {
  if (!existsSync(filePath)) {
    return null;
  }

  return readFileSync(filePath, "utf8");
}

function parseClaudeSettings(
  raw: string,
  filePath: string,
  layer: DiscoveryLayer,
  warnings: DiscoveryWarning[],
): ClaudeSettings | null {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    pushWarning(
      warnings,
      layer,
      "json-parse-error",
      `${filePath} is not valid JSON: ${detail}`,
    );
    return null;
  }

  if (!isRecord(parsed)) {
    pushWarning(warnings, layer, "invalid-shape", `${filePath} must be a JSON object`);
    return null;
  }

  const settings: ClaudeSettings = {};

  if (parsed.enabledPlugins !== undefined) {
    if (!isRecord(parsed.enabledPlugins)) {
      pushWarning(
        warnings,
        layer,
        "invalid-shape",
        `${filePath} enabledPlugins must be an object`,
      );
    } else {
      const plugins: Record<string, boolean> = {};
      let valid = true;

      for (const [pluginId, value] of Object.entries(parsed.enabledPlugins)) {
        if (typeof value !== "boolean") {
          valid = false;
          pushWarning(
            warnings,
            layer,
            "invalid-shape",
            `${filePath} enabledPlugins.${pluginId} must be a boolean`,
          );
        } else {
          plugins[pluginId] = value;
        }
      }

      if (valid) {
        settings.enabledPlugins = plugins;
      }
    }
  }

  for (const key of [
    "enabledMcpjsonServers",
    "disabledMcpjsonServers",
  ] as const) {
    const value = parsed[key];
    if (value === undefined) {
      continue;
    }

    if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
      pushWarning(
        warnings,
        layer,
        "invalid-shape",
        `${filePath} ${key} must be an array of strings`,
      );
      continue;
    }

    settings[key] = value;
  }

  if (parsed.enableAllProjectMcpServers !== undefined) {
    if (typeof parsed.enableAllProjectMcpServers !== "boolean") {
      pushWarning(
        warnings,
        layer,
        "invalid-shape",
        `${filePath} enableAllProjectMcpServers must be a boolean`,
      );
    } else {
      settings.enableAllProjectMcpServers = parsed.enableAllProjectMcpServers;
    }
  }

  return settings;
}

function discoverSkills(
  rootPath: string,
  warnings: DiscoveryWarning[],
): DiscoveryItem[] {
  if (!existsSync(rootPath)) {
    return [];
  }

  try {
    return readdirSync(rootPath, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .flatMap((entry) => {
        const skillPath = path.join(rootPath, entry.name, "SKILL.md");

        if (!existsSync(skillPath)) {
          return [];
        }

        try {
          const raw = readFileSync(skillPath, "utf8").trim();
          if (raw.length === 0 || !/^#\s+\S+/m.test(raw)) {
            pushWarning(
              warnings,
              "project",
              "invalid-skill",
              `${skillPath} must be non-empty markdown with a top-level heading`,
            );
            return [];
          }
        } catch (error) {
          const detail = error instanceof Error ? error.message : String(error);
          pushWarning(
            warnings,
            "project",
            "file-unreadable",
            `${skillPath} could not be read: ${detail}`,
          );
          return [];
        }

        return [
          {
            provider: "claude",
            kind: "skill",
            category: "skill",
            layer: "project",
            id: `claude:project:skill:${entry.name}`,
            displayName: entry.name,
            enabled: true,
            mutability: "read-only",
            sourcePath: skillPath,
            statePath: skillPath,
          } satisfies DiscoveryItem,
        ];
      });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    pushWarning(
      warnings,
      "project",
      "file-unreadable",
      `${rootPath} could not be read: ${detail}`,
    );
    return [];
  }
}

function buildToolItems(
  settings: ClaudeSettings,
  sourcePath: string,
  layer: DiscoveryLayer,
  sourceLabel: string,
): DiscoveryItem[] {
  if (settings.enabledPlugins === undefined) {
    return [];
  }

  return Object.entries(settings.enabledPlugins).map(([pluginId, enabled]) => ({
    provider: "claude",
    kind: "plugin",
    category: "tool",
    layer,
    id: `claude:${layer}:tool:${sourceLabel}:${pluginId}`,
    displayName: pluginId,
    enabled,
    mutability: "read-only",
    sourcePath,
    statePath: sourcePath,
  }));
}

function buildApprovalItems(
  settings: ClaudeSettings,
  sourcePath: string,
  layer: DiscoveryLayer,
  sourceLabel: string,
): DiscoveryItem[] {
  const items: DiscoveryItem[] = [];

  for (const serverId of settings.enabledMcpjsonServers ?? []) {
    items.push({
      provider: "claude",
      kind: "mcp",
      category: "configured-mcp",
      layer,
      id: `claude:${layer}:configured-mcp:${sourceLabel}:enabled:${serverId}`,
      displayName: serverId,
      enabled: true,
      mutability: "read-only",
      sourcePath,
      statePath: sourcePath,
    });
  }

  for (const serverId of settings.disabledMcpjsonServers ?? []) {
    items.push({
      provider: "claude",
      kind: "mcp",
      category: "configured-mcp",
      layer,
      id: `claude:${layer}:configured-mcp:${sourceLabel}:disabled:${serverId}`,
      displayName: serverId,
      enabled: false,
      mutability: "read-only",
      sourcePath,
      statePath: sourcePath,
    });
  }

  if (settings.enableAllProjectMcpServers !== undefined) {
    items.push({
      provider: "claude",
      kind: "mcp",
      category: "configured-mcp",
      layer,
      id: `claude:${layer}:configured-mcp:${sourceLabel}:all-project-mcp-servers`,
      displayName: "All project MCP servers",
      enabled: settings.enableAllProjectMcpServers,
      mutability: "read-only",
      sourcePath,
      statePath: sourcePath,
    });
  }

  return items;
}

function discoverProjectMcp(
  mcpPath: string,
  warnings: DiscoveryWarning[],
): DiscoveryItem[] {
  const raw = readOptionalFile(mcpPath);
  if (raw === null) {
    return [];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    pushWarning(
      warnings,
      "project",
      "json-parse-error",
      `${mcpPath} is not valid JSON: ${detail}`,
    );
    return [];
  }

  if (!isRecord(parsed) || !isRecord(parsed.mcpServers)) {
    pushWarning(
      warnings,
      "project",
      "invalid-shape",
      `${mcpPath} must define an object-valued mcpServers`,
    );
    return [];
  }

  return Object.keys(parsed.mcpServers).map((serverId) => ({
    provider: "claude",
    kind: "mcp",
    category: "configured-mcp",
    layer: "project",
    id: `claude:project:configured-mcp:mcp-json:${serverId}`,
    displayName: serverId,
    enabled: true,
    mutability: "read-only",
    sourcePath: mcpPath,
    statePath: mcpPath,
  }));
}

export const claudeProvider: ProviderModule = {
  id: "claude",
  discover(input): DiscoveryResult {
    const items: DiscoveryItem[] = [];
    const warnings: DiscoveryWarning[] = [];

    const files: Array<{
      filePath: string;
      layer: DiscoveryLayer;
      sourceLabel: string;
    }> = [
      {
        filePath: path.join(input.homeDir, ".claude", "settings.json"),
        layer: "global",
        sourceLabel: "settings",
      },
      {
        filePath: path.join(input.homeDir, ".claude", "settings.local.json"),
        layer: "global",
        sourceLabel: "settings-local",
      },
      {
        filePath: path.join(input.config.projectRoot, ".claude", "settings.json"),
        layer: "project",
        sourceLabel: "settings",
      },
      {
        filePath: path.join(
          input.config.projectRoot,
          ".claude",
          "settings.local.json",
        ),
        layer: "project",
        sourceLabel: "settings-local",
      },
    ];

    for (const file of files) {
      let raw: string | null;

      try {
        raw = readOptionalFile(file.filePath);
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        pushWarning(
          warnings,
          file.layer,
          "file-unreadable",
          `${file.filePath} could not be read: ${detail}`,
        );
        continue;
      }

      if (raw === null) {
        continue;
      }

      const settings = parseClaudeSettings(raw, file.filePath, file.layer, warnings);
      if (settings === null) {
        continue;
      }

      items.push(...buildToolItems(settings, file.filePath, file.layer, file.sourceLabel));
      items.push(
        ...buildApprovalItems(settings, file.filePath, file.layer, file.sourceLabel),
      );
    }

    items.push(
      ...discoverSkills(
        path.join(input.config.projectRoot, ".claude", "skills"),
        warnings,
      ),
    );
    items.push(
      ...discoverProjectMcp(
        path.join(input.config.projectRoot, ".mcp.json"),
        warnings,
      ),
    );

    return { items, warnings };
  },
  planToggle(input: TogglePlanInput): TogglePlanDecision {
    return {
      status: "blocked",
      selection: toSelectedItemIdentity(input.item),
      targetEnabled: input.targetEnabled,
      operations: [],
      affectedTargets: [],
      reason:
        input.item.mutability === "unsupported"
          ? `unsupported: ${input.item.id} uses a provider lifecycle that is not writable yet`
          : `read-only: ${input.item.id} was discovered successfully, but Claude write planning is not implemented yet`,
    };
  },
};
