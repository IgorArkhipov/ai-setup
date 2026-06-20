import { describe, expect, it } from "vitest";
import type { DiscoveryItem } from "../src/core/models.js";
import {
  createDashboardState,
  dashboardReducer,
  filterDashboardItems,
  parseDashboardStageSpec,
  selectedDashboardItem,
} from "../src/ui/state.js";

const items: DiscoveryItem[] = [
  {
    provider: "claude",
    kind: "agent",
    category: "agent",
    layer: "global",
    id: "claude:global:agent:reviewer",
    displayName: "reviewer",
    enabled: true,
    mutability: "read-write",
    sourcePath: "/tmp/reviewer.md",
    statePath: "/tmp/reviewer.md",
  },
  {
    provider: "codex",
    kind: "mcp",
    category: "configured-mcp",
    layer: "global",
    id: "codex:global:configured-mcp:context7",
    displayName: "context7",
    enabled: false,
    mutability: "read-write",
    sourcePath: "/tmp/config.toml",
    statePath: "/tmp/config.toml",
  },
];

describe("dashboard state", () => {
  it("filters by provider, category, layer, and search", () => {
    const state = createDashboardState({
      filters: {
        provider: "claude",
        category: "agent",
        layer: "global",
        search: "review",
      },
    });

    expect(filterDashboardItems(items, state)).toEqual([items[0]]);
  });

  it("selects an explicit item or falls back to the first filtered item", () => {
    expect(
      selectedDashboardItem(
        items,
        createDashboardState({
          selectedId: "codex:global:configured-mcp:context7",
        }),
      ),
    ).toBe(items[1]);

    expect(
      selectedDashboardItem(
        items,
        createDashboardState({
          filters: { category: "agent" },
        }),
      ),
    ).toBe(items[0]);
  });

  it("stages multiple changes and clears them on refresh", () => {
    const staged = dashboardReducer(createDashboardState(), {
      type: "stage",
      change: {
        provider: "claude",
        kind: "agent",
        layer: "global",
        id: "claude:global:agent:reviewer",
        targetEnabled: false,
      },
    });

    expect(staged.stagedChanges).toHaveLength(1);
    expect(dashboardReducer(staged, { type: "refresh" }).stagedChanges).toEqual([]);
  });

  it("parses repeated stage specs without splitting item ids on colons", () => {
    expect(
      parseDashboardStageSpec("claude|agent|global|claude:global:agent:reviewer|false"),
    ).toEqual({
      provider: "claude",
      kind: "agent",
      layer: "global",
      id: "claude:global:agent:reviewer",
      targetEnabled: false,
    });
  });
});
