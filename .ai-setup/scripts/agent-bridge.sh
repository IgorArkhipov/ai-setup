#!/usr/bin/env bash

set -euo pipefail

PATH="${HOME}/.local/bin:/usr/local/bin:/opt/homebrew/bin:${PATH}"
export PATH

usage() {
	printf '%s\n' "Usage: ./.ai-setup/scripts/agent-bridge.sh <command> [options]"
	printf '\n'
	printf '%s\n' "Commands:"
	printf '%s\n' "  validate      Validate an agent-neutral stage request JSON file"
	printf '%s\n' "  run-command   Run a command adapter from a stage request JSON file"
	printf '\n'
	printf '%s\n' "Options:"
	printf '%s\n' "  --request PATH   Stage or review request JSON"
	printf '%s\n' "  --command CMD    Adapter command for run-command"
	printf '%s\n' "  --json           Render JSON output"
	printf '%s\n' "  -h, --help       Show this help"
}

die() {
	printf 'Error: %s\n' "$1" >&2
	exit 1
}

need_cmd() {
	command -v "$1" >/dev/null 2>&1 || die "required command not found: $1"
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

validate_request() {
	reject_env_path "$request_file"
	[ -f "$request_file" ] || die "request file not found: $request_file"
	jq -e '
		.schema == "agent-workflow-stage-request/v1" and
		(.kind == "stage" or .kind == "review") and
		(.run_id | type == "string" and length > 0) and
		(.workflow | type == "string" and length > 0) and
		(.stage_id | type == "string" and length > 0) and
		(.prompt_file | type == "string" and length > 0) and
		(.result_file | type == "string" and length > 0) and
		(.worktree | type == "string" and length > 0) and
		(.state_dir | type == "string" and length > 0) and
		(.agent_hint | type == "string") and
		(.model_hint | type == "string")
	' "$request_file" >/dev/null || die "invalid stage request: $request_file"

	prompt_file="$(jq -r '.prompt_file' "$request_file")"
	result_file="$(jq -r '.result_file' "$request_file")"
	worktree="$(jq -r '.worktree' "$request_file")"
	state_dir="$(jq -r '.state_dir' "$request_file")"
	kind="$(jq -r '.kind' "$request_file")"
	reject_env_path "$prompt_file"
	reject_env_path "$result_file"
	[ -f "$prompt_file" ] || die "prompt file not found: $prompt_file"
	[ -d "$worktree" ] || die "worktree not found: $worktree"
	[ -d "$state_dir" ] || die "state directory not found: $state_dir"
}

render_validation_json() {
	jq \
		--arg status "valid" \
		'. + {status: $status}' \
		"$request_file"
}

run_command_adapter() {
	validate_request
	[ -n "$adapter_command" ] || die "run-command requires --command"

	mkdir -p "$(dirname "$result_file")"
	AGENT_WORKFLOW_RUN_ID="$(jq -r '.run_id' "$request_file")" \
	AGENT_WORKFLOW_WORKFLOW="$(jq -r '.workflow' "$request_file")" \
	AGENT_WORKFLOW_STAGE_ID="$(jq -r '.stage_id' "$request_file")" \
	AGENT_WORKFLOW_REQUEST_KIND="$kind" \
	AGENT_WORKFLOW_REQUEST_FILE="$request_file" \
	AGENT_WORKFLOW_PROMPT_FILE="$prompt_file" \
	AGENT_WORKFLOW_RESULT_FILE="$result_file" \
	AGENT_WORKFLOW_WORKTREE="$worktree" \
	AGENT_WORKFLOW_STATE_DIR="$state_dir" \
	AGENT_WORKFLOW_IMPLEMENTATION_PLAN="$(jq -r '.implementation_plan // ""' "$request_file")" \
	AGENT_WORKFLOW_CURRENT_MILESTONE_ID="$(jq -r '.current_milestone.id // ""' "$request_file")" \
	AGENT_WORKFLOW_CURRENT_MILESTONE_GOAL="$(jq -r '.current_milestone.goal // ""' "$request_file")" \
	AGENT_WORKFLOW_AGENT="$(jq -r '.agent_hint' "$request_file")" \
	AGENT_WORKFLOW_MODEL="$(jq -r '.model_hint' "$request_file")" \
		sh -c "$adapter_command"

	[ -f "$result_file" ] || die "adapter command did not write result file: $result_file"
}

need_cmd jq

command="${1:-}"
if [ -z "$command" ]; then
	usage
	exit 1
fi
shift

request_file=""
adapter_command=""
json=0

while [ $# -gt 0 ]; do
	case "$1" in
	--request)
		shift
		[ $# -gt 0 ] || die "--request requires a value"
		request_file="$1"
		;;
	--command)
		shift
		[ $# -gt 0 ] || die "--command requires a value"
		adapter_command="$1"
		;;
	--json)
		json=1
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

[ -n "$request_file" ] || die "$command requires --request"

case "$command" in
validate)
	validate_request
	if [ "$json" -eq 1 ]; then
		render_validation_json
	else
		printf 'status: valid\n'
		printf 'kind: %s\n' "$kind"
		printf 'stage: %s\n' "$(jq -r '.stage_id' "$request_file")"
		printf 'prompt_file: %s\n' "$prompt_file"
		printf 'result_file: %s\n' "$result_file"
	fi
	;;
run-command)
	run_command_adapter
	if [ "$json" -eq 1 ]; then
		jq -n \
			--arg status "completed" \
			--arg request_file "$request_file" \
			--arg result_file "$result_file" \
			'{status: $status, request_file: $request_file, result_file: $result_file}'
	else
		printf 'status: completed\n'
		printf 'request_file: %s\n' "$request_file"
		printf 'result_file: %s\n' "$result_file"
	fi
	;;
*)
	die "unknown command: $command"
	;;
esac
