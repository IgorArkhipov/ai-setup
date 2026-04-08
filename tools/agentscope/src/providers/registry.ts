import { readFileSync } from "node:fs";
import path from "node:path";

export type ProviderId = "claude" | "codex" | "cursor";
export type CapabilityStatus =
  | "verified"
  | "read-only"
  | "unsupported"
  | "needs-verification";

export interface CapabilityMatrix {
  version: 1;
  providers: Record<
    ProviderId,
    {
      skills: CapabilityStatus;
      configuredMcps: CapabilityStatus;
      tools: CapabilityStatus;
    }
  >;
  notes: Record<ProviderId, string>;
}

export interface ProviderFixtureSpec {
  relativePath: string;
  description: string;
  validate(raw: string): string[];
}

export interface ProviderDescriptor {
  id: ProviderId;
  name: string;
  fixtures: ProviderFixtureSpec[];
}

export interface FixtureValidationIssue {
  providerId: ProviderId;
  relativePath: string;
  message: string;
}

export interface FixtureValidationReport {
  checkedFiles: string[];
  issues: FixtureValidationIssue[];
}

const capabilityStatuses = new Set<CapabilityStatus>([
  "verified",
  "read-only",
  "unsupported",
  "needs-verification",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCapabilityStatus(value: unknown): value is CapabilityStatus {
  return (
    typeof value === "string" &&
    capabilityStatuses.has(value as CapabilityStatus)
  );
}

function parseJsonObject(raw: string, label: string): Record<string, unknown> {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`${label} must be valid JSON: ${detail}`);
  }

  if (!isRecord(parsed)) {
    throw new Error(`${label} must be a JSON object`);
  }

  return parsed;
}

function validateClaudeSettings(raw: string, label: string): string[] {
  const doc = parseJsonObject(raw, label);
  const issues: string[] = [];

  if (doc.enabledPlugins !== undefined && !isRecord(doc.enabledPlugins)) {
    issues.push("enabledPlugins must be an object");
  }

  if (
    doc.enabledMcpjsonServers !== undefined &&
    !Array.isArray(doc.enabledMcpjsonServers)
  ) {
    issues.push("enabledMcpjsonServers must be an array");
  }

  if (
    doc.disabledMcpjsonServers !== undefined &&
    !Array.isArray(doc.disabledMcpjsonServers)
  ) {
    issues.push("disabledMcpjsonServers must be an array");
  }

  if (
    doc.enableAllProjectMcpServers !== undefined &&
    typeof doc.enableAllProjectMcpServers !== "boolean"
  ) {
    issues.push("enableAllProjectMcpServers must be a boolean");
  }

  return issues;
}

function validateClaudeProjectMcp(raw: string): string[] {
  const doc = parseJsonObject(raw, "Claude project .mcp.json");

  if (!isRecord(doc.mcpServers)) {
    return ["mcpServers must be an object"];
  }

  return [];
}

function validateCodexConfig(raw: string): string[] {
  const issues: string[] = [];
  const lines = raw.split(/\r?\n/);

  for (const [index, line] of lines.entries()) {
    const trimmed = line.trim();

    if (
      !trimmed.startsWith("[plugins") &&
      !trimmed.startsWith("[mcp_servers")
    ) {
      continue;
    }

    if (!/^\[(plugins|mcp_servers)\.(?:"[^"]+"|[^\]]+)\]$/.test(trimmed)) {
      issues.push(`line ${index + 1} must use [plugins.<id>] or [mcp_servers.<id>]`);
    }
  }

  return issues;
}

function validateSkillMarkdown(raw: string): string[] {
  const trimmed = raw.trim();

  if (trimmed.length === 0) {
    return ["SKILL.md must not be empty"];
  }

  if (!/^#\s+\S+/m.test(trimmed)) {
    return ["SKILL.md must include a top-level markdown heading"];
  }

  return [];
}

function validateCursorMcp(raw: string): string[] {
  const doc = parseJsonObject(raw, "Cursor mcp.json");

  if (!isRecord(doc.mcpServers)) {
    return ["mcpServers must be an object"];
  }

  return [];
}

function validateCursorExtensions(raw: string): string[] {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Cursor extensions.json must be valid JSON: ${detail}`);
  }

  if (!Array.isArray(parsed)) {
    return ["extensions.json must be an array"];
  }

  const issues: string[] = [];

  for (const [index, entry] of parsed.entries()) {
    if (!isRecord(entry)) {
      issues.push(`extensions.json[${index}] must be an object`);
      continue;
    }

    if (!isRecord(entry.identifier)) {
      issues.push(`extensions.json[${index}].identifier must be an object`);
      continue;
    }

    if (typeof entry.identifier.id !== "string") {
      issues.push(`extensions.json[${index}].identifier.id must be a string`);
    }
  }

  return issues;
}

export const providerRegistry: ProviderDescriptor[] = [
  {
    id: "claude",
    name: "Claude Code",
    fixtures: [
      {
        relativePath: "claude/global/settings.json",
        description: "Claude global settings",
        validate: (raw) => validateClaudeSettings(raw, "Claude global settings"),
      },
      {
        relativePath: "claude/global/settings.local.json",
        description: "Claude global local settings",
        validate: (raw) =>
          validateClaudeSettings(raw, "Claude global settings.local.json"),
      },
      {
        relativePath: "claude/project/.claude/settings.json",
        description: "Claude project settings",
        validate: (raw) =>
          validateClaudeSettings(raw, "Claude project settings.json"),
      },
      {
        relativePath: "claude/project/.claude/settings.local.json",
        description: "Claude project local settings",
        validate: (raw) =>
          validateClaudeSettings(raw, "Claude project settings.local.json"),
      },
      {
        relativePath: "claude/project/.claude/skills/example-claude-skill/SKILL.md",
        description: "Claude project skill fixture",
        validate: validateSkillMarkdown,
      },
      {
        relativePath: "claude/project/.mcp.json",
        description: "Claude project MCP registry",
        validate: validateClaudeProjectMcp,
      },
    ],
  },
  {
    id: "codex",
    name: "Codex",
    fixtures: [
      {
        relativePath: "codex/global/config.toml",
        description: "Codex global config",
        validate: validateCodexConfig,
      },
      {
        relativePath: "codex/global/skills/.system/example-skill/SKILL.md",
        description: "Codex global skill fixture",
        validate: validateSkillMarkdown,
      },
      {
        relativePath: "codex/project/.codex/skills/example-project-skill/SKILL.md",
        description: "Codex project skill fixture",
        validate: validateSkillMarkdown,
      },
    ],
  },
  {
    id: "cursor",
    name: "Cursor",
    fixtures: [
      {
        relativePath: "cursor/global/skills-cursor/example-cursor-skill/SKILL.md",
        description: "Cursor global skill fixture",
        validate: validateSkillMarkdown,
      },
      {
        relativePath: "cursor/global/mcp.json",
        description: "Cursor global MCP fixture",
        validate: validateCursorMcp,
      },
      {
        relativePath: "cursor/root/profiles/default/extensions.json",
        description: "Cursor extension fixture",
        validate: validateCursorExtensions,
      },
    ],
  },
];

export function listProviders(): ProviderDescriptor[] {
  return providerRegistry;
}

export function loadCapabilityMatrix(fixturesRoot: string): CapabilityMatrix {
  const matrixPath = path.join(fixturesRoot, "capability-matrix.json");
  const raw = readFileSync(matrixPath, "utf8");
  const parsed = parseJsonObject(raw, "capability-matrix.json");

  if (parsed.version !== 1) {
    throw new Error("capability-matrix.json must use version 1");
  }

  if (!isRecord(parsed.providers)) {
    throw new Error("capability-matrix.json must define providers");
  }

  if (!isRecord(parsed.notes)) {
    throw new Error("capability-matrix.json must define notes");
  }

  const providers = {} as CapabilityMatrix["providers"];
  const notes = {} as CapabilityMatrix["notes"];

  for (const provider of providerRegistry) {
    const providerCaps = parsed.providers[provider.id];
    const providerNote = parsed.notes[provider.id];

    if (!isRecord(providerCaps)) {
      throw new Error(`capability-matrix.json is missing ${provider.id}`);
    }

    if (typeof providerNote !== "string" || providerNote.length === 0) {
      throw new Error(
        `capability-matrix.json is missing note for ${provider.id}`,
      );
    }

    for (const field of ["skills", "configuredMcps", "tools"] as const) {
      const status = providerCaps[field];

      if (!isCapabilityStatus(status)) {
        throw new Error(
          `capability-matrix.json has an invalid ${provider.id}.${field} value`,
        );
      }
    }

    providers[provider.id] = {
      skills: providerCaps.skills as CapabilityStatus,
      configuredMcps: providerCaps.configuredMcps as CapabilityStatus,
      tools: providerCaps.tools as CapabilityStatus,
    };
    notes[provider.id] = providerNote;
  }

  return {
    version: 1,
    providers,
    notes,
  };
}

export function validateProviderFixtures(
  fixturesRoot: string,
): FixtureValidationReport {
  const checkedFiles: string[] = [];
  const issues: FixtureValidationIssue[] = [];

  for (const provider of providerRegistry) {
    for (const fixture of provider.fixtures) {
      const fixturePath = path.join(fixturesRoot, fixture.relativePath);
      checkedFiles.push(fixture.relativePath);

      let raw: string;
      try {
        raw = readFileSync(fixturePath, "utf8");
      } catch {
        issues.push({
          providerId: provider.id,
          relativePath: fixture.relativePath,
          message: "fixture file is missing",
        });
        continue;
      }

      try {
        for (const message of fixture.validate(raw)) {
          issues.push({
            providerId: provider.id,
            relativePath: fixture.relativePath,
            message,
          });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        issues.push({
          providerId: provider.id,
          relativePath: fixture.relativePath,
          message,
        });
      }
    }
  }

  return { checkedFiles, issues };
}
