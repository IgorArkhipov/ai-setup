import { createHash } from "node:crypto";
import os from "node:os";
import path from "node:path";
import {
  type AgentScopeConfig,
  type AgentScopeConfigOverrides,
  loadConfig,
} from "../core/config.js";
import {
  buildDiscoveryInventorySummary,
  type ProviderModule,
  runDiscovery,
} from "../core/discovery.js";
import type { DiscoveryItem, DiscoveryResult } from "../core/models.js";
import { executeTogglePlan } from "../core/mutation-engine.js";
import type {
  BackupManifest,
  MutationOperation,
  MutationTarget,
  RestoreExecutionResult,
  ToggleExecutionResult,
  TogglePlanDecision,
} from "../core/mutation-models.js";
import { listBackupManifests } from "../core/mutation-state.js";
import { claudeProvider } from "../providers/claude.js";
import { codexProvider } from "../providers/codex.js";
import { cursorProvider } from "../providers/cursor.js";
import { loadCapabilityMatrix, validateProviderFixtures } from "../providers/registry.js";
import type {
  AgentScopeSelector,
  BulkApplyInput,
  BulkPlanInput,
  SingleToggleInput,
} from "./schemas.js";

export interface AgentScopeMcpRuntimeOptions extends AgentScopeConfigOverrides {
  packageRoot: string;
  fixturesRoot: string;
  cwd?: string;
  homeDir?: string;
  providers?: ProviderModule[];
  now?: () => Date;
  generateBackupId?: () => string;
  pid?: number;
  isProcessAlive?: (pid: number) => boolean;
}

interface RuntimeContext {
  config: AgentScopeConfig;
  discovery: DiscoveryResult;
  homeDir: string;
  providers: ProviderModule[];
}

interface PlannedAction {
  item: DiscoveryItem;
  decision: Extract<TogglePlanDecision, { status: "planned" }>;
}

interface BlockedAction {
  item: DiscoveryItem;
  reason: string;
}

interface BulkPlanState {
  status: "planned" | "blocked" | "no-op";
  selector: AgentScopeSelector;
  targetEnabled: boolean;
  matched: DiscoveryItem[];
  actionable: PlannedAction[];
  blocked: BlockedAction[];
  planFingerprint: string;
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
  return [claudeProvider, codexProvider, cursorProvider];
}

function context(options: AgentScopeMcpRuntimeOptions): RuntimeContext {
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
    discovery: runDiscovery(providers, { config, homeDir }),
    homeDir,
    providers,
  };
}

function normalizeSelector(selector: AgentScopeSelector | undefined): AgentScopeSelector {
  if (selector === undefined) {
    return {};
  }

  return {
    ...(selector.providers === undefined ? {} : { providers: [...selector.providers].sort() }),
    ...(selector.kinds === undefined ? {} : { kinds: [...selector.kinds].sort() }),
    ...(selector.categories === undefined ? {} : { categories: [...selector.categories].sort() }),
    ...(selector.layers === undefined ? {} : { layers: [...selector.layers].sort() }),
    ...(selector.enabled === undefined ? {} : { enabled: selector.enabled }),
    ...(selector.ids === undefined ? {} : { ids: [...selector.ids].sort() }),
  };
}

function matchesSelector(item: DiscoveryItem, selector: AgentScopeSelector): boolean {
  return (
    (selector.providers === undefined || selector.providers.includes(item.provider)) &&
    (selector.kinds === undefined || selector.kinds.includes(item.kind)) &&
    (selector.categories === undefined || selector.categories.includes(item.category)) &&
    (selector.layers === undefined || selector.layers.includes(item.layer)) &&
    (selector.enabled === undefined || selector.enabled === item.enabled) &&
    (selector.ids === undefined || selector.ids.includes(item.id))
  );
}

function selectedItem(input: SingleToggleInput, runtime: RuntimeContext): DiscoveryItem | string {
  const matches = runtime.discovery.items.filter((item) => {
    return (
      item.provider === input.provider &&
      item.kind === input.kind &&
      item.layer === input.layer &&
      item.id === input.id
    );
  });

  if (matches.length === 0) {
    return `unknown selection for ${input.id}`;
  }

  if (matches.length > 1) {
    return `ambiguous selection for ${input.id}`;
  }

  return matches[0] ?? `unknown selection for ${input.id}`;
}

function providerFor(item: DiscoveryItem, runtime: RuntimeContext): ProviderModule | undefined {
  return runtime.providers.find((provider) => provider.id === item.provider);
}

function blockObviousSelfTarget(item: DiscoveryItem): string | null {
  if (item.kind === "mcp" && item.id.toLowerCase().includes("agentscope")) {
    return "self-targeted-agentscope-mcp-blocked";
  }

  return null;
}

function planForItem(
  item: DiscoveryItem,
  targetEnabled: boolean,
  runtime: RuntimeContext,
): TogglePlanDecision {
  const selfTargetReason = blockObviousSelfTarget(item);
  if (selfTargetReason !== null) {
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
      reason: selfTargetReason,
    };
  }

  const provider = providerFor(item, runtime);
  if (provider?.planToggle === undefined) {
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
      reason: `unsupported provider planning for ${item.provider}`,
    };
  }

  return provider.planToggle({
    config: runtime.config,
    homeDir: runtime.homeDir,
    item,
    targetEnabled,
  });
}

function normalizeValue(value: unknown): unknown {
  if (value instanceof Uint8Array) {
    return {
      type: "bytes",
      base64: Buffer.from(value).toString("base64"),
    };
  }

  if (Array.isArray(value)) {
    return value.map((entry) => normalizeValue(entry));
  }

  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, normalizeValue(entry)]),
    );
  }

  return value;
}

function operationDigest(operation: MutationOperation): unknown {
  return normalizeValue(operation);
}

function targetSummary(target: MutationTarget): unknown {
  return normalizeValue(target);
}

function operationSummaries(operations: MutationOperation[]): unknown[] {
  return operations.map((operation) => operationDigest(operation));
}

function affectedTargetSummaries(targets: MutationTarget[]): unknown[] {
  return targets.map((target) => targetSummary(target));
}

function executionSummary(result: ToggleExecutionResult): Record<string, unknown> {
  return {
    status: result.status,
    selection: result.selection,
    targetEnabled: result.targetEnabled,
    operations: operationSummaries(result.operations),
    affectedTargets: affectedTargetSummaries(result.affectedTargets),
    ...("reason" in result ? { reason: result.reason } : {}),
    ...("backupId" in result && result.backupId !== undefined ? { backupId: result.backupId } : {}),
    ...("rollbackFailure" in result && result.rollbackFailure !== undefined
      ? { rollbackFailure: result.rollbackFailure }
      : {}),
  };
}

function blockedResponse(
  reason: string,
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    status: "blocked",
    reason,
    ...extra,
  };
}

function planSummary(decision: TogglePlanDecision): Record<string, unknown> {
  if (decision.status === "blocked") {
    return {
      status: "blocked",
      selection: decision.selection,
      targetEnabled: decision.targetEnabled,
      operations: operationSummaries(decision.operations),
      affectedTargets: affectedTargetSummaries(decision.affectedTargets),
      reason: decision.reason,
    };
  }

  return {
    status: "planned",
    selection: decision.plan.selection,
    targetEnabled: decision.plan.targetEnabled,
    operations: operationSummaries(decision.plan.operations),
    affectedTargets: affectedTargetSummaries(decision.plan.affectedTargets),
  };
}

function mutationOptions(options: AgentScopeMcpRuntimeOptions, config: AgentScopeConfig) {
  return {
    appStateRoot: config.appStateRoot,
    ...(options.now === undefined ? {} : { now: options.now }),
    ...(options.generateBackupId === undefined
      ? {}
      : { generateBackupId: options.generateBackupId }),
    ...(options.pid === undefined ? {} : { pid: options.pid }),
    ...(options.isProcessAlive === undefined ? {} : { isProcessAlive: options.isProcessAlive }),
  };
}

interface ConfirmationInput {
  requireConfirmation?: boolean | undefined;
  confirm?: boolean | undefined;
}

function hasConfirmed(input: ConfirmationInput): boolean {
  return input.requireConfirmation === true || input.confirm === true;
}

function buildBulkPlan(
  input: BulkPlanInput,
  runtime: RuntimeContext,
  allowEmptySelection: boolean,
): BulkPlanState {
  const selector = normalizeSelector(input.selector);
  const matched = runtime.discovery.items.filter((item) => matchesSelector(item, selector));
  const actionable: PlannedAction[] = [];
  const blocked: BlockedAction[] = [];

  if (matched.length === 0 && !allowEmptySelection) {
    return {
      status: "blocked",
      selector,
      targetEnabled: input.targetEnabled,
      matched,
      actionable,
      blocked,
      planFingerprint: fingerprintBulkPlan(
        runtime.config.projectRoot,
        selector,
        input.targetEnabled,
        {
          matched,
          actionable,
          blocked,
        },
      ),
    };
  }

  for (const item of matched) {
    if (item.enabled === input.targetEnabled) {
      blocked.push({ item, reason: "already-in-desired-state" });
      continue;
    }

    const decision = planForItem(item, input.targetEnabled, runtime);
    if (decision.status === "blocked") {
      blocked.push({ item, reason: decision.reason });
      continue;
    }

    actionable.push({ item, decision });
  }

  return {
    status: actionable.length > 0 ? "planned" : matched.length === 0 ? "no-op" : "blocked",
    selector,
    targetEnabled: input.targetEnabled,
    matched,
    actionable,
    blocked,
    planFingerprint: fingerprintBulkPlan(
      runtime.config.projectRoot,
      selector,
      input.targetEnabled,
      {
        matched,
        actionable,
        blocked,
      },
    ),
  };
}

function bulkPlanResponse(plan: BulkPlanState): Record<string, unknown> {
  if (plan.matched.length === 0 && plan.status === "blocked") {
    return blockedResponse("empty-selection", {
      selector: plan.selector,
      targetEnabled: plan.targetEnabled,
      matched: [],
      actionable: [],
      blocked: [],
      planFingerprint: plan.planFingerprint,
    });
  }

  return {
    status: plan.status,
    selector: plan.selector,
    targetEnabled: plan.targetEnabled,
    matched: plan.matched,
    actionable: plan.actionable.map((entry) => planSummary(entry.decision)),
    blocked: plan.blocked,
    planFingerprint: plan.planFingerprint,
  };
}

function fingerprintBulkPlan(
  projectRoot: string,
  selector: AgentScopeSelector,
  targetEnabled: boolean,
  plan: Pick<BulkPlanState, "matched" | "actionable" | "blocked">,
): string {
  const payload = normalizeValue({
    projectRoot,
    selector,
    targetEnabled,
    matched: plan.matched,
    actionable: plan.actionable.map((entry) => ({
      item: entry.item,
      plan: entry.decision.plan,
      operationDigests: entry.decision.plan.operations.map((operation) =>
        operationDigest(operation),
      ),
    })),
    blocked: plan.blocked,
  });
  const digest = createHash("sha256").update(JSON.stringify(payload)).digest("hex");

  return `sha256:${digest}`;
}

export function getInventorySummary(options: AgentScopeMcpRuntimeOptions): Record<string, unknown> {
  const runtime = context(options);

  return {
    status: "ok",
    projectRoot: runtime.config.projectRoot,
    inventory: buildDiscoveryInventorySummary(runtime.discovery.items, runtime.discovery.warnings),
    warnings: runtime.discovery.warnings,
  };
}

export function listItems(
  options: AgentScopeMcpRuntimeOptions,
  selector: AgentScopeSelector | undefined,
): Record<string, unknown> {
  const runtime = context(options);
  const normalizedSelector = normalizeSelector(selector);

  return {
    status: "ok",
    selector: normalizedSelector,
    items: runtime.discovery.items.filter((item) => matchesSelector(item, normalizedSelector)),
    warnings: runtime.discovery.warnings,
  };
}

export function runDoctorStructured(options: AgentScopeMcpRuntimeOptions): Record<string, unknown> {
  loadCapabilityMatrix(options.fixturesRoot);
  const report = validateProviderFixtures(options.fixturesRoot);
  if (report.issues.length > 0) {
    return {
      status: "failed",
      packageRoot: options.packageRoot,
      fixturesRoot: options.fixturesRoot,
      fixtureIssues: report.issues,
      warnings: [],
    };
  }

  const runtime = context(options);
  return {
    status: runtime.discovery.warnings.length === 0 ? "ok" : "failed",
    packageRoot: options.packageRoot,
    fixturesRoot: options.fixturesRoot,
    projectRoot: runtime.config.projectRoot,
    cursorRoot: runtime.config.cursorRoot,
    itemsDiscovered: runtime.discovery.items.length,
    warnings: runtime.discovery.warnings,
  };
}

export function planSingleToggle(
  options: AgentScopeMcpRuntimeOptions,
  input: SingleToggleInput,
): Record<string, unknown> {
  const runtime = context(options);
  const item = selectedItem(input, runtime);
  if (typeof item === "string") {
    return blockedResponse(item);
  }

  return planSummary(planForItem(item, input.targetEnabled, runtime));
}

export function applySingleToggle(
  options: AgentScopeMcpRuntimeOptions,
  input: SingleToggleInput & ConfirmationInput,
): Record<string, unknown> {
  if (!hasConfirmed(input)) {
    return blockedResponse("confirmation-required");
  }

  const runtime = context(options);
  const item = selectedItem(input, runtime);
  if (typeof item === "string") {
    return blockedResponse(item);
  }

  return executionSummary(
    executeTogglePlan(
      planForItem(item, input.targetEnabled, runtime),
      mutationOptions(options, runtime.config),
      true,
    ),
  );
}

export function planBulkToggle(
  options: AgentScopeMcpRuntimeOptions,
  input: BulkPlanInput,
): Record<string, unknown> {
  const runtime = context(options);

  return bulkPlanResponse(buildBulkPlan(input, runtime, input.allowEmptySelection === true));
}

export function applyBulkToggle(
  options: AgentScopeMcpRuntimeOptions,
  input: BulkApplyInput,
): Record<string, unknown> {
  if (!hasConfirmed(input)) {
    return blockedResponse("confirmation-required");
  }

  const runtime = context(options);
  const plan = buildBulkPlan(input, runtime, input.allowEmptySelection === true);
  if (plan.matched.length === 0 && input.allowEmptySelection !== true) {
    return blockedResponse("empty-selection", bulkPlanResponse(plan));
  }

  if (plan.actionable.length > input.maxItems) {
    return blockedResponse("max-items-exceeded", {
      maxItems: input.maxItems,
      actionableCount: plan.actionable.length,
      planFingerprint: plan.planFingerprint,
    });
  }

  if (plan.planFingerprint !== input.planFingerprint) {
    return blockedResponse("plan-fingerprint-mismatch", {
      expected: plan.planFingerprint,
      received: input.planFingerprint,
    });
  }

  return {
    status: plan.actionable.length === 0 ? "no-op" : "applied",
    selector: plan.selector,
    targetEnabled: input.targetEnabled,
    planFingerprint: plan.planFingerprint,
    results: plan.actionable.map((entry) =>
      executionSummary(
        executeTogglePlan(entry.decision, mutationOptions(options, runtime.config), true),
      ),
    ),
    blocked: plan.blocked,
  };
}

export function listBackups(options: AgentScopeMcpRuntimeOptions): Record<string, unknown> {
  const runtime = context(options);

  return {
    status: "ok",
    backups: listBackupManifests(runtime.config.appStateRoot).map((manifest) =>
      backupSummary(manifest),
    ),
  };
}

export function restoreBackup(
  options: AgentScopeMcpRuntimeOptions,
  backupId: string,
  restore: (
    backupId: string,
    options: ReturnType<typeof mutationOptions>,
  ) => RestoreExecutionResult,
): Record<string, unknown> {
  const runtime = context(options);
  const result = restore(backupId, mutationOptions(options, runtime.config));

  return {
    status: result.status,
    backupId: result.backupId,
    affectedTargets: affectedTargetSummaries(result.affectedTargets),
    ...("reason" in result ? { reason: result.reason } : {}),
    ...("rollbackFailure" in result && result.rollbackFailure !== undefined
      ? { rollbackFailure: result.rollbackFailure }
      : {}),
  };
}

function backupSummary(manifest: BackupManifest): Record<string, unknown> {
  return {
    backupId: manifest.backupId,
    createdAt: manifest.createdAt,
    itemCount: manifest.entries.length,
    providers: [...new Set(manifest.selection === null ? [] : [manifest.selection.provider])],
    layers: [...new Set(manifest.selection === null ? [] : [manifest.selection.layer])],
    paths: manifest.affectedTargets
      .map((target) => (target.type === "path" ? target.path : target.databasePath))
      .sort((left, right) => left.localeCompare(right)),
    restorable: true,
    selection: manifest.selection,
    targetEnabled: manifest.targetEnabled,
  };
}

export function packageRootFromImportMeta(importMetaUrl: string): string {
  return path.resolve(new URL(importMetaUrl).pathname, "..", "..");
}
