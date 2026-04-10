import { describe, expect, it } from "vitest";
import type { AgentScopeConfig } from "../src/core/config.js";
import { type ProviderModule, runDiscovery, sortDiscoveryItems } from "../src/core/discovery.js";
import type { DiscoveryItem } from "../src/core/models.js";

const config: AgentScopeConfig = {
  version: 1,
  projectRoot: "/workspace/project",
  appStateRoot: "/workspace/state",
  cursorRoot: "/workspace/cursor",
  configPaths: {
    userConfigPath: "/workspace/home/.config/agentscope/config.json",
    projectConfigPath: "/workspace/project/.agentscope.json",
  },
};

function createItem(item: Partial<DiscoveryItem> & Pick<DiscoveryItem, "id">): DiscoveryItem {
  return {
    provider: "claude",
    kind: "skill",
    category: "skill",
    layer: "global",
    displayName: item.id,
    enabled: true,
    mutability: "read-only",
    sourcePath: "/tmp/source",
    statePath: "/tmp/state",
    ...item,
  };
}

describe("discovery orchestration", () => {
  it("merges items and warnings from multiple providers", () => {
    const providers: ProviderModule[] = [
      {
        id: "claude",
        discover() {
          return {
            items: [createItem({ id: "claude:global:skill:one" })],
            warnings: [],
          };
        },
      },
      {
        id: "cursor",
        discover() {
          return {
            items: [],
            warnings: [
              {
                provider: "cursor",
                layer: "global",
                code: "missing-root",
                message: "Cursor root is missing",
              },
            ],
          };
        },
      },
    ];

    const result = runDiscovery(providers, { config, homeDir: "/workspace/home" });

    expect(result.items).toHaveLength(1);
    expect(result.warnings).toEqual([
      {
        provider: "cursor",
        layer: "global",
        code: "missing-root",
        message: "Cursor root is missing",
      },
    ]);
  });

  it("keeps healthy provider results when another provider fails", () => {
    const providers: ProviderModule[] = [
      {
        id: "claude",
        discover() {
          return {
            items: [createItem({ id: "claude:global:skill:healthy" })],
            warnings: [],
          };
        },
      },
      {
        id: "codex",
        discover() {
          throw new Error("config.toml is malformed");
        },
      },
    ];

    const result = runDiscovery(providers, { config, homeDir: "/workspace/home" });

    expect(result.items.map((item) => item.id)).toEqual(["claude:global:skill:healthy"]);
    expect(result.warnings).toEqual([
      {
        provider: "codex",
        code: "provider-failure",
        message: "config.toml is malformed",
      },
    ]);
  });

  it("sorts results by provider, layer, category, and id", () => {
    const sorted = sortDiscoveryItems([
      createItem({
        provider: "cursor",
        layer: "global",
        category: "tool",
        id: "cursor:global:tool:b",
      }),
      createItem({
        provider: "claude",
        layer: "project",
        category: "configured-mcp",
        id: "claude:project:configured-mcp:b",
      }),
      createItem({
        provider: "claude",
        layer: "global",
        category: "skill",
        id: "claude:global:skill:a",
      }),
      createItem({
        provider: "claude",
        layer: "project",
        category: "configured-mcp",
        id: "claude:project:configured-mcp:a",
      }),
    ]);

    expect(sorted.map((item) => item.id)).toEqual([
      "claude:global:skill:a",
      "claude:project:configured-mcp:a",
      "claude:project:configured-mcp:b",
      "cursor:global:tool:b",
    ]);
  });
});
