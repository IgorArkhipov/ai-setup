import { describe, expect, it } from "vitest";
import { parseCodexConfig } from "../src/providers/codex.js";

describe("parseCodexConfig", () => {
  it("parses plugin and mcp section headers", () => {
    const parsed = parseCodexConfig(`
[plugins.safe-shell]
enabled = true
name = "Safe Shell"

[mcp_servers.github]
enabled = false
display_name = "GitHub"
`);

    expect(parsed).toEqual({
      plugins: [
        {
          id: "safe-shell",
          enabled: true,
          displayName: "Safe Shell",
        },
      ],
      mcpServers: [
        {
          id: "github",
          enabled: false,
          displayName: "GitHub",
        },
      ],
    });
  });

  it("rejects malformed section headers", () => {
    expect(() =>
      parseCodexConfig(`
[plugins]
enabled = true
`),
    ).toThrow("line 2 must use [plugins.<id>] or [mcp_servers.<id>]");
  });

  it("allows files with missing optional sections", () => {
    expect(
      parseCodexConfig(`
[plugins.safe-shell]
enabled = true
`),
    ).toEqual({
      plugins: [
        {
          id: "safe-shell",
          enabled: true,
        },
      ],
      mcpServers: [],
    });
  });
});
