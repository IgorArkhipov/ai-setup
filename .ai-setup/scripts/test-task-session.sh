#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$repo_root"

jq -e '
  .defaultType == "impl" and
  (.routes | type == "object") and
  (.routes.impl.workflow == "small-feature") and
  (.routes.debug.workflow == "bug-fix") and
  (.routes.impl.model == "gpt-5.4") and
  (.routes.debug.model == "gpt-5.4") and
  (.routes.research.model == "gpt-5.5") and
  (.routes.review.agent == "codex") and
  (.routes.spec.workflow == "governed-doc")
' .ai-setup/task-router.json >/dev/null

bash -n .ai-setup/scripts/start-dev-task.sh

output="$("./.ai-setup/scripts/start-dev-task.sh" --type research --slug smoke-route --dry-run)"
printf '%s' "$output" | jq -e '
  .type == "research" and
  .workflow == "repo-research" and
  .model == "gpt-5.5" and
  .branch == "task/smoke-route" and
  (.worktree | endswith("/.worktrees/smoke-route"))
' >/dev/null

printf 'task-session assets OK\n'
