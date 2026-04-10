import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import type { ProviderModule } from "../core/discovery.js";
import type {
  DiscoveryItem,
  DiscoveryLayer,
  DiscoveryResult,
  DiscoveryWarning,
} from "../core/models.js";
import { captureSourceFingerprints, dedupeMutationTargets } from "../core/mutation-io.js";
import {
  type MutationOperation,
  type MutationTarget,
  type TogglePlanDecision,
  type TogglePlanInput,
  toSelectedItemIdentity,
} from "../core/mutation-models.js";
import {
  type LoadedVaultEntry,
  loadVaultEntries,
  serializeVaultEntry,
  type VaultEntry,
  vaultDescriptor,
} from "../core/mutation-vault.js";

interface ClaudeSettings {
  enabledPlugins?: Record<string, boolean>;
  enabledMcpjsonServers?: Record<string, unknown>;
  disabledMcpjsonServers?: Record<string, unknown>;
  enableAllProjectMcpServers?: boolean;
}

interface SettingsSource {
  filePath: string;
  exists: boolean;
  layer: DiscoveryLayer;
  settings: ClaudeSettings | null;
  sourceLabel: string;
}

const encoder = new TextEncoder();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOwnRecordEntry(value: Record<string, unknown> | undefined, key: string): boolean {
  return value !== undefined && Object.hasOwn(value, key);
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

function deterministicJsonBytes(value: unknown): Uint8Array {
  return encoder.encode(`${JSON.stringify(value, null, 2)}\n`);
}

function parseBooleanRecord(
  value: unknown,
  filePath: string,
  layer: DiscoveryLayer,
  field: string,
  warnings: DiscoveryWarning[],
): Record<string, boolean> | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!isRecord(value)) {
    pushWarning(warnings, layer, "invalid-shape", `${filePath} ${field} must be an object`);
    return undefined;
  }

  const parsed: Record<string, boolean> = {};

  for (const [key, entryValue] of Object.entries(value)) {
    if (typeof entryValue !== "boolean") {
      pushWarning(
        warnings,
        layer,
        "invalid-shape",
        `${filePath} ${field}.${key} must be a boolean`,
      );
      return undefined;
    }

    parsed[key] = entryValue;
  }

  return parsed;
}

function parseUnknownRecord(
  value: unknown,
  filePath: string,
  layer: DiscoveryLayer,
  field: string,
  warnings: DiscoveryWarning[],
): Record<string, unknown> | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!isRecord(value)) {
    pushWarning(warnings, layer, "invalid-shape", `${filePath} ${field} must be an object`);
    return undefined;
  }

  return value;
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
    pushWarning(warnings, layer, "json-parse-error", `${filePath} is not valid JSON: ${detail}`);
    return null;
  }

  if (!isRecord(parsed)) {
    pushWarning(warnings, layer, "invalid-shape", `${filePath} must be a JSON object`);
    return null;
  }

  const settings: ClaudeSettings = {};
  const enabledPlugins = parseBooleanRecord(
    parsed.enabledPlugins,
    filePath,
    layer,
    "enabledPlugins",
    warnings,
  );
  if (enabledPlugins !== undefined) {
    settings.enabledPlugins = enabledPlugins;
  }

  const enabledMcpjsonServers = parseUnknownRecord(
    parsed.enabledMcpjsonServers,
    filePath,
    layer,
    "enabledMcpjsonServers",
    warnings,
  );
  if (enabledMcpjsonServers !== undefined) {
    settings.enabledMcpjsonServers = enabledMcpjsonServers;
  }

  const disabledMcpjsonServers = parseUnknownRecord(
    parsed.disabledMcpjsonServers,
    filePath,
    layer,
    "disabledMcpjsonServers",
    warnings,
  );
  if (disabledMcpjsonServers !== undefined) {
    settings.disabledMcpjsonServers = disabledMcpjsonServers;
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

function readSettingsSource(
  filePath: string,
  layer: DiscoveryLayer,
  sourceLabel: string,
  warnings: DiscoveryWarning[],
): SettingsSource {
  try {
    const raw = readOptionalFile(filePath);
    return {
      filePath,
      exists: raw !== null,
      layer,
      settings: raw === null ? null : parseClaudeSettings(raw, filePath, layer, warnings),
      sourceLabel,
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    pushWarning(warnings, layer, "file-unreadable", `${filePath} could not be read: ${detail}`);
    return {
      filePath,
      exists: true,
      layer,
      settings: null,
      sourceLabel,
    };
  }
}

function buildToolItems(source: SettingsSource): DiscoveryItem[] {
  if (source.settings?.enabledPlugins === undefined) {
    return [];
  }

  return Object.entries(source.settings.enabledPlugins).map(([pluginId, enabled]) => ({
    provider: "claude",
    kind: "plugin",
    category: "tool",
    layer: source.layer,
    id: `claude:${source.layer}:tool:${source.sourceLabel}:${pluginId}`,
    displayName: pluginId,
    enabled,
    mutability: "read-write",
    sourcePath: source.filePath,
    statePath: source.filePath,
  }));
}

function preferredProjectSettingsPath(
  localSource: SettingsSource,
  settingsSource: SettingsSource,
): string {
  if (localSource.exists) {
    return localSource.filePath;
  }

  if (settingsSource.exists) {
    return settingsSource.filePath;
  }

  return localSource.filePath;
}

function effectiveProjectServerStatePath(
  serverId: string,
  localSource: SettingsSource,
  settingsSource: SettingsSource,
): string {
  const localSettings = localSource.settings;
  if (
    hasOwnRecordEntry(localSettings?.enabledMcpjsonServers, serverId) ||
    hasOwnRecordEntry(localSettings?.disabledMcpjsonServers, serverId)
  ) {
    return localSource.filePath;
  }

  const projectSettings = settingsSource.settings;
  if (
    hasOwnRecordEntry(projectSettings?.enabledMcpjsonServers, serverId) ||
    hasOwnRecordEntry(projectSettings?.disabledMcpjsonServers, serverId)
  ) {
    return settingsSource.filePath;
  }

  return localSource.filePath;
}

function effectiveProjectServerEnabled(
  serverId: string,
  localSource: SettingsSource,
  settingsSource: SettingsSource,
): boolean {
  const statePath = effectiveProjectServerStatePath(serverId, localSource, settingsSource);
  const settings =
    statePath === localSource.filePath ? localSource.settings : settingsSource.settings;

  return hasOwnRecordEntry(settings?.enabledMcpjsonServers, serverId);
}

function discoverProjectSkills(
  rootPath: string,
  appStateRoot: string,
  warnings: DiscoveryWarning[],
): DiscoveryItem[] {
  const items: DiscoveryItem[] = [];
  const liveIds = new Set<string>();

  if (existsSync(rootPath)) {
    try {
      for (const entry of readdirSync(rootPath, { withFileTypes: true })) {
        if (!entry.isDirectory()) {
          continue;
        }

        const skillDir = path.join(rootPath, entry.name);
        const skillPath = path.join(skillDir, "SKILL.md");

        if (!existsSync(skillPath)) {
          continue;
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
            continue;
          }
        } catch (error) {
          const detail = error instanceof Error ? error.message : String(error);
          pushWarning(
            warnings,
            "project",
            "file-unreadable",
            `${skillPath} could not be read: ${detail}`,
          );
          continue;
        }

        const id = `claude:project:skill:${entry.name}`;
        liveIds.add(id);
        items.push({
          provider: "claude",
          kind: "skill",
          category: "skill",
          layer: "project",
          id,
          displayName: entry.name,
          enabled: true,
          mutability: "read-write",
          sourcePath: skillPath,
          statePath: skillDir,
        });
      }
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      pushWarning(
        warnings,
        "project",
        "file-unreadable",
        `${rootPath} could not be read: ${detail}`,
      );
    }
  }

  try {
    const vaultedEntries = loadVaultEntries({
      appStateRoot,
      provider: "claude",
      layer: "project",
      kind: "skill",
    });

    for (const entry of vaultedEntries) {
      if (liveIds.has(entry.itemId)) {
        continue;
      }

      items.push({
        provider: "claude",
        kind: "skill",
        category: "skill",
        layer: "project",
        id: entry.itemId,
        displayName: entry.displayName,
        enabled: false,
        mutability: "read-write",
        sourcePath: path.join(entry.originalPath, "SKILL.md"),
        statePath: entry.entryPath,
      });
    }
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    pushWarning(
      warnings,
      "project",
      "file-unreadable",
      `Claude vault entries could not be loaded: ${detail}`,
    );
  }

  return items;
}

function discoverProjectMcpRegistry(
  mcpPath: string,
  warnings: DiscoveryWarning[],
): Record<string, unknown> | null {
  const raw = readOptionalFile(mcpPath);
  if (raw === null) {
    return null;
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    pushWarning(warnings, "project", "json-parse-error", `${mcpPath} is not valid JSON: ${detail}`);
    return null;
  }

  if (!isRecord(parsed) || !isRecord(parsed.mcpServers)) {
    pushWarning(
      warnings,
      "project",
      "invalid-shape",
      `${mcpPath} must define an object-valued mcpServers`,
    );
    return null;
  }

  return parsed.mcpServers;
}

function discoverProjectConfiguredMcpItems(
  mcpPath: string,
  settingsSource: SettingsSource,
  localSource: SettingsSource,
  warnings: DiscoveryWarning[],
): DiscoveryItem[] {
  const items: DiscoveryItem[] = [];
  const registry = discoverProjectMcpRegistry(mcpPath, warnings);

  if (registry !== null) {
    for (const serverId of Object.keys(registry)) {
      items.push({
        provider: "claude",
        kind: "mcp",
        category: "configured-mcp",
        layer: "project",
        id: `claude:project:configured-mcp:${serverId}`,
        displayName: serverId,
        enabled: effectiveProjectServerEnabled(serverId, localSource, settingsSource),
        mutability: "read-write",
        sourcePath: mcpPath,
        statePath: effectiveProjectServerStatePath(serverId, localSource, settingsSource),
      });
    }
  }

  if (
    registry !== null ||
    localSource.settings?.enableAllProjectMcpServers !== undefined ||
    settingsSource.settings?.enableAllProjectMcpServers !== undefined
  ) {
    const preferredPath = preferredProjectSettingsPath(localSource, settingsSource);
    const enableAll =
      localSource.settings?.enableAllProjectMcpServers ??
      settingsSource.settings?.enableAllProjectMcpServers ??
      false;

    items.push({
      provider: "claude",
      kind: "mcp",
      category: "configured-mcp",
      layer: "project",
      id: "claude:project:configured-mcp:all-project-mcp-servers",
      displayName: "All project MCP servers",
      enabled: enableAll,
      mutability: "read-write",
      sourcePath: preferredPath,
      statePath: preferredPath,
    });
  }

  return items;
}

function blockedDecision(
  input: TogglePlanInput,
  reason: string,
  operations: MutationOperation[] = [],
  affectedTargets: MutationTarget[] = [],
): TogglePlanDecision {
  return {
    status: "blocked",
    selection: toSelectedItemIdentity(input.item),
    targetEnabled: input.targetEnabled,
    operations,
    affectedTargets,
    reason,
  };
}

function plannedDecision(
  input: TogglePlanInput,
  operations: MutationOperation[],
  affectedTargets: MutationTarget[],
  fingerprintTargets: MutationTarget[] = affectedTargets,
): TogglePlanDecision {
  return {
    status: "planned",
    plan: {
      selection: toSelectedItemIdentity(input.item),
      targetEnabled: input.targetEnabled,
      operations,
      affectedTargets,
      sourceFingerprints: captureSourceFingerprints(fingerprintTargets),
    },
  };
}

function loadJsonObjectForPlanning(
  filePath: string,
):
  | { exists: false }
  | { exists: true; document: Record<string, unknown> }
  | { exists: true; error: string } {
  if (!existsSync(filePath)) {
    return { exists: false };
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(readFileSync(filePath, "utf8"));
  } catch (error) {
    return {
      exists: true,
      error: error instanceof Error ? error.message : String(error),
    };
  }

  if (!isRecord(parsed)) {
    return {
      exists: true,
      error: "settings file must be a JSON object",
    };
  }

  return {
    exists: true,
    document: parsed,
  };
}

function ensureObjectOperations(
  document: Record<string, unknown>,
  statePath: string,
  key: "enabledMcpjsonServers" | "disabledMcpjsonServers" | "enabledPlugins",
): MutationOperation[] | string {
  const current = document[key];

  if (current === undefined) {
    return [
      {
        type: "replaceJsonValue",
        path: statePath,
        jsonPath: [key],
        value: {},
      },
    ];
  }

  if (!isRecord(current)) {
    return `${statePath} ${key} must be a JSON object`;
  }

  return [];
}

function loadProjectRegistryPayload(
  sourcePath: string,
  serverId: string,
): { payload: unknown } | { error: string } {
  const raw = readOptionalFile(sourcePath);
  if (raw === null) {
    return { error: `${sourcePath} is missing` };
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return { error: `${sourcePath} is not valid JSON: ${detail}` };
  }

  if (!isRecord(parsed) || !isRecord(parsed.mcpServers)) {
    return { error: `${sourcePath} must define an object-valued mcpServers` };
  }

  if (!Object.hasOwn(parsed.mcpServers, serverId)) {
    return { error: `${sourcePath} does not define ${serverId}` };
  }

  return { payload: parsed.mcpServers[serverId] };
}

function loadDisabledSkillEntry(appStateRoot: string, itemId: string): LoadedVaultEntry | null {
  return (
    loadVaultEntries({
      appStateRoot,
      provider: "claude",
      layer: "project",
      kind: "skill",
    }).find((entry) => entry.itemId === itemId) ?? null
  );
}

function planSkillToggle(input: TogglePlanInput): TogglePlanDecision {
  if (input.item.layer !== "project") {
    return blockedDecision(input, `unsupported: ${input.item.id} is not writable`);
  }

  if (input.item.enabled) {
    const skillDir = input.item.statePath;
    const descriptor = vaultDescriptor({
      appStateRoot: input.config.appStateRoot,
      provider: "claude",
      layer: "project",
      kind: "skill",
      itemId: input.item.id,
    });

    if (existsSync(descriptor.entryPath) || existsSync(descriptor.vaultedPath)) {
      return blockedDecision(input, `vault-conflict: ${descriptor.rootPath} already exists`);
    }

    const entry: VaultEntry = {
      version: 1,
      provider: "claude",
      kind: "skill",
      layer: "project",
      itemId: input.item.id,
      displayName: input.item.displayName,
      originalPath: skillDir,
      vaultedPath: descriptor.vaultedPath,
      payloadKind: "path",
    };
    const affectedTargets = dedupeMutationTargets([
      { type: "path", path: skillDir },
      { type: "path", path: descriptor.vaultedPath },
      { type: "path", path: descriptor.entryPath },
    ]);

    return plannedDecision(
      input,
      [
        {
          type: "renamePath",
          fromPath: skillDir,
          toPath: descriptor.vaultedPath,
        },
        {
          type: "createFile",
          path: descriptor.entryPath,
          content: serializeVaultEntry(entry),
        },
      ],
      affectedTargets,
    );
  }

  if (!existsSync(input.item.statePath)) {
    return blockedDecision(input, `missing-vault-manifest: ${input.item.statePath} does not exist`);
  }

  const entry = loadDisabledSkillEntry(input.config.appStateRoot, input.item.id);
  if (entry === null) {
    return blockedDecision(
      input,
      `missing-vault-manifest: ${input.item.statePath} could not be loaded`,
    );
  }

  if (!existsSync(entry.vaultedPath)) {
    return blockedDecision(input, `missing-vault-payload: ${entry.vaultedPath} does not exist`);
  }

  if (existsSync(entry.originalPath)) {
    return blockedDecision(input, `live-path-conflict: ${entry.originalPath} already exists`);
  }

  const affectedTargets = dedupeMutationTargets([
    { type: "path", path: entry.originalPath },
    { type: "path", path: entry.vaultedPath },
    { type: "path", path: entry.entryPath },
  ]);

  return plannedDecision(
    input,
    [
      {
        type: "renamePath",
        fromPath: entry.vaultedPath,
        toPath: entry.originalPath,
      },
      {
        type: "deletePath",
        path: entry.entryPath,
      },
    ],
    affectedTargets,
  );
}

function planServerConfiguredMcpToggle(input: TogglePlanInput): TogglePlanDecision {
  const registry = loadProjectRegistryPayload(input.item.sourcePath, input.item.displayName);
  if ("error" in registry) {
    return blockedDecision(input, registry.error);
  }

  const state = loadJsonObjectForPlanning(input.item.statePath);
  const affectedTargets = dedupeMutationTargets([
    {
      type: "path",
      path: input.item.statePath,
    },
  ]);
  const fingerprintTargets = dedupeMutationTargets([
    {
      type: "path",
      path: input.item.statePath,
    },
    {
      type: "path",
      path: input.item.sourcePath,
    },
  ]);

  if ("error" in state) {
    return blockedDecision(
      input,
      `${input.item.statePath} could not be parsed: ${state.error}`,
      [],
      affectedTargets,
    );
  }

  if (!state.exists) {
    return plannedDecision(
      input,
      [
        {
          type: "createFile",
          path: input.item.statePath,
          content: deterministicJsonBytes(
            input.targetEnabled
              ? {
                  enabledMcpjsonServers: {
                    [input.item.displayName]: registry.payload,
                  },
                  disabledMcpjsonServers: {},
                }
              : {
                  enabledMcpjsonServers: {},
                  disabledMcpjsonServers: {
                    [input.item.displayName]: registry.payload,
                  },
                },
          ),
        },
      ],
      affectedTargets,
      fingerprintTargets,
    );
  }

  const operations: MutationOperation[] = [];
  for (const key of ["enabledMcpjsonServers", "disabledMcpjsonServers"] as const) {
    const ensured = ensureObjectOperations(state.document, input.item.statePath, key);
    if (typeof ensured === "string") {
      return blockedDecision(input, ensured, operations, affectedTargets);
    }
    operations.push(...ensured);
  }

  if (input.targetEnabled) {
    operations.push(
      {
        type: "removeJsonObjectEntry",
        path: input.item.statePath,
        jsonPath: ["disabledMcpjsonServers"],
        entryKey: input.item.displayName,
      },
      {
        type: "updateJsonObjectEntry",
        path: input.item.statePath,
        jsonPath: ["enabledMcpjsonServers"],
        entryKey: input.item.displayName,
        value: registry.payload,
      },
    );
  } else {
    operations.push(
      {
        type: "removeJsonObjectEntry",
        path: input.item.statePath,
        jsonPath: ["enabledMcpjsonServers"],
        entryKey: input.item.displayName,
      },
      {
        type: "updateJsonObjectEntry",
        path: input.item.statePath,
        jsonPath: ["disabledMcpjsonServers"],
        entryKey: input.item.displayName,
        value: registry.payload,
      },
    );
  }

  return plannedDecision(input, operations, affectedTargets, fingerprintTargets);
}

function planAllProjectMcpToggle(input: TogglePlanInput): TogglePlanDecision {
  const state = loadJsonObjectForPlanning(input.item.statePath);
  const affectedTargets = dedupeMutationTargets([
    {
      type: "path",
      path: input.item.statePath,
    },
  ]);

  if ("error" in state) {
    return blockedDecision(
      input,
      `${input.item.statePath} could not be parsed: ${state.error}`,
      [],
      affectedTargets,
    );
  }

  if (!state.exists) {
    return plannedDecision(
      input,
      [
        {
          type: "createFile",
          path: input.item.statePath,
          content: deterministicJsonBytes({
            enableAllProjectMcpServers: input.targetEnabled,
          }),
        },
      ],
      affectedTargets,
    );
  }

  return plannedDecision(
    input,
    [
      {
        type: "replaceJsonValue",
        path: input.item.statePath,
        jsonPath: ["enableAllProjectMcpServers"],
        value: input.targetEnabled,
      },
    ],
    affectedTargets,
  );
}

function planConfiguredMcpToggle(input: TogglePlanInput): TogglePlanDecision {
  if (input.item.id === "claude:project:configured-mcp:all-project-mcp-servers") {
    return planAllProjectMcpToggle(input);
  }

  return planServerConfiguredMcpToggle(input);
}

function planToolToggle(input: TogglePlanInput): TogglePlanDecision {
  const state = loadJsonObjectForPlanning(input.item.statePath);
  const affectedTargets = dedupeMutationTargets([
    {
      type: "path",
      path: input.item.statePath,
    },
  ]);

  if ("error" in state) {
    return blockedDecision(
      input,
      `${input.item.statePath} could not be parsed: ${state.error}`,
      [],
      affectedTargets,
    );
  }

  if (!state.exists) {
    return plannedDecision(
      input,
      [
        {
          type: "createFile",
          path: input.item.statePath,
          content: deterministicJsonBytes({
            enabledPlugins: {
              [input.item.displayName]: input.targetEnabled,
            },
          }),
        },
      ],
      affectedTargets,
    );
  }

  const ensured = ensureObjectOperations(state.document, input.item.statePath, "enabledPlugins");
  if (typeof ensured === "string") {
    return blockedDecision(input, ensured, [], affectedTargets);
  }

  return plannedDecision(
    input,
    [
      ...ensured,
      {
        type: "replaceJsonValue",
        path: input.item.statePath,
        jsonPath: ["enabledPlugins", input.item.displayName],
        value: input.targetEnabled,
      },
    ],
    affectedTargets,
  );
}

export const claudeProvider: ProviderModule = {
  id: "claude",
  discover(input): DiscoveryResult {
    const warnings: DiscoveryWarning[] = [];
    const globalSettings = readSettingsSource(
      path.join(input.homeDir, ".claude", "settings.json"),
      "global",
      "settings",
      warnings,
    );
    const globalLocalSettings = readSettingsSource(
      path.join(input.homeDir, ".claude", "settings.local.json"),
      "global",
      "settings-local",
      warnings,
    );
    const projectSettings = readSettingsSource(
      path.join(input.config.projectRoot, ".claude", "settings.json"),
      "project",
      "settings",
      warnings,
    );
    const projectLocalSettings = readSettingsSource(
      path.join(input.config.projectRoot, ".claude", "settings.local.json"),
      "project",
      "settings-local",
      warnings,
    );

    const items: DiscoveryItem[] = [
      ...buildToolItems(globalSettings),
      ...buildToolItems(globalLocalSettings),
      ...discoverProjectSkills(
        path.join(input.config.projectRoot, ".claude", "skills"),
        input.config.appStateRoot,
        warnings,
      ),
      ...discoverProjectConfiguredMcpItems(
        path.join(input.config.projectRoot, ".mcp.json"),
        projectSettings,
        projectLocalSettings,
        warnings,
      ),
      ...buildToolItems(projectSettings),
      ...buildToolItems(projectLocalSettings),
    ];

    return { items, warnings };
  },
  planToggle(input: TogglePlanInput): TogglePlanDecision {
    switch (input.item.category) {
      case "skill":
        return planSkillToggle(input);
      case "configured-mcp":
        return planConfiguredMcpToggle(input);
      case "tool":
        return planToolToggle(input);
      default:
        return blockedDecision(
          input,
          `unsupported category: ${String((input.item as { category: unknown }).category)}`,
        );
    }
  },
};
