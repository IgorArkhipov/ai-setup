import {
  categoryOrder,
  type DiscoveryCategory,
  type DiscoveryItem,
  type DiscoveryKind,
  type DiscoveryLayer,
  type DiscoveryProvider,
  kindOrder,
  providerOrder,
} from "../core/models.js";

export interface DashboardFilters {
  provider?: DiscoveryProvider;
  layer?: DiscoveryLayer | "all";
  kind?: DiscoveryKind;
  category?: DiscoveryCategory;
  search?: string;
}

export interface DashboardStageChange {
  provider: DiscoveryProvider;
  kind: DiscoveryKind;
  layer: DiscoveryLayer;
  id: string;
  targetEnabled: boolean;
}

export interface DashboardState {
  filters: DashboardFilters;
  selectedId?: string;
  stagedChanges: DashboardStageChange[];
  status: "idle" | "refreshed" | "applied" | "blocked";
}

export type DashboardAction =
  | { type: "set-filter"; filters: DashboardFilters }
  | { type: "select"; id: string | undefined }
  | { type: "stage"; change: DashboardStageChange }
  | { type: "clear-staged" }
  | { type: "refresh" }
  | { type: "mark-applied" }
  | { type: "mark-blocked" };

export interface CreateDashboardStateOptions {
  filters?: DashboardFilters;
  selectedId?: string;
  stagedChanges?: DashboardStageChange[];
}

const providerSet = new Set<DiscoveryProvider>(providerOrder);
const kindSet = new Set<DiscoveryKind>(kindOrder);
const categorySet = new Set<DiscoveryCategory>(categoryOrder);

function normalizeSearch(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed === undefined || trimmed.length === 0 ? undefined : trimmed.toLowerCase();
}

export function createDashboardState(options: CreateDashboardStateOptions = {}): DashboardState {
  const { search, ...restFilters } = options.filters ?? {};
  const normalizedSearch = normalizeSearch(search);

  return {
    filters: {
      ...restFilters,
      ...(normalizedSearch === undefined ? {} : { search: normalizedSearch }),
    },
    ...(options.selectedId === undefined ? {} : { selectedId: options.selectedId }),
    stagedChanges: options.stagedChanges ?? [],
    status: "idle",
  };
}

export function dashboardReducer(state: DashboardState, action: DashboardAction): DashboardState {
  switch (action.type) {
    case "set-filter":
      return createDashboardState({
        filters: action.filters,
        ...(state.selectedId === undefined ? {} : { selectedId: state.selectedId }),
        stagedChanges: state.stagedChanges,
      });
    case "select":
      if (action.id === undefined) {
        const { selectedId: _selectedId, ...stateWithoutSelection } = state;
        return stateWithoutSelection;
      }

      return { ...state, selectedId: action.id };
    case "stage": {
      const stagedChanges = state.stagedChanges.filter((change) => {
        return !(
          change.provider === action.change.provider &&
          change.kind === action.change.kind &&
          change.layer === action.change.layer &&
          change.id === action.change.id
        );
      });

      stagedChanges.push(action.change);

      return {
        ...state,
        stagedChanges,
      };
    }
    case "clear-staged":
      return {
        ...state,
        stagedChanges: [],
      };
    case "refresh":
      return {
        ...state,
        stagedChanges: [],
        status: "refreshed",
      };
    case "mark-applied":
      return {
        ...state,
        status: "applied",
      };
    case "mark-blocked":
      return {
        ...state,
        status: "blocked",
      };
  }
}

function itemMatchesSearch(item: DiscoveryItem, search: string | undefined): boolean {
  if (search === undefined) {
    return true;
  }

  return [
    item.provider,
    item.kind,
    item.category,
    item.layer,
    item.id,
    item.displayName,
    item.mutability,
  ].some((value) => value.toLowerCase().includes(search));
}

export function filterDashboardItems(
  items: DiscoveryItem[],
  state: DashboardState,
): DiscoveryItem[] {
  const { filters } = state;

  return items.filter((item) => {
    return (
      (filters.provider === undefined || item.provider === filters.provider) &&
      (filters.layer === undefined || filters.layer === "all" || item.layer === filters.layer) &&
      (filters.kind === undefined || item.kind === filters.kind) &&
      (filters.category === undefined || item.category === filters.category) &&
      itemMatchesSearch(item, filters.search)
    );
  });
}

export function selectedDashboardItem(
  items: DiscoveryItem[],
  state: DashboardState,
): DiscoveryItem | undefined {
  const filtered = filterDashboardItems(items, state);
  if (state.selectedId !== undefined) {
    return filtered.find((item) => item.id === state.selectedId);
  }

  return filtered[0];
}

function isProvider(value: string): value is DiscoveryProvider {
  return providerSet.has(value as DiscoveryProvider);
}

function isKind(value: string): value is DiscoveryKind {
  return kindSet.has(value as DiscoveryKind);
}

function isLayer(value: string): value is DiscoveryLayer {
  return value === "global" || value === "project";
}

function parseTargetEnabled(value: string): boolean | null {
  if (value === "true" || value === "enable" || value === "enabled") {
    return true;
  }

  if (value === "false" || value === "disable" || value === "disabled") {
    return false;
  }

  return null;
}

export function parseDashboardStageSpec(spec: string): DashboardStageChange {
  const [provider, kind, layer, id, targetEnabledRaw, extra] = spec.split("|");

  if (
    provider === undefined ||
    kind === undefined ||
    layer === undefined ||
    id === undefined ||
    targetEnabledRaw === undefined ||
    extra !== undefined ||
    !isProvider(provider) ||
    !isKind(kind) ||
    !isLayer(layer)
  ) {
    throw new Error("invalid stage spec: expected provider|kind|layer|id|targetEnabled");
  }

  const targetEnabled = parseTargetEnabled(targetEnabledRaw);
  if (targetEnabled === null) {
    throw new Error("invalid stage spec targetEnabled: expected true or false");
  }

  return {
    provider,
    kind,
    layer,
    id,
    targetEnabled,
  };
}

export function normalizeDashboardStageSpecs(
  specs: string | string[] | undefined,
): DashboardStageChange[] {
  if (specs === undefined) {
    return [];
  }

  return (Array.isArray(specs) ? specs : [specs]).map(parseDashboardStageSpec);
}

export function isDashboardCategory(value: string): value is DiscoveryCategory {
  return categorySet.has(value as DiscoveryCategory);
}

export function isDashboardKind(value: string): value is DiscoveryKind {
  return isKind(value);
}

export function isDashboardProvider(value: string): value is DiscoveryProvider {
  return isProvider(value);
}
