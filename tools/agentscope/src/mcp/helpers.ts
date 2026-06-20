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
import type { DiscoveryItem, DiscoveryProvider, DiscoveryResult } from "../core/models.js";
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
import { validateCapabilityMatrix, validateProviderFixtures } from "../providers/registry.js";
import { zedProvider } from "../providers/zed.js";
import type {
  AgentScopeSelector,
  BulkApplyInput,
  BulkPlanInput,
  DoctorInput,
  InventorySummaryInput,
  ListBackupsInput,
  RestoreBackupInput,
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

interface ItemIdentity {
  provider: DiscoveryItem["provider"];
  kind: DiscoveryItem["kind"];
  id: string;
  layer: DiscoveryItem["layer"];
}

type ContractReasonCode =
  | "unsupported"
  | "read-only"
  | "conflicting"
  | "not-found"
  | "control-plane-protected"
  | "already-in-desired-state"
  | "confirmation-required"
  | "empty-selection"
  | "max-items-exceeded"
  | "plan-fingerprint-mismatch"
  | "error";

interface DoctorIssue {
  provider: DiscoveryProvider | "core";
  code: string;
  message: string;
  layer?: DiscoveryItem["layer"];
  kind?: DiscoveryItem["kind"];
  itemId?: string;
}

interface ProviderDoctorReport {
  provider: DiscoveryProvider;
  status: "ok" | "warning" | "error";
  issues: DoctorIssue[];
}

interface PublicStatus {
  status: string;
  legacyStatus?: string;
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

const legacyBulkMutationProviders: DiscoveryProvider[] = ["claude", "codex", "cursor"];

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

function normalizeBulkMutationSelector(
  selector: AgentScopeSelector | undefined,
): AgentScopeSelector {
  const normalized = normalizeSelector(selector);

  if (normalized.providers !== undefined) {
    return normalized;
  }

  return {
    ...normalized,
    providers: [...legacyBulkMutationProviders],
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

function itemIdentity(item: DiscoveryItem): ItemIdentity {
  return {
    provider: item.provider,
    kind: item.kind,
    id: item.id,
    layer: item.layer,
  };
}

function compareIdentity(left: ItemIdentity, right: ItemIdentity): number {
  return (
    left.provider.localeCompare(right.provider) ||
    left.kind.localeCompare(right.kind) ||
    left.layer.localeCompare(right.layer) ||
    left.id.localeCompare(right.id)
  );
}

function sortedIdentities(items: DiscoveryItem[]): ItemIdentity[] {
  return items.map(itemIdentity).sort(compareIdentity);
}

function sortBlockedActions(actions: BlockedAction[]): BlockedAction[] {
  return [...actions].sort((left, right) =>
    compareIdentity(itemIdentity(left.item), itemIdentity(right.item)),
  );
}

function sortPlannedActions(actions: PlannedAction[]): PlannedAction[] {
  return [...actions].sort((left, right) =>
    compareIdentity(itemIdentity(left.item), itemIdentity(right.item)),
  );
}

function reasonCode(reason: string): ContractReasonCode {
  const normalized = reason.toLowerCase();
  const prefix = normalized.includes(":") ? (normalized.split(":")[0] ?? normalized) : normalized;

  if (prefix === "already-in-desired-state") {
    return "already-in-desired-state";
  }

  if (prefix === "confirmation-required") {
    return "confirmation-required";
  }

  if (prefix === "empty-selection") {
    return "empty-selection";
  }

  if (prefix === "max-items-exceeded") {
    return "max-items-exceeded";
  }

  if (prefix === "plan-fingerprint-mismatch") {
    return "plan-fingerprint-mismatch";
  }

  if (prefix === "self-targeted-agentscope-mcp-blocked" || normalized.includes("control-plane")) {
    return "control-plane-protected";
  }

  if (prefix === "vault-conflict" || normalized.includes("conflict")) {
    return "conflicting";
  }

  if (
    prefix === "not-found" ||
    normalized.includes("not found") ||
    normalized.includes("unknown selection") ||
    normalized.includes("missing")
  ) {
    return "not-found";
  }

  if (prefix === "read-only" || normalized.includes("read-only")) {
    return "read-only";
  }

  if (prefix === "unsupported" || normalized.includes("unsupported")) {
    return "unsupported";
  }

  return "error";
}

function blockedItem(item: DiscoveryItem, reason: string): Record<string, unknown> {
  return {
    item: itemIdentity(item),
    reasonCode: reasonCode(reason),
    message: reason,
  };
}

function blockedItemDigest(item: DiscoveryItem, reason: string): Record<string, unknown> {
  return {
    item: itemIdentity(item),
    reasonCode: reasonCode(reason),
  };
}

function publicStatus(status: string): PublicStatus {
  if (status === "failed") {
    return {
      status: "blocked",
      legacyStatus: status,
    };
  }

  if (status === "no-op") {
    return {
      status: "noop",
      legacyStatus: status,
    };
  }

  return { status };
}

function selectionFromInput(input: SingleToggleInput): ItemIdentity {
  return {
    provider: input.provider,
    kind: input.kind,
    id: input.id,
    layer: input.layer,
  };
}

function singleBlockedResponse(
  input: SingleToggleInput,
  reason: string,
  warnings: unknown[] = [],
): Record<string, unknown> {
  const selection = selectionFromInput(input);

  return {
    status: "blocked",
    selection,
    applyMode: "re-resolve-on-apply",
    targetEnabled: input.targetEnabled,
    operations: [],
    affectedTargets: [],
    affectedPaths: [],
    blocked: {
      item: selection,
      reasonCode: reasonCode(reason),
      message: reason,
    },
    warnings,
    reason,
    reasonCode: reasonCode(reason),
    message: reason,
  };
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

function jsonPointer(pathSegments: Array<string | number>): string {
  return `/${pathSegments
    .map((segment) => String(segment).replaceAll("~", "~0").replaceAll("/", "~1"))
    .join("/")}`;
}

function operationPayload(
  operation: MutationOperation,
  includeLegacyFields: boolean,
): Record<string, unknown> {
  const legacy = normalizeValue(operation);
  const legacyFields =
    includeLegacyFields && typeof legacy === "object" && legacy !== null && !Array.isArray(legacy)
      ? (legacy as Record<string, unknown>)
      : {};

  switch (operation.type) {
    case "createFile":
      return {
        ...legacyFields,
        op: operation.type,
        path: operation.path,
        value: normalizeValue(operation.content),
      };
    case "replaceJsonValue":
      return {
        ...legacyFields,
        op: operation.type,
        path: operation.path,
        pointer: jsonPointer(operation.jsonPath),
        value: normalizeValue(operation.value),
      };
    case "updateJsonObjectEntry":
      return {
        ...legacyFields,
        op: operation.type,
        path: operation.path,
        key: operation.entryKey,
        pointer: jsonPointer(operation.jsonPath),
        value: normalizeValue(operation.value),
      };
    case "removeJsonObjectEntry":
      return {
        ...legacyFields,
        op: operation.type,
        path: operation.path,
        key: operation.entryKey,
        pointer: jsonPointer(operation.jsonPath),
      };
    case "renamePath":
      return {
        ...legacyFields,
        op: operation.type,
        from: operation.fromPath,
        to: operation.toPath,
      };
    case "deletePath":
      return {
        ...legacyFields,
        op: operation.type,
        path: operation.path,
      };
    case "replaceSqliteItemTableValue":
      return {
        ...legacyFields,
        op: operation.type,
        path: operation.databasePath,
        key: operation.keyValue,
        value: normalizeValue(operation.value),
      };
  }
}

function operationDigest(operation: MutationOperation): unknown {
  return normalizeValue(operationPayload(operation, false));
}

function targetSummary(target: MutationTarget): unknown {
  return normalizeValue(target);
}

function operationSummaries(operations: MutationOperation[]): unknown[] {
  return operations.map((operation) => operationPayload(operation, true));
}

function affectedTargetSummaries(targets: MutationTarget[]): unknown[] {
  return targets.map((target) => targetSummary(target));
}

function affectedPaths(targets: MutationTarget[]): string[] {
  return [
    ...new Set(
      targets.map((target) => (target.type === "path" ? target.path : target.databasePath)),
    ),
  ].sort((left, right) => left.localeCompare(right));
}

function executionSummary(
  result: ToggleExecutionResult,
  item?: DiscoveryItem,
  warnings: unknown[] = [],
): Record<string, unknown> {
  const status = publicStatus(result.status);
  const blocked =
    "reason" in result
      ? {
          item: result.selection,
          reasonCode: reasonCode(result.reason),
          message: result.reason,
        }
      : null;

  return {
    ...status,
    selection: result.selection,
    applyMode: "re-resolve-on-apply",
    ...(item === undefined ? {} : { item }),
    targetEnabled: result.targetEnabled,
    operations: operationSummaries(result.operations),
    affectedTargets: affectedTargetSummaries(result.affectedTargets),
    affectedPaths: affectedPaths(result.affectedTargets),
    blocked,
    warnings,
    ...("reason" in result ? { reason: result.reason } : {}),
    ...("reason" in result
      ? { reasonCode: reasonCode(result.reason), message: result.reason }
      : {}),
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
    reasonCode: reasonCode(reason),
    message: reason,
    ...extra,
  };
}

function planSummary(
  decision: TogglePlanDecision,
  item?: DiscoveryItem,
  warnings: unknown[] = [],
): Record<string, unknown> {
  if (decision.status === "blocked") {
    return {
      status: "blocked",
      selection: decision.selection,
      applyMode: "re-resolve-on-apply",
      ...(item === undefined ? {} : { item }),
      targetEnabled: decision.targetEnabled,
      operations: operationSummaries(decision.operations),
      affectedTargets: affectedTargetSummaries(decision.affectedTargets),
      affectedPaths: affectedPaths(decision.affectedTargets),
      blocked: {
        item: decision.selection,
        reasonCode: reasonCode(decision.reason),
        message: decision.reason,
      },
      warnings,
      reason: decision.reason,
      reasonCode: reasonCode(decision.reason),
      message: decision.reason,
    };
  }

  const status =
    decision.plan.operations.length === 0
      ? { status: "noop", legacyStatus: "planned" }
      : publicStatus("planned");

  return {
    ...status,
    selection: decision.plan.selection,
    applyMode: "re-resolve-on-apply",
    ...(item === undefined ? {} : { item }),
    targetEnabled: decision.plan.targetEnabled,
    operations: operationSummaries(decision.plan.operations),
    affectedTargets: affectedTargetSummaries(decision.plan.affectedTargets),
    affectedPaths: affectedPaths(decision.plan.affectedTargets),
    blocked: null,
    warnings,
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
  const selector = normalizeBulkMutationSelector(input.selector);
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

function filterItemsForInventory(
  discovery: DiscoveryResult,
  input: InventorySummaryInput | undefined,
): DiscoveryResult {
  if (input === undefined) {
    return discovery;
  }

  const filteredItems = discovery.items.filter((item) => {
    return (
      (input.providers === undefined || input.providers.includes(item.provider)) &&
      (input.layers === undefined || input.layers.includes(item.layer))
    );
  });
  const filteredWarnings = discovery.warnings.filter((warning) => {
    return (
      (input.providers === undefined || input.providers.includes(warning.provider)) &&
      (input.layers === undefined ||
        warning.layer === undefined ||
        input.layers.includes(warning.layer))
    );
  });

  return {
    items: filteredItems,
    warnings: filteredWarnings,
  };
}

function selectedProviderIds(
  options: AgentScopeMcpRuntimeOptions,
  input?: DoctorInput,
): DiscoveryProvider[] {
  return (
    input?.providers ?? (options.providers ?? defaultProviders()).map((provider) => provider.id)
  );
}

function issueProvider(issue: { providerId?: DiscoveryProvider }): DiscoveryProvider | "core" {
  return issue.providerId ?? "core";
}

function providerDoctorReports(
  providerIds: DiscoveryProvider[],
  issues: DoctorIssue[],
  issueStatus: "warning" | "error",
): ProviderDoctorReport[] {
  return providerIds.map((provider) => {
    const providerIssues = issues.filter(
      (issue) => issue.provider === provider || issue.provider === "core",
    );
    return {
      provider,
      status: providerIssues.length === 0 ? "ok" : issueStatus,
      issues: providerIssues,
    };
  });
}

function bulkPlanResponse(plan: BulkPlanState): Record<string, unknown> {
  const matchedItems = sortedIdentities(plan.matched);
  const actionableItems = sortPlannedActions(plan.actionable).map((entry) =>
    itemIdentity(entry.item),
  );
  const blockedItems = sortBlockedActions(plan.blocked).map((entry) =>
    blockedItem(entry.item, entry.reason),
  );
  const perItemPlans = sortPlannedActions(plan.actionable).map((entry) =>
    planSummary(entry.decision, entry.item),
  );

  if (plan.matched.length === 0 && plan.status === "blocked") {
    return blockedResponse("empty-selection", {
      selector: plan.selector,
      targetEnabled: plan.targetEnabled,
      matchedCount: 0,
      actionableCount: 0,
      blockedCount: 0,
      matchedItems: [],
      actionableItems: [],
      blockedItems: [],
      perItemPlans: [],
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
    applyMode: "fingerprint-required",
    matched: plan.matched,
    actionable: plan.actionable.map((entry) => planSummary(entry.decision, entry.item)),
    blocked: plan.blocked,
    matchedCount: plan.matched.length,
    actionableCount: plan.actionable.length,
    blockedCount: plan.blocked.length,
    matchedItems,
    actionableItems,
    blockedItems,
    perItemPlans,
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
    schemaVersion: 1,
    tool: "agentscope_plan_toggle_items",
    projectRoot,
    targetEnabled,
    selector,
    matchedItems: sortedIdentities(plan.matched),
    actionableItems: sortPlannedActions(plan.actionable).map((entry) => itemIdentity(entry.item)),
    blockedItems: sortBlockedActions(plan.blocked).map((entry) =>
      blockedItemDigest(entry.item, entry.reason),
    ),
    perItemOperationDigests: sortPlannedActions(plan.actionable).map((entry) => ({
      selection: itemIdentity(entry.item),
      operations: entry.decision.plan.operations.map((operation) => operationDigest(operation)),
    })),
  });
  const digest = createHash("sha256").update(JSON.stringify(payload)).digest("hex");

  return `sha256:${digest}`;
}

export function getInventorySummary(
  options: AgentScopeMcpRuntimeOptions,
  input?: InventorySummaryInput,
): Record<string, unknown> {
  const runtime = context(options);
  const filtered = filterItemsForInventory(runtime.discovery, input);
  const summary = buildDiscoveryInventorySummary(filtered.items, filtered.warnings);

  return {
    status: "ok",
    projectRoot: runtime.config.projectRoot,
    inventory: {
      providers:
        input?.providers === undefined
          ? summary.providers
          : summary.providers.filter((provider) => input.providers?.includes(provider.provider)),
    },
    warnings: filtered.warnings,
  };
}

export function listItems(
  options: AgentScopeMcpRuntimeOptions,
  selector: AgentScopeSelector | undefined,
  limit?: ListBackupsInput["limit"],
): Record<string, unknown> {
  const runtime = context(options);
  const normalizedSelector = normalizeSelector(selector);
  const matchedItems = runtime.discovery.items.filter((item) =>
    matchesSelector(item, normalizedSelector),
  );

  return {
    status: "ok",
    selector: normalizedSelector,
    totalMatched: matchedItems.length,
    items: limit === undefined ? matchedItems : matchedItems.slice(0, limit),
    warnings: runtime.discovery.warnings,
  };
}

export function runDoctorStructured(
  options: AgentScopeMcpRuntimeOptions,
  input?: DoctorInput,
): Record<string, unknown> {
  const providerIds = selectedProviderIds(options, input);
  const matrixReport = validateCapabilityMatrix(options.fixturesRoot);
  const selectedMatrixIssues = matrixReport.issues.filter(
    (issue) => issue.providerId === undefined || providerIds.includes(issue.providerId),
  );
  if (selectedMatrixIssues.length > 0) {
    const issues = selectedMatrixIssues.map((issue) => ({
      provider: issueProvider(issue),
      code: "CAPABILITY_MATRIX_INVALID",
      message: issue.message,
      ...(issue.field === undefined ? {} : { itemId: issue.field }),
    }));

    return {
      status: "error",
      packageRoot: options.packageRoot,
      fixturesRoot: options.fixturesRoot,
      capabilityMatrixIssues: selectedMatrixIssues,
      fixtureIssues: [],
      providers: providerDoctorReports(providerIds, issues, "error"),
      warnings: [],
    };
  }

  const report = validateProviderFixtures(options.fixturesRoot);
  const selectedFixtureIssues = report.issues.filter((issue) =>
    providerIds.includes(issue.providerId),
  );
  if (selectedFixtureIssues.length > 0) {
    const issues = selectedFixtureIssues.map((issue) => ({
      provider: issue.providerId,
      code: "PROVIDER_FIXTURE_INVALID",
      message: issue.message,
      itemId: issue.relativePath,
    }));

    return {
      status: "error",
      packageRoot: options.packageRoot,
      fixturesRoot: options.fixturesRoot,
      fixtureIssues: selectedFixtureIssues,
      providers: providerDoctorReports(providerIds, issues, "error"),
      warnings: [],
    };
  }

  const runtime = context(options);
  const providerReports = providerIds.map((provider) => {
    const issues = runtime.discovery.warnings.filter((warning) => warning.provider === provider);
    return {
      provider,
      status: issues.length === 0 ? "ok" : "warning",
      issues,
    };
  });
  const filteredWarnings = runtime.discovery.warnings.filter((warning) =>
    providerIds.includes(warning.provider),
  );
  const filteredItems = runtime.discovery.items.filter((item) =>
    providerIds.includes(item.provider),
  );

  return {
    status: filteredWarnings.length === 0 ? "ok" : "warning",
    packageRoot: options.packageRoot,
    fixturesRoot: options.fixturesRoot,
    projectRoot: runtime.config.projectRoot,
    cursorRoot: runtime.config.cursorRoot,
    itemsDiscovered: filteredItems.length,
    providers: providerReports,
    warnings: filteredWarnings,
  };
}

export function planSingleToggle(
  options: AgentScopeMcpRuntimeOptions,
  input: SingleToggleInput,
): Record<string, unknown> {
  const runtime = context(options);
  const item = selectedItem(input, runtime);
  if (typeof item === "string") {
    return singleBlockedResponse(input, item, runtime.discovery.warnings);
  }

  return planSummary(
    planForItem(item, input.targetEnabled, runtime),
    item,
    runtime.discovery.warnings,
  );
}

export function applySingleToggle(
  options: AgentScopeMcpRuntimeOptions,
  input: SingleToggleInput & ConfirmationInput,
): Record<string, unknown> {
  if (!hasConfirmed(input)) {
    return singleBlockedResponse(input, "confirmation-required");
  }

  const runtime = context(options);
  const item = selectedItem(input, runtime);
  if (typeof item === "string") {
    return singleBlockedResponse(input, item, runtime.discovery.warnings);
  }

  return executionSummary(
    executeTogglePlan(
      planForItem(item, input.targetEnabled, runtime),
      mutationOptions(options, runtime.config),
      true,
    ),
    item,
    runtime.discovery.warnings,
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
      currentPlanFingerprint: plan.planFingerprint,
    });
  }
  const executed = plan.actionable.map((entry) => ({
    item: entry.item,
    result: executionSummary(
      executeTogglePlan(entry.decision, mutationOptions(options, runtime.config), true),
      entry.item,
      runtime.discovery.warnings,
    ),
  }));
  const results = executed.map((entry) => entry.result);
  const backupIds = [
    ...new Set(
      results.flatMap((result) => {
        const backupId = result.backupId;
        return typeof backupId === "string" ? [backupId] : [];
      }),
    ),
  ];
  const applyBlockedItems = executed
    .filter((entry) => entry.result.status === "blocked")
    .map((entry) => ({
      item: itemIdentity(entry.item),
      reasonCode:
        typeof entry.result.reasonCode === "string" ? entry.result.reasonCode : reasonCode("error"),
      message: typeof entry.result.message === "string" ? entry.result.message : "blocked",
    }));
  const planBlockedItems = sortBlockedActions(plan.blocked).map((entry) =>
    blockedItem(entry.item, entry.reason),
  );
  const blockedItems = [...planBlockedItems, ...applyBlockedItems].sort((left, right) =>
    compareIdentity(left.item as ItemIdentity, right.item as ItemIdentity),
  );
  const legacyBlocked = [
    ...plan.blocked,
    ...executed
      .filter((entry) => entry.result.status === "blocked")
      .map((entry) => ({
        item: entry.item,
        reason:
          typeof entry.result.reason === "string"
            ? entry.result.reason
            : typeof entry.result.message === "string"
              ? entry.result.message
              : "blocked",
      })),
  ];
  const appliedCount = results.filter((result) => result.status === "applied").length;
  const noopCount = results.filter((result) => result.status === "noop").length;
  const blockedCount = blockedItems.length;
  const aggregateStatus =
    appliedCount > 0 ? "applied" : blockedCount > 0 ? "blocked" : publicStatus("no-op").status;

  return {
    status: aggregateStatus,
    selector: plan.selector,
    targetEnabled: input.targetEnabled,
    applyMode: "fingerprint-required",
    planFingerprint: plan.planFingerprint,
    matchedCount: plan.matched.length,
    appliedCount,
    noopCount,
    blockedCount,
    backupIds,
    results,
    matchedItems: sortedIdentities(plan.matched),
    actionableItems: sortPlannedActions(plan.actionable).map((entry) => itemIdentity(entry.item)),
    blocked: legacyBlocked,
    blockedItems,
    warnings: runtime.discovery.warnings,
  };
}

export function listBackups(
  options: AgentScopeMcpRuntimeOptions,
  limit?: ListBackupsInput["limit"],
): Record<string, unknown> {
  const runtime = context(options);
  const backups = listBackupManifests(runtime.config.appStateRoot).map((manifest) =>
    backupSummary(manifest),
  );

  return {
    status: "ok",
    totalBackups: backups.length,
    backups: limit === undefined ? backups : backups.slice(0, limit),
  };
}

export function restoreBackup(
  options: AgentScopeMcpRuntimeOptions,
  input: RestoreBackupInput,
  restore: (
    backupId: string,
    options: ReturnType<typeof mutationOptions>,
  ) => RestoreExecutionResult,
): Record<string, unknown> {
  if (!hasConfirmed(input)) {
    return blockedResponse("confirmation-required");
  }

  const runtime = context(options);
  const result = restore(input.backupId, mutationOptions(options, runtime.config));
  const status = publicStatus(result.status);

  return {
    ...status,
    backupId: result.backupId,
    affectedTargets: affectedTargetSummaries(result.affectedTargets),
    affectedPaths: affectedPaths(result.affectedTargets),
    restoredPaths: affectedPaths(result.affectedTargets),
    warnings: [],
    ...("reason" in result ? { reason: result.reason } : {}),
    ...("reason" in result
      ? { reasonCode: reasonCode(result.reason), message: result.reason }
      : {}),
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
