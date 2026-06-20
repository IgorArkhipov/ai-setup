import { type Dirent, existsSync, readdirSync, readFileSync, statSync } from "node:fs";
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
  loadVaultEntries,
  serializeVaultEntry,
  type VaultEntry,
  vaultDescriptor,
  vaultPayloadLocation,
} from "../core/mutation-vault.js";

interface ZedSettingsLocation {
  layer: DiscoveryLayer;
  idSuffix: string;
  displayName: string;
  filePath: string;
}

interface ZedConfiguredMcpIdentity {
  layer: DiscoveryLayer;
  settingsId: string;
  serverId: string;
}

const encoder = new TextEncoder();
const projectInstructionFiles = [
  ".rules",
  ".cursorrules",
  ".windsurfrules",
  ".clinerules",
  ".github/copilot-instructions.md",
  "AGENT.md",
  "AGENTS.md",
  "CLAUDE.md",
  "GEMINI.md",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function deterministicJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function stripJsonCommentsAndTrailingCommas(contents: string): string {
  let withoutComments = "";
  let inString = false;
  let escaped = false;
  let index = 0;

  while (index < contents.length) {
    const char = contents[index];
    const next = contents[index + 1];

    if (char === undefined) {
      break;
    }

    if (inString) {
      withoutComments += char;
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      index += 1;
      continue;
    }

    if (char === '"') {
      inString = true;
      withoutComments += char;
      index += 1;
      continue;
    }

    if (char === "/" && next === "/") {
      index += 2;
      while (index < contents.length && contents[index] !== "\n") {
        index += 1;
      }
      continue;
    }

    if (char === "/" && next === "*") {
      index += 2;
      while (index < contents.length && !(contents[index] === "*" && contents[index + 1] === "/")) {
        index += 1;
      }
      index += 2;
      continue;
    }

    withoutComments += char;
    index += 1;
  }

  let result = "";
  inString = false;
  escaped = false;

  for (let cursor = 0; cursor < withoutComments.length; cursor += 1) {
    const char = withoutComments[cursor];
    if (char === undefined) {
      break;
    }

    if (inString) {
      result += char;
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      result += char;
      continue;
    }

    if (char === ",") {
      let lookahead = cursor + 1;
      while (lookahead < withoutComments.length && /\s/.test(withoutComments[lookahead] ?? "")) {
        lookahead += 1;
      }
      const next = withoutComments[lookahead];
      if (next === "}" || next === "]") {
        continue;
      }
    }

    result += char;
  }

  return result;
}

function parseZedJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return JSON.parse(stripJsonCommentsAndTrailingCommas(raw));
  }
}

function pushWarning(
  warnings: DiscoveryWarning[],
  layer: DiscoveryLayer,
  code: string,
  message: string,
): void {
  warnings.push({
    provider: "zed",
    layer,
    code,
    message,
  });
}

function readOptionalFile(filePath: string): string | null {
  if (!existsSync(filePath)) {
    return null;
  }

  return readFileSync(filePath, "utf8");
}

function parseJsonObjectFile(
  filePath: string,
  layer: DiscoveryLayer,
  warnings: DiscoveryWarning[],
): Record<string, unknown> | null {
  let raw: string | null;
  try {
    raw = readOptionalFile(filePath);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    pushWarning(warnings, layer, "file-unreadable", `${filePath} could not be read: ${detail}`);
    return null;
  }

  if (raw === null) {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = parseZedJson(raw);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    pushWarning(warnings, layer, "json-parse-error", `${filePath} is not valid JSON: ${detail}`);
    return null;
  }

  if (!isRecord(parsed)) {
    pushWarning(warnings, layer, "invalid-shape", `${filePath} must be a JSON object`);
    return null;
  }

  return parsed;
}

function unquoteMetadataValue(value: string): string {
  const trimmed = value.trim();
  const quoted = trimmed.match(/^["'](.+)["']$/);
  return (quoted?.[1] ?? trimmed).trim();
}

function parseSkillName(raw: string): string | null {
  if (!raw.startsWith("---")) {
    return null;
  }

  const endIndex = raw.indexOf("\n---", 3);
  if (endIndex === -1) {
    return null;
  }

  const frontmatter = raw.slice(3, endIndex);
  const match = frontmatter.match(/^name:\s*(.+)$/m);
  const name = match?.[1] === undefined ? "" : unquoteMetadataValue(match[1]);

  return name.length > 0 ? name : null;
}

function skillDisplayName(
  skillFile: string,
  fallbackName: string,
  layer: DiscoveryLayer,
  warnings: DiscoveryWarning[],
): string {
  try {
    return parseSkillName(readFileSync(skillFile, "utf8")) ?? fallbackName;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    pushWarning(warnings, layer, "file-unreadable", `${skillFile} could not be read: ${detail}`);
    return fallbackName;
  }
}

function collectSkillDirs(
  rootPath: string,
  layer: DiscoveryLayer,
  warnings: DiscoveryWarning[],
): Array<{
  id: string;
  displayName: string;
  skillDir: string;
  skillFile: string;
}> {
  if (!existsSync(rootPath)) {
    return [];
  }

  const skills: Array<{
    id: string;
    displayName: string;
    skillDir: string;
    skillFile: string;
  }> = [];

  let entries: Dirent[];
  try {
    entries = readdirSync(rootPath, { withFileTypes: true });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    pushWarning(warnings, layer, "file-unreadable", `${rootPath} could not be read: ${detail}`);
    return [];
  }

  for (const entry of entries) {
    const skillDir = path.join(rootPath, entry.name);
    const isSkillDirectory =
      entry.isDirectory() ||
      (entry.isSymbolicLink() &&
        (() => {
          try {
            return statSync(skillDir).isDirectory();
          } catch (error) {
            const detail = error instanceof Error ? error.message : String(error);
            pushWarning(
              warnings,
              layer,
              "file-unreadable",
              `${skillDir} could not be read: ${detail}`,
            );
            return false;
          }
        })());

    if (!isSkillDirectory) {
      continue;
    }

    const skillFile = path.join(skillDir, "SKILL.md");
    if (!existsSync(skillFile)) {
      continue;
    }

    skills.push({
      id: entry.name,
      displayName: skillDisplayName(skillFile, entry.name, layer, warnings),
      skillDir,
      skillFile,
    });
  }

  return skills.sort((left, right) => left.id.localeCompare(right.id));
}

function discoverLiveSkillItems(
  rootPath: string,
  appStateRoot: string,
  layer: DiscoveryLayer,
  warnings: DiscoveryWarning[],
): DiscoveryItem[] {
  const liveItems = collectSkillDirs(rootPath, layer, warnings).map((skill) => ({
    provider: "zed" as const,
    kind: "skill" as const,
    category: "skill" as const,
    layer,
    id: `zed:${layer}:skill:${skill.id}`,
    displayName: skill.displayName,
    enabled: true,
    mutability: "read-write" as const,
    sourcePath: skill.skillFile,
    statePath: skill.skillDir,
  }));
  const liveIds = new Set(liveItems.map((item) => item.id));

  return [...liveItems, ...discoverVaultedSkillItems(appStateRoot, layer, warnings, liveIds)].sort(
    (left, right) => left.id.localeCompare(right.id),
  );
}

function discoverVaultedSkillItems(
  appStateRoot: string,
  layer: DiscoveryLayer,
  warnings: DiscoveryWarning[],
  liveIds: Set<string>,
): DiscoveryItem[] {
  try {
    return loadVaultEntries({
      appStateRoot,
      provider: "zed",
      layer,
      kind: "skill",
    }).flatMap((entry) => {
      if (liveIds.has(entry.itemId)) {
        pushWarning(
          warnings,
          layer,
          "conflicting-state",
          `conflicting Zed skill state for ${entry.itemId}: live and vaulted copies both exist`,
        );
        return [];
      }

      if (entry.payloadKind !== "path") {
        pushWarning(
          warnings,
          layer,
          "invalid-shape",
          `${entry.entryPath} must use payloadKind path for Zed skills`,
        );
        return [];
      }

      if (!existsSync(entry.vaultedPath)) {
        pushWarning(
          warnings,
          layer,
          "missing-vault-payload",
          `${entry.vaultedPath} does not exist for ${entry.itemId}`,
        );
        return [];
      }

      return [
        {
          provider: "zed" as const,
          kind: "skill" as const,
          category: "skill" as const,
          layer,
          id: entry.itemId,
          displayName: entry.displayName,
          enabled: false,
          mutability: "read-write" as const,
          sourcePath: path.join(entry.originalPath, "SKILL.md"),
          statePath: entry.entryPath,
        },
      ];
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    pushWarning(
      warnings,
      layer,
      "file-unreadable",
      `Zed ${layer} skill vault entries could not be loaded: ${detail}`,
    );
    return [];
  }
}

function settingsItem(location: ZedSettingsLocation): DiscoveryItem {
  return {
    provider: "zed",
    kind: "setting",
    category: "provider-setting",
    layer: location.layer,
    id: `zed:${location.layer}:setting:${location.idSuffix}`,
    displayName: location.displayName,
    enabled: true,
    mutability: "read-only",
    sourcePath: location.filePath,
    statePath: location.filePath,
  };
}

function instructionItem(
  layer: DiscoveryLayer,
  idSuffix: string,
  displayName: string,
  filePath: string,
  enabled: boolean,
): DiscoveryItem {
  return {
    provider: "zed",
    kind: "setting",
    category: "provider-setting",
    layer,
    id: `zed:${layer}:setting:${idSuffix}`,
    displayName,
    enabled,
    mutability: "read-only",
    sourcePath: filePath,
    statePath: filePath,
  };
}

function discoverInstructionItems(homeDir: string, projectRoot: string): DiscoveryItem[] {
  const items: DiscoveryItem[] = [];
  const globalAgentsPath = path.join(homeDir, ".config", "zed", "AGENTS.md");

  if (existsSync(globalAgentsPath)) {
    items.push(instructionItem("global", "agents-md", "AGENTS.md", globalAgentsPath, true));
  }

  const presentProjectInstructions = projectInstructionFiles
    .map((relativePath) => ({
      relativePath,
      filePath: path.join(projectRoot, relativePath),
    }))
    .filter((candidate) => existsSync(candidate.filePath));

  for (const [index, instruction] of presentProjectInstructions.entries()) {
    const idSuffix = instruction.relativePath
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    items.push(
      instructionItem(
        "project",
        idSuffix,
        instruction.relativePath,
        instruction.filePath,
        index === 0,
      ),
    );
  }

  return items;
}

function zedSettingsLocations(homeDir: string, projectRoot: string): ZedSettingsLocation[] {
  return [
    {
      layer: "global",
      idSuffix: "config-settings",
      displayName: "~/.config/zed/settings.json",
      filePath: path.join(homeDir, ".config", "zed", "settings.json"),
    },
    {
      layer: "global",
      idSuffix: "zed-settings",
      displayName: "~/.zed/settings.json",
      filePath: path.join(homeDir, ".zed", "settings.json"),
    },
    {
      layer: "project",
      idSuffix: "project-settings",
      displayName: ".zed/settings.json",
      filePath: path.join(projectRoot, ".zed", "settings.json"),
    },
  ];
}

function parseContextServers(
  location: ZedSettingsLocation,
  warnings: DiscoveryWarning[],
): Record<string, unknown> | null {
  const parsed = parseJsonObjectFile(location.filePath, location.layer, warnings);
  if (parsed === null) {
    return null;
  }

  const contextServers = parsed.context_servers;
  if (contextServers === undefined) {
    return {};
  }

  if (!isRecord(contextServers)) {
    pushWarning(
      warnings,
      location.layer,
      "invalid-shape",
      `${location.filePath} context_servers must be a JSON object`,
    );
    return null;
  }

  return contextServers;
}

function discoverConfiguredMcpItems(
  location: ZedSettingsLocation,
  warnings: DiscoveryWarning[],
): DiscoveryItem[] {
  if (!existsSync(location.filePath)) {
    return [];
  }

  const items = [settingsItem(location)];
  const contextServers = parseContextServers(location, warnings);
  if (contextServers === null) {
    return items;
  }

  for (const serverId of Object.keys(contextServers).sort()) {
    if (!isRecord(contextServers[serverId])) {
      pushWarning(
        warnings,
        location.layer,
        "invalid-shape",
        `${location.filePath} context_servers.${serverId} must be a JSON object`,
      );
      continue;
    }

    items.push({
      provider: "zed",
      kind: "mcp",
      category: "configured-mcp",
      layer: location.layer,
      id: `zed:${location.layer}:configured-mcp:${location.idSuffix}:${serverId}`,
      displayName: serverId,
      enabled: true,
      mutability: "read-write",
      sourcePath: location.filePath,
      statePath: location.filePath,
    });
  }

  return items;
}

function zedConfiguredMcpIdentity(itemId: string): ZedConfiguredMcpIdentity | null {
  const match = itemId.match(/^zed:(global|project):configured-mcp:([^:]+):(.+)$/);
  if (match === null) {
    return null;
  }

  const [, layer, settingsId, serverId] = match;
  if (layer === undefined || settingsId === undefined || serverId === undefined) {
    return null;
  }

  return {
    layer: layer as DiscoveryLayer,
    settingsId,
    serverId,
  };
}

function discoverVaultedConfiguredMcpItems(
  appStateRoot: string,
  layer: DiscoveryLayer,
  warnings: DiscoveryWarning[],
  liveIds: Set<string>,
): DiscoveryItem[] {
  try {
    return loadVaultEntries({
      appStateRoot,
      provider: "zed",
      layer,
      kind: "configured-mcp",
    }).flatMap((entry) => {
      if (liveIds.has(entry.itemId)) {
        pushWarning(
          warnings,
          layer,
          "conflicting-state",
          `conflicting Zed configured MCP state for ${entry.itemId}: live and vaulted copies both exist`,
        );
        return [];
      }

      if (entry.payloadKind !== "json-payload") {
        pushWarning(
          warnings,
          layer,
          "invalid-shape",
          `${entry.entryPath} must use payloadKind json-payload for Zed configured MCPs`,
        );
        return [];
      }

      if (!existsSync(entry.payloadPath)) {
        pushWarning(
          warnings,
          layer,
          "missing-vault-payload",
          `${entry.payloadPath} does not exist for ${entry.itemId}`,
        );
        return [];
      }

      let payload: unknown;
      try {
        payload = JSON.parse(readFileSync(entry.payloadPath, "utf8"));
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        pushWarning(
          warnings,
          layer,
          "invalid-shape",
          `${entry.payloadPath} must contain a JSON object: ${detail}`,
        );
        return [];
      }

      if (!isRecord(payload)) {
        pushWarning(
          warnings,
          layer,
          "invalid-shape",
          `${entry.payloadPath} must contain a JSON object`,
        );
        return [];
      }

      const identity = zedConfiguredMcpIdentity(entry.itemId);
      if (identity === null) {
        pushWarning(
          warnings,
          layer,
          "invalid-shape",
          `${entry.entryPath} itemId must use a Zed configured MCP id`,
        );
        return [];
      }

      return [
        {
          provider: "zed" as const,
          kind: "mcp" as const,
          category: "configured-mcp" as const,
          layer,
          id: entry.itemId,
          displayName: entry.displayName,
          enabled: false,
          mutability: "read-write" as const,
          sourcePath: entry.originalPath,
          statePath: entry.entryPath,
        },
      ];
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    pushWarning(
      warnings,
      layer,
      "file-unreadable",
      `Zed ${layer} configured MCP vault entries could not be loaded: ${detail}`,
    );
    return [];
  }
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

function loadVaultedEntry(
  appStateRoot: string,
  layer: DiscoveryLayer,
  kind: "skill" | "configured-mcp",
  itemId: string,
) {
  return (
    loadVaultEntries({
      appStateRoot,
      provider: "zed",
      layer,
      kind,
    }).find((entry) => entry.itemId === itemId) ?? null
  );
}

function planSkillToggle(input: TogglePlanInput): TogglePlanDecision {
  if (input.item.enabled === input.targetEnabled) {
    return plannedDecision(input, [], []);
  }

  if (input.item.enabled) {
    const descriptor = vaultDescriptor({
      appStateRoot: input.config.appStateRoot,
      provider: "zed",
      layer: input.item.layer,
      kind: "skill",
      itemId: input.item.id,
    });

    if (existsSync(descriptor.entryPath) || existsSync(descriptor.vaultedPath)) {
      return blockedDecision(input, `vault-conflict: ${descriptor.rootPath} already exists`);
    }

    const entry: VaultEntry = {
      version: 1,
      provider: "zed",
      kind: "skill",
      layer: input.item.layer,
      itemId: input.item.id,
      displayName: input.item.displayName,
      originalPath: input.item.statePath,
      vaultedPath: descriptor.vaultedPath,
      payloadKind: "path",
    };
    const affectedTargets = dedupeMutationTargets([
      { type: "path", path: input.item.statePath },
      { type: "path", path: descriptor.vaultedPath },
      { type: "path", path: descriptor.entryPath },
    ]);

    return plannedDecision(
      input,
      [
        {
          type: "renamePath",
          fromPath: input.item.statePath,
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

  const entry = loadVaultedEntry(
    input.config.appStateRoot,
    input.item.layer,
    "skill",
    input.item.id,
  );
  if (entry === null) {
    return blockedDecision(
      input,
      `missing-vault-manifest: ${input.item.statePath} could not be loaded`,
    );
  }

  if (entry.payloadKind !== "path") {
    return blockedDecision(
      input,
      `invalid-vault-manifest: ${entry.entryPath} must use payloadKind path`,
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
    { type: "path", path: path.dirname(entry.entryPath) },
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
      {
        type: "deletePath",
        path: path.dirname(entry.entryPath),
      },
    ],
    affectedTargets,
  );
}

function parseLiveSettingsForPlan(
  filePath: string,
):
  | { status: "missing" }
  | { status: "ok"; doc: Record<string, unknown> }
  | { status: "error"; reason: string } {
  let raw: string | null;
  try {
    raw = readOptionalFile(filePath);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return { status: "error", reason: `${filePath} could not be read: ${detail}` };
  }

  if (raw === null) {
    return { status: "missing" };
  }

  try {
    const parsed = parseZedJson(raw);
    if (!isRecord(parsed)) {
      return { status: "error", reason: `${filePath} must be a JSON object` };
    }
    return { status: "ok", doc: parsed };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return { status: "error", reason: `${filePath} is not valid JSON or JSONC: ${detail}` };
  }
}

function planConfiguredMcpToggle(input: TogglePlanInput): TogglePlanDecision {
  if (input.item.enabled === input.targetEnabled) {
    return plannedDecision(input, [], []);
  }

  const identity = zedConfiguredMcpIdentity(input.item.id);
  if (identity === null) {
    return blockedDecision(input, `unsupported: ${input.item.id} is not a Zed configured MCP`);
  }

  const descriptor = vaultDescriptor({
    appStateRoot: input.config.appStateRoot,
    provider: "zed",
    layer: input.item.layer,
    kind: "configured-mcp",
    itemId: input.item.id,
  });

  if (input.item.enabled) {
    if (existsSync(descriptor.entryPath) || existsSync(descriptor.payloadPath)) {
      return blockedDecision(input, `vault-conflict: ${descriptor.rootPath} already exists`);
    }

    const parsed = parseLiveSettingsForPlan(input.item.statePath);
    if (parsed.status !== "ok") {
      return blockedDecision(
        input,
        parsed.status === "missing"
          ? `missing-live-config: ${input.item.statePath} does not exist`
          : parsed.reason,
      );
    }

    const contextServers = parsed.doc.context_servers;
    if (!isRecord(contextServers)) {
      return blockedDecision(
        input,
        `invalid-live-config: ${input.item.statePath} context_servers must be a JSON object`,
      );
    }

    const serverConfig = contextServers[identity.serverId];
    if (!isRecord(serverConfig)) {
      return blockedDecision(
        input,
        `missing-live-server: ${identity.serverId} is not present in ${input.item.statePath}`,
      );
    }

    const payloadPath = vaultPayloadLocation(descriptor, "json-payload");
    const entry: VaultEntry = {
      version: 1,
      provider: "zed",
      kind: "configured-mcp",
      layer: input.item.layer,
      itemId: input.item.id,
      displayName: input.item.displayName,
      originalPath: input.item.statePath,
      vaultedPath: payloadPath,
      payloadKind: "json-payload",
    };
    const affectedTargets = dedupeMutationTargets([
      { type: "path", path: input.item.statePath },
      { type: "path", path: payloadPath },
      { type: "path", path: descriptor.entryPath },
    ]);

    return plannedDecision(
      input,
      [
        {
          type: "createFile",
          path: payloadPath,
          content: encoder.encode(deterministicJson(serverConfig)),
        },
        {
          type: "createFile",
          path: descriptor.entryPath,
          content: serializeVaultEntry(entry),
        },
        {
          type: "removeJsonObjectEntry",
          path: input.item.statePath,
          jsonPath: ["context_servers"],
          entryKey: identity.serverId,
        },
      ],
      affectedTargets,
    );
  }

  const entry = loadVaultedEntry(
    input.config.appStateRoot,
    input.item.layer,
    "configured-mcp",
    input.item.id,
  );
  if (entry === null) {
    return blockedDecision(
      input,
      `missing-vault-manifest: ${input.item.statePath} could not be loaded`,
    );
  }

  if (entry.payloadKind !== "json-payload") {
    return blockedDecision(
      input,
      `invalid-vault-manifest: ${entry.entryPath} must use payloadKind json-payload`,
    );
  }

  if (!existsSync(entry.payloadPath)) {
    return blockedDecision(input, `missing-vault-payload: ${entry.payloadPath} does not exist`);
  }

  let payload: unknown;
  try {
    payload = JSON.parse(readFileSync(entry.payloadPath, "utf8"));
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return blockedDecision(
      input,
      `invalid-vault-payload: ${entry.payloadPath} could not be parsed: ${detail}`,
    );
  }

  if (!isRecord(payload)) {
    return blockedDecision(input, `invalid-vault-payload: ${entry.payloadPath} must be an object`);
  }

  const parsed = parseLiveSettingsForPlan(entry.originalPath);
  if (parsed.status === "error") {
    return blockedDecision(input, parsed.reason);
  }

  const contextServers = parsed.status === "ok" ? parsed.doc.context_servers : undefined;
  if (contextServers !== undefined && !isRecord(contextServers)) {
    return blockedDecision(
      input,
      `invalid-live-config: ${entry.originalPath} context_servers must be a JSON object`,
    );
  }

  if (isRecord(contextServers) && Object.hasOwn(contextServers, identity.serverId)) {
    return blockedDecision(
      input,
      `live-server-conflict: ${identity.serverId} is already present in ${entry.originalPath}`,
    );
  }

  const affectedTargets = dedupeMutationTargets([
    { type: "path", path: entry.originalPath },
    { type: "path", path: entry.payloadPath },
    { type: "path", path: entry.entryPath },
    { type: "path", path: path.dirname(entry.entryPath) },
  ]);
  const restoreOperation: MutationOperation =
    parsed.status === "missing"
      ? {
          type: "createFile",
          path: entry.originalPath,
          content: encoder.encode(
            deterministicJson({
              context_servers: {
                [identity.serverId]: payload,
              },
            }),
          ),
        }
      : contextServers === undefined
        ? {
            type: "replaceJsonValue",
            path: entry.originalPath,
            jsonPath: ["context_servers"],
            value: {
              [identity.serverId]: payload,
            },
          }
        : {
            type: "updateJsonObjectEntry",
            path: entry.originalPath,
            jsonPath: ["context_servers"],
            entryKey: identity.serverId,
            value: payload,
          };

  return plannedDecision(
    input,
    [
      restoreOperation,
      {
        type: "deletePath",
        path: entry.payloadPath,
      },
      {
        type: "deletePath",
        path: entry.entryPath,
      },
      {
        type: "deletePath",
        path: path.dirname(entry.entryPath),
      },
    ],
    affectedTargets,
  );
}

function planReadOnlySurfaceToggle(input: TogglePlanInput): TogglePlanDecision {
  return blockedDecision(input, `read-only: ${input.item.id} is discovered but not writable`);
}

export const zedProvider: ProviderModule = {
  id: "zed",
  discover(input): DiscoveryResult {
    const items: DiscoveryItem[] = [];
    const warnings: DiscoveryWarning[] = [];
    const liveMcpIds = new Set<string>();

    items.push(
      ...discoverLiveSkillItems(
        path.join(input.homeDir, ".agents", "skills"),
        input.config.appStateRoot,
        "global",
        warnings,
      ),
      ...discoverLiveSkillItems(
        path.join(input.config.projectRoot, ".agents", "skills"),
        input.config.appStateRoot,
        "project",
        warnings,
      ),
      ...discoverInstructionItems(input.homeDir, input.config.projectRoot),
    );

    for (const location of zedSettingsLocations(input.homeDir, input.config.projectRoot)) {
      const discovered = discoverConfiguredMcpItems(location, warnings);
      for (const item of discovered) {
        if (item.kind === "mcp") {
          liveMcpIds.add(item.id);
        }
      }
      items.push(...discovered);
    }

    items.push(
      ...discoverVaultedConfiguredMcpItems(
        input.config.appStateRoot,
        "global",
        warnings,
        liveMcpIds,
      ),
      ...discoverVaultedConfiguredMcpItems(
        input.config.appStateRoot,
        "project",
        warnings,
        liveMcpIds,
      ),
    );

    return { items, warnings };
  },
  planToggle(input: TogglePlanInput): TogglePlanDecision {
    if (input.item.mutability === "read-only") {
      return planReadOnlySurfaceToggle(input);
    }

    if (input.item.kind === "skill") {
      return planSkillToggle(input);
    }

    if (input.item.kind === "mcp") {
      return planConfiguredMcpToggle(input);
    }

    return blockedDecision(
      input,
      `unsupported: ${input.item.id} is not part of the current Zed writable surface`,
    );
  },
};
