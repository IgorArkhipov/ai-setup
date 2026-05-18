import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, describe, expect, it } from "vitest";
import { AGENTSCOPE_MCP_TOOL_NAMES, createAgentScopeMcpServer } from "../src/mcp/server.js";
import type { AgentScopeMcpOptions } from "../src/mcp/tools.js";
import { fakeToggleProvider } from "./support/fake-toggle-provider.js";
import { createMutationSandbox, type MutationSandbox } from "./support/mutation-sandbox.js";

const packageRoot = path.resolve(import.meta.dirname, "..");
const fixturesRoot = path.join(packageRoot, "test", "fixtures");
const runtimeRoot = path.join(fixturesRoot, "runtime");
const sandboxes: MutationSandbox[] = [];

afterEach(() => {
  while (sandboxes.length > 0) {
    sandboxes.pop()?.cleanup();
  }
});

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
      }>(session.client, "agentscope_get_inventory_summary");
      expect(summary).toMatchObject({
        status: "ok",
        projectRoot: path.join(runtimeRoot, "project"),
      });
      expect(summary.inventory.providers).toContainEqual(
        expect.objectContaining({ provider: "claude", totalAvailable: expect.any(Number) }),
      );

      const listed = await callStructured<{
        status: string;
        items: Array<{ provider: string; layer: string; id: string }>;
        warnings: unknown[];
      }>(session.client, "agentscope_list_items", {
        selector: {
          providers: ["claude"],
          layers: ["project"],
        },
      });
      expect(listed).toMatchObject({ status: "ok", warnings: [] });
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
        warnings: unknown[];
      }>(session.client, "agentscope_run_doctor");
      expect(doctor).toMatchObject({
        status: "ok",
        itemsDiscovered: expect.any(Number),
        warnings: [],
      });
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
      const plan = await callStructured<{ status: string; operations: unknown[] }>(
        session.client,
        "agentscope_plan_toggle_item",
        selector,
      );
      expect(plan.status).toBe("planned");
      expect(plan.operations.length).toBeGreaterThan(0);
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

      const applied = await callStructured<{ status: string; backupId: string }>(
        session.client,
        "agentscope_apply_toggle_item",
        { ...selector, requireConfirmation: true },
      );
      expect(applied).toMatchObject({
        status: "applied",
        backupId: "backup-mcp-single",
      });
      expect(sandbox.listBackupIds()).toEqual(["backup-mcp-single"]);

      const backups = await callStructured<{
        status: string;
        backups: Array<{ backupId: string; itemCount: number; restorable: boolean }>;
      }>(session.client, "agentscope_list_backups");
      expect(backups.backups).toContainEqual(
        expect.objectContaining({
          backupId: "backup-mcp-single",
          itemCount: expect.any(Number),
          restorable: true,
        }),
      );

      const restored = await callStructured<{ status: string; backupId: string }>(
        session.client,
        "agentscope_restore_backup",
        { backupId: "backup-mcp-single" },
      );
      expect(restored).toEqual(
        expect.objectContaining({
          status: "restored",
          backupId: "backup-mcp-single",
        }),
      );
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
        matched: unknown[];
        actionable: unknown[];
        blocked: unknown[];
      }>(session.client, "agentscope_plan_toggle_items", args);
      expect(plan.status).toBe("planned");
      expect(plan.planFingerprint).toMatch(/^sha256:/);
      expect(plan.matched).toHaveLength(1);
      expect(plan.actionable).toHaveLength(1);
      expect(plan.blocked).toEqual([]);

      const applied = await callStructured<{
        status: string;
        planFingerprint: string;
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

      const mismatch = await callStructured<{ status: string; reason: string }>(
        session.client,
        "agentscope_apply_toggle_items",
        {
          ...args,
          maxItems: 1,
          planFingerprint: "sha256:not-the-plan",
          requireConfirmation: true,
        },
      );
      expect(mismatch).toMatchObject({
        status: "blocked",
        reason: "plan-fingerprint-mismatch",
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
