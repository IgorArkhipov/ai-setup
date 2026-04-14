import { type Dirent, existsSync, readdirSync, readFileSync } from "node:fs";
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

interface ParsedCodexEntry {
  id: string;
  enabled?: boolean;
  displayName?: string;
}

interface ParsedCodexSection {
  kind: CodexSectionKind;
  id: string;
  start: number;
  end: number;
  content: string;
}

interface ParsedTomlLine {
  rawLine: string;
  line: string;
  lineNumber: number;
  offset: number;
}

export interface ParsedCodexConfig {
  mcpServers: ParsedCodexEntry[];
  plugins: ParsedCodexEntry[];
}

type CodexSectionKind = "mcp_servers" | "plugins";
type TomlMultilineState = "basic" | "literal" | null;

const encoder = new TextEncoder();

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
    throw new Error(`line ${lineNumber} must use [plugins.<id>] or [mcp_servers.<id>]`);
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

function detectLineEnding(value: string): "\r\n" | "\n" {
  return value.includes("\r\n") ? "\r\n" : "\n";
}

function collectTomlLines(raw: string): ParsedTomlLine[] {
  const lines: ParsedTomlLine[] = [];
  let offset = 0;

  for (const [index, rawLine] of raw.split("\n").entries()) {
    lines.push({
      rawLine,
      line: rawLine.endsWith("\r") ? rawLine.slice(0, -1) : rawLine,
      lineNumber: index + 1,
      // `rawLine` still includes `\r` for CRLF documents, so `+ 1` accounts only for `\n`.
      offset,
    });
    offset += rawLine.length + 1;
  }

  return lines;
}

function skipBasicString(line: string, start: number): number {
  let index = start + 1;

  while (index < line.length) {
    if (line[index] === "\\") {
      index += 2;
      continue;
    }

    if (line[index] === '"') {
      return index + 1;
    }

    index += 1;
  }

  return line.length;
}

function skipLiteralString(line: string, start: number): number {
  const end = line.indexOf("'", start + 1);
  return end === -1 ? line.length : end + 1;
}

function findClosingBasicMultilineDelimiter(line: string, start: number): number {
  let index = start;

  while (index <= line.length - 3) {
    if (line.startsWith('"""', index)) {
      let backslashCount = 0;
      let cursor = index - 1;

      while (cursor >= 0 && line[cursor] === "\\") {
        backslashCount += 1;
        cursor -= 1;
      }

      if (backslashCount % 2 === 0) {
        return index;
      }
    }

    index += 1;
  }

  return -1;
}

function advanceTomlMultilineState(
  line: string,
  initialState: TomlMultilineState,
): TomlMultilineState {
  let state = initialState;
  let index = 0;

  while (index < line.length) {
    if (state === null) {
      if (line[index] === "#") {
        return null;
      }

      if (line.startsWith('"""', index)) {
        state = "basic";
        index += 3;
        continue;
      }

      if (line.startsWith("'''", index)) {
        state = "literal";
        index += 3;
        continue;
      }

      if (line[index] === '"') {
        index = skipBasicString(line, index);
        continue;
      }

      if (line[index] === "'") {
        index = skipLiteralString(line, index);
        continue;
      }

      index += 1;
      continue;
    }

    if (state === "basic") {
      const closingIndex = findClosingBasicMultilineDelimiter(line, index);
      if (closingIndex === -1) {
        return state;
      }

      state = null;
      index = closingIndex + 3;
      continue;
    }

    const closingIndex = line.indexOf("'''", index);
    if (closingIndex === -1) {
      return state;
    }

    state = null;
    index = closingIndex + 3;
  }

  return state;
}

function collectTomlHeaders(raw: string): Array<{
  start: number;
  kind: CodexSectionKind | null;
  id: string | null;
}> {
  const headers: Array<{
    start: number;
    kind: CodexSectionKind | null;
    id: string | null;
  }> = [];
  let multilineState: TomlMultilineState = null;

  for (const { line, lineNumber, offset } of collectTomlLines(raw)) {
    if (multilineState === null) {
      const trimmed = line.trim();
      if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
        try {
          const parsed = parseSectionHeader(trimmed, lineNumber);
          headers.push({
            start: offset,
            kind: parsed.kind,
            id: parsed.id,
          });
        } catch {
          headers.push({
            start: offset,
            kind: null,
            id: null,
          });
        }
      }
    }

    multilineState = advanceTomlMultilineState(line, multilineState);
  }

  return headers;
}

function parseCodexSections(raw: string, kind: CodexSectionKind): ParsedCodexSection[] {
  const headers = collectTomlHeaders(raw);
  const matchingHeaders = headers.filter(
    (candidate): candidate is { start: number; kind: CodexSectionKind; id: string } =>
      candidate.kind === kind && candidate.id !== null,
  );

  return matchingHeaders.map((header) => {
    const nextHeader = headers.find((candidate) => candidate.start > header.start);
    const end = nextHeader?.start ?? raw.length;

    return {
      kind,
      id: header.id,
      start: header.start,
      end,
      content: raw.slice(header.start, end),
    };
  });
}

function normalizeTomlDocument(doc: string, lineEnding = detectLineEnding(doc)): string {
  const trimmed = doc.trimEnd();
  return trimmed.length > 0 ? `${trimmed}${lineEnding}` : "";
}

function removeCodexSection(configToml: string, section: ParsedCodexSection): string {
  const lineEnding = detectLineEnding(configToml);
  return normalizeTomlDocument(
    `${configToml.slice(0, section.start)}${configToml.slice(section.end)}`,
    lineEnding,
  );
}

function appendCodexSection(configToml: string, sectionContent: string): string {
  const lineEnding = detectLineEnding(configToml.length > 0 ? configToml : sectionContent);
  const normalizedSection = normalizeTomlDocument(sectionContent, lineEnding);
  const trimmedDoc = configToml.trimEnd();

  if (trimmedDoc.length === 0) {
    return normalizedSection;
  }

  return `${trimmedDoc}${lineEnding}${lineEnding}${normalizedSection}`;
}

export function parseCodexConfig(raw: string): ParsedCodexConfig {
  const plugins = new Map<string, ParsedCodexEntry>();
  const mcpServers = new Map<string, ParsedCodexEntry>();
  let currentSection: { kind: CodexSectionKind; id: string } | null = null;
  let multilineState: TomlMultilineState = null;

  for (const { rawLine, lineNumber } of collectTomlLines(raw)) {
    if (multilineState !== null) {
      multilineState = advanceTomlMultilineState(rawLine, multilineState);
      continue;
    }

    const line = stripComment(rawLine).trim();

    if (line.length === 0) {
      multilineState = advanceTomlMultilineState(rawLine, multilineState);
      continue;
    }

    if (line.startsWith("[plugins") || line.startsWith("[mcp_servers")) {
      currentSection = parseSectionHeader(line, lineNumber);
      const bucket = currentSection.kind === "plugins" ? plugins : mcpServers;

      if (!bucket.has(currentSection.id)) {
        bucket.set(currentSection.id, { id: currentSection.id });
      }

      multilineState = advanceTomlMultilineState(rawLine, multilineState);
      continue;
    }

    if (line.startsWith("[")) {
      currentSection = null;
      multilineState = advanceTomlMultilineState(rawLine, multilineState);
      continue;
    }

    if (currentSection === null) {
      multilineState = advanceTomlMultilineState(rawLine, multilineState);
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

    multilineState = advanceTomlMultilineState(rawLine, multilineState);
  }

  return {
    mcpServers: [...mcpServers.values()],
    plugins: [...plugins.values()],
  };
}

function pushWarning(
  warnings: DiscoveryWarning[],
  layer: DiscoveryLayer,
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

function readOptionalFile(filePath: string): string | null {
  if (!existsSync(filePath)) {
    return null;
  }

  return readFileSync(filePath, "utf8");
}

function discoverLiveSkillItems(
  rootPath: string,
  layer: DiscoveryLayer,
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
      pushWarning(warnings, layer, "file-unreadable", `${current} could not be read: ${detail}`);
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
        const displayName = path.basename(skillDir);
        items.push({
          provider: "codex",
          kind: "skill",
          category: "skill",
          layer,
          id: `codex:${layer}:skill:${displayName}`,
          displayName,
          enabled: true,
          mutability: "read-write",
          sourcePath: entryPath,
          statePath: skillDir,
        });
      }
    }
  }

  return items;
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
      provider: "codex",
      layer,
      kind: "skill",
    }).flatMap((entry) => {
      if (liveIds.has(entry.itemId)) {
        pushWarning(
          warnings,
          layer,
          "conflicting-state",
          `conflicting Codex skill state for ${entry.itemId}: live and vaulted copies both exist`,
        );
        return [];
      }

      if (entry.payloadKind !== "path") {
        pushWarning(
          warnings,
          layer,
          "invalid-shape",
          `${entry.entryPath} must use payloadKind path for Codex skills`,
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
          provider: "codex" as const,
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
      `Codex ${layer} skill vault entries could not be loaded: ${detail}`,
    );
    return [];
  }
}

function discoverSkillItems(
  rootPath: string,
  appStateRoot: string,
  layer: DiscoveryLayer,
  warnings: DiscoveryWarning[],
): DiscoveryItem[] {
  const liveItems = discoverLiveSkillItems(rootPath, layer, warnings);
  const liveIds = new Set(liveItems.map((item) => item.id));

  return [...liveItems, ...discoverVaultedSkillItems(appStateRoot, layer, warnings, liveIds)];
}

function codexConfiguredMcpId(itemId: string): string | null {
  const prefix = "codex:global:configured-mcp:config:";
  return itemId.startsWith(prefix) ? itemId.slice(prefix.length) : null;
}

function discoverVaultedConfiguredMcpItems(
  appStateRoot: string,
  warnings: DiscoveryWarning[],
  liveIds: Set<string>,
): DiscoveryItem[] {
  try {
    return loadVaultEntries({
      appStateRoot,
      provider: "codex",
      layer: "global",
      kind: "configured-mcp",
    }).flatMap((entry) => {
      if (liveIds.has(entry.itemId)) {
        pushWarning(
          warnings,
          "global",
          "conflicting-state",
          `conflicting Codex configured MCP state for ${entry.itemId}: live and vaulted copies both exist`,
        );
        return [];
      }

      if (entry.payloadKind !== "text-payload") {
        pushWarning(
          warnings,
          "global",
          "invalid-shape",
          `${entry.entryPath} must use payloadKind text-payload for Codex configured MCPs`,
        );
        return [];
      }

      if (!existsSync(entry.payloadPath)) {
        pushWarning(
          warnings,
          "global",
          "missing-vault-payload",
          `${entry.payloadPath} does not exist for ${entry.itemId}`,
        );
        return [];
      }

      let payload: string;
      try {
        payload = readFileSync(entry.payloadPath, "utf8");
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        pushWarning(
          warnings,
          "global",
          "file-unreadable",
          `${entry.payloadPath} could not be read: ${detail}`,
        );
        return [];
      }

      const serverId = codexConfiguredMcpId(entry.itemId);
      const sections = parseCodexSections(payload, "mcp_servers");
      if (serverId === null || sections.length !== 1 || sections[0]?.id !== serverId) {
        pushWarning(
          warnings,
          "global",
          "invalid-shape",
          `${entry.payloadPath} must contain exactly one matching [mcp_servers.${serverId ?? "unknown"}] section`,
        );
        return [];
      }

      return [
        {
          provider: "codex" as const,
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
      "global",
      "file-unreadable",
      `Codex configured MCP vault entries could not be loaded: ${detail}`,
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
      provider: "codex",
      layer,
      kind,
    }).find((entry) => entry.itemId === itemId) ?? null
  );
}

function planSkillToggle(input: TogglePlanInput): TogglePlanDecision {
  if (input.item.enabled) {
    const skillDir = input.item.statePath;
    const descriptor = vaultDescriptor({
      appStateRoot: input.config.appStateRoot,
      provider: "codex",
      layer: input.item.layer,
      kind: "skill",
      itemId: input.item.id,
    });

    if (existsSync(descriptor.entryPath) || existsSync(descriptor.vaultedPath)) {
      return blockedDecision(input, `vault-conflict: ${descriptor.rootPath} already exists`);
    }

    const entry: VaultEntry = {
      version: 1,
      provider: "codex",
      kind: "skill",
      layer: input.item.layer,
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

function planConfiguredMcpToggle(input: TogglePlanInput): TogglePlanDecision {
  if (input.item.layer !== "global") {
    return blockedDecision(input, `unsupported: ${input.item.id} is not writable`);
  }

  const serverId = codexConfiguredMcpId(input.item.id);
  if (serverId === null) {
    return blockedDecision(input, `unsupported: ${input.item.id} is not a Codex configured MCP`);
  }

  const descriptor = vaultDescriptor({
    appStateRoot: input.config.appStateRoot,
    provider: "codex",
    layer: "global",
    kind: "configured-mcp",
    itemId: input.item.id,
  });

  if (input.item.enabled) {
    if (existsSync(descriptor.entryPath) || existsSync(descriptor.payloadPath)) {
      return blockedDecision(input, `vault-conflict: ${descriptor.rootPath} already exists`);
    }

    const raw = readOptionalFile(input.item.statePath);
    if (raw === null) {
      return blockedDecision(input, `missing-live-config: ${input.item.statePath} does not exist`);
    }

    const section = parseCodexSections(raw, "mcp_servers").find(
      (candidate) => candidate.id === serverId,
    );
    if (section === undefined) {
      return blockedDecision(
        input,
        `missing-live-section: ${serverId} is not present in ${input.item.statePath}`,
      );
    }

    const vaultedPayloadPath = vaultPayloadLocation(descriptor, "text-payload");
    const entry: VaultEntry = {
      version: 1,
      provider: "codex",
      kind: "configured-mcp",
      layer: "global",
      itemId: input.item.id,
      displayName: input.item.displayName,
      originalPath: input.item.statePath,
      vaultedPath: vaultedPayloadPath,
      payloadKind: "text-payload",
    };

    const affectedTargets = dedupeMutationTargets([
      { type: "path", path: input.item.statePath },
      { type: "path", path: vaultedPayloadPath },
      { type: "path", path: descriptor.entryPath },
    ]);

    return plannedDecision(
      input,
      [
        {
          type: "createFile",
          path: vaultedPayloadPath,
          content: encoder.encode(normalizeTomlDocument(section.content)),
        },
        {
          type: "createFile",
          path: descriptor.entryPath,
          content: serializeVaultEntry(entry),
        },
        {
          type: "createFile",
          path: input.item.statePath,
          content: encoder.encode(removeCodexSection(raw, section)),
        },
      ],
      affectedTargets,
    );
  }

  const entry = loadVaultedEntry(
    input.config.appStateRoot,
    "global",
    "configured-mcp",
    input.item.id,
  );
  const liveConfigPath = entry?.originalPath ?? input.item.sourcePath;
  const currentRaw = readOptionalFile(liveConfigPath) ?? "";

  if (entry === null) {
    const liveSection = parseCodexSections(currentRaw, "mcp_servers").find(
      (candidate) => candidate.id === serverId,
    );
    if (liveSection !== undefined) {
      return blockedDecision(
        input,
        `unsupported-live-disabled-section: ${serverId} is present in ${liveConfigPath} but was not disabled through the AgentScope vault`,
      );
    }
  }

  if (entry === null) {
    return blockedDecision(
      input,
      `missing-vault-manifest: ${input.item.statePath} could not be loaded`,
    );
  }

  if (entry.payloadKind !== "text-payload") {
    return blockedDecision(
      input,
      `invalid-vault-manifest: ${entry.entryPath} must use payloadKind text-payload`,
    );
  }

  if (!existsSync(entry.payloadPath)) {
    return blockedDecision(input, `missing-vault-payload: ${entry.payloadPath} does not exist`);
  }

  let payload: string;
  try {
    payload = readFileSync(entry.payloadPath, "utf8");
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return blockedDecision(
      input,
      `invalid-vault-payload: ${entry.payloadPath} could not be read: ${detail}`,
    );
  }

  const payloadSections = parseCodexSections(payload, "mcp_servers");
  if (payloadSections.length !== 1 || payloadSections[0]?.id !== serverId) {
    return blockedDecision(
      input,
      `invalid-vault-payload: ${entry.payloadPath} must contain exactly one matching [mcp_servers.${serverId}] section`,
    );
  }

  const liveSection = parseCodexSections(currentRaw, "mcp_servers").find(
    (candidate) => candidate.id === serverId,
  );
  if (liveSection !== undefined) {
    return blockedDecision(
      input,
      `live-section-conflict: ${serverId} is already present in ${entry.originalPath}`,
    );
  }

  const affectedTargets = dedupeMutationTargets([
    { type: "path", path: entry.originalPath },
    { type: "path", path: entry.payloadPath },
    { type: "path", path: entry.entryPath },
    { type: "path", path: path.dirname(entry.entryPath) },
  ]);

  return plannedDecision(
    input,
    [
      {
        type: "createFile",
        path: entry.originalPath,
        content: encoder.encode(appendCodexSection(currentRaw, payloadSections[0].content)),
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
    ],
    affectedTargets,
  );
}

export const codexProvider: ProviderModule = {
  id: "codex",
  discover(input): DiscoveryResult {
    const items: DiscoveryItem[] = [];
    const warnings: DiscoveryWarning[] = [];

    items.push(
      ...discoverSkillItems(
        path.join(input.homeDir, ".codex", "skills"),
        input.config.appStateRoot,
        "global",
        warnings,
      ),
    );
    items.push(
      ...discoverSkillItems(
        path.join(input.config.projectRoot, ".codex", "skills"),
        input.config.appStateRoot,
        "project",
        warnings,
      ),
    );

    const configPath = path.join(input.homeDir, ".codex", "config.toml");
    const configRaw = readOptionalFile(configPath);
    const liveConfiguredMcpIds = new Set<string>();

    if (configRaw !== null) {
      let parsed: ParsedCodexConfig;
      try {
        parsed = parseCodexConfig(configRaw);
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        pushWarning(
          warnings,
          "global",
          "toml-parse-error",
          `${configPath} could not be parsed: ${detail}`,
        );
        parsed = {
          mcpServers: [],
          plugins: [],
        };
      }

      items.push(
        ...parsed.mcpServers.map((server) => {
          const itemId = `codex:global:configured-mcp:config:${server.id}`;
          liveConfiguredMcpIds.add(itemId);

          return {
            provider: "codex" as const,
            kind: "mcp" as const,
            category: "configured-mcp" as const,
            layer: "global" as const,
            id: itemId,
            displayName: server.displayName ?? server.id,
            enabled: server.enabled ?? true,
            mutability: "read-write" as const,
            sourcePath: configPath,
            statePath: configPath,
          };
        }),
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
    }

    items.push(
      ...discoverVaultedConfiguredMcpItems(
        input.config.appStateRoot,
        warnings,
        liveConfiguredMcpIds,
      ),
    );

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
      `unsupported: ${input.item.id} is not part of the current Codex writable surface`,
    );
  },
};
