import type { ProviderId } from "../providers/registry.js";

export type DiscoveryProvider = ProviderId;
export type DiscoveryKind = "skill" | "mcp" | "plugin";
export type DiscoveryCategory = "skill" | "configured-mcp" | "tool";
export type DiscoveryLayer = "global" | "project";
export type DiscoveryMutability = "read-write" | "read-only" | "unsupported";

export interface DiscoveryItem {
  provider: DiscoveryProvider;
  kind: DiscoveryKind;
  category: DiscoveryCategory;
  layer: DiscoveryLayer;
  id: string;
  displayName: string;
  enabled: boolean;
  mutability: DiscoveryMutability;
  sourcePath: string;
  statePath: string;
}

export interface DiscoveryWarning {
  provider: DiscoveryProvider;
  layer?: DiscoveryLayer;
  code: string;
  message: string;
}

export interface DiscoveryResult {
  items: DiscoveryItem[];
  warnings: DiscoveryWarning[];
}

export interface InventoryBucketSummary {
  available: number;
  active: number;
}

export interface ProviderInventorySummary {
  provider: DiscoveryProvider;
  totalAvailable: number;
  totalActive: number;
  warningCount: number;
  kinds: Record<DiscoveryKind, InventoryBucketSummary>;
  categories: Record<DiscoveryCategory, InventoryBucketSummary>;
  layers: Record<DiscoveryLayer, InventoryBucketSummary>;
}

export interface DiscoveryInventorySummary {
  providers: ProviderInventorySummary[];
}

export const providerOrder: DiscoveryProvider[] = ["claude", "codex", "cursor"];
export const kindOrder: DiscoveryKind[] = ["skill", "mcp", "plugin"];
export const layerOrder: DiscoveryLayer[] = ["global", "project"];
export const categoryOrder: DiscoveryCategory[] = ["skill", "configured-mcp", "tool"];
