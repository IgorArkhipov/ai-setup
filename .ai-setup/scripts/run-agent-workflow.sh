#!/usr/bin/env bash

set -euo pipefail

PATH="${HOME}/.local/bin:/usr/local/bin:/opt/homebrew/bin:${PATH}"
export PATH

usage() {
	cat <<'EOF'
Usage: ./.ai-setup/scripts/run-agent-workflow.sh <command> [options]

Commands:
  start       Plan or create a timestamped workflow run
  status      Show current run state
  resume      Validate and report the next resumable action
  stage       Compose one stage command without executing live agents
  transition  Parse a stage result and report the next action

Common options:
  --workflow NAME       Workflow id, default: route-first
  --slug SLUG           Human-readable run label
  --prompt TEXT         Inline source prompt
  --prompt-file PATH    Source prompt file; .env* paths are rejected
  --base-ref REF        Base ref for new worktree creation, default: HEAD
  --run-id RUN_ID       Existing workflow run id
  --stage STAGE_ID      Stage id for stage command
  --state-root PATH     Run-state root, default: tmp/agent-workflows
  --worktree-root PATH  Worktree root, default: .worktrees
  --now "YYYY-MM-DD HH:MM"
  --result-file PATH    Stage result file for transition checks
  --apply               Write run state for start
  --dry-run             Validate without live agent execution
  --json                Render JSON output
  -h, --help            Show this help
EOF
}

die() {
	printf 'Error: %s\n' "$1" >&2
	exit 1
}

need_cmd() {
	command -v "$1" >/dev/null 2>&1 || die "required command not found: $1"
}

slugify() {
	printf '%s' "$1" |
		tr '[:upper:]' '[:lower:]' |
		sed 's/[^a-z0-9._-]/-/g; s/--*/-/g; s/^-//; s/-$//'
}

is_env_path() {
	case "$1" in
	.env | .env.* | */.env | */.env.*)
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

abs_path() {
	local path="$1"
	case "$path" in
	/*)
		printf '%s\n' "$path"
		;;
	*)
		printf '%s/%s\n' "$repo_root" "$path"
		;;
	esac
}

timestamp_prefix() {
	local value="$1"
	if [ -n "$value" ]; then
		printf '%s\n' "$value" | sed 's/://g; s/[[:space:]]/-/g'
		return 0
	fi

	date '+%Y-%m-%d-%H%M'
}

workflow_file() {
	local workflow_id="$1"
	printf '%s/.ai-setup/workflows/%s.json\n' "$repo_root" "$workflow_id"
}

stage_file() {
	local stage_id="$1"
	printf '%s/.ai-setup/stages/%s.json\n' "$repo_root" "$stage_id"
}

read_manifest() {
	local path="$1"
	[ -f "$path" ] || die "run manifest not found: $path"
	jq -e '.run_id and .workflow and .current_stage and .next_action and (.stage_history | type == "array")' "$path" >/dev/null ||
		die "run manifest is missing current_stage, next_action, workflow, run_id, or stage_history: $path"
}

ensure_worktree_root_safe() {
	local root="$1"
	local rel_path

	case "$root" in
	"$repo_root"/*)
		rel_path="${root#$repo_root/}"
		if git -C "$repo_root" check-ignore -q "$rel_path"; then
			mkdir -p "$root"
			return 0
		fi
		die "$rel_path is not ignored by git; add it to .gitignore before using this workflow"
		;;
	esac
	mkdir -p "$root"
}

ensure_worktree() {
	local worktree="$1"
	local branch_name="$2"
	local base_ref_value="$3"

	if [ -d "$worktree" ]; then
		(cd "$worktree" && git rev-parse --show-toplevel >/dev/null 2>&1) ||
			die "existing path is not a git worktree: $worktree"
		return 0
	fi

	if git -C "$repo_root" rev-parse --verify "$branch_name" >/dev/null 2>&1; then
		git -C "$repo_root" worktree add --quiet "$worktree" "$branch_name"
	else
		git -C "$repo_root" worktree add --quiet -b "$branch_name" "$worktree" "$base_ref_value"
	fi
}

extract_result_field() {
	local field="$1"
	local path="$2"
	awk -F': *' -v field="$field" '$1 == field { print $2; exit }' "$path"
}

transition_next_action() {
	local status="$1"
	local open_findings="$2"

	if [ "$status" = "accepted" ] && [ "$open_findings" -gt 0 ]; then
		printf 'stop_blocked\n'
		return 0
	fi

	case "$status" in
	accepted)
		printf 'advance_or_gate\n'
		;;
	needs_polish)
		printf 'polish_current\n'
		;;
	needs_upstream)
		printf 'backtrack_upstream\n'
		;;
	blocked)
		printf 'stop_blocked\n'
		;;
	needs_human)
		printf 'stop_needs_human\n'
		;;
	failed)
		printf 'stop_failed\n'
		;;
	*)
		die "unknown stage result status: $status"
		;;
	esac
}

stage_family() {
	local stage="$1"

	case "$stage" in
	draft-*)
		printf '%s\n' "${stage#draft-}"
		;;
	review-*)
		printf '%s\n' "${stage#review-}"
		;;
	polish-*)
		printf '%s\n' "${stage#polish-}"
		;;
	*)
		printf '\n'
		;;
	esac
}

resolve_transition_target() {
	local stage="$1"
	local decision_action="$2"
	local family
	local candidate

	resolved_next_action="$decision_action"
	resolved_next_stage=""

	family="$(stage_family "$stage")"
	case "$decision_action" in
	advance_or_gate)
		case "$stage" in
		draft-* | polish-*)
			candidate="review-$family"
			[ -f "$(stage_file "$candidate")" ] || die "next review stage not found: $candidate"
			resolved_next_stage="$candidate"
			resolved_next_action="run_stage"
			;;
		review-*)
			resolved_next_action="stop_gate"
			;;
		esac
		;;
	polish_current)
		[ -n "$family" ] || die "cannot polish stage without a stage family: $stage"
		candidate="polish-$family"
		[ -f "$(stage_file "$candidate")" ] || die "next polish stage not found: $candidate"
		resolved_next_stage="$candidate"
		resolved_next_action="run_stage"
		;;
	esac
}

write_stage_prompt() {
	local stage="$1"
	local stage_path="$2"
	local manifest_path="$3"
	local prompt_path="$4"
	local result_path="$5"
	local prompt_dir
	local source_prompt

	prompt_dir="${prompt_path%/*}"
	source_prompt="$state_dir/prompt.md"
	[ -f "$source_prompt" ] || die "source prompt not found: $source_prompt"
	mkdir -p "$prompt_dir"

	{
		printf '# Agent Workflow Stage: %s\n\n' "$stage"
		printf '## Run metadata\n\n'
		jq -r '
			"- run_id: \(.run_id)",
			"- workflow: \(.workflow)",
			"- slug: \(.slug)",
			"- branch: \(.branch)",
			"- worktree: \(.worktree)",
			"- current_stage: \(.current_stage)",
			"- next_action: \(.next_action)"
		' "$manifest_path"

		printf '\n## Original prompt\n\n'
		printf 'original_prompt:\n'
		sed 's/^/  /' "$source_prompt"

		printf '\n\n## Prompt chain\n'
		while IFS= read -r chain_path; do
			reject_env_path "$chain_path"
			[ -f "$repo_root/$chain_path" ] || die "prompt-chain file not found: $chain_path"
			printf '\n### %s\n\n' "$chain_path"
			cat "$repo_root/$chain_path"
			printf '\n'
		done < <(jq -r '.promptChain[]' "$stage_path")

		printf '\n## Output contract\n\n'
		printf 'Expected outputs:\n'
		jq -r '.outputs[] | "- " + .' "$stage_path"
		printf '\nStage result file:\n'
		printf -- '- %s\n\n' "$result_path"
		printf 'The stage result must include these parseable fields:\n'
		printf -- '- Status: accepted | needs_polish | needs_upstream | blocked | needs_human | failed\n'
		printf -- '- Open findings: <non-negative integer>\n'
	} >"$prompt_path"
}

render_start_json() {
	jq -n \
		--arg run_id "$run_id" \
		--arg workflow "$workflow" \
		--arg slug "$slug" \
		--arg branch "$branch" \
		--arg worktree "$worktree_path" \
		--arg state_dir "$state_dir" \
		--arg current_stage "$current_stage" \
		--arg next_action "$next_action" \
		--arg status "$run_status" \
		'{
			run_id: $run_id,
			workflow: $workflow,
			slug: $slug,
			branch: $branch,
			worktree: $worktree,
			state_dir: $state_dir,
			current_stage: $current_stage,
			next_action: $next_action,
			status: $status,
			stage_history: []
		}'
}

need_cmd git
need_cmd jq
repo_root="$(git rev-parse --show-toplevel)"

command="${1:-}"
if [ -z "$command" ]; then
	usage
	exit 1
fi
shift

workflow="route-first"
slug=""
prompt=""
prompt_file=""
run_id=""
state_root="tmp/agent-workflows"
worktree_root=".worktrees"
base_ref="HEAD"
now=""
result_file=""
stage_id=""
apply=0
dry_run=0
json=0

while [ $# -gt 0 ]; do
	case "$1" in
	--workflow)
		shift
		[ $# -gt 0 ] || die "--workflow requires a value"
		workflow="$1"
		;;
	--slug)
		shift
		[ $# -gt 0 ] || die "--slug requires a value"
		slug="$1"
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
	--run-id)
		shift
		[ $# -gt 0 ] || die "--run-id requires a value"
		run_id="$1"
		;;
	--state-root)
		shift
		[ $# -gt 0 ] || die "--state-root requires a value"
		state_root="$1"
		;;
	--worktree-root)
		shift
		[ $# -gt 0 ] || die "--worktree-root requires a value"
		worktree_root="$1"
		;;
	--base-ref)
		shift
		[ $# -gt 0 ] || die "--base-ref requires a value"
		base_ref="$1"
		;;
	--now)
		shift
		[ $# -gt 0 ] || die "--now requires a value"
		now="$1"
		;;
	--result-file)
		shift
		[ $# -gt 0 ] || die "--result-file requires a value"
		result_file="$1"
		;;
	--stage)
		shift
		[ $# -gt 0 ] || die "--stage requires a value"
		stage_id="$1"
		;;
	--apply)
		apply=1
		;;
	--dry-run)
		dry_run=1
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

case "$command" in
start)
	[ -n "$slug" ] || die "start requires --slug"
	[ -z "$prompt" ] || [ -z "$prompt_file" ] || die "use either --prompt or --prompt-file, not both"
	[ -n "$prompt" ] || [ -n "$prompt_file" ] || die "start requires --prompt or --prompt-file"
	if [ -n "$prompt_file" ]; then
		reject_env_path "$prompt_file"
	fi

	wf_file="$(workflow_file "$workflow")"
	[ -f "$wf_file" ] || die "workflow not found: $wf_file"
	current_stage="$(jq -r '.initialStage' "$wf_file")"
	[ -f "$(stage_file "$current_stage")" ] || die "initial stage not found: $current_stage"

	slug="$(slugify "$slug")"
	[ -n "$slug" ] || die "slug resolved to empty value"
	run_id="$(timestamp_prefix "$now")-$slug"
	branch="task/$run_id"
	state_root_abs="$(abs_path "$state_root")"
	worktree_root_abs="$(abs_path "$worktree_root")"
	state_dir="$state_root_abs/$run_id"
	worktree_path="$worktree_root_abs/$run_id"
	next_action="run_stage"
	run_status="$([ "$apply" -eq 1 ] && printf 'created' || printf 'dry-run')"

	if [ "$apply" -eq 1 ]; then
		ensure_worktree_root_safe "$worktree_root_abs"
		ensure_worktree "$worktree_path" "$branch" "$base_ref"
		mkdir -p "$state_dir/stage-results"
		if [ -n "$prompt_file" ]; then
			cp "$prompt_file" "$state_dir/prompt.md"
		else
			printf '%s\n' "$prompt" >"$state_dir/prompt.md"
		fi
		render_start_json >"$state_dir/run.json"
	fi

	if [ "$json" -eq 1 ]; then
		render_start_json
	else
		printf 'run_id: %s\n' "$run_id"
		printf 'workflow: %s\n' "$workflow"
		printf 'current_stage: %s\n' "$current_stage"
		printf 'next_action: %s\n' "$next_action"
		printf 'branch: %s\n' "$branch"
		printf 'worktree: %s\n' "$worktree_path"
		printf 'state_dir: %s\n' "$state_dir"
	fi
	;;
status | resume)
	[ -n "$run_id" ] || die "$command requires --run-id"
	state_root_abs="$(abs_path "$state_root")"
	manifest="$state_root_abs/$run_id/run.json"
	read_manifest "$manifest"
	if [ "$command" = "resume" ]; then
		output="$(jq '. + {status: "resume_ready"}' "$manifest")"
	else
		output="$(cat "$manifest")"
	fi

	if [ "$json" -eq 1 ]; then
		printf '%s\n' "$output"
	else
		printf 'run_id: %s\n' "$(printf '%s' "$output" | jq -r '.run_id')"
		printf 'workflow: %s\n' "$(printf '%s' "$output" | jq -r '.workflow')"
		printf 'current_stage: %s\n' "$(printf '%s' "$output" | jq -r '.current_stage')"
		printf 'next_action: %s\n' "$(printf '%s' "$output" | jq -r '.next_action')"
	fi
	;;
stage)
	[ -n "$run_id" ] || die "stage requires --run-id"
	[ -n "$stage_id" ] || die "stage requires --stage"
	state_root_abs="$(abs_path "$state_root")"
	manifest="$state_root_abs/$run_id/run.json"
	read_manifest "$manifest"
	stage_path="$(stage_file "$stage_id")"
	[ -f "$stage_path" ] || die "stage config not found: $stage_path"
	agent="$(jq -r '.agent' "$stage_path")"
	model="$(jq -r '.model' "$stage_path")"
	first_output="$(jq -r '.outputs[0]' "$stage_path")"
	state_dir="$state_root_abs/$run_id"
	prompt_path="$state_dir/stage-prompts/$stage_id.prompt.md"
	case "$first_output" in
	stage-results/*)
		result_path="$state_dir/$first_output"
		;;
	*)
		result_path="$repo_root/$first_output"
		;;
	esac
	command_text="codex --cd $(jq -r '.worktree' "$manifest") --model $model --no-alt-screen \"$prompt_path\""
	if [ "$apply" -eq 1 ]; then
		write_stage_prompt "$stage_id" "$stage_path" "$manifest" "$prompt_path" "$result_path"
	fi
	if [ "$json" -eq 1 ]; then
		prompt_chain_json="$(jq -c '.promptChain' "$stage_path")"
		jq -n \
			--arg status "stage_ready" \
			--arg stage "$stage_id" \
			--arg agent "$agent" \
			--arg model "$model" \
			--arg prompt_file "$prompt_path" \
			--arg result_file "$result_path" \
			--arg command "$command_text" \
			--argjson prompt_chain "$prompt_chain_json" \
			'{
				status: $status,
				stage: $stage,
				agent: $agent,
				model: $model,
				prompt_file: $prompt_file,
				result_file: $result_file,
				command: $command,
				prompt_chain: $prompt_chain
			}'
	else
		printf 'status: stage_ready\n'
		printf 'stage: %s\n' "$stage_id"
		printf 'agent: %s\n' "$agent"
		printf 'model: %s\n' "$model"
		printf 'prompt_file: %s\n' "$prompt_path"
		printf 'result_file: %s\n' "$result_path"
		printf 'command: %s\n' "$command_text"
	fi
	;;
transition)
	[ -n "$result_file" ] || die "transition requires --result-file"
	reject_env_path "$result_file"
	[ -f "$result_file" ] || die "stage result not found: $result_file"
	status="$(extract_result_field "Status" "$result_file")"
	[ -n "$status" ] || die "stage result missing Status: $result_file"
	open_findings="$(extract_result_field "Open findings" "$result_file")"
	open_findings="${open_findings:-0}"
	target_artifact="$(extract_result_field "Target artifact" "$result_file")"
	case "$open_findings" in
	'' | *[!0-9]*)
		die "Open findings must be a non-negative integer: $open_findings"
		;;
	esac
	decision_action="$(transition_next_action "$status" "$open_findings")"
	resolved_next_action="$decision_action"
	resolved_next_stage=""
	if [ "$apply" -eq 1 ]; then
		[ -n "$run_id" ] || die "transition --apply requires --run-id"
		[ -n "$stage_id" ] || die "transition --apply requires --stage"
		state_root_abs="$(abs_path "$state_root")"
		manifest="$state_root_abs/$run_id/run.json"
		read_manifest "$manifest"
		resolve_transition_target "$stage_id" "$decision_action"
		tmp_manifest="$(mktemp)"
		jq \
			--arg stage "$stage_id" \
			--arg status "$status" \
			--arg decision_action "$decision_action" \
			--arg next_action "$resolved_next_action" \
			--arg next_stage "$resolved_next_stage" \
			--arg result_file "$result_file" \
			--arg target_artifact "$target_artifact" \
			--argjson open_findings "$open_findings" \
			'
				.next_action = $next_action
				| if $next_stage != "" then .current_stage = $next_stage else . end
				| .last_result = {
					stage: $stage,
					status: $status,
					decision_action: $decision_action,
					next_action: $next_action,
					next_stage: $next_stage,
					open_findings: $open_findings,
					result_file: $result_file,
					target_artifact: $target_artifact
				}
				| .stage_history = (.stage_history + [.last_result])
			' "$manifest" >"$tmp_manifest"
		mv "$tmp_manifest" "$manifest"
	fi
	if [ "$json" -eq 1 ]; then
		jq -n \
			--arg status "$status" \
			--arg next_action "$resolved_next_action" \
			--arg decision_action "$decision_action" \
			--arg next_stage "$resolved_next_stage" \
			--argjson open_findings "$open_findings" \
			'{status: $status, decision_action: $decision_action, next_action: $next_action, next_stage: $next_stage, open_findings: $open_findings}'
	else
		printf 'status: %s\n' "$status"
		printf 'decision_action: %s\n' "$decision_action"
		printf 'next_action: %s\n' "$resolved_next_action"
		printf 'next_stage: %s\n' "$resolved_next_stage"
		printf 'open_findings: %s\n' "$open_findings"
	fi
	;;
*)
	die "unknown command: $command"
	;;
esac
