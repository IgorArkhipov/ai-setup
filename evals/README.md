# Eval Suite

This directory contains baseline promptfoo regressions for AgentScope documentation discovery. The current suite tests whether a chat answer can recover the correct operational source of truth from the active `memory-bank/ops/` documents without inventing unsupported behavior.

## Scope

Current coverage is intentionally basic and document-centric. The 10 baseline cases cover:

1. log discovery and missing `./tmp/logs` behavior;
2. external versus internal log terminology;
3. configuration precedence;
4. CLI root override flags;
5. the no-`.env*` configuration contract;
6. local verification commands;
7. absence of local service dependencies;
8. release flow and non-existent deploy steps;
9. rollback behavior for code versus user state;
10. non-local environment and remote log ownership.

These are regression checks for answer quality against governed docs, not end-to-end CLI behavior tests.

## Run

Structural validation without a live model:

```bash
PROMPTFOO_CONFIG_DIR=/tmp/promptfoo \
PROMPTFOO_DISABLE_WAL_MODE=true \
promptfoo eval -c evals/promptfooconfig.yaml \
  --providers echo \
  --no-write \
  --no-progress-bar \
  --no-table
```

Live NVIDIA run against the configured model:

```bash
export NVIDIA_API_KEY=...
PROMPTFOO_CONFIG_DIR=/tmp/promptfoo \
PROMPTFOO_DISABLE_WAL_MODE=true \
promptfoo eval -c evals/promptfooconfig.yaml --no-progress-bar
```

Manual GitHub Actions run:

1. Set repository secret `NVIDIA_API_KEY`.
2. Dispatch `.github/workflows/promptfoo-evals.yml`.
3. Optionally set `filter_pattern` to a case id such as `EC-003`.
4. Review the uploaded `promptfoo-results` artifact.

## Cases

### EC-001

What is being tested:
The answer routes a logs question to the logging guide and explains that `./tmp/logs` may be absent.

Expected result:
The answer names `memory-bank/ops/logging.md`, mentions `./tmp/logs`, says it may not exist, references `~/.config/agentscope/audit/log.jsonl`, and keeps `.env*` out of scope.

How to reproduce:
Run `promptfoo eval -c evals/promptfooconfig.yaml --filter-pattern EC-001`.

How verification works:
`evals/cases/log-discovery.yaml` asserts all required substrings with `icontains`.

### EC-002

What is being tested:
The answer distinguishes external command-run logs from internal AgentScope-owned audit state.

Expected result:
The answer maps external logs to `./tmp/logs`, internal logs to `appStateRoot` audit state, and says the streams are complementary.

How to reproduce:
Run `promptfoo eval -c evals/promptfooconfig.yaml --filter-pattern EC-002`.

How verification works:
The case passes only if the answer contains the governed path and the required terminology checkpoints.

### EC-003

What is being tested:
The answer reports the documented configuration precedence in the correct order.

Expected result:
The answer names `memory-bank/ops/config.md` and includes built-in defaults, global config, project config, and explicit CLI flags.

How to reproduce:
Run `promptfoo eval -c evals/promptfooconfig.yaml --filter-pattern EC-003`.

How verification works:
The case uses five `icontains` assertions anchored to the config guide.

### EC-004

What is being tested:
The answer reports the three root override flags and the stateful commands that support them.

Expected result:
The answer names `memory-bank/ops/config.md`, includes `--project-root`, `--app-state-root`, `--cursor-root`, and ties them to documented commands.

How to reproduce:
Run `promptfoo eval -c evals/promptfooconfig.yaml --filter-pattern EC-004`.

How verification works:
The case asserts the three flags and representative commands from the supported surface.

### EC-005

What is being tested:
The answer does not route configuration through `.env*` files.

Expected result:
The answer names `memory-bank/ops/config.md`, says AgentScope is not `.env`-driven, points to JSON plus CLI overrides, and says `.env*` files are outside the supported contract.

How to reproduce:
Run `promptfoo eval -c evals/promptfooconfig.yaml --filter-pattern EC-005`.

How verification works:
The case passes only if the answer contains all documented contract phrases.

### EC-006

What is being tested:
The answer reports the canonical local verification baseline from the development guide.

Expected result:
The answer names `memory-bank/ops/development.md` and includes `npm run lint`, `npm test`, `npm run coverage`, and `npm run build`.

How to reproduce:
Run `promptfoo eval -c evals/promptfooconfig.yaml --filter-pattern EC-006`.

How verification works:
The case requires all four commands plus the governing path.

### EC-007

What is being tested:
The answer does not invent a local web server, application database, or required supporting services.

Expected result:
The answer names `memory-bank/ops/development.md` and states that there is no local web server, no application database to provision, and no required Docker/Redis/Postgres-style dependencies.

How to reproduce:
Run `promptfoo eval -c evals/promptfooconfig.yaml --filter-pattern EC-007`.

How verification works:
The case checks the answer for the three no-service checkpoints.

### EC-008

What is being tested:
The answer describes the release flow without inventing deployment stages.

Expected result:
The answer names `memory-bank/ops/release.md`, states that AgentScope is a private package, says the release reality is build-and-verify, and includes CI plus merge-to-main flow.

How to reproduce:
Run `promptfoo eval -c evals/promptfooconfig.yaml --filter-pattern EC-008`.

How verification works:
The case asserts the path and the release-flow checkpoints from the guide.

### EC-009

What is being tested:
The answer distinguishes repository rollback from user-state rollback after guarded mutation.

Expected result:
The answer names `memory-bank/ops/release.md`, separates git rollback from backup-id restore, and includes `agentscope restore <backup-id>`.

How to reproduce:
Run `promptfoo eval -c evals/promptfooconfig.yaml --filter-pattern EC-009`.

How verification works:
The case requires the rollback vocabulary from the release guide.

### EC-010

What is being tested:
The answer does not invent staging or production environments and points to the correct remote logs.

Expected result:
The answer names `memory-bank/ops/stages.md`, says GitHub Actions CI is the only authoritative non-local execution surface, and points to Actions step logs as canonical remote logs.

How to reproduce:
Run `promptfoo eval -c evals/promptfooconfig.yaml --filter-pattern EC-010`.

How verification works:
The case asserts the path plus the non-local environment and log ownership phrases.
