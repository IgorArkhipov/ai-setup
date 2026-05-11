#!/usr/bin/env bash

set -euo pipefail

PATH="${HOME}/.local/bin:/usr/local/bin:/opt/homebrew/bin:${PATH}"
export PATH

usage() {
	cat <<'EOF'
Usage: ./.ai-setup/scripts/run-agent-workflow.sh <command> [options]

Commands:
  run         Execute a full workflow pipeline until it stops
  start       Plan or create a timestamped workflow run
  status      Show current run state
  resume      Validate and report the next resumable action
  stage       Compose one stage command without executing live agents
  step        Execute exactly one current stage and transition it
  transition  Parse a stage result and report the next action

Common options:
  --workflow NAME       Workflow id, default: route-first
  --slug SLUG           Human-readable run label
  --prompt TEXT         Inline source prompt
  --prompt-file PATH    Source prompt file; .env* paths are rejected
  --implementation-plan PATH
                      Accepted implementation plan for milestone workflow
  --base-ref REF        Base ref for new worktree creation, default: HEAD
  --run-id RUN_ID       Existing workflow run id
  --stage STAGE_ID      Stage id for stage command
  --state-root PATH     Run-state root, default: tmp/agent-workflows
  --worktree-root PATH  Worktree root, default: .worktrees
  --now "YYYY-MM-DD HH:MM"
  --result-file PATH    Stage result file for transition checks
  --stage-command CMD   Shell command used by run/step; receives AGENT_WORKFLOW_* env vars
  --claude-review       Run Claude second-opinion review after accepted review stages
  --review-command CMD  Shell command for Claude review; receives AGENT_WORKFLOW_* env vars
  --max-steps N         Maximum stages executed by run, default: 20
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

validate_branch_name() {
	local branch_name="$1"
	git check-ref-format --branch "$branch_name" >/dev/null 2>&1 ||
		die "invalid branch name: $branch_name"
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
	jq -e '.run_id and .workflow and .worktree and .current_stage and .next_action and (.stage_history | type == "array")' "$path" >/dev/null ||
		die "run manifest is missing current_stage, next_action, workflow, run_id, worktree, or stage_history: $path"
}

extract_milestones_json() {
	local plan_path="$1"
	awk '
		BEGIN { first = 1; print "[" }
		/^\|[[:space:]]*`?(STEP|MS|TASK)-[A-Za-z0-9._-]+`?[[:space:]]*\|/ {
			line = $0
			gsub(/^\|/, "", line)
			gsub(/\|$/, "", line)
			n = split(line, raw, "|")
			for (i = 1; i <= n; i++) {
				gsub(/^[[:space:]]+|[[:space:]]+$/, "", raw[i])
				gsub(/^`|`$/, "", raw[i])
			}
			id = raw[1]
			goal = raw[3]
			if (goal == "") {
				goal = raw[2]
			}
			gsub(/\\/,"\\\\", id)
			gsub(/"/,"\\\"", id)
			gsub(/\\/,"\\\\", goal)
			gsub(/"/,"\\\"", goal)
			if (!first) {
				print ","
			}
			printf "  {\"id\":\"%s\",\"goal\":\"%s\"}", id, goal
			first = 0
		}
		END { print "\n]" }
	' "$plan_path"
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
	local existing_branch

	if [ -d "$worktree" ]; then
		(cd "$worktree" && git rev-parse --show-toplevel >/dev/null 2>&1) ||
			die "existing path is not a git worktree: $worktree"
		existing_branch="$(git -C "$worktree" rev-parse --abbrev-ref HEAD)"
		[ "$existing_branch" = "$branch_name" ] ||
			die "worktree branch mismatch: expected $branch_name, got $existing_branch"
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
	awk -v field="$field" '
		{
			sub(/\r$/, "", $0)
			prefix = field ":"
			if (index($0, prefix) == 1) {
				value = substr($0, length(prefix) + 1)
				sub(/^ */, "", value)
				print value
				exit
			}
		}
	' "$path"
}

target_artifact_path() {
	local artifact="$1"
	local worktree="$2"

	case "$artifact" in
	/*)
		printf '%s\n' "$artifact"
		;;
	*)
		printf '%s/%s\n' "$worktree" "$artifact"
		;;
	esac
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
	local requested_next_stage="$3"
	local family
	local candidate

	resolved_next_action="$decision_action"
	resolved_next_stage=""
	resolved_stop_reason=""

	family="$(stage_family "$stage")"
	case "$decision_action" in
	advance_or_gate)
		case "$stage" in
		route-document)
			[ -n "$requested_next_stage" ] || die "route-document accepted result requires Next stage"
			if [ "$requested_next_stage" = "none" ]; then
				resolved_next_action="stop_gate"
				resolved_stop_reason="no_governed_document"
				return 0
			fi
			case "$requested_next_stage" in
			draft-prd | draft-use-case | draft-adr | draft-feature)
				;;
			*)
				die "invalid route next stage: $requested_next_stage"
				;;
			esac
			[ -f "$(stage_file "$requested_next_stage")" ] || die "route next stage not found: $requested_next_stage"
			resolved_next_stage="$requested_next_stage"
			resolved_next_action="run_stage"
			;;
		implement-milestone | polish-milestone)
			resolved_next_stage="review-milestone"
			resolved_next_action="run_stage"
			;;
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
	backtrack_upstream)
		case "$stage" in
		review-milestone | polish-milestone)
			resolved_next_stage="implement-milestone"
			resolved_next_action="run_stage"
			;;
		review-* | polish-*)
			[ -n "$family" ] || die "cannot backtrack stage without a stage family: $stage"
			candidate="draft-$family"
			[ -f "$(stage_file "$candidate")" ] || die "upstream draft stage not found: $candidate"
			resolved_next_stage="$candidate"
			resolved_next_action="run_stage"
			;;
		esac
		;;
	esac

	if [ "$resolved_next_action" != "run_stage" ] && [ -z "$resolved_stop_reason" ]; then
		resolved_stop_reason="$resolved_next_action"
	fi
}

write_stage_prompt() {
	local stage="$1"
	local stage_path="$2"
	local manifest_path="$3"
	local prompt_path="$4"
	local result_path="$5"
	local prompt_dir
	local previous_result_file
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

		if jq -e '.last_result?' "$manifest_path" >/dev/null; then
			printf '\n\n## Previous stage result\n\n'
			jq -r '
				"- previous_result_stage: \(.last_result.stage)",
				"- previous_result_status: \(.last_result.status)",
				"- previous_result_next_action: \(.last_result.next_action)",
				"- previous_result_next_stage: \(.last_result.next_stage)",
				"- previous_result_open_findings: \(.last_result.open_findings)",
				"- previous_result_file: \(.last_result.result_file)"
			' "$manifest_path"
			previous_result_file="$(jq -r '.last_result.result_file // ""' "$manifest_path")"
			if [ -n "$previous_result_file" ]; then
				reject_env_path "$previous_result_file"
				printf '\nPrevious result content:\n\n'
				if [ -f "$previous_result_file" ]; then
					cat "$previous_result_file"
					printf '\n'
				else
					printf 'Previous result file is not available at prompt-preparation time.\n'
				fi
			fi
		fi

		if jq -e '.current_milestone?' "$manifest_path" >/dev/null; then
			printf '\n\n## Current implementation milestone\n\n'
			jq -r '
				"- milestone_index: \(.current_milestone_index)",
				"- milestone_id: \(.current_milestone.id)",
				"- milestone_goal: \(.current_milestone.goal)",
				"- implementation_plan: \(.implementation_plan)"
			' "$manifest_path"
		fi

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
		printf -- '- Target artifact: <repo-relative path | absolute path | none>\n'
		printf -- '- Open findings: <non-negative integer>\n'
		if [ "$stage" = "route-document" ]; then
			printf -- '- Next stage: draft-prd | draft-use-case | draft-adr | draft-feature | none\n'
		fi
	} >"$prompt_path"
}

write_claude_review_prompt() {
	local review_prompt_path="$1"
	local review_result_path="$2"
	local primary_result_path="$3"
	local target_artifact_value
	local target_artifact_abs
	local manifest_worktree
	local prompt_dir

	prompt_dir="${review_prompt_path%/*}"
	mkdir -p "$prompt_dir"
	target_artifact_value="$(extract_result_field "Target artifact" "$primary_result_path")"
	manifest_worktree="$(jq -r '.worktree' "$manifest")"
	target_artifact_abs=""
	if [ -n "$target_artifact_value" ] && [ "$target_artifact_value" != "none" ]; then
		target_artifact_abs="$(target_artifact_path "$target_artifact_value" "$manifest_worktree")"
	fi

	{
		printf '# Claude Code Second-Opinion Review\n\n'
		printf 'You are performing an independent second-opinion review for an agentic workflow stage.\n\n'
		printf 'Constraints:\n'
		printf -- '- This is a review pass for repository work in `%s`.\n' "$manifest_worktree"
		printf -- '- Do not read or use `.env*` files.\n'
		printf -- '- Write your final parseable result to `%s`.\n' "$review_result_path"
		printf -- '- If review cannot run, use `Status: needs_human` or `Status: blocked`; do not silently accept.\n\n'
		printf 'Run metadata:\n'
		jq -r '
			"- run_id: \(.run_id)",
			"- workflow: \(.workflow)",
			"- current_stage: \(.current_stage)",
			"- worktree: \(.worktree)"
		' "$manifest"
		printf -- '- primary_result_file: %s\n' "$primary_result_path"
		printf -- '- target_artifact: %s\n' "${target_artifact_value:-none}"
		if [ -n "$target_artifact_abs" ]; then
			printf -- '- target_artifact_absolute: %s\n' "$target_artifact_abs"
		fi

		printf '\nPrimary review result:\n\n'
		cat "$primary_result_path"
		printf '\n\nReview the target artifact and produce this exact stage-result contract:\n\n'
		printf 'Status: accepted | needs_polish | needs_upstream | blocked | needs_human | failed\n'
		printf 'Target artifact: %s\n' "${target_artifact_value:-none}"
		printf 'Open findings: <non-negative integer>\n\n'
		printf 'Use `accepted` only when the artifact is ready. Use `needs_polish` for current-artifact fixes, `needs_upstream` when the plan/design/input must change first, and `needs_human` when a human decision is required.\n'
	} >"$review_prompt_path"
}

render_stage_json() {
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
}

prepare_stage() {
	stage_path="$(stage_file "$stage_id")"
	[ -f "$stage_path" ] || die "stage config not found: $stage_path"
	agent="$(jq -r '.agent' "$stage_path")"
	model="$(jq -r '.model' "$stage_path")"
	state_dir="$state_root_abs/$run_id"
	prompt_path="$state_dir/stage-prompts/$stage_id.prompt.md"
	result_path="$state_dir/stage-results/$stage_id.md"
	command_text="codex exec --cd $(jq -r '.worktree' "$manifest") --model $model \"\$(cat $prompt_path)\""
	if [ "$apply" -eq 1 ]; then
		write_stage_prompt "$stage_id" "$stage_path" "$manifest" "$prompt_path" "$result_path"
	fi
}

stage_requires_target_artifact() {
	local stage="$1"
	local stage_path_value

	[ "$stage" != "route-document" ] || return 1
	stage_path_value="$(stage_file "$stage")"
	[ -f "$stage_path_value" ] || die "stage config not found: $stage_path_value"
	[ "$(jq -r 'if has("targetArtifactRequired") then .targetArtifactRequired else true end' "$stage_path_value")" = "true" ]
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
		--arg implementation_plan "$implementation_plan_abs" \
		--argjson milestones "$milestones_json" \
		'
		{
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
		}
		| if $implementation_plan != "" then
			.implementation_plan = $implementation_plan
			| .milestones = $milestones
			| .current_milestone_index = 0
			| .current_milestone = $milestones[0]
		else . end
		'
}

initialize_run_state() {
	[ -n "$slug" ] || die "$command requires --slug"
	[ -z "$prompt" ] || [ -z "$prompt_file" ] || die "use either --prompt or --prompt-file, not both"
	[ -n "$prompt" ] || [ -n "$prompt_file" ] || [ -n "$implementation_plan" ] || die "$command requires --prompt, --prompt-file, or --implementation-plan"
	if [ -n "$prompt_file" ]; then
		reject_env_path "$prompt_file"
	fi
	if [ -n "$implementation_plan" ]; then
		reject_env_path "$implementation_plan"
		implementation_plan_abs="$(abs_path "$implementation_plan")"
		[ -f "$implementation_plan_abs" ] || die "implementation plan not found: $implementation_plan_abs"
		milestones_json="$(extract_milestones_json "$implementation_plan_abs")"
		[ "$(printf '%s' "$milestones_json" | jq 'length')" -gt 0 ] ||
			die "implementation plan has no milestone rows: $implementation_plan_abs"
	else
		implementation_plan_abs=""
		milestones_json="[]"
	fi

	wf_file="$(workflow_file "$workflow")"
	[ -f "$wf_file" ] || die "workflow not found: $wf_file"
	current_stage="$(jq -r '.initialStage' "$wf_file")"
	[ -f "$(stage_file "$current_stage")" ] || die "initial stage not found: $current_stage"

	slug="$(slugify "$slug")"
	[ -n "$slug" ] || die "slug resolved to empty value"
	run_id="$(timestamp_prefix "$now")-$slug"
	branch="task/$run_id"
	validate_branch_name "$branch"
	state_root_abs="$(abs_path "$state_root")"
	worktree_root_abs="$(abs_path "$worktree_root")"
	state_dir="$state_root_abs/$run_id"
	worktree_path="$worktree_root_abs/$run_id"
	next_action="run_stage"
	run_status="$([ "$apply" -eq 1 ] && printf 'created' || printf 'dry-run')"

	if [ "$apply" -eq 1 ]; then
		ensure_worktree_root_safe "$state_root_abs"
		ensure_worktree_root_safe "$worktree_root_abs"
		[ ! -f "$state_dir/run.json" ] || die "run already initialized: $state_dir/run.json"
		ensure_worktree "$worktree_path" "$branch" "$base_ref"
		mkdir -p "$state_dir/stage-results"
		if [ -n "$prompt_file" ]; then
			cp "$prompt_file" "$state_dir/prompt.md"
		else
			if [ -n "$prompt" ]; then
				printf '%s\n' "$prompt" >"$state_dir/prompt.md"
			else
				printf 'Execute accepted implementation plan: %s\n' "$implementation_plan_abs" >"$state_dir/prompt.md"
			fi
		fi
		render_start_json >"$state_dir/run.json"
	fi
}

run_stage_agent() {
	local manifest_worktree
	local command_body

	manifest_worktree="$(jq -r '.worktree' "$manifest")"
	command_body="${stage_command:-}"
	if [ -n "$command_body" ]; then
		AGENT_WORKFLOW_RUN_ID="$run_id" \
			AGENT_WORKFLOW_STAGE_ID="$stage_id" \
			AGENT_WORKFLOW_PROMPT_FILE="$prompt_path" \
			AGENT_WORKFLOW_RESULT_FILE="$result_path" \
			AGENT_WORKFLOW_WORKTREE="$manifest_worktree" \
			AGENT_WORKFLOW_STATE_DIR="$state_dir" \
			AGENT_WORKFLOW_IMPLEMENTATION_PLAN="$(jq -r '.implementation_plan // ""' "$manifest")" \
			AGENT_WORKFLOW_CURRENT_MILESTONE_ID="$(jq -r '.current_milestone.id // ""' "$manifest")" \
			AGENT_WORKFLOW_CURRENT_MILESTONE_GOAL="$(jq -r '.current_milestone.goal // ""' "$manifest")" \
			AGENT_WORKFLOW_AGENT="$agent" \
			AGENT_WORKFLOW_MODEL="$model" \
			sh -c "$command_body"
	else
		need_cmd codex
		codex exec --cd "$manifest_worktree" --model "$model" "$(cat "$prompt_path")"
	fi

	[ -f "$result_path" ] || die "stage command did not write result file: $result_path"
}

should_run_claude_review() {
	[ "$claude_review" -eq 1 ] || return 1
	case "$stage_id" in
	review-*)
		;;
	*)
		return 1
		;;
	esac
	[ "$(extract_result_field "Status" "$result_path")" = "accepted" ] || return 1
	return 0
}

run_claude_review_agent() {
	local manifest_worktree
	local command_body

	manifest_worktree="$(jq -r '.worktree' "$manifest")"
	review_prompt_path="$state_dir/stage-review-prompts/$stage_id.claude.prompt.md"
	review_result_path="$state_dir/stage-results/$stage_id.claude.md"
	write_claude_review_prompt "$review_prompt_path" "$review_result_path" "$result_path"

	command_body="${review_command:-}"
	if [ -n "$command_body" ]; then
		AGENT_WORKFLOW_RUN_ID="$run_id" \
			AGENT_WORKFLOW_STAGE_ID="$stage_id" \
			AGENT_WORKFLOW_PROMPT_FILE="$prompt_path" \
			AGENT_WORKFLOW_RESULT_FILE="$result_path" \
			AGENT_WORKFLOW_REVIEW_PROMPT_FILE="$review_prompt_path" \
			AGENT_WORKFLOW_REVIEW_RESULT_FILE="$review_result_path" \
			AGENT_WORKFLOW_WORKTREE="$manifest_worktree" \
			AGENT_WORKFLOW_STATE_DIR="$state_dir" \
			AGENT_WORKFLOW_IMPLEMENTATION_PLAN="$(jq -r '.implementation_plan // ""' "$manifest")" \
			AGENT_WORKFLOW_CURRENT_MILESTONE_ID="$(jq -r '.current_milestone.id // ""' "$manifest")" \
			AGENT_WORKFLOW_CURRENT_MILESTONE_GOAL="$(jq -r '.current_milestone.goal // ""' "$manifest")" \
			AGENT_WORKFLOW_AGENT="claude" \
			AGENT_WORKFLOW_MODEL="$model" \
			sh -c "$command_body"
	else
		need_cmd claude
		claude -p "$(cat "$review_prompt_path")" >"$review_result_path"
	fi

	[ -f "$review_result_path" ] || die "Claude review did not write result file: $review_result_path"
	result_path="$review_result_path"
}

execute_current_stage() {
	local manifest_next_action

	read_manifest "$manifest"
	manifest_next_action="$(jq -r '.next_action' "$manifest")"
	[ "$manifest_next_action" = "run_stage" ] ||
		die "cannot execute stage; next_action is $manifest_next_action"

	stage_id="$(jq -r '.current_stage' "$manifest")"
	prepare_stage
	run_stage_agent
	if should_run_claude_review; then
		run_claude_review_agent
	fi
	"$0" transition \
		--run-id "$run_id" \
		--stage "$stage_id" \
		--state-root "$state_root_abs" \
		--result-file "$result_path" \
		--apply \
		--json >/dev/null
}

render_execution_json() {
	jq \
		--arg status "$pipeline_status" \
		--argjson steps "$pipeline_steps" \
		'. + {status: $status, steps: $steps}' \
		"$manifest"
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
implementation_plan=""
stage_command="${AGENT_WORKFLOW_STAGE_COMMAND:-}"
review_command="${AGENT_WORKFLOW_REVIEW_COMMAND:-}"
claude_review=0
max_steps=20
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
	--implementation-plan)
		shift
		[ $# -gt 0 ] || die "--implementation-plan requires a value"
		implementation_plan="$1"
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
	--stage-command)
		shift
		[ $# -gt 0 ] || die "--stage-command requires a value"
		stage_command="$1"
		;;
	--review-command)
		shift
		[ $# -gt 0 ] || die "--review-command requires a value"
		review_command="$1"
		;;
	--claude-review)
		claude_review=1
		;;
	--max-steps)
		shift
		[ $# -gt 0 ] || die "--max-steps requires a value"
		max_steps="$1"
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

case "$max_steps" in
'' | *[!0-9]*)
	die "--max-steps must be a non-negative integer: $max_steps"
	;;
esac

case "$command" in
run)
	[ "$apply" -eq 1 ] || die "run requires --apply"
	[ "$dry_run" -eq 0 ] || die "run does not support --dry-run; use start/resume/stage/transition"
	if [ -z "$run_id" ]; then
		initialize_run_state
	else
		state_root_abs="$(abs_path "$state_root")"
	fi

	manifest="$state_root_abs/$run_id/run.json"
	read_manifest "$manifest"
	pipeline_steps=0
	while [ "$(jq -r '.next_action' "$manifest")" = "run_stage" ]; do
		[ "$pipeline_steps" -lt "$max_steps" ] ||
			die "max steps reached before workflow stopped: $max_steps"
		execute_current_stage
		pipeline_steps=$((pipeline_steps + 1))
		read_manifest "$manifest"
	done
	pipeline_status="stopped"
	if [ "$json" -eq 1 ]; then
		render_execution_json
	else
		printf 'status: %s\n' "$pipeline_status"
		printf 'run_id: %s\n' "$run_id"
		printf 'steps: %s\n' "$pipeline_steps"
		printf 'current_stage: %s\n' "$(jq -r '.current_stage' "$manifest")"
		printf 'next_action: %s\n' "$(jq -r '.next_action' "$manifest")"
		if [ "$(jq -r '.stop_reason // ""' "$manifest")" != "" ]; then
			printf 'stop_reason: %s\n' "$(jq -r '.stop_reason' "$manifest")"
		fi
	fi
	;;
start)
	initialize_run_state

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
step)
	[ "$apply" -eq 1 ] || die "step requires --apply"
	[ "$dry_run" -eq 0 ] || die "step does not support --dry-run; use stage/transition"
	[ -n "$run_id" ] || die "step requires --run-id"
	state_root_abs="$(abs_path "$state_root")"
	manifest="$state_root_abs/$run_id/run.json"
	read_manifest "$manifest"
	pipeline_steps=1
	execute_current_stage
	read_manifest "$manifest"
	pipeline_status="step_complete"
	if [ "$json" -eq 1 ]; then
		render_execution_json
	else
		printf 'status: %s\n' "$pipeline_status"
		printf 'run_id: %s\n' "$run_id"
		printf 'steps: %s\n' "$pipeline_steps"
		printf 'current_stage: %s\n' "$(jq -r '.current_stage' "$manifest")"
		printf 'next_action: %s\n' "$(jq -r '.next_action' "$manifest")"
	fi
	;;
status | resume)
	[ -n "$run_id" ] || die "$command requires --run-id"
	state_root_abs="$(abs_path "$state_root")"
	manifest="$state_root_abs/$run_id/run.json"
	read_manifest "$manifest"
	if [ "$command" = "resume" ]; then
		if [ "$apply" -eq 1 ] && [ "$(jq -r '.next_action' "$manifest")" = "run_stage" ]; then
			stage_id="$(jq -r '.current_stage' "$manifest")"
			prepare_stage
			if [ "$json" -eq 1 ]; then
				render_stage_json
			else
				printf 'status: stage_ready\n'
				printf 'stage: %s\n' "$stage_id"
				printf 'agent: %s\n' "$agent"
				printf 'model: %s\n' "$model"
				printf 'prompt_file: %s\n' "$prompt_path"
				printf 'result_file: %s\n' "$result_path"
				printf 'command: %s\n' "$command_text"
			fi
			exit 0
		fi
		if [ "$(jq -r '.next_action' "$manifest")" != "run_stage" ]; then
			output="$(jq '. + {status: "stopped"}' "$manifest")"
		else
			output="$(jq '. + {status: "resume_ready"}' "$manifest")"
		fi
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
		if [ "$(printf '%s' "$output" | jq -r '.stop_reason // ""')" != "" ]; then
			printf 'stop_reason: %s\n' "$(printf '%s' "$output" | jq -r '.stop_reason')"
		fi
		if [ "$(printf '%s' "$output" | jq -r '.last_result.stage // ""')" != "" ]; then
			printf 'last_result_stage: %s\n' "$(printf '%s' "$output" | jq -r '.last_result.stage')"
			printf 'last_result_status: %s\n' "$(printf '%s' "$output" | jq -r '.last_result.status')"
			printf 'last_result_next_action: %s\n' "$(printf '%s' "$output" | jq -r '.last_result.next_action')"
		fi
	fi
	;;
stage)
	[ -n "$run_id" ] || die "stage requires --run-id"
	[ -n "$stage_id" ] || die "stage requires --stage"
	state_root_abs="$(abs_path "$state_root")"
	manifest="$state_root_abs/$run_id/run.json"
	read_manifest "$manifest"
	if [ "$apply" -eq 1 ]; then
		manifest_next_action="$(jq -r '.next_action' "$manifest")"
		[ "$manifest_next_action" = "run_stage" ] ||
			die "cannot prepare stage $stage_id; next_action is $manifest_next_action"
		manifest_stage="$(jq -r '.current_stage' "$manifest")"
		[ "$stage_id" = "$manifest_stage" ] ||
			die "cannot prepare stage $stage_id; current stage is $manifest_stage"
	fi
	prepare_stage
	if [ "$json" -eq 1 ]; then
		render_stage_json
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
	requested_next_stage="$(extract_result_field "Next stage" "$result_file")"
	case "$open_findings" in
	'' | *[!0-9]*)
		die "Open findings must be a non-negative integer: $open_findings"
		;;
	esac
	decision_action="$(transition_next_action "$status" "$open_findings")"
	resolved_next_action="$decision_action"
	resolved_next_stage=""
	resolved_stop_reason=""
	if [ "$apply" -eq 1 ]; then
		[ -n "$run_id" ] || die "transition --apply requires --run-id"
		[ -n "$stage_id" ] || die "transition --apply requires --stage"
		state_root_abs="$(abs_path "$state_root")"
		manifest="$state_root_abs/$run_id/run.json"
		read_manifest "$manifest"
		manifest_next_action="$(jq -r '.next_action' "$manifest")"
		[ "$manifest_next_action" = "run_stage" ] ||
			die "cannot apply transition for $stage_id; next_action is $manifest_next_action"
		manifest_stage="$(jq -r '.current_stage' "$manifest")"
		[ "$stage_id" = "$manifest_stage" ] ||
			die "cannot apply transition for $stage_id; current stage is $manifest_stage"
		if [ "$status" = "accepted" ] && [ "$open_findings" -eq 0 ] && stage_requires_target_artifact "$stage_id"; then
			[ -n "$target_artifact" ] || die "accepted result requires Target artifact"
			reject_env_path "$target_artifact"
			target_path="$(target_artifact_path "$target_artifact" "$(jq -r '.worktree' "$manifest")")"
			[ -f "$target_path" ] || die "target artifact not found: $target_path"
		fi
		resolve_transition_target "$stage_id" "$decision_action" "$requested_next_stage"
		milestone_has_next=0
		milestone_next_index=0
		if [ "$(jq -r '.workflow' "$manifest")" = "implementation-plan" ] &&
			[ "$stage_id" = "review-milestone" ] &&
			[ "$status" = "accepted" ] &&
			[ "$open_findings" -eq 0 ]; then
			milestone_next_index="$(($(jq -r '.current_milestone_index' "$manifest") + 1))"
			if [ "$milestone_next_index" -lt "$(jq -r '.milestones | length' "$manifest")" ]; then
				milestone_has_next=1
				resolved_next_action="run_stage"
				resolved_next_stage="implement-milestone"
				resolved_stop_reason=""
			else
				resolved_next_action="stop_gate"
				resolved_next_stage=""
				resolved_stop_reason="all_milestones_accepted"
			fi
		fi
		tmp_manifest="$(mktemp)"
		jq \
			--arg stage "$stage_id" \
			--arg status "$status" \
			--arg decision_action "$decision_action" \
			--arg next_action "$resolved_next_action" \
			--arg next_stage "$resolved_next_stage" \
			--arg stop_reason "$resolved_stop_reason" \
			--arg requested_next_stage "$requested_next_stage" \
			--arg result_file "$result_file" \
			--arg target_artifact "$target_artifact" \
			--argjson open_findings "$open_findings" \
			--argjson milestone_has_next "$milestone_has_next" \
			--argjson milestone_next_index "$milestone_next_index" \
			'
				.next_action = $next_action
				| if $next_stage != "" then .current_stage = $next_stage else . end
				| if $stop_reason != "" then .stop_reason = $stop_reason else del(.stop_reason) end
				| if $milestone_has_next == 1 then
					.current_milestone_index = $milestone_next_index
					| .current_milestone = .milestones[$milestone_next_index]
				else . end
				| .last_result = {
					stage: $stage,
					status: $status,
					decision_action: $decision_action,
					next_action: $next_action,
					next_stage: $next_stage,
					stop_reason: $stop_reason,
					requested_next_stage: $requested_next_stage,
					open_findings: $open_findings,
					result_file: $result_file,
					target_artifact: $target_artifact
				}
				| .stage_history = (.stage_history + [.last_result])
			' "$manifest" >"$tmp_manifest"
		mv "$tmp_manifest" "$manifest"
	elif [ -n "$stage_id" ]; then
		resolve_transition_target "$stage_id" "$decision_action" "$requested_next_stage"
	else
		case "$decision_action" in
		stop_*)
			resolved_next_action="$decision_action"
			resolved_stop_reason="$decision_action"
			;;
		*)
			resolved_next_action="unresolved"
			;;
		esac
	fi
	if [ "$json" -eq 1 ]; then
		jq -n \
			--arg status "$status" \
			--arg next_action "$resolved_next_action" \
			--arg decision_action "$decision_action" \
			--arg next_stage "$resolved_next_stage" \
			--arg stop_reason "$resolved_stop_reason" \
			--arg requested_next_stage "$requested_next_stage" \
			--argjson open_findings "$open_findings" \
			'{status: $status, decision_action: $decision_action, next_action: $next_action, next_stage: $next_stage, stop_reason: $stop_reason, requested_next_stage: $requested_next_stage, open_findings: $open_findings}'
	else
		printf 'status: %s\n' "$status"
		printf 'decision_action: %s\n' "$decision_action"
		printf 'next_action: %s\n' "$resolved_next_action"
		printf 'next_stage: %s\n' "$resolved_next_stage"
		printf 'stop_reason: %s\n' "$resolved_stop_reason"
		printf 'open_findings: %s\n' "$open_findings"
	fi
	;;
*)
	die "unknown command: $command"
	;;
esac
