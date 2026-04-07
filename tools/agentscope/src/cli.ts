#!/usr/bin/env node

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { cac } from "cac";
import { runDoctor } from "./commands/doctor.js";
import { renderProviders } from "./commands/providers.js";

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

const packageRoot = packageRootFromCli();
const fixturesRoot = path.join(packageRoot, "test", "fixtures");

const cli = cac("agentscope");
cli.version(readVersion(packageRoot));
cli.help();

cli
  .command("providers", "Print the provider capability matrix")
  .action(() => {
    console.log(renderProviders(fixturesRoot));
  });

cli
  .command("doctor", "Validate the baseline fixtures and capability matrix")
  .action(() => {
    const result = runDoctor(packageRoot, fixturesRoot);
    console.log(result.output);
    process.exitCode = result.exitCode;
  });

cli.parse();
