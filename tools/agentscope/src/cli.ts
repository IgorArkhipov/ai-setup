#!/usr/bin/env node

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { cac } from "cac";
import { runDoctor } from "./commands/doctor.js";
import { runList } from "./commands/list.js";
import { renderProviders } from "./commands/providers.js";
import { runRestore } from "./commands/restore.js";
import { runSnapshot } from "./commands/snapshot.js";
import { runToggle } from "./commands/toggle.js";

interface CliIo {
  stdout: (message: string) => void;
  stderr: (message: string) => void;
}

interface RunCliOptions extends Partial<CliIo> {
  packageRoot?: string;
}

function packageRootFromCli(): string {
  const currentFile = fileURLToPath(import.meta.url);
  return path.resolve(path.dirname(currentFile), "..");
}

function readVersion(packageRoot: string): string {
  const packageJsonPath = path.join(packageRoot, "package.json");
  const pkg = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
    version?: string;
  };

  return pkg.version ?? "0.0.0";
}

function defaultIo(): CliIo {
  return {
    stdout: (message) => console.log(message),
    stderr: (message) => console.error(message),
  };
}

function handleCommand(
  action: () => { exitCode?: number; output: string } | string,
  io: CliIo,
): number {
  try {
    const result = action();

    if (typeof result === "string") {
      io.stdout(result);
      return 0;
    }

    io.stdout(result.output);
    return result.exitCode ?? 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    io.stderr(message);
    return 1;
  }
}

function createCli(packageRoot: string, io: CliIo) {
  const fixturesRoot = path.join(packageRoot, "test", "fixtures");
  const cli = cac("agentscope");
  let exitCode = 0;

  const runHandled = (action: () => { exitCode?: number; output: string } | string): void => {
    exitCode = handleCommand(action, io);
  };

  cli.version(readVersion(packageRoot));
  cli.help();

  cli.command("providers", "Print the provider capability matrix").action(() => {
    runHandled(() => renderProviders(fixturesRoot));
  });

  cli
    .command("doctor", "Validate fixtures and local provider inputs")
    .option("--project-root <path>", "Override the project root")
    .option("--app-state-root <path>", "Override the app state root")
    .option("--cursor-root <path>", "Override the Cursor root")
    .action((options) => {
      runHandled(() =>
        runDoctor(packageRoot, fixturesRoot, {
          projectRoot: options.projectRoot,
          appStateRoot: options.appStateRoot,
          cursorRoot: options.cursorRoot,
        }),
      );
    });

  cli
    .command("snapshot", "Persist the current discovery inventory as a project snapshot")
    .option("--json", "Render JSON output")
    .option("--project-root <path>", "Override the project root")
    .option("--app-state-root <path>", "Override the app state root")
    .option("--cursor-root <path>", "Override the Cursor root")
    .action((options) => {
      runHandled(() =>
        runSnapshot({
          json: options.json,
          projectRoot: options.projectRoot,
          appStateRoot: options.appStateRoot,
          cursorRoot: options.cursorRoot,
        }),
      );
    });

  cli
    .command("list", "List discovered provider items")
    .option("--json", "Render JSON output")
    .option("--provider <id>", "Filter to one provider")
    .option("--layer <layer>", "Filter to global, project, or all")
    .option("--project-root <path>", "Override the project root")
    .option("--app-state-root <path>", "Override the app state root")
    .option("--cursor-root <path>", "Override the Cursor root")
    .action((options) => {
      runHandled(() =>
        runList({
          json: options.json,
          provider: options.provider,
          layer: options.layer,
          projectRoot: options.projectRoot,
          appStateRoot: options.appStateRoot,
          cursorRoot: options.cursorRoot,
        }),
      );
    });

  cli
    .command("toggle", "Plan or apply a toggle for one discovered item")
    .option("--provider <id>", "Provider id")
    .option("--kind <kind>", "Discovery kind")
    .option("--id <id>", "Normalized discovery id")
    .option("--layer <layer>", "Discovery layer")
    .option("--apply", "Apply writes instead of dry-run")
    .option("--json", "Render JSON output")
    .option("--project-root <path>", "Override the project root")
    .option("--app-state-root <path>", "Override the app state root")
    .option("--cursor-root <path>", "Override the Cursor root")
    .action((options) => {
      runHandled(() =>
        runToggle({
          provider: options.provider,
          kind: options.kind,
          id: options.id,
          layer: options.layer,
          apply: options.apply,
          json: options.json,
          projectRoot: options.projectRoot,
          appStateRoot: options.appStateRoot,
          cursorRoot: options.cursorRoot,
        }),
      );
    });

  cli
    .command("restore <backupId>", "Restore one previously saved backup")
    .option("--json", "Render JSON output")
    .option("--project-root <path>", "Override the project root")
    .option("--app-state-root <path>", "Override the app state root")
    .option("--cursor-root <path>", "Override the Cursor root")
    .action((backupId, options) => {
      runHandled(() =>
        runRestore({
          backupId,
          json: options.json,
          projectRoot: options.projectRoot,
          appStateRoot: options.appStateRoot,
          cursorRoot: options.cursorRoot,
        }),
      );
    });

  return {
    cli,
    exitCode: () => exitCode,
  };
}

export function runCli(argv: string[], options: RunCliOptions = {}): number {
  const io: CliIo = {
    ...defaultIo(),
    ...options,
  };
  const packageRoot = options.packageRoot ?? packageRootFromCli();
  const { cli, exitCode } = createCli(packageRoot, io);

  try {
    const parsed = cli.parse(["node", "agentscope", ...argv], { run: false });
    if (cli.matchedCommand === undefined) {
      if (cli.options.help === true || cli.options.version === true) {
        return 0;
      }

      if (parsed.args.length === 0) {
        io.stderr("No command specified.");
      } else {
        io.stderr(`Unknown command: ${parsed.args.join(" ")}`);
      }

      return 1;
    }

    cli.runMatchedCommand();
    return exitCode();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    io.stderr(message);
    return 1;
  }
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] !== undefined && path.resolve(process.argv[1]) === currentFile) {
  process.exitCode = runCli(process.argv.slice(2));
}
