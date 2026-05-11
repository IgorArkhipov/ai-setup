#!/usr/bin/env bash

set -euo pipefail

PATH="${HOME}/.local/bin:/usr/local/bin:/opt/homebrew/bin:${PATH}"
export PATH

usage() {
	cat <<'EOF'
Usage: ./.ai-setup/scripts/start-dev-task.sh [options]

Create or reuse an isolated git worktree, run init.sh inside it, and open the
task in Zellij using a route from .ai-setup/task-router.json.

Options:
  --type TYPE          Task route key: impl, debug, research, review, spec
  --slug SLUG          Stable slug for worktree/session naming
  --branch BRANCH      Override branch name (default: task/<slug>)
  --prompt TEXT        Inline task prompt
  --prompt-file PATH   Read the task prompt from a file
  --base-ref REF       Base ref for new worktree creation (default: HEAD)
  --detached           Start a new Zellij session without attaching to it
  --dry-run            Print the resolved plan without creating anything
  -h, --help           Show this help
EOF
}

die() {
	printf 'Error: %s\n' "$1" >&2
	exit 1
}

need_cmd() {
	command -v "$1" >/dev/null 2>&1 || die "required command not found: $1"
}

resolve_tool() {
	local tool="$1"
	local path_value=""

	if path_value="$(command -v "$tool" 2>/dev/null)"; then
		printf '%s\n' "$path_value"
		return 0
	fi

	if command -v mise >/dev/null 2>&1; then
		if path_value="$(mise which "$tool" 2>/dev/null)"; then
			printf '%s\n' "$path_value"
			return 0
		fi
	fi

	die "required command not found: $tool"
}

slugify() {
	printf '%s' "$1" |
		tr '[:upper:]' '[:lower:]' |
		sed 's/[^a-z0-9._-]/-/g; s/--*/-/g; s/^-//; s/-$//'
}

validate_branch_name() {
	local branch_name="$1"
	git check-ref-format --branch "$branch_name" >/dev/null 2>&1 ||
		die "invalid branch name: $branch_name"
}

read_prompt_file() {
	local path="$1"
	[ -f "$path" ] || die "prompt file not found: $path"
	cat "$path"
}

is_env_path() {
	case "$1" in
	.env* | */.env*)
		return 0
		;;
	*)
		return 1
		;;
	esac
}

reject_env_path() {
	local path="$1"
	if is_env_path "$path"; then
		die "refusing to read .env* path: $path"
	fi
}

ensure_worktree_dir_is_ignored() {
	local repo_root="$1"
	mkdir -p "$repo_root/.worktrees"
	if (cd "$repo_root" && git check-ignore -q .worktrees); then
		return 0
	fi
	die ".worktrees is not ignored by git; add it to .gitignore before using this workflow"
}

ensure_worktree() {
	local repo_root="$1"
	local worktree_path="$2"
	local branch="$3"
	local base_ref="$4"
	local existing_branch

	if [ -d "$worktree_path" ]; then
		(cd "$worktree_path" && git rev-parse --show-toplevel >/dev/null 2>&1) ||
			die "existing path is not a git worktree: $worktree_path"
		existing_branch="$(git -C "$worktree_path" rev-parse --abbrev-ref HEAD)"
		[ "$existing_branch" = "$branch" ] ||
			die "worktree branch mismatch: expected $branch, got $existing_branch"
		return 0
	fi

	if git rev-parse --verify "$branch" >/dev/null 2>&1; then
		git -C "$repo_root" worktree add "$worktree_path" "$branch"
	else
		git -C "$repo_root" worktree add -b "$branch" "$worktree_path" "$base_ref"
	fi
}

run_init_step() {
	local worktree_path="$1"

	if [ -x "$worktree_path/init.sh" ]; then
		(cd "$worktree_path" && ./init.sh)
		return 0
	fi

	if [ -f "$worktree_path/init.sh" ]; then
		(cd "$worktree_path" && bash ./init.sh)
		return 0
	fi

	(cd "$worktree_path" && mise trust && direnv allow)
}

type=""
slug=""
branch=""
prompt=""
prompt_file=""
base_ref="HEAD"
detached=0
dry_run=0

while [ $# -gt 0 ]; do
	case "$1" in
	--type)
		shift
		[ $# -gt 0 ] || die "--type requires a value"
		type="$1"
		;;
	--slug)
		shift
		[ $# -gt 0 ] || die "--slug requires a value"
		slug="$1"
		;;
	--branch)
		shift
		[ $# -gt 0 ] || die "--branch requires a value"
		branch="$1"
		;;
	--prompt)
		shift
		[ $# -gt 0 ] || die "--prompt requires a value"
		prompt="$1"
		;;
	--prompt-file)
		shift
		[ $# -gt 0 ] || die "--prompt-file requires a value"
		prompt_file="$1"
		;;
	--base-ref)
		shift
		[ $# -gt 0 ] || die "--base-ref requires a value"
		base_ref="$1"
		;;
	--detached)
		detached=1
		;;
	--dry-run)
		dry_run=1
		;;
	-h | --help)
		usage
		exit 0
		;;
	*)
		die "unknown argument: $1"
		;;
	esac
	shift
done

[ -z "$prompt" ] || [ -z "$prompt_file" ] || die "use either --prompt or --prompt-file, not both"
if [ -n "$prompt_file" ]; then
	reject_env_path "$prompt_file"
fi

need_cmd git
need_cmd jq
need_cmd mise

repo_root="$(git rev-parse --show-toplevel)"
routes_file="$repo_root/.ai-setup/task-router.json"
[ -f "$routes_file" ] || die "task router config not found: $routes_file"

default_type="$(jq -r '.defaultType' "$routes_file")"
type="${type:-$default_type}"

route_exists="$(jq -r --arg type "$type" 'has("routes") and (.routes[$type] != null)' "$routes_file")"
[ "$route_exists" = "true" ] || die "unknown task type: $type"

workflow="$(jq -r --arg type "$type" '.routes[$type].workflow' "$routes_file")"
agent="$(jq -r --arg type "$type" '.routes[$type].agent' "$routes_file")"
model="$(jq -r --arg type "$type" '.routes[$type].model' "$routes_file")"
prompt_prefix="$(jq -r --arg type "$type" '.routes[$type].promptPrefix' "$routes_file")"

timestamp="$(date +%Y%m%d-%H%M%S)"
slug="$(slugify "${slug:-$type-$timestamp}")"
[ -n "$slug" ] || die "slug resolved to empty value"

branch="${branch:-task/$slug}"
validate_branch_name "$branch"
worktree_root="$repo_root/.worktrees"
worktree_path="$worktree_root/$slug"
repo_name="$(basename "$repo_root")"
session_name="${repo_name}-${slug}"
tab_name="${type}:${slug}"
user_shell="${SHELL:-/bin/bash}"
[ -x "$user_shell" ] || user_shell="/bin/bash"

if [ -n "$prompt_file" ]; then
	task_prompt="$(read_prompt_file "$prompt_file")"
elif [ -n "$prompt" ]; then
	task_prompt="$prompt"
else
	task_prompt="No explicit task text was provided. Use the current repository state plus the route contract below."
fi

full_prompt="${prompt_prefix}

Task route:
- type: ${type}
- workflow: ${workflow}
- agent: ${agent}
- model: ${model}
- worktree: ${worktree_path}
- branch: ${branch}
- router config: .ai-setup/task-router.json

User task:
${task_prompt}"

launcher_dir="$repo_root/tmp/task-launchers"
manifest_path="$launcher_dir/${slug}.json"
prompt_path="$launcher_dir/${slug}.prompt.txt"
launcher_path="$launcher_dir/${slug}.sh"

if [ "$dry_run" -eq 1 ]; then
	jq -n \
		--arg type "$type" \
		--arg workflow "$workflow" \
		--arg agent "$agent" \
		--arg model "$model" \
		--arg slug "$slug" \
		--arg branch "$branch" \
		--arg worktree "$worktree_path" \
		--arg session "$session_name" \
		--arg tab "$tab_name" \
		--arg baseRef "$base_ref" \
		--argjson detached "$detached" \
		'{
			type: $type,
			workflow: $workflow,
			agent: $agent,
			model: $model,
			slug: $slug,
			branch: $branch,
			worktree: $worktree,
			session: $session,
			tab: $tab,
			baseRef: $baseRef,
			detached: $detached
		}'
	exit 0
fi

codex_bin="$(resolve_tool codex)"
zellij_bin="$(resolve_tool zellij)"
direnv_bin="$(resolve_tool direnv)"
PATH="$(dirname "$codex_bin"):$(dirname "$zellij_bin"):$(dirname "$direnv_bin"):${PATH}"
export PATH
export ZELLIJ_SOCKET_DIR="${ZELLIJ_SOCKET_DIR:-/tmp/zellij-${UID:-$(id -u)}}"
mkdir -p "$ZELLIJ_SOCKET_DIR"

ensure_worktree_dir_is_ignored "$repo_root"
mkdir -p "$worktree_root" "$launcher_dir"
ensure_worktree "$repo_root" "$worktree_path" "$branch" "$base_ref"
run_init_step "$worktree_path"

printf '%s\n' "$full_prompt" >"$prompt_path"

jq -n \
	--arg type "$type" \
	--arg workflow "$workflow" \
	--arg agent "$agent" \
	--arg model "$model" \
	--arg slug "$slug" \
	--arg branch "$branch" \
	--arg worktree "$worktree_path" \
	--arg session "$session_name" \
	--arg tab "$tab_name" \
	--arg promptFile "$prompt_path" \
	--arg launcher "$launcher_path" \
	'{
		type: $type,
		workflow: $workflow,
		agent: $agent,
		model: $model,
		slug: $slug,
		branch: $branch,
		worktree: $worktree,
		session: $session,
	tab: $tab,
	promptFile: $promptFile,
	launcher: $launcher
	}' >"$manifest_path"

cat >"$launcher_path" <<EOF
#!/usr/bin/env bash
set -euo pipefail

PATH="\${HOME}/.local/bin:/usr/local/bin:/opt/homebrew/bin:\${PATH}"
export PATH
export ZELLIJ_SOCKET_DIR=$(printf '%q' "$ZELLIJ_SOCKET_DIR")

cd $(printf '%q' "$worktree_path")

printf 'Task route ready\n'
printf '  worktree: %s\n' $(printf '%q' "$worktree_path")
printf '  branch:   %s\n' $(printf '%q' "$branch")
printf '  type:     %s\n' $(printf '%q' "$type")
printf '  workflow: %s\n' $(printf '%q' "$workflow")
printf '  agent:    %s\n' $(printf '%q' "$agent")
printf '  model:    %s\n' $(printf '%q' "$model")
printf '  prompt:   %s\n\n' $(printf '%q' "$prompt_path")

prompt="\$(cat $(printf '%q' "$prompt_path"))"
if $(printf '%q' "$codex_bin") --cd $(printf '%q' "$worktree_path") --model $(printf '%q' "$model") --no-alt-screen "\$prompt"; then
	:
else
	status=\$?
	printf '\nCodex exited with status %s\n' "\$status"
fi

printf '\nDropping into %s at %s\n' $(printf '%q' "$user_shell") $(printf '%q' "$worktree_path")
exec $(printf '%q' "$user_shell") -l
EOF
chmod +x "$launcher_path"

printf 'Prepared task worktree %s on branch %s\n' "$worktree_path" "$branch"
printf 'Route: %s -> %s (%s)\n' "$type" "$workflow" "$model"

if [ -n "${ZELLIJ:-}" ]; then
	"$zellij_bin" action new-tab --name "$tab_name" --cwd "$worktree_path" -- "$launcher_path"
	printf 'Opened Zellij tab %s in the current session\n' "$tab_name"
else
	if [ "$detached" -eq 1 ]; then
		"$zellij_bin" options \
			--session-name "$session_name" \
			--attach-to-session false \
			--default-cwd "$worktree_path" \
			--default-shell "$launcher_path"
		printf 'Started detached Zellij session %s\n' "$session_name"
	else
		printf 'Starting Zellij session %s\n' "$session_name"
		cd "$worktree_path"
		SHELL="$launcher_path" exec "$zellij_bin" --session "$session_name"
	fi
fi
