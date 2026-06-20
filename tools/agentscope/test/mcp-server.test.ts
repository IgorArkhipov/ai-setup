import { createHash } from "node:crypto";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, describe, expect, it } from "vitest";
import type { ProviderModule } from "../src/core/discovery.js";
import { captureSourceFingerprints } from "../src/core/mutation-io.js";
import { toSelectedItemIdentity } from "../src/core/mutation-models.js";
import { AGENTSCOPE_MCP_TOOL_NAMES, createAgentScopeMcpServer } from "../src/mcp/server.js";
import type { AgentScopeMcpOptions } from "../src/mcp/tools.js";
import { fakeToggleProvider } from "./support/fake-toggle-provider.js";
import { createMutationSandbox, type MutationSandbox } from "./support/mutation-sandbox.js";

const packageRoot = path.resolve(import.meta.dirname, "..");
const fixturesRoot = path.join(packageRoot, "test", "fixtures");
const runtimeRoot = path.join(fixturesRoot, "runtime");
const sandboxes: MutationSandbox[] = [];
const tempDirs: string[] = [];

const modernSurfaceProvider: ProviderModule = {
  id: "claude",
  discover() {
    return {
      items: [
        {
          provider: "claude",
          kind: "agent",
          category: "agent",
          layer: "global",
          id: "claude:global:agent:reviewer",
          displayName: "reviewer",
          enabled: true,
          mutability: "read-only",
          sourcePath: path.join(runtimeRoot, "home", ".claude", "agents", "reviewer.md"),
          statePath: path.join(runtimeRoot, "home", ".claude", "agents", "reviewer.md"),
        },
      ],
      warnings: [],
    };
  },
};

const selfTargetProvider: ProviderModule = {
  id: "codex",
  discover(input) {
    const sourcePath = path.join(input.config.projectRoot, ".codex", "config.toml");

    return {
      items: [
        {
          provider: "codex",
          kind: "mcp",
          category: "configured-mcp",
          layer: "project",
          id: "codex:project:mcp:agentscope",
          displayName: "AgentScope MCP",
          enabled: true,
          mutability: "read-write",
          sourcePath,
          statePath: sourcePath,
        },
      ],
      warnings: [],
    };
  },
};

const conflictProvider: ProviderModule = {
  id: "codex",
  discover(input) {
    const sourcePath = path.join(input.config.projectRoot, ".codex", "config.toml");

    return {
      items: [
        {
          provider: "codex",
          kind: "plugin",
          category: "tool",
          layer: "project",
          id: "codex:project:tool:conflict",
          displayName: "Conflict",
          enabled: true,
          mutability: "read-write",
          sourcePath,
          statePath: sourcePath,
        },
      ],
      warnings: [],
    };
  },
  planToggle(input) {
    return {
      status: "blocked",
      selection: {
        provider: input.item.provider,
        kind: input.item.kind,
        layer: input.item.layer,
        id: input.item.id,
        displayName: input.item.displayName,
        enabled: input.item.enabled,
        mutability: input.item.mutability,
        sourcePath: input.item.sourcePath,
        statePath: input.item.statePath,
      },
      targetEnabled: input.targetEnabled,
      operations: [],
      affectedTargets: [],
      reason: "vault-conflict: item is vaulted by AgentScope",
    };
  },
};

const failingApplyProvider: ProviderModule = {
  id: "codex",
  discover(input) {
    const statePath = path.join(input.config.projectRoot, "failed-apply.json");

    return {
      items: [
        {
          provider: "codex",
          kind: "plugin",
          category: "tool",
          layer: "project",
          id: "codex:project:tool:apply-fails",
          displayName: "Apply Fails",
          enabled: false,
          mutability: "read-write",
          sourcePath: statePath,
          statePath,
        },
      ],
      warnings: [],
    };
  },
  planToggle(input) {
    const target = {
      type: "path" as const,
      path: path.join(input.config.projectRoot, "failed-apply.json"),
    };

    return {
      status: "planned",
      plan: {
        selection: toSelectedItemIdentity(input.item),
        targetEnabled: input.targetEnabled,
        operations: [
          {
            type: "replaceJsonValue",
            path: target.path,
            jsonPath: ["missing", "enabled"],
            value: true,
          },
        ],
        affectedTargets: [target],
        sourceFingerprints: captureSourceFingerprints([target]),
      },
    };
  },
};

const emptyPlanProvider: ProviderModule = {
  id: "codex",
  discover(input) {
    const sourcePath = path.join(input.config.projectRoot, "empty-plan.json");

    return {
      items: [
        {
          provider: "codex",
          kind: "plugin",
          category: "tool",
          layer: "project",
          id: "codex:project:tool:empty-plan",
          displayName: "Empty Plan",
          enabled: true,
          mutability: "read-write",
          sourcePath,
          statePath: sourcePath,
        },
      ],
      warnings: [],
    };
  },
  planToggle(input) {
    return {
      status: "planned",
      plan: {
        selection: toSelectedItemIdentity(input.item),
        targetEnabled: input.targetEnabled,
        operations: [],
        affectedTargets: [],
        sourceFingerprints: [],
      },
    };
  },
};

afterEach(() => {
  while (sandboxes.length > 0) {
    sandboxes.pop()?.cleanup();
  }

  while (tempDirs.length > 0) {
    const target = tempDirs.pop();
    if (target !== undefined) {
      rmSync(target, { recursive: true, force: true });
    }
  }
});

function copyFixturesWithCapabilityMatrixMutation(
  mutate: (matrix: { providers: Record<string, Record<string, unknown>> }) => void,
): string {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), "agentscope-fixtures-"));
  tempDirs.push(tempRoot);
  cpSync(fixturesRoot, tempRoot, { recursive: true });
  const matrixPath = path.join(tempRoot, "capability-matrix.json");
  const matrix = JSON.parse(readFileSync(matrixPath, "utf8")) as {
    providers: Record<string, Record<string, unknown>>;
  };
  mutate(matrix);
  writeFileSync(matrixPath, `${JSON.stringify(matrix, null, 2)}\n`, "utf8");
  return tempRoot;
}

async function connectMcp(options: Partial<AgentScopeMcpOptions> = {}) {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createAgentScopeMcpServer({
    packageRoot,
    fixturesRoot,
    cwd: runtimeRoot,
    homeDir: path.join(runtimeRoot, "home"),
    projectRoot: path.join(runtimeRoot, "project"),
    appStateRoot: path.join(runtimeRoot, "app-state"),
    cursorRoot: path.join(runtimeRoot, "cursor", "User"),
    ...options,
  });
  const client = new Client({ name: "agentscope-test-client", version: "0.0.0" });

  await server.connect(serverTransport);
  await client.connect(clientTransport);

  return {
    client,
    async close() {
      await client.close();
      await server.close();
    },
  };
}

async function callStructured<T>(
  client: Client,
  name: string,
  args: Record<string, unknown> = {},
): Promise<T> {
  const result = await client.callTool({ name, arguments: args });
  if (!("structuredContent" in result)) {
    throw new Error(`tool ${name} did not return structuredContent`);
  }

  return result.structuredContent as T;
}

function normalizeForFingerprint(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => normalizeForFingerprint(entry));
  }

  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, normalizeForFingerprint(entry)]),
    );
  }

  return value;
}

function fingerprintPayload(value: unknown): string {
  return `sha256:${createHash("sha256")
    .update(JSON.stringify(normalizeForFingerprint(value)))
    .digest("hex")}`;
}

function operationDigestFromPayload(operation: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    ["op", "path", "from", "to", "key", "pointer", "value"]
      .filter((key) => key in operation)
      .map((key) => [key, operation[key]]),
  );
}

describe("agentscope MCP server", () => {
  it("lists the stable AgentScope tool surface", async () => {
    const session = await connectMcp();

    try {
      const tools = await session.client.listTools();
      expect(tools.tools.map((tool) => tool.name).sort()).toEqual(
        [...AGENTSCOPE_MCP_TOOL_NAMES].sort(),
      );
    } finally {
      await session.close();
    }
  });

  it("returns structured read-only inventory, item list, and doctor output", async () => {
    const session = await connectMcp();

    try {
      const summary = await callStructured<{
        status: string;
        projectRoot: string;
        inventory: { providers: Array<{ provider: string; totalAvailable: number }> };
      }>(session.client, "agentscope_get_inventory_summary", {
        providers: ["claude"],
        layers: ["project"],
      });
      expect(summary).toMatchObject({
        status: "ok",
        projectRoot: path.join(runtimeRoot, "project"),
      });
      expect(summary.inventory.providers).toEqual([
        expect.objectContaining({ provider: "claude", totalAvailable: expect.any(Number) }),
      ]);

      const listed = await callStructured<{
        status: string;
        totalMatched: number;
        items: Array<{ provider: string; layer: string; id: string }>;
        warnings: unknown[];
      }>(session.client, "agentscope_list_items", {
        selector: {
          providers: ["claude"],
          layers: ["project"],
        },
        limit: 1,
      });
      expect(listed).toMatchObject({ status: "ok", warnings: [] });
      expect(listed.totalMatched).toBeGreaterThan(listed.items.length);
      expect(listed.items).toHaveLength(1);
      expect(listed.items).toContainEqual(
        expect.objectContaining({
          provider: "claude",
          layer: "project",
          id: "claude:project:skill:example-claude-skill",
        }),
      );

      const doctor = await callStructured<{
        status: string;
        itemsDiscovered: number;
        providers: Array<{ provider: string; status: string; issues: unknown[] }>;
        warnings: unknown[];
      }>(session.client, "agentscope_run_doctor");
      expect(doctor).toMatchObject({
        status: "ok",
        itemsDiscovered: expect.any(Number),
        providers: expect.arrayContaining([
          expect.objectContaining({ provider: "claude", status: "ok", issues: [] }),
        ]),
        warnings: [],
      });

      const codexDoctor = await callStructured<{
        status: string;
        providers: Array<{ provider: string }>;
      }>(session.client, "agentscope_run_doctor", { providers: ["codex"] });
      expect(codexDoctor).toMatchObject({ status: "ok" });
      expect(codexDoctor.providers).toEqual([expect.objectContaining({ provider: "codex" })]);
    } finally {
      await session.close();
    }
  });

  it("returns structured capability matrix issues from MCP doctor output", async () => {
    const staleFixturesRoot = copyFixturesWithCapabilityMatrixMutation((matrix) => {
      delete matrix.providers.claude.agents;
    });
    const session = await connectMcp({ fixturesRoot: staleFixturesRoot });

    try {
      const doctor = await callStructured<{
        status: string;
        providers: Array<{ provider: string; status: string; issues: unknown[] }>;
        capabilityMatrixIssues: Array<{ providerId: string; field: string; message: string }>;
      }>(session.client, "agentscope_run_doctor");

      expect(doctor).toMatchObject({
        status: "error",
        providers: [
          expect.objectContaining({
            provider: "claude",
            status: "error",
            issues: [expect.objectContaining({ code: "CAPABILITY_MATRIX_INVALID" })],
          }),
          expect.objectContaining({ provider: "codex", status: "ok", issues: [] }),
          expect.objectContaining({ provider: "cursor", status: "ok", issues: [] }),
        ],
        capabilityMatrixIssues: [
          {
            providerId: "claude",
            field: "agents",
            message: "capability-matrix.json is missing claude.agents",
          },
        ],
      });

      const filteredDoctor = await callStructured<{
        status: string;
        providers: Array<{ provider: string; status: string; issues: unknown[] }>;
        capabilityMatrixIssues?: unknown[];
      }>(session.client, "agentscope_run_doctor", { providers: ["codex"] });
      expect(filteredDoctor).toMatchObject({
        status: "ok",
        providers: [expect.objectContaining({ provider: "codex", status: "ok", issues: [] })],
      });
      expect(filteredDoctor.capabilityMatrixIssues).toBeUndefined();
    } finally {
      await session.close();
    }
  });

  it("accepts modern surface selectors in structured MCP calls", async () => {
    const session = await connectMcp({ providers: [modernSurfaceProvider] });

    try {
      const listed = await callStructured<{
        status: string;
        items: Array<{ provider: string; kind: string; category: string; id: string }>;
      }>(session.client, "agentscope_list_items", {
        selector: {
          kinds: ["agent"],
          categories: ["agent"],
        },
      });

      expect(listed).toMatchObject({ status: "ok" });
      expect(listed.items).toEqual([
        expect.objectContaining({
          provider: "claude",
          kind: "agent",
          category: "agent",
          id: "claude:global:agent:reviewer",
        }),
      ]);
    } finally {
      await session.close();
    }
  });

  it("plans, applies, lists backups, and restores one selected item", async () => {
    const sandbox = createMutationSandbox();
    sandboxes.push(sandbox);
    const session = await connectMcp({
      cwd: sandbox.projectRoot,
      homeDir: sandbox.homeDir,
      projectRoot: sandbox.projectRoot,
      appStateRoot: sandbox.appStateRoot,
      cursorRoot: sandbox.cursorRoot,
      providers: [fakeToggleProvider],
      now: () => new Date("2026-05-17T12:00:00.000Z"),
      generateBackupId: () => "backup-mcp-single",
    });

    try {
      const selector = {
        provider: "codex",
        kind: "plugin",
        layer: "project",
        id: sandbox.ids.full,
        targetEnabled: true,
      };
      const plan = await callStructured<{
        status: string;
        applyMode: string;
        item: { id: string; enabled: boolean };
        blocked: null;
        warnings: unknown[];
        operations: Array<{ op: string }>;
      }>(session.client, "agentscope_plan_toggle_item", selector);
      expect(plan.status).toBe("planned");
      expect(plan.applyMode).toBe("re-resolve-on-apply");
      expect(plan.item).toMatchObject({ id: sandbox.ids.full, enabled: false });
      expect(plan.blocked).toBeNull();
      expect(plan.warnings).toEqual([]);
      expect(plan).toHaveProperty("affectedPaths");
      expect(plan.operations.length).toBeGreaterThan(0);
      expect(plan.operations[0]).toHaveProperty("op");
      expect(sandbox.listBackupIds()).toEqual([]);

      const unconfirmed = await callStructured<{ status: string; reason: string }>(
        session.client,
        "agentscope_apply_toggle_item",
        { ...selector, requireConfirmation: false },
      );
      expect(unconfirmed).toMatchObject({
        status: "blocked",
        reason: "confirmation-required",
      });
      expect(sandbox.listBackupIds()).toEqual([]);

      const applied = await callStructured<{
        status: string;
        applyMode: string;
        backupId: string;
        item: { id: string };
        blocked: null;
        warnings: unknown[];
      }>(session.client, "agentscope_apply_toggle_item", {
        ...selector,
        requireConfirmation: true,
      });
      expect(applied).toMatchObject({
        status: "applied",
        applyMode: "re-resolve-on-apply",
        backupId: "backup-mcp-single",
        item: { id: sandbox.ids.full },
        blocked: null,
        warnings: [],
      });

      expect(sandbox.listBackupIds()).toEqual(["backup-mcp-single"]);

      const backups = await callStructured<{
        status: string;
        totalBackups: number;
        backups: Array<{ backupId: string; itemCount: number; restorable: boolean }>;
      }>(session.client, "agentscope_list_backups", { limit: 1 });
      expect(backups.totalBackups).toBe(1);
      expect(backups.backups).toHaveLength(1);
      expect(backups.backups).toContainEqual(
        expect.objectContaining({
          backupId: "backup-mcp-single",
          itemCount: expect.any(Number),
          restorable: true,
        }),
      );

      const unconfirmedRestore = await callStructured<{ status: string; reasonCode: string }>(
        session.client,
        "agentscope_restore_backup",
        { backupId: "backup-mcp-single" },
      );
      expect(unconfirmedRestore).toMatchObject({
        status: "blocked",
        reasonCode: "confirmation-required",
      });

      const restored = await callStructured<{
        status: string;
        backupId: string;
        restoredPaths: string[];
        warnings: unknown[];
      }>(session.client, "agentscope_restore_backup", {
        backupId: "backup-mcp-single",
        requireConfirmation: true,
      });
      expect(restored).toEqual(
        expect.objectContaining({
          status: "restored",
          backupId: "backup-mcp-single",
          restoredPaths: expect.any(Array),
          warnings: [],
        }),
      );

      const missingRestore = await callStructured<{
        status: string;
        reasonCode: string;
        backupId: string;
      }>(session.client, "agentscope_restore_backup", {
        backupId: "missing-backup",
        requireConfirmation: true,
      });
      expect(missingRestore).toMatchObject({
        status: "blocked",
        backupId: "missing-backup",
        reasonCode: "not-found",
      });
    } finally {
      await session.close();
    }
  });

  it("plans and applies a bulk selector with a stable fingerprint", async () => {
    const sandbox = createMutationSandbox();
    sandboxes.push(sandbox);
    let backupSequence = 0;
    const nextBackupId = () => {
      backupSequence += 1;
      return `backup-mcp-bulk-${backupSequence.toString()}`;
    };
    const session = await connectMcp({
      cwd: sandbox.projectRoot,
      homeDir: sandbox.homeDir,
      projectRoot: sandbox.projectRoot,
      appStateRoot: sandbox.appStateRoot,
      cursorRoot: sandbox.cursorRoot,
      providers: [fakeToggleProvider],
      now: () => new Date("2026-05-17T12:30:00.000Z"),
      generateBackupId: nextBackupId,
    });

    try {
      const args = {
        selector: {
          providers: ["codex"],
          kinds: ["plugin"],
          ids: [sandbox.ids.full],
        },
        targetEnabled: true,
      };
      const plan = await callStructured<{
        status: string;
        planFingerprint: string;
        selector: Record<string, unknown>;
        targetEnabled: boolean;
        matchedCount: number;
        actionableCount: number;
        blockedCount: number;
        matchedItems: Array<Record<string, unknown>>;
        actionableItems: Array<Record<string, unknown>>;
        blockedItems: Array<Record<string, unknown>>;
        perItemPlans: Array<{ status: string; operations: Array<Record<string, unknown>> }>;
        matched: unknown[];
        actionable: unknown[];
        blocked: unknown[];
      }>(session.client, "agentscope_plan_toggle_items", args);
      expect(plan.status).toBe("planned");
      expect(plan.planFingerprint).toMatch(/^sha256:/);
      expect(plan.matchedCount).toBe(1);
      expect(plan.actionableCount).toBe(1);
      expect(plan.blockedCount).toBe(0);
      expect(plan.matchedItems).toHaveLength(1);
      expect(plan.actionableItems).toHaveLength(1);
      expect(plan.blockedItems).toEqual([]);
      expect(plan.perItemPlans[0]).toMatchObject({
        status: "planned",
      });
      expect(plan.perItemPlans[0]?.operations).toEqual(
        expect.arrayContaining([expect.objectContaining({ op: expect.any(String) })]),
      );
      expect(plan.planFingerprint).toBe(
        fingerprintPayload({
          schemaVersion: 1,
          tool: "agentscope_plan_toggle_items",
          projectRoot: sandbox.projectRoot,
          targetEnabled: plan.targetEnabled,
          selector: plan.selector,
          matchedItems: plan.matchedItems,
          actionableItems: plan.actionableItems,
          blockedItems: plan.blockedItems.map((entry) => ({
            item: entry.item,
            reasonCode: entry.reasonCode,
          })),
          perItemOperationDigests: [
            {
              selection: plan.actionableItems[0],
              operations:
                plan.perItemPlans[0]?.operations.map((operation) =>
                  operationDigestFromPayload(operation),
                ) ?? [],
            },
          ],
        }),
      );
      expect(plan.matched).toHaveLength(1);
      expect(plan.actionable).toHaveLength(1);
      expect(plan.blocked).toEqual([]);

      const applied = await callStructured<{
        status: string;
        planFingerprint: string;
        matchedCount: number;
        appliedCount: number;
        noopCount: number;
        blockedCount: number;
        backupIds: string[];
        blockedItems: unknown[];
        results: Array<{ status: string; backupId: string }>;
      }>(session.client, "agentscope_apply_toggle_items", {
        ...args,
        requireConfirmation: true,
        maxItems: 1,
        planFingerprint: plan.planFingerprint,
      });
      expect(applied).toMatchObject({
        status: "applied",
        planFingerprint: plan.planFingerprint,
        matchedCount: 1,
        appliedCount: 1,
        noopCount: 0,
        blockedCount: 0,
        backupIds: ["backup-mcp-bulk-1"],
        blockedItems: [],
      });
      expect(applied.results).toContainEqual(
        expect.objectContaining({
          status: "applied",
          backupId: "backup-mcp-bulk-1",
        }),
      );
    } finally {
      await session.close();
    }
  });

  it("normalizes public blocked reason codes for protected and conflicting selections", async () => {
    const session = await connectMcp({ providers: [selfTargetProvider] });

    try {
      const protectedPlan = await callStructured<{
        status: string;
        reasonCode: string;
        blocked: { reasonCode: string };
      }>(session.client, "agentscope_plan_toggle_item", {
        provider: "codex",
        kind: "mcp",
        layer: "project",
        id: "codex:project:mcp:agentscope",
        targetEnabled: false,
      });
      expect(protectedPlan).toMatchObject({
        status: "blocked",
        reason: "self-targeted-agentscope-mcp-blocked",
        reasonCode: "control-plane-protected",
        blocked: { reasonCode: "control-plane-protected" },
      });
    } finally {
      await session.close();
    }

    const conflictSession = await connectMcp({ providers: [conflictProvider] });

    try {
      const conflictPlan = await callStructured<{
        status: string;
        reasonCode: string;
        blocked: { reasonCode: string };
      }>(conflictSession.client, "agentscope_plan_toggle_item", {
        provider: "codex",
        kind: "plugin",
        layer: "project",
        id: "codex:project:tool:conflict",
        targetEnabled: false,
      });
      expect(conflictPlan).toMatchObject({
        status: "blocked",
        reasonCode: "conflicting",
        blocked: { reasonCode: "conflicting" },
      });
    } finally {
      await conflictSession.close();
    }
  });

  it("normalizes empty single-item plans and applies to public noop status", async () => {
    const session = await connectMcp({ providers: [emptyPlanProvider] });
    const selector = {
      provider: "codex",
      kind: "plugin",
      layer: "project",
      id: "codex:project:tool:empty-plan",
      targetEnabled: true,
    };

    try {
      const noopPlan = await callStructured<{
        status: string;
        legacyStatus: string;
        affectedPaths: string[];
      }>(session.client, "agentscope_plan_toggle_item", selector);
      expect(noopPlan).toMatchObject({
        status: "noop",
        legacyStatus: "planned",
        affectedPaths: [],
      });

      const noopApply = await callStructured<{ status: string; legacyStatus: string }>(
        session.client,
        "agentscope_apply_toggle_item",
        { ...selector, requireConfirmation: true },
      );
      expect(noopApply).toMatchObject({
        status: "noop",
        legacyStatus: "no-op",
      });
    } finally {
      await session.close();
    }
  });

  it("returns single-item review shape for missing selections", async () => {
    const session = await connectMcp();

    try {
      const missing = await callStructured<{
        status: string;
        selection: { id: string };
        applyMode: string;
        reasonCode: string;
        blocked: { reasonCode: string };
        affectedPaths: string[];
        warnings: unknown[];
      }>(session.client, "agentscope_plan_toggle_item", {
        provider: "codex",
        kind: "plugin",
        layer: "project",
        id: "missing-item",
        targetEnabled: true,
      });
      expect(missing).toMatchObject({
        status: "blocked",
        selection: { id: "missing-item" },
        applyMode: "re-resolve-on-apply",
        reasonCode: "not-found",
        blocked: { reasonCode: "not-found" },
        affectedPaths: [],
        warnings: [],
      });
    } finally {
      await session.close();
    }
  });

  it("includes apply-time blocked results in bulk apply aggregates", async () => {
    const sandbox = createMutationSandbox();
    sandboxes.push(sandbox);
    writeFileSync(path.join(sandbox.projectRoot, "failed-apply.json"), "{}\n");
    const session = await connectMcp({
      cwd: sandbox.projectRoot,
      homeDir: sandbox.homeDir,
      projectRoot: sandbox.projectRoot,
      appStateRoot: sandbox.appStateRoot,
      cursorRoot: sandbox.cursorRoot,
      providers: [failingApplyProvider],
    });

    try {
      const args = {
        selector: {
          providers: ["codex"],
          kinds: ["plugin"],
          ids: ["codex:project:tool:apply-fails"],
        },
        targetEnabled: true,
      };
      const plan = await callStructured<{ planFingerprint: string }>(
        session.client,
        "agentscope_plan_toggle_items",
        args,
      );
      const applied = await callStructured<{
        status: string;
        appliedCount: number;
        noopCount: number;
        blockedCount: number;
        blockedItems: Array<{ reasonCode: string }>;
        results: Array<{ status: string; reasonCode: string }>;
      }>(session.client, "agentscope_apply_toggle_items", {
        ...args,
        planFingerprint: plan.planFingerprint,
        requireConfirmation: true,
        maxItems: 1,
      });
      expect(applied).toMatchObject({
        status: "blocked",
        appliedCount: 0,
        noopCount: 0,
        blockedCount: 1,
        blockedItems: [expect.objectContaining({ reasonCode: "not-found" })],
        results: [expect.objectContaining({ status: "blocked", reasonCode: "not-found" })],
      });
    } finally {
      await session.close();
    }
  });

  it("blocks bulk apply on fingerprint mismatch, missing confirmation, maxItems, and empty selections", async () => {
    const sandbox = createMutationSandbox();
    sandboxes.push(sandbox);
    const session = await connectMcp({
      cwd: sandbox.projectRoot,
      homeDir: sandbox.homeDir,
      projectRoot: sandbox.projectRoot,
      appStateRoot: sandbox.appStateRoot,
      cursorRoot: sandbox.cursorRoot,
      providers: [fakeToggleProvider],
    });

    try {
      const args = {
        selector: {
          providers: ["codex"],
          kinds: ["plugin"],
          ids: [sandbox.ids.full],
        },
        targetEnabled: true,
      };
      const plan = await callStructured<{ planFingerprint: string }>(
        session.client,
        "agentscope_plan_toggle_items",
        args,
      );

      const unconfirmed = await callStructured<{ status: string; reason: string }>(
        session.client,
        "agentscope_apply_toggle_items",
        {
          ...args,
          maxItems: 1,
          planFingerprint: plan.planFingerprint,
          requireConfirmation: false,
        },
      );
      expect(unconfirmed).toMatchObject({
        status: "blocked",
        reason: "confirmation-required",
      });

      const mismatch = await callStructured<{
        status: string;
        reason: string;
        reasonCode: string;
        currentPlanFingerprint: string;
      }>(session.client, "agentscope_apply_toggle_items", {
        ...args,
        maxItems: 1,
        planFingerprint: "sha256:not-the-plan",
        requireConfirmation: true,
      });
      expect(mismatch).toMatchObject({
        status: "blocked",
        reason: "plan-fingerprint-mismatch",
        reasonCode: "plan-fingerprint-mismatch",
        currentPlanFingerprint: plan.planFingerprint,
      });

      const tooMany = await callStructured<{ status: string; reason: string }>(
        session.client,
        "agentscope_apply_toggle_items",
        {
          ...args,
          maxItems: 0,
          planFingerprint: plan.planFingerprint,
          requireConfirmation: true,
        },
      );
      expect(tooMany).toMatchObject({
        status: "blocked",
        reason: "max-items-exceeded",
      });

      const empty = await callStructured<{ status: string; reason: string }>(
        session.client,
        "agentscope_plan_toggle_items",
        {
          selector: {
            ids: ["missing"],
          },
          targetEnabled: true,
        },
      );
      expect(empty).toMatchObject({
        status: "blocked",
        reason: "empty-selection",
      });
      expect(sandbox.listBackupIds()).toEqual([]);
    } finally {
      await session.close();
    }
  });
});
