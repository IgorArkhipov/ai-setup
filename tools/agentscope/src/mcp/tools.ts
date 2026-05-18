import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { restoreBackupById } from "../core/mutation-engine.js";
import {
  type AgentScopeMcpRuntimeOptions,
  applyBulkToggle,
  applySingleToggle,
  getInventorySummary,
  listBackups,
  listItems,
  planBulkToggle,
  planSingleToggle,
  restoreBackup,
  runDoctorStructured,
} from "./helpers.js";
import {
  bulkApplyInputSchema,
  bulkPlanInputSchema,
  listItemsInputSchema,
  restoreBackupInputSchema,
  singleApplyInputSchema,
  singleToggleInputSchema,
} from "./schemas.js";

export interface AgentScopeMcpOptions extends AgentScopeMcpRuntimeOptions {}

function structuredResult(value: Record<string, unknown>) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(value, null, 2),
      },
    ],
    structuredContent: value,
  };
}

export function registerAgentScopeTools(server: McpServer, options: AgentScopeMcpOptions): void {
  server.registerTool(
    "agentscope_get_inventory_summary",
    {
      title: "Get AgentScope inventory summary",
      description: "Return structured provider inventory counts and discovery warnings.",
      annotations: { readOnlyHint: true },
    },
    async () => structuredResult(getInventorySummary(options)),
  );

  server.registerTool(
    "agentscope_list_items",
    {
      title: "List AgentScope items",
      description: "List discovered AgentScope provider items with optional selector filters.",
      inputSchema: listItemsInputSchema,
      annotations: { readOnlyHint: true },
    },
    async ({ selector }) => structuredResult(listItems(options, selector)),
  );

  server.registerTool(
    "agentscope_plan_toggle_item",
    {
      title: "Plan one AgentScope item toggle",
      description: "Plan a reversible toggle for one selected provider item without writing.",
      inputSchema: singleToggleInputSchema,
      annotations: { readOnlyHint: true },
    },
    async (input) => structuredResult(planSingleToggle(options, input)),
  );

  server.registerTool(
    "agentscope_apply_toggle_item",
    {
      title: "Apply one AgentScope item toggle",
      description: "Apply a planned toggle for one selected provider item after confirmation.",
      inputSchema: singleApplyInputSchema,
      annotations: {
        destructiveHint: true,
        idempotentHint: false,
      },
    },
    async (input) => structuredResult(applySingleToggle(options, input)),
  );

  server.registerTool(
    "agentscope_plan_toggle_items",
    {
      title: "Plan AgentScope item toggles",
      description: "Plan a bulk selector toggle and return a stable review fingerprint.",
      inputSchema: bulkPlanInputSchema,
      annotations: { readOnlyHint: true },
    },
    async (input) => structuredResult(planBulkToggle(options, input)),
  );

  server.registerTool(
    "agentscope_apply_toggle_items",
    {
      title: "Apply AgentScope item toggles",
      description: "Apply a reviewed bulk toggle plan after confirmation and fingerprint check.",
      inputSchema: bulkApplyInputSchema,
      annotations: {
        destructiveHint: true,
        idempotentHint: false,
      },
    },
    async (input) => structuredResult(applyBulkToggle(options, input)),
  );

  server.registerTool(
    "agentscope_list_backups",
    {
      title: "List AgentScope backups",
      description: "List recent AgentScope mutation backups from local app state.",
      annotations: { readOnlyHint: true },
    },
    async () => structuredResult(listBackups(options)),
  );

  server.registerTool(
    "agentscope_restore_backup",
    {
      title: "Restore AgentScope backup",
      description: "Restore one backup id through the existing AgentScope restore path.",
      inputSchema: restoreBackupInputSchema,
      annotations: {
        destructiveHint: true,
        idempotentHint: false,
      },
    },
    async ({ backupId }) => structuredResult(restoreBackup(options, backupId, restoreBackupById)),
  );

  server.registerTool(
    "agentscope_run_doctor",
    {
      title: "Run AgentScope doctor",
      description: "Return structured fixture and provider discovery health output.",
      annotations: { readOnlyHint: true },
    },
    async () => structuredResult(runDoctorStructured(options)),
  );
}
