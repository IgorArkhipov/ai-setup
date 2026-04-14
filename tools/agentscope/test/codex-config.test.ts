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

  it("ignores header-like lines inside multiline strings", () => {
    const parsed = parseCodexConfig(`
[mcp_servers.github]
enabled = true
display_name = "GitHub"

[profiles.example]
banner = """
[mcp_servers.fake]
[plugins.fake]
"""

[plugins.safe-shell]
enabled = true
name = "Safe Shell"
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
          enabled: true,
          displayName: "GitHub",
        },
      ],
    });
  });

  it("ignores header-like lines inside literal multiline strings", () => {
    const parsed = parseCodexConfig(`
[mcp_servers.github]
enabled = true

[profiles.example]
banner = '''
[mcp_servers.fake]
[plugins.fake]
'''

[plugins.safe-shell]
enabled = true
`);

    expect(parsed).toEqual({
      plugins: [
        {
          id: "safe-shell",
          enabled: true,
        },
      ],
      mcpServers: [
        {
          id: "github",
          enabled: true,
        },
      ],
    });
  });

  it("ignores array-of-tables headers outside the supported Codex sections", () => {
    const parsed = parseCodexConfig(`
[mcp_servers.github]
enabled = true

[[profiles.example]]
label = "first"

[plugins.safe-shell]
enabled = true
`);

    expect(parsed).toEqual({
      plugins: [
        {
          id: "safe-shell",
          enabled: true,
        },
      ],
      mcpServers: [
        {
          id: "github",
          enabled: true,
        },
      ],
    });
  });
});
