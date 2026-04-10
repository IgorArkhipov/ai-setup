import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  loadVaultEntries,
  serializeVaultEntry,
  vaultDescriptor,
  type VaultEntry,
} from "../src/core/mutation-vault.js";
import { createClaudeSandbox } from "./support/claude-sandbox.js";

const tempRoots: string[] = [];

function createTempRoot(): string {
  const root = path.join(
    os.tmpdir(),
    `agentscope-vault-${Math.random().toString(16).slice(2)}`,
  );
  mkdirSync(root, { recursive: true });
  tempRoots.push(root);
  return root;
}

afterEach(() => {
  while (tempRoots.length > 0) {
    const root = tempRoots.pop();
    if (root !== undefined) {
      rmSync(root, { recursive: true, force: true });
    }
  }
});

function writeEntry(appStateRoot: string, entry: VaultEntry): string {
  const descriptor = vaultDescriptor({
    appStateRoot,
    provider: entry.provider,
    layer: entry.layer,
    kind: entry.kind,
    itemId: entry.itemId,
  });
  mkdirSync(descriptor.rootPath, { recursive: true });
  writeFileSync(descriptor.entryPath, serializeVaultEntry(entry));
  return descriptor.entryPath;
}

describe("mutation vault", () => {
  it("builds deterministic vault paths from provider, layer, kind, and item id", () => {
    const appStateRoot = "/tmp/agentscope-state";
    const descriptor = vaultDescriptor({
      appStateRoot,
      provider: "claude",
      layer: "project",
      kind: "skill",
      itemId: "claude:project:skill:example-claude-skill",
    });

    expect(descriptor.entryPath).toContain(
      "/vault/claude/project/skill/claude%3Aproject%3Askill%3Aexample-claude-skill/entry.json",
    );
    expect(descriptor.payloadPath).toContain(
      "/vault/claude/project/skill/claude%3Aproject%3Askill%3Aexample-claude-skill/payload.json",
    );
    expect(descriptor.vaultedPath).toContain(
      "/vault/claude/project/skill/claude%3Aproject%3Askill%3Aexample-claude-skill/payload",
    );
  });

  it("serializes and reloads manifests across a fresh process boundary", () => {
    const appStateRoot = createTempRoot();
    const entry: VaultEntry = {
      version: 1,
      provider: "claude",
      kind: "skill",
      layer: "project",
      itemId: "claude:project:skill:example-claude-skill",
      displayName: "example-claude-skill",
      originalPath: "/workspace/project/.claude/skills/example-claude-skill",
      vaultedPath: "/workspace/state/vault/claude/project/skill/example/payload",
      payloadKind: "path",
    };

    const entryPath = writeEntry(appStateRoot, entry);
    const reloaded = loadVaultEntries({
      appStateRoot,
      provider: "claude",
      layer: "project",
      kind: "skill",
    });

    expect(readFileSync(entryPath, "utf8")).toBe(
      Buffer.from(serializeVaultEntry(entry)).toString("utf8"),
    );
    expect(reloaded).toEqual([
      {
        ...entry,
        entryPath,
        payloadPath: vaultDescriptor({
          appStateRoot,
          provider: "claude",
          layer: "project",
          kind: "skill",
          itemId: entry.itemId,
        }).payloadPath,
      },
    ]);
  });

  it("serializes path-backed and json-payload-backed entries deterministically", () => {
    const pathEntry: VaultEntry = {
      version: 1,
      provider: "claude",
      kind: "skill",
      layer: "project",
      itemId: "claude:project:skill:example-claude-skill",
      displayName: "example-claude-skill",
      originalPath: "/workspace/project/.claude/skills/example-claude-skill",
      vaultedPath: "/workspace/state/vault/claude/project/skill/example/payload",
      payloadKind: "path",
    };
    const payloadEntry: VaultEntry = {
      version: 1,
      provider: "claude",
      kind: "configured-mcp",
      layer: "project",
      itemId: "claude:project:configured-mcp:github",
      displayName: "github",
      originalPath: "/workspace/project/.mcp.json",
      vaultedPath: "/workspace/state/vault/claude/project/configured-mcp/github/payload.json",
      payloadKind: "json-payload",
    };

    expect(Buffer.from(serializeVaultEntry(pathEntry)).toString("utf8")).toMatchInlineSnapshot(`
      "{
        "version": 1,
        "provider": "claude",
        "kind": "skill",
        "layer": "project",
        "itemId": "claude:project:skill:example-claude-skill",
        "displayName": "example-claude-skill",
        "originalPath": "/workspace/project/.claude/skills/example-claude-skill",
        "vaultedPath": "/workspace/state/vault/claude/project/skill/example/payload",
        "payloadKind": "path"
      }
      "
    `);
    expect(Buffer.from(serializeVaultEntry(payloadEntry)).toString("utf8")).toMatchInlineSnapshot(`
      "{
        "version": 1,
        "provider": "claude",
        "kind": "configured-mcp",
        "layer": "project",
        "itemId": "claude:project:configured-mcp:github",
        "displayName": "github",
        "originalPath": "/workspace/project/.mcp.json",
        "vaultedPath": "/workspace/state/vault/claude/project/configured-mcp/github/payload.json",
        "payloadKind": "json-payload"
      }
      "
    `);
  });

  it("loads only the requested provider, category, and layer slice", () => {
    const appStateRoot = createTempRoot();

    writeEntry(appStateRoot, {
      version: 1,
      provider: "claude",
      kind: "skill",
      layer: "project",
      itemId: "claude:project:skill:example-claude-skill",
      displayName: "example-claude-skill",
      originalPath: "/workspace/project/.claude/skills/example-claude-skill",
      vaultedPath: "/workspace/state/vault/claude/project/skill/example/payload",
      payloadKind: "path",
    });
    writeEntry(appStateRoot, {
      version: 1,
      provider: "claude",
      kind: "configured-mcp",
      layer: "project",
      itemId: "claude:project:configured-mcp:github",
      displayName: "github",
      originalPath: "/workspace/project/.mcp.json",
      vaultedPath: "/workspace/state/vault/claude/project/configured-mcp/github/payload.json",
      payloadKind: "json-payload",
    });

    const skills = loadVaultEntries({
      appStateRoot,
      provider: "claude",
      layer: "project",
      kind: "skill",
    });
    const configuredMcps = loadVaultEntries({
      appStateRoot,
      provider: "claude",
      layer: "project",
      kind: "configured-mcp",
    });

    expect(skills.map((entry) => entry.itemId)).toEqual([
      "claude:project:skill:example-claude-skill",
    ]);
    expect(configuredMcps.map((entry) => entry.itemId)).toEqual([
      "claude:project:configured-mcp:github",
    ]);
  });

  it("ignores malformed vault directory names while loading valid entries", () => {
    const appStateRoot = createTempRoot();
    const rootPath = path.join(
      appStateRoot,
      "vault",
      "claude",
      "project",
      "skill",
    );

    writeEntry(appStateRoot, {
      version: 1,
      provider: "claude",
      kind: "skill",
      layer: "project",
      itemId: "claude:project:skill:example-claude-skill",
      displayName: "example-claude-skill",
      originalPath: "/workspace/project/.claude/skills/example-claude-skill",
      vaultedPath: "/workspace/state/vault/claude/project/skill/example/payload",
      payloadKind: "path",
    });
    mkdirSync(path.join(rootPath, "bad%ZZ"), { recursive: true });

    expect(
      loadVaultEntries({
        appStateRoot,
        provider: "claude",
        layer: "project",
        kind: "skill",
      }).map((entry) => entry.itemId),
    ).toEqual(["claude:project:skill:example-claude-skill"]);
  });

  it("creates an isolated Claude sandbox from committed fixtures", () => {
    const sandbox = createClaudeSandbox();
    tempRoots.push(sandbox.root);

    writeFileSync(
      sandbox.projectPath(".claude/settings.local.json"),
      JSON.stringify({ sandbox: true }, null, 2),
    );

    expect(
      sandbox.readProjectJson<{ sandbox: boolean }>(".claude/settings.local.json"),
    ).toEqual({ sandbox: true });
    expect(
      JSON.parse(
        readFileSync(
          path.resolve(
            import.meta.dirname,
            "fixtures",
            "runtime",
            "project",
            ".claude",
            "settings.local.json",
          ),
          "utf8",
        ),
      ),
    ).toMatchObject({
      enabledPlugins: {
        "local-shell": false,
      },
    });
  });
});
