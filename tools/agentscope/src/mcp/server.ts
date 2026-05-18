import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { type AgentScopeMcpOptions, registerAgentScopeTools } from "./tools.js";

export const AGENTSCOPE_MCP_TOOL_NAMES = [
  "agentscope_get_inventory_summary",
  "agentscope_list_items",
  "agentscope_plan_toggle_item",
  "agentscope_apply_toggle_item",
  "agentscope_plan_toggle_items",
  "agentscope_apply_toggle_items",
  "agentscope_list_backups",
  "agentscope_restore_backup",
  "agentscope_run_doctor",
] as const;

export function createAgentScopeMcpServer(options: AgentScopeMcpOptions): McpServer {
  const server = new McpServer({
    name: "agentscope",
    version: "0.1.0",
  });

  registerAgentScopeTools(server, options);

  return server;
}

export async function runAgentScopeMcpStdio(options: AgentScopeMcpOptions): Promise<void> {
  const server = createAgentScopeMcpServer(options);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
