import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import type { AgentScopeConfig } from "../../src/core/config.js";

const runtimeFixturesRoot = path.resolve(import.meta.dirname, "..", "fixtures", "runtime");

export interface CodexSandbox {
  root: string;
  homeDir: string;
  projectRoot: string;
  cursorRoot: string;
  appStateRoot: string;
  config: AgentScopeConfig;
  cleanup: () => void;
  homePath: (relativePath: string) => string;
  projectPath: (relativePath: string) => string;
  readHomeText: (relativePath: string) => string;
  readProjectText: (relativePath: string) => string;
  readAuditLog: () => unknown[];
  listBackupIds: () => string[];
}

export function createCodexSandbox(): CodexSandbox {
  const root = mkdtempSync(path.join(os.tmpdir(), "agentscope-codex-"));
  const homeDir = path.join(root, "home");
  const projectRoot = path.join(root, "project");
  const cursorRoot = path.join(root, "cursor", "User");
  const appStateRoot = path.join(root, "app-state");

  mkdirSync(homeDir, { recursive: true });
  mkdirSync(projectRoot, { recursive: true });
  mkdirSync(cursorRoot, { recursive: true });

  cpSync(path.join(runtimeFixturesRoot, "home", ".codex"), path.join(homeDir, ".codex"), {
    recursive: true,
  });
  cpSync(path.join(runtimeFixturesRoot, "project", ".codex"), path.join(projectRoot, ".codex"), {
    recursive: true,
  });

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
    homePath(relativePath: string): string {
      return path.join(homeDir, relativePath);
    },
    projectPath(relativePath: string): string {
      return path.join(projectRoot, relativePath);
    },
    readHomeText(relativePath: string): string {
      return readFileSync(path.join(homeDir, relativePath), "utf8");
    },
    readProjectText(relativePath: string): string {
      return readFileSync(path.join(projectRoot, relativePath), "utf8");
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
  };
}
