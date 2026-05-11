#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$repo_root"

runner=".ai-setup/scripts/run-agent-workflow.sh"
workflow=".ai-setup/workflows/route-first.json"
stages_dir=".ai-setup/stages"
fixtures_dir=".ai-setup/test/fixtures/stage-results"

fail() {
	printf 'agent-workflow check failed: %s\n' "$1" >&2
	exit 1
}

assert_file() {
	[ -f "$1" ] || fail "missing file: $1"
}

assert_executable() {
	[ -x "$1" ] || fail "missing executable: $1"
}

assert_contains() {
	local haystack="$1"
	local needle="$2"
	printf '%s' "$haystack" | grep -Fq "$needle" || fail "expected output to contain: $needle"
}

assert_json_eq() {
	local json="$1"
	local query="$2"
	local expected="$3"
	local actual
	actual="$(printf '%s' "$json" | jq -r "$query")"
	[ "$actual" = "$expected" ] || fail "expected $query to be $expected, got $actual"
}

assert_file "$workflow"
assert_executable "$runner"
bash -n "$runner"

jq -e '.id == "route-first" and (.stages | type == "array") and (.stages | length > 0)' "$workflow" >/dev/null

while IFS= read -r stage_id; do
	stage_path="$stages_dir/$stage_id.json"
	assert_file "$stage_path"
	jq -e --arg id "$stage_id" '.id == $id and (.promptChain | type == "array")' "$stage_path" >/dev/null
	while IFS= read -r prompt_path; do
		case "$prompt_path" in
		.env* | */.env* | ./.env* | */.env/*)
			fail "stage $stage_id references forbidden .env* path: $prompt_path"
			;;
		esac
		assert_file "$prompt_path"
	done < <(jq -r '.promptChain[]' "$stage_path")
done < <(jq -r '.stages[]' "$workflow")

env_output="$("$runner" start --workflow route-first --slug env-guard --prompt-file .env.local --dry-run 2>&1 || true)"
assert_contains "$env_output" ".env"

start_json="$("$runner" start \
	--workflow route-first \
	--slug "Provider Auth" \
	--prompt "Add provider auth detection" \
	--now "2026-05-11 14:32" \
	--dry-run \
	--json)"
assert_json_eq "$start_json" '.run_id' '2026-05-11-1432-provider-auth'
assert_json_eq "$start_json" '.branch' 'task/2026-05-11-1432-provider-auth'
assert_json_eq "$start_json" '.current_stage' 'route-document'
assert_json_eq "$start_json" '.next_action' 'run_stage'

sandbox="$(mktemp -d)"
apply_run_id="2026-05-11-1433-provider-auth-apply"
apply_worktree="$sandbox/worktrees/$apply_run_id"
apply_branch="task/$apply_run_id"
none_run_id="2026-05-11-1434-no-doc-needed"
none_worktree="$sandbox/worktrees/$none_run_id"
none_branch="task/$none_run_id"

cleanup() {
	git -C "$repo_root" worktree remove --force "$apply_worktree" >/dev/null 2>&1 || true
	git -C "$repo_root" worktree remove --force "$none_worktree" >/dev/null 2>&1 || true
	git -C "$repo_root" branch -D "$apply_branch" >/dev/null 2>&1 || true
	git -C "$repo_root" branch -D "$none_branch" >/dev/null 2>&1 || true
	rm -rf "$sandbox"
}
trap cleanup EXIT

apply_json="$("$runner" start \
	--workflow route-first \
	--slug "Provider Auth Apply" \
	--prompt "Add provider auth detection" \
	--now "2026-05-11 14:33" \
	--state-root "$sandbox/agent-workflows" \
	--worktree-root "$sandbox/worktrees" \
	--apply \
	--json)"
run_id="$(printf '%s' "$apply_json" | jq -r '.run_id')"
manifest="$sandbox/agent-workflows/$run_id/run.json"
assert_file "$manifest"
jq -e '.run_id == "2026-05-11-1433-provider-auth-apply" and .current_stage == "route-document" and .next_action == "run_stage" and (.stage_history | type == "array") and (.stage_history | length == 0)' "$manifest" >/dev/null
assert_file "$sandbox/agent-workflows/$run_id/prompt.md"
[ -d "$apply_worktree" ] || fail "apply did not create worktree: $apply_worktree"
git -C "$apply_worktree" rev-parse --show-toplevel >/dev/null 2>&1 || fail "apply worktree is not a git worktree"

status_output="$("$runner" status --run-id "$run_id" --state-root "$sandbox/agent-workflows")"
assert_contains "$status_output" "current_stage: route-document"
assert_contains "$status_output" "next_action: run_stage"

resume_json="$("$runner" resume --run-id "$run_id" --state-root "$sandbox/agent-workflows" --dry-run --json)"
assert_json_eq "$resume_json" '.status' 'resume_ready'
assert_json_eq "$resume_json" '.current_stage' 'route-document'

stage_json="$("$runner" stage \
	--run-id "$run_id" \
	--stage route-document \
	--state-root "$sandbox/agent-workflows" \
	--dry-run \
	--json)"
assert_json_eq "$stage_json" '.status' 'stage_ready'
assert_json_eq "$stage_json" '.stage' 'route-document'
assert_json_eq "$stage_json" '.agent' 'codex'
assert_json_eq "$stage_json" '.model' 'gpt-5.5'
assert_json_eq "$stage_json" '.result_file' "$sandbox/agent-workflows/$run_id/stage-results/route-document.md"

stage_apply_json="$("$runner" stage \
	--run-id "$run_id" \
	--stage route-document \
	--state-root "$sandbox/agent-workflows" \
	--apply \
	--json)"
stage_prompt="$sandbox/agent-workflows/$run_id/stage-prompts/route-document.prompt.md"
assert_json_eq "$stage_apply_json" '.prompt_file' "$stage_prompt"
assert_file "$stage_prompt"
stage_prompt_text="$(cat "$stage_prompt")"
assert_contains "$stage_prompt_text" "# Agent Workflow Stage: route-document"
assert_contains "$stage_prompt_text" "run_id: $run_id"
assert_contains "$stage_prompt_text" "original_prompt:"
assert_contains "$stage_prompt_text" "Add provider auth detection"
assert_contains "$stage_prompt_text" "Expected outputs:"
assert_contains "$stage_prompt_text" "Next stage:"
assert_contains "$stage_prompt_text" "none"

none_json="$("$runner" start \
	--workflow route-first \
	--slug "No Doc Needed" \
	--prompt "No governed document is needed" \
	--now "2026-05-11 14:34" \
	--state-root "$sandbox/agent-workflows" \
	--worktree-root "$sandbox/worktrees" \
	--apply \
	--json)"
none_manifest="$sandbox/agent-workflows/$(printf '%s' "$none_json" | jq -r '.run_id')/run.json"
none_route_json="$("$runner" transition \
	--run-id "$none_run_id" \
	--stage route-document \
	--state-root "$sandbox/agent-workflows" \
	--result-file "$fixtures_dir/route-none.md" \
	--apply \
	--json)"
assert_json_eq "$none_route_json" '.next_action' 'stop_gate'
assert_json_eq "$none_route_json" '.stop_reason' 'no_governed_document'
jq -e '
	.current_stage == "route-document" and
	.next_action == "stop_gate" and
	.stop_reason == "no_governed_document" and
	.last_result.requested_next_stage == "none" and
	.last_result.stop_reason == "no_governed_document" and
	(.stage_history | length == 1)
' "$none_manifest" >/dev/null

route_transition_json="$("$runner" transition \
	--run-id "$run_id" \
	--stage route-document \
	--state-root "$sandbox/agent-workflows" \
	--result-file "$fixtures_dir/route-feature.md" \
	--apply \
	--json)"
assert_json_eq "$route_transition_json" '.status' 'accepted'
assert_json_eq "$route_transition_json" '.next_action' 'run_stage'
assert_json_eq "$route_transition_json" '.next_stage' 'draft-feature'
jq -e '
	.current_stage == "draft-feature" and
	.next_action == "run_stage" and
	.last_result.stage == "route-document" and
	.last_result.decision_action == "advance_or_gate" and
	.last_result.next_stage == "draft-feature" and
	(.stage_history | length == 1)
' "$manifest" >/dev/null

wrong_stage_output="$("$runner" transition \
	--run-id "$run_id" \
	--stage review-feature \
	--state-root "$sandbox/agent-workflows" \
	--result-file "$fixtures_dir/accepted.md" \
	--apply \
	2>&1 || true)"
assert_contains "$wrong_stage_output" "current stage is draft-feature"

resume_stage_json="$("$runner" resume \
	--run-id "$run_id" \
	--state-root "$sandbox/agent-workflows" \
	--apply \
	--json)"
assert_json_eq "$resume_stage_json" '.status' 'stage_ready'
assert_json_eq "$resume_stage_json" '.stage' 'draft-feature'
resume_stage_prompt="$sandbox/agent-workflows/$run_id/stage-prompts/draft-feature.prompt.md"
assert_json_eq "$resume_stage_json" '.prompt_file' "$resume_stage_prompt"
assert_file "$resume_stage_prompt"
resume_stage_prompt_text="$(cat "$resume_stage_prompt")"
assert_contains "$resume_stage_prompt_text" "# Agent Workflow Stage: draft-feature"
assert_contains "$resume_stage_prompt_text" "Expected outputs:"

draft_transition_json="$("$runner" transition \
	--run-id "$run_id" \
	--stage draft-feature \
	--state-root "$sandbox/agent-workflows" \
	--result-file "$fixtures_dir/accepted.md" \
	--apply \
	--json)"
assert_json_eq "$draft_transition_json" '.status' 'accepted'
assert_json_eq "$draft_transition_json" '.next_action' 'run_stage'
jq -e '
	.current_stage == "review-feature" and
	.next_action == "run_stage" and
	.last_result.status == "accepted" and
	.last_result.decision_action == "advance_or_gate" and
	.last_result.next_stage == "review-feature" and
	(.stage_history | length == 2)
' "$manifest" >/dev/null

review_transition_json="$("$runner" transition \
	--run-id "$run_id" \
	--stage review-feature \
	--state-root "$sandbox/agent-workflows" \
	--result-file "$fixtures_dir/needs_polish.md" \
	--apply \
	--json)"
assert_json_eq "$review_transition_json" '.status' 'needs_polish'
assert_json_eq "$review_transition_json" '.next_action' 'run_stage'
jq -e '
	.current_stage == "polish-feature" and
	.next_action == "run_stage" and
	.last_result.status == "needs_polish" and
	.last_result.open_findings == 2 and
	.last_result.stage == "review-feature" and
	.last_result.decision_action == "polish_current" and
	.last_result.next_stage == "polish-feature" and
	.last_result.result_file == "'"$fixtures_dir"'/needs_polish.md" and
	(.stage_history | length == 3) and
	.stage_history[0].stage == "route-document" and
	.stage_history[2].next_action == "run_stage"
' "$manifest" >/dev/null

polish_transition_json="$("$runner" transition \
	--run-id "$run_id" \
	--stage polish-feature \
	--state-root "$sandbox/agent-workflows" \
	--result-file "$fixtures_dir/accepted.md" \
	--apply \
	--json)"
assert_json_eq "$polish_transition_json" '.next_action' 'run_stage'
jq -e '
	.current_stage == "review-feature" and
	.next_action == "run_stage" and
	.last_result.decision_action == "advance_or_gate" and
	.last_result.next_stage == "review-feature" and
	(.stage_history | length == 4)
' "$manifest" >/dev/null

review_accept_json="$("$runner" transition \
	--run-id "$run_id" \
	--stage review-feature \
	--state-root "$sandbox/agent-workflows" \
	--result-file "$fixtures_dir/accepted.md" \
	--apply \
	--json)"
assert_json_eq "$review_accept_json" '.next_action' 'stop_gate'
jq -e '
	.current_stage == "review-feature" and
	.next_action == "stop_gate" and
	.stop_reason == "stop_gate" and
	.last_result.decision_action == "advance_or_gate" and
	.last_result.next_stage == "" and
	.last_result.stop_reason == "stop_gate" and
	(.stage_history | length == 5)
' "$manifest" >/dev/null
resume_stop_json="$("$runner" resume --run-id "$run_id" --state-root "$sandbox/agent-workflows" --dry-run --json)"
assert_json_eq "$resume_stop_json" '.next_action' 'stop_gate'
assert_json_eq "$resume_stop_json" '.stop_reason' 'stop_gate'
resume_stop_apply_json="$("$runner" resume --run-id "$run_id" --state-root "$sandbox/agent-workflows" --apply --json)"
assert_json_eq "$resume_stop_apply_json" '.status' 'stopped'
assert_json_eq "$resume_stop_apply_json" '.next_action' 'stop_gate'
assert_json_eq "$resume_stop_apply_json" '.stop_reason' 'stop_gate'
status_stop_output="$("$runner" status --run-id "$run_id" --state-root "$sandbox/agent-workflows")"
assert_contains "$status_stop_output" "stop_reason: stop_gate"
assert_contains "$status_stop_output" "last_result_stage: review-feature"
assert_contains "$status_stop_output" "last_result_status: accepted"

bad_id="2026-05-11-1500-bad"
mkdir -p "$sandbox/agent-workflows/$bad_id"
printf '{"run_id":"%s"}\n' "$bad_id" >"$sandbox/agent-workflows/$bad_id/run.json"
bad_output="$("$runner" resume --run-id "$bad_id" --state-root "$sandbox/agent-workflows" --dry-run 2>&1 || true)"
assert_contains "$bad_output" "missing current_stage"

for status in accepted needs_polish needs_upstream blocked needs_human failed; do
	result="$fixtures_dir/$status.md"
	assert_file "$result"
	transition_json="$("$runner" transition --result-file "$result" --dry-run --json)"
	assert_json_eq "$transition_json" '.status' "$status"
done

accepted_with_findings="$("$runner" transition --result-file "$fixtures_dir/accepted-with-open-findings.md" --dry-run --json)"
assert_json_eq "$accepted_with_findings" '.next_action' 'stop_blocked'

printf 'agent-workflow assets OK\n'
