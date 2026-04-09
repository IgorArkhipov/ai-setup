import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { runCli } from "../src/cli.js";

const packageRoot = path.resolve(import.meta.dirname, "..");
const runtimeRoot = path.resolve(import.meta.dirname, "fixtures", "runtime");

describe("cli", () => {
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
    expect(stderr).toHaveBeenCalledWith(
      expect.stringContaining("Unknown option"),
    );
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

    expect(exitCode).toBe(1);
    expect(stderr).not.toHaveBeenCalled();
    expect(stdout).toHaveBeenCalledWith(
      expect.stringContaining("status: blocked"),
    );
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
    expect(stdout).toHaveBeenCalledWith(
      expect.stringContaining("backup manifest not found"),
    );
  });
});
