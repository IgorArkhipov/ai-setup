import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import type { AgentScopeConfig } from "../../src/core/config.js";
import { readSqliteItemValue } from "../../src/core/mutation-io.js";
import { fakeToggleIds, setupFakeToggleFixtures } from "./fake-toggle-provider.js";

export interface MutationSandbox {
  root: string;
  homeDir: string;
  projectRoot: string;
  cursorRoot: string;
  appStateRoot: string;
  config: AgentScopeConfig;
  cleanup: () => void;
  readText: (relativePath: string) => string;
  readJson: <T>(relativePath: string) => T;
  pathFor: (relativePath: string) => string;
  readAuditLog: () => unknown[];
  listBackupIds: () => string[];
  readSqliteValue: (relativePath: string, key: string) => Uint8Array | null;
  ids: typeof fakeToggleIds;
}

export function createMutationSandbox(): MutationSandbox {
  const root = mkdtempSync(path.join(os.tmpdir(), "agentscope-mutation-"));
  const homeDir = path.join(root, "home");
  const projectRoot = path.join(root, "project");
  const cursorRoot = path.join(root, "cursor", "User");
  const appStateRoot = path.join(root, "app-state");

  mkdirSync(homeDir, { recursive: true });
  mkdirSync(projectRoot, { recursive: true });
  mkdirSync(cursorRoot, { recursive: true });
  setupFakeToggleFixtures(projectRoot);

  return {
    root,
    homeDir,
    projectRoot,
    cursorRoot,
    appStateRoot,
    config: {
      version: 1,
      projectRoot,
      appStateRoot,
      cursorRoot,
      configPaths: {
        userConfigPath: path.join(homeDir, ".config", "agentscope", "config.json"),
        projectConfigPath: path.join(projectRoot, ".agentscope.json"),
      },
    },
    cleanup() {
      rmSync(root, { recursive: true, force: true });
    },
    readText(relativePath: string): string {
      return readFileSync(path.join(projectRoot, relativePath), "utf8");
    },
    readJson(relativePath) {
      return JSON.parse(readFileSync(path.join(projectRoot, relativePath), "utf8"));
    },
    pathFor(relativePath: string): string {
      return path.join(projectRoot, relativePath);
    },
    readAuditLog(): unknown[] {
      const auditPath = path.join(appStateRoot, "audit", "log.jsonl");
      if (!existsSync(auditPath)) {
        return [];
      }

      return readFileSync(auditPath, "utf8")
        .trim()
        .split("\n")
        .filter((line) => line.length > 0)
        .map((line) => JSON.parse(line));
    },
    listBackupIds(): string[] {
      const backupsRoot = path.join(appStateRoot, "backups");
      if (!existsSync(backupsRoot)) {
        return [];
      }

      return readdirSync(backupsRoot).sort((left, right) => left.localeCompare(right));
    },
    readSqliteValue(relativePath: string, key: string): Uint8Array | null {
      return readSqliteItemValue(path.join(projectRoot, relativePath), key);
    },
    ids: fakeToggleIds,
  };
}
