import { readFileSync } from "node:fs";
import path from "node:path";

export type ProviderId = "claude" | "codex" | "cursor";
export type CapabilityStatus =
  | "observed-shape"
  | "shell-only"
  | "not-yet-sampled";

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
  "observed-shape",
  "shell-only",
  "not-yet-sampled",
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

function validateBooleanRecord(value: unknown, label: string): string[] {
  if (value === undefined) {
    return [];
  }

  if (!isRecord(value)) {
    return [`${label} must be an object`];
  }

  return Object.entries(value)
    .filter(([, entryValue]) => typeof entryValue !== "boolean")
    .map(([key]) => `${label}.${key} must be a boolean`);
}

function validateStringArray(value: unknown, label: string): string[] {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    return [`${label} must be an array of strings`];
  }

  return value
    .map((entry, index) =>
      typeof entry === "string" ? null : `${label}[${index}] must be a string`,
    )
    .filter((entry): entry is string => entry !== null);
}

function validateClaudeGlobalSettings(raw: string): string[] {
  const doc = parseJsonObject(raw, "Claude global settings");
  return validateBooleanRecord(doc.enabledPlugins, "enabledPlugins");
}

function validateClaudeProjectSettings(raw: string): string[] {
  const doc = parseJsonObject(raw, "Claude project settings");
  const issues: string[] = [];

  if (
    doc.enableAllProjectMcpServers !== undefined &&
    typeof doc.enableAllProjectMcpServers !== "boolean"
  ) {
    issues.push("enableAllProjectMcpServers must be a boolean");
  }

  issues.push(
    ...validateStringArray(doc.enabledMcpjsonServers, "enabledMcpjsonServers"),
  );
  issues.push(
    ...validateStringArray(doc.disabledMcpjsonServers, "disabledMcpjsonServers"),
  );

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

  if (!/^\[plugins\.(?:"[^"]+"|[^\]]+)\]\s*$/m.test(raw)) {
    issues.push("config.toml must include at least one [plugins.<id>] section");
  }

  if (!/^\s*enabled\s*=\s*(true|false)\s*$/m.test(raw)) {
    issues.push("config.toml plugin section must include enabled = true|false");
  }

  if (!/^\[mcp_servers\.(?:"[^"]+"|[^\]]+)\]\s*$/m.test(raw)) {
    issues.push(
      "config.toml must include at least one [mcp_servers.<id>] section",
    );
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

function validateCursorJsonShell(raw: string, label: string): string[] {
  parseJsonObject(raw, label);
  return [];
}

export const providerRegistry: ProviderDescriptor[] = [
  {
    id: "claude",
    name: "Claude",
    fixtures: [
      {
        relativePath: "claude/global/settings.json",
        description: "Global Claude settings shell",
        validate: validateClaudeGlobalSettings,
      },
      {
        relativePath: "claude/project/.claude/settings.local.json",
        description: "Project Claude local settings shell",
        validate: validateClaudeProjectSettings,
      },
      {
        relativePath: "claude/project/.mcp.json",
        description: "Project Claude MCP registry shell",
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
        description: "Global Codex config",
        validate: validateCodexConfig,
      },
      {
        relativePath: "codex/global/skills/.system/example-skill/SKILL.md",
        description: "Global Codex skill fixture",
        validate: validateSkillMarkdown,
      },
      {
        relativePath: "codex/project/.codex/skills/example-project-skill/SKILL.md",
        description: "Project Codex skill fixture",
        validate: validateSkillMarkdown,
      },
    ],
  },
  {
    id: "cursor",
    name: "Cursor",
    fixtures: [
      {
        relativePath: "cursor/global/settings.json",
        description: "Cursor user settings shell",
        validate: (raw) => validateCursorJsonShell(raw, "Cursor settings.json"),
      },
      {
        relativePath: "cursor/global/storage.json",
        description: "Cursor global storage shell",
        validate: (raw) => validateCursorJsonShell(raw, "Cursor storage.json"),
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
      throw new Error(`capability-matrix.json is missing note for ${provider.id}`);
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
