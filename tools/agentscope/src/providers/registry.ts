import { readFileSync } from "node:fs";
import path from "node:path";

export type ProviderId = "claude" | "codex" | "cursor" | "zed";
export type CapabilityStatus = "verified" | "read-only" | "unsupported" | "needs-verification";
export const capabilityFields = [
  "skills",
  "configuredMcps",
  "tools",
  "agents",
  "hooks",
  "providerSettings",
  "pluginConfigs",
  "pluginManifests",
  "extensions",
] as const;
export type CapabilityField = (typeof capabilityFields)[number];
export type ProviderCapabilities = Record<CapabilityField, CapabilityStatus>;

export const capabilityFieldLabels: Record<CapabilityField, string> = {
  skills: "skills",
  configuredMcps: "configured MCPs",
  tools: "tools",
  agents: "agents",
  hooks: "hooks",
  providerSettings: "provider settings",
  pluginConfigs: "plugin configs",
  pluginManifests: "plugin manifests",
  extensions: "extensions",
};

export interface CapabilityMatrix {
  version: 1;
  providers: Record<ProviderId, ProviderCapabilities>;
  notes: Record<ProviderId, string>;
}

export interface CapabilityMatrixIssue {
  providerId?: ProviderId;
  field?: CapabilityField;
  message: string;
}

export interface CapabilityMatrixValidationReport {
  issues: CapabilityMatrixIssue[];
  matrix?: CapabilityMatrix;
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
  return typeof value === "string" && capabilityStatuses.has(value as CapabilityStatus);
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

function stripTrailingCommas(contents: string): string {
  let result = "";
  let inString = false;
  let escaped = false;

  for (let index = 0; index < contents.length; index += 1) {
    const char = contents[index];
    if (char === undefined) {
      break;
    }

    if (inString) {
      result += char;
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      result += char;
      continue;
    }

    if (char === ",") {
      let lookahead = index + 1;
      while (lookahead < contents.length && /\s/.test(contents[lookahead] ?? "")) {
        lookahead += 1;
      }

      const next = contents[lookahead];
      if (next === "}" || next === "]") {
        continue;
      }
    }

    result += char;
  }

  return result;
}

function stripJsonComments(contents: string): string {
  let result = "";
  let inString = false;
  let escaped = false;
  let index = 0;

  while (index < contents.length) {
    const char = contents[index];
    const next = contents[index + 1];

    if (char === undefined) {
      break;
    }

    if (inString) {
      result += char;
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      index += 1;
      continue;
    }

    if (char === '"') {
      inString = true;
      result += char;
      index += 1;
      continue;
    }

    if (char === "/" && next === "/") {
      index += 2;
      while (index < contents.length && contents[index] !== "\n") {
        index += 1;
      }
      continue;
    }

    if (char === "/" && next === "*") {
      index += 2;
      while (index < contents.length && !(contents[index] === "*" && contents[index + 1] === "/")) {
        index += 1;
      }
      index += 2;
      continue;
    }

    result += char;
    index += 1;
  }

  return result;
}

function validateClaudeSettings(raw: string, label: string): string[] {
  const doc = parseJsonObject(raw, label);
  const issues: string[] = [];

  if (doc.enabledPlugins !== undefined) {
    if (!isRecord(doc.enabledPlugins)) {
      issues.push("enabledPlugins must be an object");
    } else {
      for (const [key, value] of Object.entries(doc.enabledPlugins)) {
        if (typeof value !== "boolean") {
          issues.push(`enabledPlugins.${key} must be a boolean`);
        }
      }
    }
  }

  if (doc.enabledMcpjsonServers !== undefined && !isRecord(doc.enabledMcpjsonServers)) {
    issues.push("enabledMcpjsonServers must be an object");
  }

  if (doc.disabledMcpjsonServers !== undefined && !isRecord(doc.disabledMcpjsonServers)) {
    issues.push("disabledMcpjsonServers must be an object");
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

    if (!trimmed.startsWith("[plugins") && !trimmed.startsWith("[mcp_servers")) {
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
  let doc: Record<string, unknown>;
  try {
    doc = parseJsonObject(raw, "Cursor mcp.json");
  } catch {
    doc = parseJsonObject(stripTrailingCommas(raw), "Cursor mcp.json");
  }

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

function validateZedSettings(raw: string, label: string): string[] {
  const doc = parseJsonObject(stripTrailingCommas(stripJsonComments(raw)), label);

  if (doc.context_servers !== undefined && !isRecord(doc.context_servers)) {
    return ["context_servers must be an object"];
  }

  return [];
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
        validate: (raw) => validateClaudeSettings(raw, "Claude global settings.local.json"),
      },
      {
        relativePath: "claude/project/.claude/settings.json",
        description: "Claude project settings",
        validate: (raw) => validateClaudeSettings(raw, "Claude project settings.json"),
      },
      {
        relativePath: "claude/project/.claude/settings.local.json",
        description: "Claude project local settings",
        validate: (raw) => validateClaudeSettings(raw, "Claude project settings.local.json"),
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
  {
    id: "zed",
    name: "Zed",
    fixtures: [
      {
        relativePath: "zed/global/settings.json",
        description: "Zed global settings",
        validate: (raw) => validateZedSettings(raw, "Zed global settings"),
      },
      {
        relativePath: "zed/global/skills/example-zed-skill/SKILL.md",
        description: "Zed global skill fixture",
        validate: validateSkillMarkdown,
      },
      {
        relativePath: "zed/global/AGENTS.md",
        description: "Zed global instruction fixture",
        validate: validateSkillMarkdown,
      },
      {
        relativePath: "zed/project/.zed/settings.json",
        description: "Zed project settings",
        validate: (raw) => validateZedSettings(raw, "Zed project settings"),
      },
      {
        relativePath: "zed/project/.agents/skills/example-project-zed-skill/SKILL.md",
        description: "Zed project skill fixture",
        validate: validateSkillMarkdown,
      },
      {
        relativePath: "zed/project/AGENTS.md",
        description: "Zed project instruction fixture",
        validate: validateSkillMarkdown,
      },
    ],
  },
];

export function listProviders(): ProviderDescriptor[] {
  return providerRegistry;
}

export function loadCapabilityMatrix(fixturesRoot: string): CapabilityMatrix {
  const report = validateCapabilityMatrix(fixturesRoot);

  if (report.matrix === undefined) {
    throw new Error(report.issues.map((issue) => issue.message).join("; "));
  }

  return report.matrix;
}

export function validateCapabilityMatrix(fixturesRoot: string): CapabilityMatrixValidationReport {
  const matrixPath = path.join(fixturesRoot, "capability-matrix.json");
  const issues: CapabilityMatrixIssue[] = [];
  let raw: string;

  try {
    raw = readFileSync(matrixPath, "utf8");
  } catch {
    return {
      issues: [
        {
          message: "capability-matrix.json is missing",
        },
      ],
    };
  }

  let parsed: Record<string, unknown>;

  try {
    parsed = parseJsonObject(raw, "capability-matrix.json");
  } catch (error) {
    return {
      issues: [
        {
          message: error instanceof Error ? error.message : String(error),
        },
      ],
    };
  }

  if (parsed.version !== 1) {
    issues.push({ message: "capability-matrix.json must use version 1" });
  }

  if (!isRecord(parsed.providers)) {
    issues.push({ message: "capability-matrix.json must define providers" });
  }

  if (!isRecord(parsed.notes)) {
    issues.push({ message: "capability-matrix.json must define notes" });
  }

  const providers = {} as CapabilityMatrix["providers"];
  const notes = {} as CapabilityMatrix["notes"];
  const providerRecords = isRecord(parsed.providers) ? parsed.providers : {};
  const noteRecords = isRecord(parsed.notes) ? parsed.notes : {};

  for (const provider of providerRegistry) {
    const providerCaps = providerRecords[provider.id];
    const providerNote = noteRecords[provider.id];

    if (!isRecord(providerCaps)) {
      issues.push({
        providerId: provider.id,
        message: `capability-matrix.json is missing ${provider.id}`,
      });
    } else {
      const capabilities: Partial<ProviderCapabilities> = {};

      for (const field of capabilityFields) {
        const status = providerCaps[field];

        if (status === undefined) {
          issues.push({
            providerId: provider.id,
            field,
            message: `capability-matrix.json is missing ${provider.id}.${field}`,
          });
          continue;
        }

        if (!isCapabilityStatus(status)) {
          issues.push({
            providerId: provider.id,
            field,
            message: `capability-matrix.json has an invalid ${provider.id}.${field} value`,
          });
          continue;
        }

        capabilities[field] = status;
      }

      providers[provider.id] = capabilities as ProviderCapabilities;
    }

    if (typeof providerNote !== "string" || providerNote.length === 0) {
      issues.push({
        providerId: provider.id,
        message: `capability-matrix.json is missing note for ${provider.id}`,
      });
    } else {
      notes[provider.id] = providerNote;
    }
  }

  if (issues.length > 0) {
    return { issues };
  }

  return {
    issues: [],
    matrix: {
      version: 1,
      providers,
      notes,
    },
  };
}

export function validateProviderFixtures(fixturesRoot: string): FixtureValidationReport {
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
