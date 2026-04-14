import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { pathToFileURL } from "node:url";
import type { AgentScopeConfig } from "../../src/core/config.js";

const runtimeFixturesRoot = path.resolve(import.meta.dirname, "..", "fixtures", "runtime");
const disabledServersKey = "cursor/disabledMcpServers";

export interface CursorSandbox {
  root: string;
  homeDir: string;
  projectRoot: string;
  cursorRoot: string;
  appStateRoot: string;
  config: AgentScopeConfig;
  cleanup: () => void;
  homePath: (relativePath: string) => string;
  cursorPath: (relativePath: string) => string;
  readHomeText: (relativePath: string) => string;
  readHomeJson: <T>(relativePath: string) => T;
  readWorkspaceDisabledServers: () => string[];
  setWorkspaceDisabledServers: (disabledServerIds: string[]) => void;
  readAuditLog: () => unknown[];
  listBackupIds: () => string[];
}

export function createCursorSandbox(options: { withWorkspaceState?: boolean } = {}): CursorSandbox {
  const root = mkdtempSync(path.join(os.tmpdir(), "agentscope-cursor-"));
  const homeDir = path.join(root, "home");
  const projectRoot = path.join(root, "project");
  const cursorRoot = path.join(root, "cursor", "User");
  const appStateRoot = path.join(root, "app-state");

  mkdirSync(homeDir, { recursive: true });
  mkdirSync(projectRoot, { recursive: true });
  mkdirSync(cursorRoot, { recursive: true });

  cpSync(path.join(runtimeFixturesRoot, "home", ".cursor"), path.join(homeDir, ".cursor"), {
    recursive: true,
  });
  cpSync(path.join(runtimeFixturesRoot, "cursor", "User"), cursorRoot, {
    recursive: true,
  });

  const workspaceRoot = path.join(cursorRoot, "workspaceStorage", "sandbox-workspace");
  const workspaceDbPath = path.join(workspaceRoot, "state.vscdb");

  function setWorkspaceDisabledServers(disabledServerIds: string[]) {
    mkdirSync(workspaceRoot, { recursive: true });
    writeFileSync(
      path.join(workspaceRoot, "workspace.json"),
      JSON.stringify(
        {
          folder: pathToFileURL(projectRoot).toString(),
        },
        null,
        2,
      ),
      "utf8",
    );

    const database = new DatabaseSync(workspaceDbPath);
    try {
      database.exec(
        "CREATE TABLE IF NOT EXISTS ItemTable (key TEXT PRIMARY KEY, value BLOB NOT NULL)",
      );
      database
        .prepare(
          "INSERT INTO ItemTable (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        )
        .run(disabledServersKey, JSON.stringify(disabledServerIds));
    } finally {
      database.close();
    }
  }

  if (options.withWorkspaceState ?? true) {
    setWorkspaceDisabledServers([]);
  }

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
    cursorPath(relativePath: string): string {
      return path.join(cursorRoot, relativePath);
    },
    readHomeText(relativePath: string): string {
      return readFileSync(path.join(homeDir, relativePath), "utf8");
    },
    readHomeJson(relativePath) {
      return JSON.parse(readFileSync(path.join(homeDir, relativePath), "utf8"));
    },
    readWorkspaceDisabledServers(): string[] {
      if (!existsSync(workspaceDbPath)) {
        return [];
      }

      const database = new DatabaseSync(workspaceDbPath);
      try {
        const row = database
          .prepare("SELECT value FROM ItemTable WHERE key = ?")
          .get(disabledServersKey) as { value?: Uint8Array | Buffer | string } | undefined;
        if (row?.value === undefined) {
          return [];
        }

        const rawValue =
          typeof row.value === "string" ? row.value : Buffer.from(row.value).toString("utf8");
        return JSON.parse(rawValue) as string[];
      } finally {
        database.close();
      }
    },
    setWorkspaceDisabledServers,
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
