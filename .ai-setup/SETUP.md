# Base Setup For The AI Driven Development Course

Most interaction with the surrounding system happens through CLI tools. Because of that, it is important to have a working baseline toolset and agent skills, and after installation verify that they are not only installed but actually configured for your accounts.

This file is the canonical bootstrap guide for `ai-setup` itself and for course projects created as forks from it. In downstream documents, link to this file instead of copying the `make` commands, login steps, `direnv allow`, and `make check`.

## Automatic Installation

Works for mainstream Linux distributions (tested on Ubuntu) and macOS.

```bash
make
```

By default, `make` runs the `ai` target, which does the following in order:

1. installs `mise` if it is not already available;
2. installs the tools from `mise.toml`;
3. installs the agent CLIs;
4. installs supporting CLIs for agents;
5. installs curated skills for `codex` and `claude-code`.

## Authentication

After `make`, you must authenticate with the required services. Without that, `make check` will fail during the auth checks:

```bash
claude auth login
codex login
gh auth login
```

Then configure `direnv` integration for your shell (see the [direnv section](#direnv) below) and allow `.envrc`:

```bash
direnv allow
```

## Installation Verification

After authentication, run the baseline environment check:

```bash
make check
```

`make check` validates:

- the required toolchain from the local setup;
- installed agent CLIs;
- required authentication for `claude`, `codex`, and `gh`;
- installed supporting CLIs for agents: `playwright-cli`, `ccbox`;
- the baseline shell/environment setup, including `direnv` and a numeric `PORT`.

The command exits with an error only for baseline installation problems.

## What Gets Installed Automatically

### Tools Installed Through `mise`

The following are installed from `mise.toml`: `direnv`, `gh`, `gitleaks`, `jq`, `node`, `port-selector`, and `ruby`,
plus `zellij` as the baseline multiplexer for parallel task sessions.

### Coding Agents

- `@anthropic-ai/claude-code`
- `@openai/codex`

### CLI Tools For Agents

Required:

| Tool | Purpose | How To Verify |
| --- | --- | --- |
| [@playwright/cli](https://github.com/microsoft/playwright-cli) | Website automation and web testing | Ask an agent to open a site and take a screenshot |
| [gh](https://github.com/cli/cli) | Work with the GitHub API outside `git`: view and create issues, pull requests, and projects | Ask an agent to inspect or create an issue in the repository |
| [port-selector](https://github.com/dapi/port-selector) | Automatically choose a free port from a range for local dev servers and e2e while agents work in parallel | Run `port-selector` and confirm that it returns a free port number |
| [ccbox](https://github.com/diskd-ai/ccbox) | Codebase inspection and analysis for agents | Run `ccbox --version` |
| [zellij](https://zellij.dev/) | Open adjacent tabs/sessions for isolated work in separate git worktrees | Run `zellij --version`, then `make check` |

## Isolated Task Session In A Neighboring Tab/Session

For parallel work, use the repo-owned launcher:

```bash
./.ai-setup/scripts/start-dev-task.sh \
  --type impl \
  --slug add-provider-toggle \
  --prompt "Implement the requested change"
```

For script-driven or CI-like scenarios, you can run a detached session:

```bash
./.ai-setup/scripts/start-dev-task.sh \
  --type spec \
  --slug task-session-demo \
  --prompt "Document the workflow" \
  --detached
```

What the launcher does:

1. routes the task through `.ai-setup/task-router.json`;
2. creates or reuses `.worktrees/<slug>`;
3. runs `./init.sh` in the new worktree;
4. opens the routed task in `zellij`:
   - if you are already inside `zellij`, it creates a neighboring tab;
   - otherwise, it creates a separate `zellij` session;
   - when needed, it uses `zellij` from `mise` and sets a short `ZELLIJ_SOCKET_DIR` to work around the macOS `TMPDIR` socket-path issue.

Currently supported `--type` values:

- `impl` - implementation using the small-feature workflow in `codex` with `gpt-5.4`;
- `debug` - bug-fix workflow in `codex` with `gpt-5.4`;
- `research` - read-mostly research in `codex` with `gpt-5.5`;
- `review` - review workflow in `codex` with `gpt-5.5`;
- `spec` - governed-document workflow in `codex` with `gpt-5.5`.

Validate the task-session configuration:

```bash
make check-task-session
```

Validate the repo-local workflow-runner configuration:

```bash
make check-agent-workflow
```

Start a dry-run route-first workflow for AgentScope development:

```bash
./.ai-setup/scripts/run-agent-workflow.sh start \
  --workflow route-first \
  --slug provider-auth \
  --prompt "Add provider auth detection" \
  --dry-run
```

Create the timestamped run state and worktree when you are ready to materialize the pipeline:

```bash
./.ai-setup/scripts/run-agent-workflow.sh start \
  --workflow route-first \
  --slug provider-auth \
  --prompt "Add provider auth detection" \
  --apply
```

Run the same pipeline with Claude second-opinion review after accepted review stages:

```bash
./.ai-setup/scripts/run-agent-workflow.sh run \
  --workflow route-first \
  --slug provider-auth \
  --prompt "Add provider auth detection" \
  --claude-review \
  --apply
```

Execute an accepted governed implementation plan milestone by milestone:

```bash
./.ai-setup/scripts/run-agent-workflow.sh run \
  --workflow implementation-plan \
  --slug provider-auth-implementation \
  --implementation-plan memory-bank/features/FT-007/implementation-plan.md \
  --claude-review \
  --apply
```

Open the current stage in an interactive Zellij-ready launcher:

```bash
./.ai-setup/scripts/run-agent-workflow.sh stage \
  --run-id <run-id> \
  --stage <current-stage> \
  --interactive \
  --apply
```

## What To Preserve In A Derived Project

If you create a course project from this repository, the original `README.md` is expected to be replaced with your project's README.

To avoid losing the environment onboarding along with that change, keep the local setup requirements in a separate permanent document in the derived repository:

- `SETUP.md` if you want to keep setup separate from the README;
- `CONTRIBUTING.md` if it is part of developer onboarding;
- `docs/onboarding.md` if you need more detailed internal documentation.

At minimum, that document should preserve:

- how to bring up the local environment;
- how to complete the required CLI authentication;
- how to verify the result with `make check`.

## direnv

This project uses `direnv`:

1. configure integration with your shell: [direnv hooks documentation](https://direnv.net/docs/hook.html)
2. allow the local `.envrc` in the project root:

```bash
direnv allow
```

`.envrc` loads `.env` and `.env.local`, and if `PORT` is not set explicitly, it assigns one automatically through `port-selector`. `make check` validates that `direnv` really exports a numeric `PORT`.
