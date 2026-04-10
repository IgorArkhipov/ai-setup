import type { ProviderId } from "../providers/registry.js";
import type { AgentScopeConfig } from "./config.js";
import {
  categoryOrder,
  type DiscoveryItem,
  type DiscoveryResult,
  type DiscoveryWarning,
  layerOrder,
  providerOrder,
} from "./models.js";
import type { TogglePlanDecision, TogglePlanInput } from "./mutation-models.js";

export interface ProviderDiscoveryInput {
  config: AgentScopeConfig;
  homeDir: string;
}

export interface ProviderModule {
  id: ProviderId;
  discover(input: ProviderDiscoveryInput): DiscoveryResult;
  planToggle?(input: TogglePlanInput): TogglePlanDecision;
}

function compareByOrder<T extends string>(value: T, order: readonly T[]): number {
  const index = order.indexOf(value);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

export function sortDiscoveryItems(items: DiscoveryItem[]): DiscoveryItem[] {
  return [...items].sort((left, right) => {
    return (
      compareByOrder(left.provider, providerOrder) -
        compareByOrder(right.provider, providerOrder) ||
      compareByOrder(left.layer, layerOrder) - compareByOrder(right.layer, layerOrder) ||
      compareByOrder(left.category, categoryOrder) -
        compareByOrder(right.category, categoryOrder) ||
      left.id.localeCompare(right.id)
    );
  });
}

export function sortDiscoveryWarnings(warnings: DiscoveryWarning[]): DiscoveryWarning[] {
  return [...warnings].sort((left, right) => {
    return (
      compareByOrder(left.provider, providerOrder) -
        compareByOrder(right.provider, providerOrder) ||
      compareByOrder(left.layer ?? "global", layerOrder) -
        compareByOrder(right.layer ?? "global", layerOrder) ||
      left.code.localeCompare(right.code) ||
      left.message.localeCompare(right.message)
    );
  });
}

export function runDiscovery(
  providers: ProviderModule[],
  input: ProviderDiscoveryInput,
): DiscoveryResult {
  const items: DiscoveryItem[] = [];
  const warnings: DiscoveryWarning[] = [];

  for (const provider of providers) {
    try {
      const result = provider.discover(input);
      items.push(...result.items);
      warnings.push(...result.warnings);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      warnings.push({
        provider: provider.id,
        code: "provider-failure",
        message,
      });
    }
  }

  return {
    items: sortDiscoveryItems(items),
    warnings: sortDiscoveryWarnings(warnings),
  };
}
