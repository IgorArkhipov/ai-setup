import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import type { DiscoveryLayer } from "./models.js";

export type VaultProvider = "claude" | "codex" | "cursor";
export type VaultEntryKind = "skill" | "configured-mcp";
export type VaultPayloadKind = "path" | "json-payload" | "text-payload";

export interface VaultEntry {
  version: 1;
  provider: VaultProvider;
  kind: VaultEntryKind;
  layer: DiscoveryLayer;
  itemId: string;
  displayName: string;
  originalPath: string;
  // Path where the disabled payload lives inside the vault.
  // `path` payloads use a directory here; text/json payloads use a file path.
  vaultedPath: string;
  payloadKind: VaultPayloadKind;
}

export interface VaultDescriptorInput {
  appStateRoot: string;
  provider: VaultProvider;
  layer: DiscoveryLayer;
  kind: VaultEntryKind;
  itemId: string;
}

export interface VaultDescriptor {
  rootPath: string;
  entryPath: string;
  // Canonical file path for text/json payloads stored inside the vault.
  payloadPath: string;
  // Canonical path location for the vaulted payload.
  // This is a directory for `path` payloads and a file path for text/json payloads.
  vaultedPath: string;
}

export interface LoadedVaultEntry extends VaultEntry {
  entryPath: string;
  payloadPath: string;
}

const encoder = new TextEncoder();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sliceRoot(
  appStateRoot: string,
  provider: VaultProvider,
  layer: DiscoveryLayer,
  kind: VaultEntryKind,
): string {
  return path.join(appStateRoot, "vault", provider, layer, kind);
}

function safeItemId(itemId: string): string {
  return encodeURIComponent(itemId);
}

function validateEntry(raw: string, entryPath: string): VaultEntry {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`${entryPath} must be valid JSON: ${detail}`);
  }

  if (!isRecord(parsed)) {
    throw new Error(`${entryPath} must be a JSON object`);
  }

  const {
    version,
    provider,
    kind,
    layer,
    itemId,
    displayName,
    originalPath,
    vaultedPath,
    payloadKind,
  } = parsed;

  if (version !== 1) {
    throw new Error(`${entryPath} version must be 1`);
  }

  if (provider !== "claude" && provider !== "codex" && provider !== "cursor") {
    throw new Error(`${entryPath} provider must be claude, codex, or cursor`);
  }

  if (kind !== "skill" && kind !== "configured-mcp") {
    throw new Error(`${entryPath} kind must be skill or configured-mcp`);
  }

  if (layer !== "global" && layer !== "project") {
    throw new Error(`${entryPath} layer must be global or project`);
  }

  if (
    typeof itemId !== "string" ||
    typeof displayName !== "string" ||
    typeof originalPath !== "string" ||
    typeof vaultedPath !== "string"
  ) {
    throw new Error(`${entryPath} string fields are invalid`);
  }

  if (payloadKind !== "path" && payloadKind !== "json-payload" && payloadKind !== "text-payload") {
    throw new Error(`${entryPath} payloadKind must be path, json-payload, or text-payload`);
  }

  return {
    version: 1,
    provider,
    kind,
    layer,
    itemId,
    displayName,
    originalPath,
    vaultedPath,
    payloadKind,
  };
}

export function vaultDescriptor(input: VaultDescriptorInput): VaultDescriptor {
  const rootPath = path.join(
    sliceRoot(input.appStateRoot, input.provider, input.layer, input.kind),
    safeItemId(input.itemId),
  );

  return {
    rootPath,
    entryPath: path.join(rootPath, "entry.json"),
    payloadPath: path.join(rootPath, "payload.json"),
    vaultedPath: path.join(rootPath, "payload"),
  };
}

export function vaultPayloadLocation(
  descriptor: VaultDescriptor,
  payloadKind: VaultPayloadKind,
): string {
  return payloadKind === "path" ? descriptor.vaultedPath : descriptor.payloadPath;
}

export function serializeVaultEntry(entry: VaultEntry): Uint8Array {
  return encoder.encode(
    `${JSON.stringify(
      {
        version: 1,
        provider: entry.provider,
        kind: entry.kind,
        layer: entry.layer,
        itemId: entry.itemId,
        displayName: entry.displayName,
        originalPath: entry.originalPath,
        vaultedPath: entry.vaultedPath,
        payloadKind: entry.payloadKind,
      } satisfies VaultEntry,
      null,
      2,
    )}\n`,
  );
}

export function loadVaultEntries(input: {
  appStateRoot: string;
  provider: VaultProvider;
  layer: DiscoveryLayer;
  kind: VaultEntryKind;
}): LoadedVaultEntry[] {
  const rootPath = sliceRoot(input.appStateRoot, input.provider, input.layer, input.kind);

  if (!existsSync(rootPath)) {
    return [];
  }

  const entries: LoadedVaultEntry[] = [];

  for (const directoryEntry of readdirSync(rootPath, { withFileTypes: true })) {
    if (!directoryEntry.isDirectory()) {
      continue;
    }

    let itemId: string;
    try {
      itemId = decodeURIComponent(directoryEntry.name);
    } catch {
      continue;
    }

    const descriptor = vaultDescriptor({
      appStateRoot: input.appStateRoot,
      provider: input.provider,
      layer: input.layer,
      kind: input.kind,
      itemId,
    });

    if (!existsSync(descriptor.entryPath)) {
      continue;
    }

    const entry = validateEntry(readFileSync(descriptor.entryPath, "utf8"), descriptor.entryPath);

    entries.push({
      ...entry,
      entryPath: descriptor.entryPath,
      payloadPath: descriptor.payloadPath,
    });
  }

  return entries.sort((left, right) => left.itemId.localeCompare(right.itemId));
}
