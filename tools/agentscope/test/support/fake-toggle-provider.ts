import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { ProviderModule } from "../../src/core/discovery.js";
import type { DiscoveryItem, DiscoveryResult } from "../../src/core/models.js";
import {
  captureSourceFingerprints,
  createSqliteItemsDatabase,
  dedupeMutationTargets,
  writeSqliteItemValue,
} from "../../src/core/mutation-io.js";
import {
  toSelectedItemIdentity,
  type MutationOperation,
  type MutationTarget,
  type TogglePlanDecision,
  type TogglePlanInput,
} from "../../src/core/mutation-models.js";

export const fakeToggleIds = {
  full: "codex:project:tool:fake-full-toggle",
  noop: "codex:project:tool:fake-noop-toggle",
} as const;

const encoder = new TextEncoder();
const enabledSqliteValue = Uint8Array.from([0, 255, 1, 2]);
const disabledSqliteValue = Uint8Array.from([0, 255, 9, 8]);

function fakeRoot(projectRoot: string): string {
  return path.join(projectRoot, ".fake-toggle");
}

function fullPaths(projectRoot: string) {
  const root = fakeRoot(projectRoot);
  return {
    root,
    generatedPath: path.join(root, "generated", "enabled.txt"),
    settingsPath: path.join(root, "json", "settings.json"),
    originalPath: path.join(root, "files", "original-name.txt"),
    renamedPath: path.join(root, "files", "renamed-name.txt"),
    deletedPath: path.join(root, "files", "delete-me.txt"),
    sqlitePath: path.join(root, "sqlite", "items.db"),
    noopPath: path.join(root, "noop", "enabled.flag"),
  };
}

function currentFullEnabled(projectRoot: string): boolean {
  return existsSync(fullPaths(projectRoot).generatedPath);
}

function currentNoopEnabled(projectRoot: string): boolean {
  return existsSync(fullPaths(projectRoot).noopPath);
}

function buildItem(id: string, displayName: string, enabled: boolean, projectRoot: string): DiscoveryItem {
  const sourcePath = path.join(fakeRoot(projectRoot), "provider.json");

  return {
    provider: "codex",
    kind: "plugin",
    category: "tool",
    layer: "project",
    id,
    displayName,
    enabled,
    mutability: "read-write",
    sourcePath,
    statePath: sourcePath,
  };
}

function buildFullTargets(projectRoot: string): MutationTarget[] {
  const paths = fullPaths(projectRoot);
  return dedupeMutationTargets([
    {
      type: "path",
      path: paths.generatedPath,
    },
    {
      type: "path",
      path: paths.settingsPath,
    },
    {
      type: "path",
      path: paths.originalPath,
    },
    {
      type: "path",
      path: paths.renamedPath,
    },
    {
      type: "path",
      path: paths.deletedPath,
    },
    {
      type: "sqlite-item",
      databasePath: paths.sqlitePath,
      tableName: "items",
      keyColumn: "key",
      keyValue: "feature",
      valueColumn: "value",
    },
  ]);
}

function buildFullOperations(
  projectRoot: string,
  targetEnabled: boolean,
): MutationOperation[] {
  const paths = fullPaths(projectRoot);

  if (targetEnabled) {
    return [
      {
        type: "createFile",
        path: paths.generatedPath,
        content: encoder.encode("enabled\n"),
      },
      {
        type: "replaceJsonValue",
        path: paths.settingsPath,
        jsonPath: ["feature", "enabled"],
        value: true,
      },
      {
        type: "updateJsonObjectEntry",
        path: paths.settingsPath,
        jsonPath: ["feature", "plugins"],
        entryKey: "demo",
        value: { enabled: true },
      },
      {
        type: "removeJsonObjectEntry",
        path: paths.settingsPath,
        jsonPath: ["feature", "plugins"],
        entryKey: "legacy",
      },
      {
        type: "renamePath",
        fromPath: paths.originalPath,
        toPath: paths.renamedPath,
      },
      {
        type: "deletePath",
        path: paths.deletedPath,
      },
      {
        type: "replaceSqliteItemTableValue",
        databasePath: paths.sqlitePath,
        tableName: "items",
        keyColumn: "key",
        keyValue: "feature",
        valueColumn: "value",
        value: enabledSqliteValue,
      },
    ];
  }

  return [
    {
      type: "deletePath",
      path: paths.generatedPath,
    },
    {
      type: "replaceJsonValue",
      path: paths.settingsPath,
      jsonPath: ["feature", "enabled"],
      value: false,
    },
    {
      type: "removeJsonObjectEntry",
      path: paths.settingsPath,
      jsonPath: ["feature", "plugins"],
      entryKey: "demo",
    },
    {
      type: "updateJsonObjectEntry",
      path: paths.settingsPath,
      jsonPath: ["feature", "plugins"],
      entryKey: "legacy",
      value: { enabled: true },
    },
    {
      type: "renamePath",
      fromPath: paths.renamedPath,
      toPath: paths.originalPath,
    },
    {
      type: "createFile",
      path: paths.deletedPath,
      content: encoder.encode("delete me\n"),
    },
    {
      type: "replaceSqliteItemTableValue",
      databasePath: paths.sqlitePath,
      tableName: "items",
      keyColumn: "key",
      keyValue: "feature",
      valueColumn: "value",
      value: disabledSqliteValue,
    },
  ];
}

function planFullToggle(input: TogglePlanInput): TogglePlanDecision {
  const targets = buildFullTargets(input.config.projectRoot);
  return {
    status: "planned",
    plan: {
      selection: toSelectedItemIdentity(input.item),
      targetEnabled: input.targetEnabled,
      operations: buildFullOperations(input.config.projectRoot, input.targetEnabled),
      affectedTargets: targets,
      sourceFingerprints: captureSourceFingerprints(targets),
    },
  };
}

function planNoopToggle(input: TogglePlanInput): TogglePlanDecision {
  const paths = fullPaths(input.config.projectRoot);
  const actualEnabled = currentNoopEnabled(input.config.projectRoot);
  const targets: MutationTarget[] = [
    {
      type: "path",
      path: paths.noopPath,
    },
  ];

  return {
    status: "planned",
    plan: {
      selection: toSelectedItemIdentity(input.item),
      targetEnabled: input.targetEnabled,
      operations: actualEnabled === input.targetEnabled ? [] : [
        input.targetEnabled
          ? {
              type: "createFile",
              path: paths.noopPath,
              content: encoder.encode("enabled\n"),
            }
          : {
              type: "deletePath",
              path: paths.noopPath,
            },
      ],
      affectedTargets: targets,
      sourceFingerprints: captureSourceFingerprints(targets),
    },
  };
}

export function setupFakeToggleFixtures(projectRoot: string): void {
  const paths = fullPaths(projectRoot);
  mkdirSync(path.dirname(paths.settingsPath), { recursive: true });
  mkdirSync(path.dirname(paths.originalPath), { recursive: true });
  mkdirSync(path.dirname(paths.sqlitePath), { recursive: true });
  mkdirSync(path.dirname(paths.noopPath), { recursive: true });

  writeFileSync(
    paths.settingsPath,
    JSON.stringify(
      {
        feature: {
          enabled: false,
          plugins: {
            legacy: {
              enabled: true,
            },
          },
        },
      },
      null,
      2,
    ) + "\n",
  );
  writeFileSync(paths.originalPath, "original name\n");
  writeFileSync(paths.deletedPath, "delete me\n");
  writeFileSync(
    path.join(fakeRoot(projectRoot), "provider.json"),
    JSON.stringify({ provider: "fake-toggle" }, null, 2),
  );
  createSqliteItemsDatabase(paths.sqlitePath);
  writeSqliteItemValue(paths.sqlitePath, "feature", disabledSqliteValue);
}

export function readFakeSettings(projectRoot: string): {
  feature: { enabled: boolean; plugins: Record<string, unknown> };
} {
  return JSON.parse(readFileSync(fullPaths(projectRoot).settingsPath, "utf8")) as {
    feature: { enabled: boolean; plugins: Record<string, unknown> };
  };
}

export const fakeToggleProvider: ProviderModule = {
  id: "codex",
  discover(input): DiscoveryResult {
    const projectRoot = input.config.projectRoot;

    return {
      items: [
        buildItem(
          fakeToggleIds.full,
          "Fake Full Toggle",
          currentFullEnabled(projectRoot),
          projectRoot,
        ),
        buildItem(
          fakeToggleIds.noop,
          "Fake Noop Toggle",
          true,
          projectRoot,
        ),
      ],
      warnings: [],
    };
  },
  planToggle(input): TogglePlanDecision {
    if (input.item.id === fakeToggleIds.full) {
      return planFullToggle(input);
    }

    if (input.item.id === fakeToggleIds.noop) {
      return planNoopToggle(input);
    }

    return {
      status: "blocked",
      selection: toSelectedItemIdentity(input.item),
      targetEnabled: input.targetEnabled,
      operations: [],
      affectedTargets: [],
      reason: `unsupported: fake provider does not handle ${input.item.id}`,
    };
  },
};
