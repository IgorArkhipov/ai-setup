import { type Dirent, existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { pathToFileURL } from "node:url";
import type { ProviderModule } from "../core/discovery.js";
import type { DiscoveryItem, DiscoveryResult, DiscoveryWarning } from "../core/models.js";
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

type CursorWorkspaceState =
  | {
      kind: "missing";
    }
  | {
      kind: "ok";
      databasePath: string;
      disabledServerIds: string[];
    }
  | {
      kind: "invalid";
      databasePath: string;
      reason: string;
    };

interface CursorMcpDocument {
  root: Record<string, unknown>;
  servers: Record<string, unknown>;
}

const encoder = new TextEncoder();
const cursorConfiguredMcpPrefix = "cursor:global:configured-mcp:mcp-json:";
const cursorWorkspaceDisabledServersKey = "cursor/disabledMcpServers";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pushWarning(warnings: DiscoveryWarning[], code: string, message: string): void {
  warnings.push({
    provider: "cursor",
    layer: "global",
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

function stripTrailingCommas(contents: string): string {
  let result = "";
  let inString = false;
  let escaped = false;

  for (let index = 0; index < contents.length; index += 1) {
    const char = contents[index];
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
      let lookahead = index + 1;
      while (lookahead < contents.length && /\s/.test(contents[lookahead] ?? "")) {
        lookahead += 1;
      }

      const next = contents[lookahead];
      if (next === "}" || next === "]") {
        continue;
      }
    }

    result += char;
  }

  return result;
}

function parseCursorJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return JSON.parse(stripTrailingCommas(raw));
  }
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function collectSkillDirs(
  rootPath: string,
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
      pushWarning(warnings, "file-unreadable", `${current} could not be read: ${detail}`);
      continue;
    }

    for (const entry of entries) {
      const entryPath = path.join(current, entry.name);

      if (entry.isDirectory()) {
        stack.push(entryPath);
        continue;
      }

      if (entry.isFile() && entry.name === "SKILL.md") {
        const skillDir = path.dirname(entryPath);
        const relativePath = path.relative(rootPath, skillDir).split(path.sep).join("/");
        if (relativePath.length === 0) {
          continue;
        }

        skills.push({
          id: relativePath,
          displayName: relativePath,
          skillDir,
          skillFile: entryPath,
        });
      }
    }
  }

  return skills.sort((left, right) => left.id.localeCompare(right.id));
}

function discoverLiveSkillItems(rootPath: string, warnings: DiscoveryWarning[]): DiscoveryItem[] {
  return collectSkillDirs(rootPath, warnings).map((skill) => ({
    provider: "cursor",
    kind: "skill",
    category: "skill",
    layer: "global",
    id: `cursor:global:skill:${skill.id}`,
    displayName: skill.displayName,
    enabled: true,
    mutability: "read-write",
    sourcePath: skill.skillFile,
    statePath: skill.skillDir,
  }));
}

function discoverVaultedSkillItems(
  appStateRoot: string,
  warnings: DiscoveryWarning[],
  liveIds: Set<string>,
): DiscoveryItem[] {
  try {
    return loadVaultEntries({
      appStateRoot,
      provider: "cursor",
      layer: "global",
      kind: "skill",
    }).flatMap((entry) => {
      if (liveIds.has(entry.itemId)) {
        pushWarning(
          warnings,
          "conflicting-state",
          `conflicting Cursor skill state for ${entry.itemId}: live and vaulted copies both exist`,
        );
        return [];
      }

      if (entry.payloadKind !== "path") {
        pushWarning(
          warnings,
          "invalid-shape",
          `${entry.entryPath} must use payloadKind path for Cursor skills`,
        );
        return [];
      }

      if (!existsSync(entry.vaultedPath)) {
        pushWarning(
          warnings,
          "missing-vault-payload",
          `${entry.vaultedPath} does not exist for ${entry.itemId}`,
        );
        return [];
      }

      return [
        {
          provider: "cursor" as const,
          kind: "skill" as const,
          category: "skill" as const,
          layer: "global" as const,
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
      "file-unreadable",
      `Cursor skill vault entries could not be loaded: ${detail}`,
    );
    return [];
  }
}

function discoverSkillItems(
  rootPath: string,
  appStateRoot: string,
  warnings: DiscoveryWarning[],
): DiscoveryItem[] {
  const liveItems = discoverLiveSkillItems(rootPath, warnings);
  const liveIds = new Set(liveItems.map((item) => item.id));

  return [...liveItems, ...discoverVaultedSkillItems(appStateRoot, warnings, liveIds)];
}

function findCursorWorkspaceDbPath(cursorRoot: string, projectRoot: string): string | null {
  const workspaceStorageRoot = path.join(cursorRoot, "workspaceStorage");
  if (!existsSync(workspaceStorageRoot)) {
    return null;
  }

  const projectFolder = pathToFileURL(projectRoot).toString();
  const entries = readdirSync(workspaceStorageRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .sort((left, right) => left.name.localeCompare(right.name));

  for (const entry of entries) {
    const workspaceRoot = path.join(workspaceStorageRoot, entry.name);
    const workspaceJsonPath = path.join(workspaceRoot, "workspace.json");
    if (!existsSync(workspaceJsonPath)) {
      continue;
    }

    try {
      const parsed = JSON.parse(readFileSync(workspaceJsonPath, "utf8")) as { folder?: string };
      if (parsed.folder === projectFolder) {
        const databasePath = path.join(workspaceRoot, "state.vscdb");
        return existsSync(databasePath) ? databasePath : null;
      }
    } catch {}
  }

  return null;
}

function readCursorWorkspaceDisabledServerIds(databasePath: string):
  | {
      ok: true;
      disabledServerIds: string[];
    }
  | {
      ok: false;
      reason: string;
    } {
  try {
    const database = new DatabaseSync(databasePath);

    try {
      const row = database
        .prepare("SELECT value FROM ItemTable WHERE key = ?")
        .get(cursorWorkspaceDisabledServersKey) as
        | { value?: Uint8Array | Buffer | string }
        | undefined;
      if (row?.value === undefined) {
        return {
          ok: true,
          disabledServerIds: [],
        };
      }

      const rawValue =
        typeof row.value === "string" ? row.value : Buffer.from(row.value).toString("utf8");
      const parsed = JSON.parse(rawValue);
      if (!Array.isArray(parsed) || parsed.some((value) => typeof value !== "string")) {
        return {
          ok: false,
          reason: `invalid Cursor workspace state at ${databasePath}; expected ${cursorWorkspaceDisabledServersKey} to be a JSON string array`,
        };
      }

      return {
        ok: true,
        disabledServerIds: parsed,
      };
    } finally {
      database.close();
    }
  } catch {
    return {
      ok: false,
      reason: `invalid Cursor workspace state at ${databasePath}; could not read ${cursorWorkspaceDisabledServersKey}`,
    };
  }
}

function loadCursorWorkspaceState(cursorRoot: string, projectRoot: string): CursorWorkspaceState {
  const databasePath = findCursorWorkspaceDbPath(cursorRoot, projectRoot);
  if (databasePath === null) {
    return {
      kind: "missing",
    };
  }

  const disabledServers = readCursorWorkspaceDisabledServerIds(databasePath);
  if (!disabledServers.ok) {
    return {
      kind: "invalid",
      databasePath,
      reason: disabledServers.reason,
    };
  }

  return {
    kind: "ok",
    databasePath,
    disabledServerIds: disabledServers.disabledServerIds,
  };
}

function readCursorMcpDocument(mcpPath: string):
  | {
      ok: true;
      document: CursorMcpDocument;
    }
  | {
      ok: false;
      reason: string;
    } {
  const raw = readOptionalFile(mcpPath);
  if (raw === null) {
    return {
      ok: true,
      document: {
        root: { mcpServers: {} },
        servers: {},
      },
    };
  }

  let parsed: unknown;
  try {
    parsed = parseCursorJson(raw);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      reason: `${mcpPath} is not valid JSON: ${detail}`,
    };
  }

  if (!isRecord(parsed)) {
    return {
      ok: false,
      reason: `${mcpPath} must be a JSON object`,
    };
  }

  const root = cloneJson(parsed);
  const servers = root.mcpServers;
  if (!isRecord(servers)) {
    return {
      ok: false,
      reason: `${mcpPath} must define an object-valued mcpServers`,
    };
  }

  return {
    ok: true,
    document: {
      root,
      servers: cloneJson(servers),
    },
  };
}

function renderCursorMcpDocument(root: Record<string, unknown>): Uint8Array {
  return encoder.encode(`${JSON.stringify(root, null, 2)}\n`);
}

function withCursorMcpEntry(
  root: Record<string, unknown>,
  id: string,
  value: Record<string, unknown>,
): Record<string, unknown> {
  const nextRoot = cloneJson(root);
  const nextServers = isRecord(nextRoot.mcpServers)
    ? cloneJson(nextRoot.mcpServers)
    : ({} as Record<string, unknown>);
  nextServers[id] = value;
  nextRoot.mcpServers = nextServers;
  return nextRoot;
}

function withoutCursorMcpEntry(root: Record<string, unknown>, id: string): Record<string, unknown> {
  const nextRoot = cloneJson(root);
  const nextServers = isRecord(nextRoot.mcpServers)
    ? cloneJson(nextRoot.mcpServers)
    : ({} as Record<string, unknown>);
  delete nextServers[id];
  nextRoot.mcpServers = nextServers;
  return nextRoot;
}

function withCursorMcpEnabled(value: Record<string, unknown>): Record<string, unknown> {
  const nextValue = cloneJson(value);
  delete nextValue.disabled;
  return nextValue;
}

function isCursorMcpDisabled(value: unknown): boolean {
  return isRecord(value) && value.disabled === true;
}

function toCursorWorkspaceServerId(serverId: string): string {
  return serverId.startsWith("user-") ? serverId : `user-${serverId}`;
}

function cursorConfiguredMcpId(itemId: string): string | null {
  return itemId.startsWith(cursorConfiguredMcpPrefix)
    ? itemId.slice(cursorConfiguredMcpPrefix.length)
    : null;
}

function discoverLiveConfiguredMcpItems(
  mcpPath: string,
  workspaceState: CursorWorkspaceState,
  warnings: DiscoveryWarning[],
): { items: DiscoveryItem[]; liveIds: Set<string> } {
  const parsed = readCursorMcpDocument(mcpPath);
  if (!parsed.ok) {
    const code = parsed.reason.includes("valid JSON") ? "json-parse-error" : "invalid-shape";
    pushWarning(warnings, code, parsed.reason);
    return {
      items: [],
      liveIds: new Set<string>(),
    };
  }

  const disabledServerIds =
    workspaceState.kind === "ok" ? new Set(workspaceState.disabledServerIds) : new Set<string>();
  const statePath = workspaceState.kind === "ok" ? workspaceState.databasePath : mcpPath;
  const items: DiscoveryItem[] = [];
  const liveIds = new Set<string>();

  for (const [serverId, value] of Object.entries(parsed.document.servers).sort(([left], [right]) =>
    left.localeCompare(right),
  )) {
    if (!isRecord(value)) {
      pushWarning(
        warnings,
        "invalid-shape",
        `${mcpPath} mcpServers.${serverId} must be a JSON object`,
      );
      continue;
    }

    const itemId = `${cursorConfiguredMcpPrefix}${serverId}`;
    liveIds.add(itemId);

    items.push({
      provider: "cursor",
      kind: "mcp",
      category: "configured-mcp",
      layer: "global",
      id: itemId,
      displayName: serverId,
      enabled:
        !isCursorMcpDisabled(value) && !disabledServerIds.has(toCursorWorkspaceServerId(serverId)),
      mutability: "read-write",
      sourcePath: mcpPath,
      statePath,
    });
  }

  return {
    items,
    liveIds,
  };
}

function discoverVaultedConfiguredMcpItems(
  appStateRoot: string,
  warnings: DiscoveryWarning[],
  liveIds: Set<string>,
): DiscoveryItem[] {
  try {
    return loadVaultEntries({
      appStateRoot,
      provider: "cursor",
      layer: "global",
      kind: "configured-mcp",
    }).flatMap((entry) => {
      if (liveIds.has(entry.itemId)) {
        pushWarning(
          warnings,
          "conflicting-state",
          `conflicting Cursor configured MCP state for ${entry.itemId}: live and vaulted copies both exist`,
        );
        return [];
      }

      if (entry.payloadKind !== "json-payload") {
        pushWarning(
          warnings,
          "invalid-shape",
          `${entry.entryPath} must use payloadKind json-payload for Cursor configured MCPs`,
        );
        return [];
      }

      if (!existsSync(entry.payloadPath)) {
        pushWarning(
          warnings,
          "missing-vault-payload",
          `${entry.payloadPath} does not exist for ${entry.itemId}`,
        );
        return [];
      }

      try {
        const rawPayload = readFileSync(entry.payloadPath, "utf8");
        if (!isRecord(JSON.parse(rawPayload))) {
          pushWarning(
            warnings,
            "invalid-shape",
            `${entry.payloadPath} must contain a JSON object payload for ${entry.itemId}`,
          );
          return [];
        }
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        pushWarning(
          warnings,
          "invalid-shape",
          `${entry.payloadPath} could not be parsed for ${entry.itemId}: ${detail}`,
        );
        return [];
      }

      return [
        {
          provider: "cursor" as const,
          kind: "mcp" as const,
          category: "configured-mcp" as const,
          layer: "global" as const,
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
      "file-unreadable",
      `Cursor MCP vault entries could not be loaded: ${detail}`,
    );
    return [];
  }
}

function discoverConfiguredMcpItems(
  mcpPath: string,
  appStateRoot: string,
  cursorRoot: string,
  projectRoot: string,
  warnings: DiscoveryWarning[],
): DiscoveryItem[] {
  const workspaceState = loadCursorWorkspaceState(cursorRoot, projectRoot);
  if (workspaceState.kind === "invalid") {
    pushWarning(warnings, "invalid-shape", workspaceState.reason);
  }

  const liveItems = discoverLiveConfiguredMcpItems(mcpPath, workspaceState, warnings);
  return [
    ...liveItems.items,
    ...discoverVaultedConfiguredMcpItems(appStateRoot, warnings, liveItems.liveIds),
  ];
}

function discoverExtensions(cursorRoot: string, warnings: DiscoveryWarning[]): DiscoveryItem[] {
  if (!existsSync(cursorRoot)) {
    pushWarning(warnings, "missing-root", `Cursor root is missing or unreadable: ${cursorRoot}`);
    return [];
  }

  const profilesRoot = path.join(cursorRoot, "profiles");
  if (!existsSync(profilesRoot)) {
    return [];
  }

  const itemsById = new Map<string, DiscoveryItem>();

  try {
    for (const profileEntry of readdirSync(profilesRoot, { withFileTypes: true }).sort(
      (left, right) => left.name.localeCompare(right.name),
    )) {
      if (!profileEntry.isDirectory()) {
        continue;
      }

      const extensionsPath = path.join(profilesRoot, profileEntry.name, "extensions.json");
      if (!existsSync(extensionsPath)) {
        continue;
      }

      let raw: string;
      try {
        raw = readFileSync(extensionsPath, "utf8");
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        pushWarning(warnings, "file-unreadable", `${extensionsPath} could not be read: ${detail}`);
        continue;
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        pushWarning(warnings, "json-parse-error", `${extensionsPath} is not valid JSON: ${detail}`);
        continue;
      }

      if (!Array.isArray(parsed)) {
        pushWarning(warnings, "invalid-shape", `${extensionsPath} must be an array`);
        continue;
      }

      for (const [index, entry] of parsed.entries()) {
        if (
          !isRecord(entry) ||
          !isRecord(entry.identifier) ||
          typeof entry.identifier.id !== "string"
        ) {
          pushWarning(
            warnings,
            "invalid-shape",
            `${extensionsPath}[${index}] must include identifier.id as a string`,
          );
          continue;
        }

        const itemId = `cursor:global:tool:extension:${entry.identifier.id}`;
        if (itemsById.has(itemId)) {
          continue;
        }

        itemsById.set(itemId, {
          provider: "cursor",
          kind: "plugin",
          category: "tool",
          layer: "global",
          id: itemId,
          displayName: entry.identifier.id,
          enabled: true,
          mutability: "unsupported",
          sourcePath: extensionsPath,
          statePath: extensionsPath,
        });
      }
    }
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    pushWarning(warnings, "file-unreadable", `${profilesRoot} could not be read: ${detail}`);
  }

  return [...itemsById.values()].sort((left, right) => left.id.localeCompare(right.id));
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

function loadVaultedEntry(itemId: string, kind: "skill" | "configured-mcp", appStateRoot: string) {
  return (
    loadVaultEntries({
      appStateRoot,
      provider: "cursor",
      layer: "global",
      kind,
    }).find((entry) => entry.itemId === itemId) ?? null
  );
}

function planSkillToggle(input: TogglePlanInput): TogglePlanDecision {
  if (input.item.layer !== "global") {
    return blockedDecision(input, `unsupported: ${input.item.id} is not writable`);
  }

  if (input.item.enabled) {
    const descriptor = vaultDescriptor({
      appStateRoot: input.config.appStateRoot,
      provider: "cursor",
      layer: "global",
      kind: "skill",
      itemId: input.item.id,
    });

    if (existsSync(descriptor.entryPath) || existsSync(descriptor.vaultedPath)) {
      return blockedDecision(input, `vault-conflict: ${descriptor.rootPath} already exists`);
    }

    const entry: VaultEntry = {
      version: 1,
      provider: "cursor",
      kind: "skill",
      layer: "global",
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

  if (!existsSync(input.item.statePath)) {
    return blockedDecision(input, `missing-vault-manifest: ${input.item.statePath} does not exist`);
  }

  const entry = loadVaultedEntry(input.item.id, "skill", input.config.appStateRoot);
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

function workspaceTarget(databasePath: string): MutationTarget {
  return {
    type: "sqlite-item",
    databasePath,
    tableName: "ItemTable",
    keyColumn: "key",
    keyValue: cursorWorkspaceDisabledServersKey,
    valueColumn: "value",
  };
}

function workspaceOperation(databasePath: string, disabledServerIds: string[]): MutationOperation {
  return {
    type: "replaceSqliteItemTableValue",
    databasePath,
    tableName: "ItemTable",
    keyColumn: "key",
    keyValue: cursorWorkspaceDisabledServersKey,
    valueColumn: "value",
    value: encoder.encode(JSON.stringify(disabledServerIds)),
  };
}

function readCursorPayload(
  entry: ReturnType<typeof loadVaultedEntry>,
): Record<string, unknown> | null {
  if (entry === null) {
    return null;
  }

  try {
    const payload = JSON.parse(readFileSync(entry.payloadPath, "utf8"));
    return isRecord(payload) ? payload : null;
  } catch {
    return null;
  }
}

function planConfiguredMcpToggle(input: TogglePlanInput): TogglePlanDecision {
  const serverId = cursorConfiguredMcpId(input.item.id);
  if (serverId === null) {
    return blockedDecision(input, `unsupported: ${input.item.id} is not a Cursor configured MCP`);
  }

  const workspaceState = loadCursorWorkspaceState(
    input.config.cursorRoot,
    input.config.projectRoot,
  );
  if (workspaceState.kind === "invalid") {
    return blockedDecision(input, workspaceState.reason);
  }

  const parsed = readCursorMcpDocument(input.item.sourcePath);
  if (!parsed.ok) {
    const code = parsed.reason.includes("valid JSON")
      ? "invalid-live-config"
      : "invalid-live-shape";
    return blockedDecision(input, `${code}: ${parsed.reason}`);
  }

  const descriptor = vaultDescriptor({
    appStateRoot: input.config.appStateRoot,
    provider: "cursor",
    layer: "global",
    kind: "configured-mcp",
    itemId: input.item.id,
  });
  const currentValue = parsed.document.servers[serverId];
  const liveValue = isRecord(currentValue) ? currentValue : null;
  const disabledServerIds =
    workspaceState.kind === "ok" ? new Set(workspaceState.disabledServerIds) : new Set<string>();
  const workspaceServerId = toCursorWorkspaceServerId(serverId);
  const hasWorkspaceDisabled = disabledServerIds.has(workspaceServerId);

  if (input.item.enabled) {
    if (existsSync(descriptor.entryPath) || existsSync(descriptor.payloadPath)) {
      return blockedDecision(input, `vault-conflict: ${descriptor.rootPath} already exists`);
    }

    if (liveValue === null) {
      return blockedDecision(
        input,
        `missing-live-entry: ${serverId} is not present in ${input.item.sourcePath}`,
      );
    }

    const vaultedPayloadPath = vaultPayloadLocation(descriptor, "json-payload");
    const entry: VaultEntry = {
      version: 1,
      provider: "cursor",
      kind: "configured-mcp",
      layer: "global",
      itemId: input.item.id,
      displayName: input.item.displayName,
      originalPath: input.item.sourcePath,
      vaultedPath: vaultedPayloadPath,
      payloadKind: "json-payload",
    };

    const operations: MutationOperation[] = [
      {
        type: "createFile",
        path: vaultedPayloadPath,
        content: encoder.encode(`${JSON.stringify(liveValue, null, 2)}\n`),
      },
      {
        type: "createFile",
        path: descriptor.entryPath,
        content: serializeVaultEntry(entry),
      },
      {
        type: "createFile",
        path: input.item.sourcePath,
        content: renderCursorMcpDocument(withoutCursorMcpEntry(parsed.document.root, serverId)),
      },
    ];
    const affectedTargets: MutationTarget[] = [
      { type: "path", path: input.item.sourcePath },
      { type: "path", path: vaultedPayloadPath },
      { type: "path", path: descriptor.entryPath },
    ];

    if (workspaceState.kind === "ok" && hasWorkspaceDisabled) {
      const nextDisabledServers = workspaceState.disabledServerIds.filter(
        (value) => value !== workspaceServerId,
      );
      operations.push(workspaceOperation(workspaceState.databasePath, nextDisabledServers));
      affectedTargets.push(workspaceTarget(workspaceState.databasePath));
    }

    return plannedDecision(input, operations, dedupeMutationTargets(affectedTargets));
  }

  const entry = loadVaultedEntry(input.item.id, "configured-mcp", input.config.appStateRoot);
  if (entry !== null) {
    if (entry.payloadKind !== "json-payload") {
      return blockedDecision(
        input,
        `invalid-vault-manifest: ${entry.entryPath} must use payloadKind json-payload`,
      );
    }

    if (!existsSync(entry.payloadPath)) {
      return blockedDecision(input, `missing-vault-payload: ${entry.payloadPath} does not exist`);
    }

    if (liveValue !== null) {
      return blockedDecision(
        input,
        `live-entry-conflict: ${serverId} is already present in ${input.item.sourcePath}`,
      );
    }

    const payload = readCursorPayload(entry);
    if (payload === null) {
      return blockedDecision(
        input,
        `invalid-vault-payload: ${entry.payloadPath} must contain a JSON object for ${input.item.id}`,
      );
    }

    const operations: MutationOperation[] = [
      {
        type: "createFile",
        path: entry.originalPath,
        content: renderCursorMcpDocument(
          withCursorMcpEntry(parsed.document.root, serverId, withCursorMcpEnabled(payload)),
        ),
      },
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
    ];
    const affectedTargets: MutationTarget[] = [
      { type: "path", path: entry.originalPath },
      { type: "path", path: entry.payloadPath },
      { type: "path", path: entry.entryPath },
      { type: "path", path: path.dirname(entry.entryPath) },
    ];

    if (workspaceState.kind === "ok" && hasWorkspaceDisabled) {
      const nextDisabledServers = workspaceState.disabledServerIds.filter(
        (value) => value !== workspaceServerId,
      );
      operations.push(workspaceOperation(workspaceState.databasePath, nextDisabledServers));
      affectedTargets.push(workspaceTarget(workspaceState.databasePath));
    }

    return plannedDecision(input, operations, dedupeMutationTargets(affectedTargets));
  }

  if (liveValue === null) {
    return blockedDecision(
      input,
      `missing-vault-manifest: ${input.item.statePath} could not be loaded`,
    );
  }

  const operations: MutationOperation[] = [];
  const affectedTargets: MutationTarget[] = [];

  if (isCursorMcpDisabled(liveValue)) {
    operations.push({
      type: "createFile",
      path: input.item.sourcePath,
      content: renderCursorMcpDocument(
        withCursorMcpEntry(parsed.document.root, serverId, withCursorMcpEnabled(liveValue)),
      ),
    });
    affectedTargets.push({ type: "path", path: input.item.sourcePath });
  }

  if (workspaceState.kind === "ok" && hasWorkspaceDisabled) {
    const nextDisabledServers = workspaceState.disabledServerIds.filter(
      (value) => value !== workspaceServerId,
    );
    operations.push(workspaceOperation(workspaceState.databasePath, nextDisabledServers));
    affectedTargets.push(workspaceTarget(workspaceState.databasePath));
  }

  if (operations.length === 0) {
    return blockedDecision(
      input,
      `unsupported-live-disabled-entry: ${serverId} is not disabled in a writable Cursor state source`,
    );
  }

  return plannedDecision(input, operations, dedupeMutationTargets(affectedTargets));
}

export const cursorProvider: ProviderModule = {
  id: "cursor",
  discover(input): DiscoveryResult {
    const warnings: DiscoveryWarning[] = [];
    const items: DiscoveryItem[] = [];

    items.push(
      ...discoverSkillItems(
        path.join(input.homeDir, ".cursor", "skills-cursor"),
        input.config.appStateRoot,
        warnings,
      ),
    );
    items.push(
      ...discoverConfiguredMcpItems(
        path.join(input.homeDir, ".cursor", "mcp.json"),
        input.config.appStateRoot,
        input.config.cursorRoot,
        input.config.projectRoot,
        warnings,
      ),
    );
    items.push(...discoverExtensions(input.config.cursorRoot, warnings));

    return { items, warnings };
  },
  planToggle(input: TogglePlanInput): TogglePlanDecision {
    if (input.item.kind === "plugin") {
      return blockedDecision(
        input,
        `unsupported: ${input.item.id} uses a provider lifecycle that is not writable in the current architecture`,
      );
    }

    if (input.item.kind === "skill") {
      return planSkillToggle(input);
    }

    if (input.item.kind === "mcp") {
      return planConfiguredMcpToggle(input);
    }

    return blockedDecision(
      input,
      `unsupported: ${input.item.id} is not part of the current Cursor writable surface`,
    );
  },
};
