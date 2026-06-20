import os from "node:os";
import { type AgentScopeConfigOverrides, loadConfig } from "../core/config.js";
import { type ProviderModule, runDiscovery } from "../core/discovery.js";
import {
  categoryOrder,
  type DiscoveryCategory,
  type DiscoveryItem,
  type DiscoveryKind,
  type DiscoveryLayer,
  type DiscoveryProvider,
  type DiscoveryWarning,
  kindOrder,
  providerOrder,
} from "../core/models.js";
import { executeTogglePlan } from "../core/mutation-engine.js";
import type { ToggleExecutionResult, TogglePlanDecision } from "../core/mutation-models.js";
import { writeDiscoverySnapshot } from "../core/snapshots.js";
import { claudeProvider } from "../providers/claude.js";
import { codexProvider } from "../providers/codex.js";
import { cursorProvider } from "../providers/cursor.js";
import { zedProvider } from "../providers/zed.js";
import { previewFromToggleResult, renderDashboard } from "../ui/render.js";
import {
  createDashboardState,
  type DashboardFilters,
  type DashboardStageChange,
  filterDashboardItems,
  isDashboardCategory,
  isDashboardKind,
  isDashboardProvider,
  normalizeDashboardStageSpecs,
  selectedDashboardItem,
} from "../ui/state.js";

export interface DashboardCommandOptions extends AgentScopeConfigOverrides {
  cwd?: string;
  homeDir?: string;
  json?: boolean;
  provider?: string;
  layer?: string;
  kind?: string;
  category?: string;
  search?: string;
  select?: string;
  stage?: string | string[];
  apply?: boolean;
  confirm?: boolean;
  providers?: ProviderModule[];
  now?: () => Date;
  generateBackupId?: () => string;
  pid?: number;
  isProcessAlive?: (pid: number) => boolean;
  snapshotCapturedAt?: string;
  snapshotRandomSuffix?: string;
}

export interface DashboardCommandResult {
  exitCode: number;
  output: string;
}

interface Runtime {
  config: ReturnType<typeof loadConfig>;
  homeDir: string;
  providers: ProviderModule[];
  discovery: ReturnType<typeof runDiscovery>;
}

const supportedLayers = new Set(["global", "project", "all"]);

function failure(json: boolean | undefined, reason: string): DashboardCommandResult {
  return {
    exitCode: 1,
    output: json ? JSON.stringify({ status: "failed", reason }, null, 2) : reason,
  };
}

function definedOverrides(
  options: Pick<AgentScopeConfigOverrides, "projectRoot" | "appStateRoot" | "cursorRoot">,
): AgentScopeConfigOverrides {
  return {
    ...(options.projectRoot === undefined ? {} : { projectRoot: options.projectRoot }),
    ...(options.appStateRoot === undefined ? {} : { appStateRoot: options.appStateRoot }),
    ...(options.cursorRoot === undefined ? {} : { cursorRoot: options.cursorRoot }),
  };
}

function defaultProviders(): ProviderModule[] {
  return [claudeProvider, codexProvider, cursorProvider, zedProvider];
}

function runtime(options: DashboardCommandOptions): Runtime {
  const cwd = options.cwd ?? process.cwd();
  const homeDir = options.homeDir ?? os.homedir();
  const config = loadConfig({
    cwd,
    homeDir,
    overrides: definedOverrides(options),
  });
  const providers = options.providers ?? defaultProviders();

  return {
    config,
    homeDir,
    providers,
    discovery: runDiscovery(providers, { config, homeDir }),
  };
}

function parseFilters(options: DashboardCommandOptions): DashboardFilters | string {
  if (options.provider !== undefined && !isDashboardProvider(options.provider)) {
    return `invalid provider: expected ${providerOrder.join(", ")}`;
  }

  if (options.layer !== undefined && !supportedLayers.has(options.layer)) {
    return "invalid layer: expected global, project, or all";
  }

  if (options.kind !== undefined && !isDashboardKind(options.kind)) {
    return `invalid kind: expected ${kindOrder.join(", ")}`;
  }

  if (options.category !== undefined && !isDashboardCategory(options.category)) {
    return `invalid category: expected ${categoryOrder.join(", ")}`;
  }

  return {
    ...(options.provider === undefined ? {} : { provider: options.provider as DiscoveryProvider }),
    ...(options.layer === undefined ? {} : { layer: options.layer as DiscoveryLayer | "all" }),
    ...(options.kind === undefined ? {} : { kind: options.kind as DiscoveryKind }),
    ...(options.category === undefined ? {} : { category: options.category as DiscoveryCategory }),
    ...(options.search === undefined ? {} : { search: options.search }),
  };
}

function findItem(runtimeContext: Runtime, change: DashboardStageChange): DiscoveryItem | string {
  const matches = runtimeContext.discovery.items.filter((item) => {
    return (
      item.provider === change.provider &&
      item.kind === change.kind &&
      item.layer === change.layer &&
      item.id === change.id
    );
  });

  if (matches.length === 0) {
    return `unknown selection for ${change.id}`;
  }

  if (matches.length > 1) {
    return `ambiguous selection for ${change.id}`;
  }

  return matches[0] ?? `unknown selection for ${change.id}`;
}

function blockedDecision(
  item: DiscoveryItem,
  targetEnabled: boolean,
  reason: string,
): TogglePlanDecision {
  return {
    status: "blocked",
    selection: {
      provider: item.provider,
      kind: item.kind,
      layer: item.layer,
      id: item.id,
      displayName: item.displayName,
      enabled: item.enabled,
      mutability: item.mutability,
      sourcePath: item.sourcePath,
      statePath: item.statePath,
    },
    targetEnabled,
    operations: [],
    affectedTargets: [],
    reason,
  };
}

function planItem(
  runtimeContext: Runtime,
  item: DiscoveryItem,
  targetEnabled: boolean,
): TogglePlanDecision {
  const provider = runtimeContext.providers.find((entry) => entry.id === item.provider);
  if (provider?.planToggle === undefined) {
    return blockedDecision(
      item,
      targetEnabled,
      `unsupported provider planning for ${item.provider}`,
    );
  }

  return provider.planToggle({
    config: runtimeContext.config,
    homeDir: runtimeContext.homeDir,
    item,
    targetEnabled,
  });
}

function executeDecision(
  options: DashboardCommandOptions,
  runtimeContext: Runtime,
  decision: TogglePlanDecision,
  apply: boolean,
): ToggleExecutionResult {
  return executeTogglePlan(
    decision,
    {
      appStateRoot: runtimeContext.config.appStateRoot,
      ...(options.now === undefined ? {} : { now: options.now }),
      ...(options.generateBackupId === undefined
        ? {}
        : { generateBackupId: options.generateBackupId }),
      ...(options.pid === undefined ? {} : { pid: options.pid }),
      ...(options.isProcessAlive === undefined ? {} : { isProcessAlive: options.isProcessAlive }),
    },
    apply,
  );
}

function filterDashboardWarnings(
  warnings: DiscoveryWarning[],
  state: ReturnType<typeof createDashboardState>,
): DiscoveryWarning[] {
  const { provider, layer } = state.filters;

  return warnings.filter((warning) => {
    return (
      (provider === undefined || warning.provider === provider) &&
      (layer === undefined ||
        layer === "all" ||
        warning.layer === undefined ||
        warning.layer === layer)
    );
  });
}

function stagePreview(
  runtimeContext: Runtime,
  change: DashboardStageChange,
): ReturnType<typeof previewFromToggleResult> & DashboardStageChange {
  const item = findItem(runtimeContext, change);
  if (typeof item === "string") {
    return {
      ...change,
      status: "blocked",
      targetEnabled: change.targetEnabled,
      operations: [],
      reason: item,
    };
  }

  return {
    ...change,
    ...previewFromToggleResult(
      executeDecision(
        {},
        runtimeContext,
        planItem(runtimeContext, item, change.targetEnabled),
        false,
      ),
    ),
  };
}

export function runDashboard(options: DashboardCommandOptions = {}): DashboardCommandResult {
  const filters = parseFilters(options);
  if (typeof filters === "string") {
    return failure(options.json, filters);
  }

  let stagedChanges: DashboardStageChange[];
  try {
    stagedChanges = normalizeDashboardStageSpecs(options.stage);
  } catch (error) {
    return failure(options.json, error instanceof Error ? error.message : String(error));
  }

  if (options.apply === true && stagedChanges.length > 0 && options.confirm !== true) {
    return failure(options.json, "confirmation required for dashboard apply");
  }

  const initialRuntime = runtime(options);
  const state = createDashboardState({
    filters,
    ...(options.select === undefined ? {} : { selectedId: options.select }),
    stagedChanges,
  });
  const filteredItems = filterDashboardItems(initialRuntime.discovery.items, state);
  const selected = selectedDashboardItem(initialRuntime.discovery.items, state);
  const selectedPreview =
    selected === undefined
      ? undefined
      : previewFromToggleResult(
          executeDecision(
            options,
            initialRuntime,
            planItem(initialRuntime, selected, !selected.enabled),
            false,
          ),
        );
  const stagedPreviews = stagedChanges.map((change) => stagePreview(initialRuntime, change));
  const applyResults: ToggleExecutionResult[] = [];

  if (options.apply === true) {
    for (const change of stagedChanges) {
      const currentRuntime = runtime(options);
      const item = findItem(currentRuntime, change);
      if (typeof item === "string") {
        applyResults.push({
          status: "blocked",
          selection: {
            provider: change.provider,
            kind: change.kind,
            layer: change.layer,
            id: change.id,
            displayName: change.id,
            enabled: false,
            mutability: "unsupported",
            sourcePath: "",
            statePath: "",
          },
          targetEnabled: change.targetEnabled,
          operations: [],
          affectedTargets: [],
          reason: item,
        });
        continue;
      }

      applyResults.push(
        executeDecision(
          options,
          currentRuntime,
          planItem(currentRuntime, item, change.targetEnabled),
          true,
        ),
      );
    }
  }

  const appliedAny = applyResults.some((result) => result.status === "applied");
  const finalRuntime = appliedAny ? runtime(options) : initialRuntime;
  const renderedItems = appliedAny
    ? filterDashboardItems(finalRuntime.discovery.items, state)
    : filteredItems;
  const renderedSelected = appliedAny
    ? selectedDashboardItem(finalRuntime.discovery.items, state)
    : selected;
  const renderedSelectedPreview =
    renderedSelected === undefined
      ? undefined
      : appliedAny
        ? previewFromToggleResult(
            executeDecision(
              options,
              finalRuntime,
              planItem(finalRuntime, renderedSelected, !renderedSelected.enabled),
              false,
            ),
          )
        : selectedPreview;
  const renderedDiscovery = {
    ...finalRuntime.discovery,
    warnings: filterDashboardWarnings(finalRuntime.discovery.warnings, state),
  };
  const snapshot =
    appliedAny === true
      ? writeDiscoverySnapshot({
          appStateRoot: finalRuntime.config.appStateRoot,
          projectRoot: finalRuntime.config.projectRoot,
          items: finalRuntime.discovery.items,
          warnings: finalRuntime.discovery.warnings,
          ...(options.snapshotCapturedAt === undefined
            ? {}
            : { capturedAt: options.snapshotCapturedAt }),
          ...(options.snapshotRandomSuffix === undefined
            ? {}
            : { randomSuffix: options.snapshotRandomSuffix }),
        })
      : undefined;
  const output = renderDashboard({
    state,
    discovery: renderedDiscovery,
    items: renderedItems,
    selected: renderedSelected,
    selectedPreview: renderedSelectedPreview,
    stagedPreviews,
    ...(options.apply === true ? { applyResults } : {}),
    ...(snapshot === undefined ? {} : { snapshot }),
  });
  const failed = applyResults.some(
    (result) => result.status === "blocked" || result.status === "failed",
  );

  if (options.json === true) {
    return {
      exitCode: failed ? 1 : 0,
      output: JSON.stringify(
        {
          status: failed ? "blocked" : "ok",
          items: renderedItems,
          selected: renderedSelected,
          selectedPreview: renderedSelectedPreview,
          staged: stagedPreviews,
          applyResults,
          snapshot,
          warnings: renderedDiscovery.warnings,
        },
        null,
        2,
      ),
    };
  }

  return {
    exitCode: failed ? 1 : 0,
    output,
  };
}
