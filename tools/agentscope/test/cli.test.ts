import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { runCli } from "../src/cli.js";

const packageRoot = path.resolve(import.meta.dirname, "..");
const runtimeRoot = path.resolve(import.meta.dirname, "fixtures", "runtime");

describe("cli", () => {
  it("returns zero for help output", () => {
    const stdout = vi.fn<(message: string) => void>();
    const stderr = vi.fn<(message: string) => void>();

    expect(
      runCli(["--help"], {
        packageRoot,
        stdout,
        stderr,
      }),
    ).toBe(0);
    expect(stderr).not.toHaveBeenCalled();
  });

  it("returns zero for version output", () => {
    const stdout = vi.fn<(message: string) => void>();
    const stderr = vi.fn<(message: string) => void>();

    expect(
      runCli(["--version"], {
        packageRoot,
        stdout,
        stderr,
      }),
    ).toBe(0);
    expect(stderr).not.toHaveBeenCalled();
  });

  it("routes providers to the registered command handler", () => {
    const stdout = vi.fn<(message: string) => void>();
    const stderr = vi.fn<(message: string) => void>();

    const exitCode = runCli(["providers"], {
      packageRoot,
      stdout,
      stderr,
    });

    expect(exitCode).toBe(0);
    expect(stderr).not.toHaveBeenCalled();
    expect(stdout).toHaveBeenCalledWith(expect.stringContaining("Claude Code (claude)"));
  });

  it("routes doctor to the registered command handler", () => {
    const stdout = vi.fn<(message: string) => void>();
    const stderr = vi.fn<(message: string) => void>();

    const exitCode = runCli(
      [
        "doctor",
        "--project-root",
        path.join(runtimeRoot, "project"),
        "--app-state-root",
        path.join(runtimeRoot, "app-state"),
        "--cursor-root",
        path.join(runtimeRoot, "cursor", "User"),
      ],
      {
        packageRoot,
        stdout,
        stderr,
      },
    );

    expect(exitCode).toBe(0);
    expect(stderr).not.toHaveBeenCalled();
    expect(stdout).toHaveBeenCalledWith(expect.stringContaining("OK"));
  });

  it("prints a concise error for invalid options", () => {
    const stdout = vi.fn<(message: string) => void>();
    const stderr = vi.fn<(message: string) => void>();

    const exitCode = runCli(["list", "--not-a-real-flag"], {
      packageRoot,
      stdout,
      stderr,
    });

    expect(exitCode).toBe(1);
    expect(stdout).not.toHaveBeenCalled();
    expect(stderr).toHaveBeenCalledWith(expect.stringContaining("Unknown option"));
  });

  it("returns non-zero when no command is provided", () => {
    const stdout = vi.fn<(message: string) => void>();
    const stderr = vi.fn<(message: string) => void>();

    const exitCode = runCli([], {
      packageRoot,
      stdout,
      stderr,
    });

    expect(exitCode).toBe(1);
    expect(stdout).not.toHaveBeenCalled();
    expect(stderr).toHaveBeenCalledWith("No command specified.");
  });

  it("returns non-zero when an unknown command is provided", () => {
    const stdout = vi.fn<(message: string) => void>();
    const stderr = vi.fn<(message: string) => void>();

    const exitCode = runCli(["unknown-command"], {
      packageRoot,
      stdout,
      stderr,
    });

    expect(exitCode).toBe(1);
    expect(stdout).not.toHaveBeenCalled();
    expect(stderr).toHaveBeenCalledWith("Unknown command: unknown-command");
  });

  it("routes toggle to the registered command handler", () => {
    const stdout = vi.fn<(message: string) => void>();
    const stderr = vi.fn<(message: string) => void>();

    const exitCode = runCli(
      [
        "toggle",
        "--provider",
        "claude",
        "--kind",
        "skill",
        "--id",
        "claude:project:skill:example-claude-skill",
        "--layer",
        "project",
        "--project-root",
        path.join(runtimeRoot, "project"),
        "--app-state-root",
        path.join(runtimeRoot, "app-state"),
        "--cursor-root",
        path.join(runtimeRoot, "cursor", "User"),
      ],
      {
        packageRoot,
        stdout,
        stderr,
      },
    );

    expect(exitCode).toBe(0);
    expect(stderr).not.toHaveBeenCalled();
    expect(stdout).toHaveBeenCalledWith(expect.stringContaining("status: dry-run"));
  });

  it("routes positional toggle selectors and explicit target flags", () => {
    const stdout = vi.fn<(message: string) => void>();
    const stderr = vi.fn<(message: string) => void>();

    const exitCode = runCli(
      [
        "toggle",
        "claude",
        "skill",
        "claude:project:skill:example-claude-skill",
        "--layer",
        "project",
        "--disable",
        "--json",
        "--project-root",
        path.join(runtimeRoot, "project"),
        "--app-state-root",
        path.join(runtimeRoot, "app-state"),
        "--cursor-root",
        path.join(runtimeRoot, "cursor", "User"),
      ],
      {
        packageRoot,
        stdout,
        stderr,
      },
    );

    expect(exitCode).toBe(0);
    expect(stderr).not.toHaveBeenCalled();
    expect(JSON.parse(stdout.mock.calls[0]?.[0] ?? "")).toMatchObject({
      status: "dry-run",
      targetEnabled: false,
    });
  });

  it("returns non-zero for conflicting toggle target flags", () => {
    const stdout = vi.fn<(message: string) => void>();
    const stderr = vi.fn<(message: string) => void>();

    const exitCode = runCli(
      [
        "toggle",
        "--provider",
        "claude",
        "--kind",
        "skill",
        "--id",
        "claude:project:skill:example-claude-skill",
        "--layer",
        "project",
        "--enable",
        "--disable",
        "--json",
        "--project-root",
        path.join(runtimeRoot, "project"),
        "--app-state-root",
        path.join(runtimeRoot, "app-state"),
        "--cursor-root",
        path.join(runtimeRoot, "cursor", "User"),
      ],
      {
        packageRoot,
        stdout,
        stderr,
      },
    );

    expect(exitCode).toBe(1);
    expect(stderr).not.toHaveBeenCalled();
    expect(JSON.parse(stdout.mock.calls[0]?.[0] ?? "")).toEqual({
      status: "failed",
      reason: "cannot use --enable and --disable together",
    });
  });

  it("routes restore to the registered command handler", () => {
    const stdout = vi.fn<(message: string) => void>();
    const stderr = vi.fn<(message: string) => void>();

    const exitCode = runCli(
      [
        "restore",
        "backup-missing",
        "--project-root",
        path.join(runtimeRoot, "project"),
        "--app-state-root",
        path.join(runtimeRoot, "app-state"),
        "--cursor-root",
        path.join(runtimeRoot, "cursor", "User"),
      ],
      {
        packageRoot,
        stdout,
        stderr,
      },
    );

    expect(exitCode).toBe(1);
    expect(stderr).not.toHaveBeenCalled();
    expect(stdout).toHaveBeenCalledWith(expect.stringContaining("backup manifest not found"));
  });

  it("routes list filters through the registered command handler", () => {
    const stdout = vi.fn<(message: string) => void>();
    const stderr = vi.fn<(message: string) => void>();

    const exitCode = runCli(
      [
        "list",
        "--provider",
        "claude",
        "--layer",
        "project",
        "--kind",
        "mcp",
        "--category",
        "configured-mcp",
        "--json",
        "--project-root",
        path.join(runtimeRoot, "project"),
        "--app-state-root",
        path.join(runtimeRoot, "app-state"),
        "--cursor-root",
        path.join(runtimeRoot, "cursor", "User"),
      ],
      {
        packageRoot,
        stdout,
        stderr,
      },
    );

    expect(exitCode).toBe(0);
    expect(stderr).not.toHaveBeenCalled();
    expect(JSON.parse(stdout.mock.calls[0]?.[0] ?? "")).toMatchObject({
      items: expect.arrayContaining([
        expect.objectContaining({
          provider: "claude",
          layer: "project",
          kind: "mcp",
          category: "configured-mcp",
        }),
      ]),
      warnings: [],
    });
  });

  it("routes dashboard through the registered command handler", () => {
    const stdout = vi.fn<(message: string) => void>();
    const stderr = vi.fn<(message: string) => void>();

    const exitCode = runCli(
      [
        "dashboard",
        "--provider",
        "claude",
        "--category",
        "skill",
        "--select",
        "claude:project:skill:example-claude-skill",
        "--project-root",
        path.join(runtimeRoot, "project"),
        "--app-state-root",
        path.join(runtimeRoot, "app-state"),
        "--cursor-root",
        path.join(runtimeRoot, "cursor", "User"),
      ],
      {
        packageRoot,
        stdout,
        stderr,
      },
    );

    expect(exitCode).toBe(0);
    expect(stderr).not.toHaveBeenCalled();
    expect(stdout).toHaveBeenCalledWith(expect.stringContaining("AgentScope Dashboard"));
    expect(stdout).toHaveBeenCalledWith(expect.stringContaining("Selected item"));
  });

  it("passes repeated dashboard stage options to the command handler", () => {
    const stdout = vi.fn<(message: string) => void>();
    const stderr = vi.fn<(message: string) => void>();

    const exitCode = runCli(
      [
        "dashboard",
        "--stage",
        "claude|skill|project|claude:project:skill:example-claude-skill|false",
        "--stage",
        "claude|mcp|project|claude:project:configured-mcp:github|false",
        "--project-root",
        path.join(runtimeRoot, "project"),
        "--app-state-root",
        path.join(runtimeRoot, "app-state"),
        "--cursor-root",
        path.join(runtimeRoot, "cursor", "User"),
      ],
      {
        packageRoot,
        stdout,
        stderr,
      },
    );

    expect(exitCode).toBe(0);
    expect(stderr).not.toHaveBeenCalled();
    expect(stdout).toHaveBeenCalledWith(
      expect.stringContaining("claude:project:skill:example-claude-skill"),
    );
    expect(stdout).toHaveBeenCalledWith(
      expect.stringContaining("claude:project:configured-mcp:github"),
    );
  });

  it("routes snapshot through the registered command handler", () => {
    const stdout = vi.fn<(message: string) => void>();
    const stderr = vi.fn<(message: string) => void>();
    const appStateRoot = mkdtempSync(path.join(tmpdir(), "agentscope-cli-snapshot-"));

    try {
      const exitCode = runCli(
        [
          "snapshot",
          "--json",
          "--project-root",
          path.join(runtimeRoot, "project"),
          "--app-state-root",
          appStateRoot,
          "--cursor-root",
          path.join(runtimeRoot, "cursor", "User"),
        ],
        {
          packageRoot,
          stdout,
          stderr,
        },
      );

      expect(exitCode).toBe(0);
      expect(stderr).not.toHaveBeenCalled();
      expect(JSON.parse(stdout.mock.calls[0]?.[0] ?? "")).toMatchObject({
        snapshot: expect.objectContaining({
          version: 1,
          projectRoot: path.join(runtimeRoot, "project"),
        }),
        latestPath: expect.stringContaining("latest.json"),
        historyPath: expect.stringContaining(".json"),
      });
    } finally {
      rmSync(appStateRoot, { recursive: true, force: true });
    }
  });

  it("returns non-zero for an invalid list layer filter", () => {
    const stdout = vi.fn<(message: string) => void>();
    const stderr = vi.fn<(message: string) => void>();

    const exitCode = runCli(
      [
        "list",
        "--layer",
        "workspace",
        "--project-root",
        path.join(runtimeRoot, "project"),
        "--app-state-root",
        path.join(runtimeRoot, "app-state"),
        "--cursor-root",
        path.join(runtimeRoot, "cursor", "User"),
      ],
      {
        packageRoot,
        stdout,
        stderr,
      },
    );

    expect(exitCode).toBe(1);
    expect(stderr).not.toHaveBeenCalled();
    expect(stdout).toHaveBeenCalledWith("invalid layer: expected global, project, or all");
  });
});
