#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$repo_root"

runner=".ai-setup/scripts/run-agent-workflow.sh"
workflow=".ai-setup/workflows/route-first.json"
stages_dir=".ai-setup/stages"
fixtures_dir=".ai-setup/test/fixtures/stage-results"
fake_agent="$repo_root/.ai-setup/test/fixtures/fake-stage-agent.sh"
fake_accepting_agent="$repo_root/.ai-setup/test/fixtures/fake-stage-agent-accepting-review.sh"
fake_claude_reviewer="$repo_root/.ai-setup/test/fixtures/fake-claude-reviewer.sh"
fake_implementation_agent="$repo_root/.ai-setup/test/fixtures/fake-implementation-agent.sh"

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
assert_executable "$fake_agent"
assert_executable "$fake_accepting_agent"
assert_executable "$fake_claude_reviewer"
assert_executable "$fake_implementation_agent"
bash -n "$runner"
bash -n "$fake_agent"
bash -n "$fake_accepting_agent"
bash -n "$fake_claude_reviewer"
bash -n "$fake_implementation_agent"

jq -e '.id == "route-first" and (.stages | type == "array") and (.stages | length > 0)' "$workflow" >/dev/null

while IFS= read -r stage_id; do
	stage_path="$stages_dir/$stage_id.json"
	assert_file "$stage_path"
	jq -e --arg id "$stage_id" '.id == $id and (.promptChain | type == "array")' "$stage_path" >/dev/null
	while IFS= read -r prompt_path; do
		case "$prompt_path" in
		.env* | */.env*)
			fail "stage $stage_id references forbidden .env* path: $prompt_path"
			;;
		esac
		assert_file "$prompt_path"
	done < <(jq -r '.promptChain[]' "$stage_path")
done < <(jq -r '.stages[]' "$workflow")

env_output="$("$runner" start --workflow route-first --slug env-guard --prompt-file .envrc --dry-run 2>&1 || true)"
assert_contains "$env_output" ".env"

bad_slug_output="$("$runner" start --workflow route-first --slug "bad..slug" --prompt "Bad slug" --dry-run 2>&1 || true)"
assert_contains "$bad_slug_output" "invalid branch name"

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
sandbox_tag="$(basename "$sandbox" | tr '[:upper:]' '[:lower:]')"
apply_slug="provider-auth-apply-$sandbox_tag"
none_slug="no-doc-needed-$sandbox_tag"
step_slug="step-demo-$sandbox_tag"
pipeline_slug="pipeline-demo-$sandbox_tag"
apply_run_id="2026-05-11-1433-$apply_slug"
apply_worktree="$sandbox/worktrees/$apply_run_id"
apply_branch="task/$apply_run_id"
none_run_id="2026-05-11-1434-$none_slug"
none_worktree="$sandbox/worktrees/$none_run_id"
none_branch="task/$none_run_id"
step_run_id="2026-05-11-1435-$step_slug"
step_worktree="$sandbox/worktrees/$step_run_id"
step_branch="task/$step_run_id"
pipeline_run_id="2026-05-11-1436-$pipeline_slug"
pipeline_worktree="$sandbox/worktrees/$pipeline_run_id"
pipeline_branch="task/$pipeline_run_id"
claude_review_slug="claude-review-demo-$sandbox_tag"
claude_review_run_id="2026-05-11-1438-$claude_review_slug"
claude_review_worktree="$sandbox/worktrees/$claude_review_run_id"
claude_review_branch="task/$claude_review_run_id"
implementation_slug="implementation-demo-$sandbox_tag"
implementation_run_id="2026-05-11-1439-$implementation_slug"
implementation_worktree="$sandbox/worktrees/$implementation_run_id"
implementation_branch="task/$implementation_run_id"
mismatch_slug="branch-mismatch-$sandbox_tag"
mismatch_run_id="2026-05-11-1437-$mismatch_slug"
mismatch_worktree="$sandbox/worktrees/$mismatch_run_id"
mismatch_branch="task/$mismatch_run_id"
mismatch_existing_branch="task/$mismatch_run_id-existing"

cleanup() {
	git -C "$repo_root" worktree remove --force "$apply_worktree" >/dev/null 2>&1 || true
	git -C "$repo_root" worktree remove --force "$none_worktree" >/dev/null 2>&1 || true
	git -C "$repo_root" worktree remove --force "$step_worktree" >/dev/null 2>&1 || true
	git -C "$repo_root" worktree remove --force "$pipeline_worktree" >/dev/null 2>&1 || true
	git -C "$repo_root" worktree remove --force "$claude_review_worktree" >/dev/null 2>&1 || true
	git -C "$repo_root" worktree remove --force "$implementation_worktree" >/dev/null 2>&1 || true
	git -C "$repo_root" worktree remove --force "$mismatch_worktree" >/dev/null 2>&1 || true
	git -C "$repo_root" branch -D "$apply_branch" >/dev/null 2>&1 || true
	git -C "$repo_root" branch -D "$none_branch" >/dev/null 2>&1 || true
	git -C "$repo_root" branch -D "$step_branch" >/dev/null 2>&1 || true
	git -C "$repo_root" branch -D "$pipeline_branch" >/dev/null 2>&1 || true
	git -C "$repo_root" branch -D "$claude_review_branch" >/dev/null 2>&1 || true
	git -C "$repo_root" branch -D "$implementation_branch" >/dev/null 2>&1 || true
	git -C "$repo_root" branch -D "$mismatch_branch" >/dev/null 2>&1 || true
	git -C "$repo_root" branch -D "$mismatch_existing_branch" >/dev/null 2>&1 || true
	rm -rf "$sandbox"
}
trap cleanup EXIT

apply_json="$("$runner" start \
	--workflow route-first \
	--slug "$apply_slug" \
	--prompt "Add provider auth detection" \
	--now "2026-05-11 14:33" \
	--state-root "$sandbox/agent-workflows" \
	--worktree-root "$sandbox/worktrees" \
	--apply \
	--json)"
run_id="$(printf '%s' "$apply_json" | jq -r '.run_id')"
manifest="$sandbox/agent-workflows/$run_id/run.json"
assert_file "$manifest"
jq -e --arg run_id "$apply_run_id" '.run_id == $run_id and .current_stage == "route-document" and .next_action == "run_stage" and (.stage_history | type == "array") and (.stage_history | length == 0)' "$manifest" >/dev/null
assert_file "$sandbox/agent-workflows/$run_id/prompt.md"
[ -d "$apply_worktree" ] || fail "apply did not create worktree: $apply_worktree"
git -C "$apply_worktree" rev-parse --show-toplevel >/dev/null 2>&1 || fail "apply worktree is not a git worktree"

duplicate_output="$("$runner" start \
	--workflow route-first \
	--slug "$apply_slug" \
	--prompt "Replace existing run" \
	--now "2026-05-11 14:33" \
	--state-root "$sandbox/agent-workflows" \
	--worktree-root "$sandbox/worktrees" \
	--apply \
	2>&1 || true)"
assert_contains "$duplicate_output" "run already initialized"

tracked_state_output="$("$runner" start \
	--workflow route-first \
	--slug "Tracked State $sandbox_tag" \
	--prompt "Reject tracked state root" \
	--now "2026-05-11 14:34" \
	--state-root memory-bank/state \
	--worktree-root "$sandbox/worktrees" \
	--apply \
	2>&1 || true)"
assert_contains "$tracked_state_output" "not ignored by git"

git -C "$repo_root" branch "$mismatch_existing_branch" HEAD
git -C "$repo_root" worktree add --quiet "$mismatch_worktree" "$mismatch_existing_branch"
mismatch_output="$("$runner" start \
	--workflow route-first \
	--slug "$mismatch_slug" \
	--prompt "Reject mismatched worktree branch" \
	--now "2026-05-11 14:37" \
	--state-root "$sandbox/agent-workflows" \
	--worktree-root "$sandbox/worktrees" \
	--apply \
	2>&1 || true)"
assert_contains "$mismatch_output" "worktree branch mismatch"

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
assert_contains "$stage_prompt_text" "Target artifact:"
assert_contains "$stage_prompt_text" "Next stage:"
assert_contains "$stage_prompt_text" "none"

interactive_stage_json="$("$runner" stage \
	--run-id "$run_id" \
	--stage route-document \
	--state-root "$sandbox/agent-workflows" \
	--interactive \
	--apply \
	--json)"
interactive_launcher="$sandbox/agent-workflows/$run_id/stage-launchers/route-document.sh"
assert_json_eq "$interactive_stage_json" '.status' 'interactive_ready'
assert_json_eq "$interactive_stage_json" '.launcher_file' "$interactive_launcher"
assert_json_eq "$interactive_stage_json" '.launched' 'false'
assert_file "$interactive_launcher"
assert_contains "$(cat "$interactive_launcher")" "codex --cd"
assert_contains "$(cat "$interactive_launcher")" "$stage_prompt"

route_transition_dry_json="$("$runner" transition \
	--stage route-document \
	--result-file "$fixtures_dir/route-feature.md" \
	--dry-run \
	--json)"
assert_json_eq "$route_transition_dry_json" '.next_action' 'run_stage'
assert_json_eq "$route_transition_dry_json" '.next_stage' 'draft-feature'

upstream_transition_dry_json="$("$runner" transition \
	--stage review-feature \
	--result-file "$fixtures_dir/needs_upstream.md" \
	--dry-run \
	--json)"
assert_json_eq "$upstream_transition_dry_json" '.next_action' 'run_stage'
assert_json_eq "$upstream_transition_dry_json" '.next_stage' 'draft-feature'

accepted_unresolved_json="$("$runner" transition \
	--result-file "$fixtures_dir/accepted.md" \
	--dry-run \
	--json)"
assert_json_eq "$accepted_unresolved_json" '.decision_action' 'advance_or_gate'
assert_json_eq "$accepted_unresolved_json" '.next_action' 'unresolved'

invalid_route_result="$sandbox/invalid-route.md"
cat >"$invalid_route_result" <<'EOF'
Status: accepted
Target artifact: none
Open findings: 0
Next stage: review-feature
EOF
invalid_route_output="$("$runner" transition \
	--stage route-document \
	--result-file "$invalid_route_result" \
	--dry-run \
	--json \
	2>&1 || true)"
assert_contains "$invalid_route_output" "invalid route next stage"

none_json="$("$runner" start \
	--workflow route-first \
	--slug "$none_slug" \
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

wrong_stage_prompt_output="$("$runner" stage \
	--run-id "$run_id" \
	--stage review-feature \
	--state-root "$sandbox/agent-workflows" \
	--apply \
	2>&1 || true)"
assert_contains "$wrong_stage_prompt_output" "current stage is draft-feature"

missing_target_output="$("$runner" transition \
	--run-id "$run_id" \
	--stage draft-feature \
	--state-root "$sandbox/agent-workflows" \
	--result-file "$fixtures_dir/accepted-missing-target.md" \
	--apply \
	2>&1 || true)"
assert_contains "$missing_target_output" "target artifact not found"
jq -e '
	.current_stage == "draft-feature" and
	.next_action == "run_stage" and
	(.stage_history | length == 1)
' "$manifest" >/dev/null

resume_stage_json="$("$runner" resume \
	--run-id "$run_id" \
	--state-root "$sandbox/agent-workflows" \
	--apply \
	--json)"
assert_json_eq "$resume_stage_json" '.status' 'stage_ready'
assert_json_eq "$resume_stage_json" '.stage' 'draft-feature'
resume_stage_prompt="$sandbox/agent-workflows/$run_id/stage-prompts/draft-feature.prompt.md"
assert_json_eq "$resume_stage_json" '.prompt_file' "$resume_stage_prompt"
assert_json_eq "$resume_stage_json" '.result_file' "$sandbox/agent-workflows/$run_id/stage-results/draft-feature.md"
assert_file "$resume_stage_prompt"
resume_stage_prompt_text="$(cat "$resume_stage_prompt")"
assert_contains "$resume_stage_prompt_text" "# Agent Workflow Stage: draft-feature"
assert_contains "$resume_stage_prompt_text" "## Previous stage result"
assert_contains "$resume_stage_prompt_text" "previous_result_stage: route-document"
assert_contains "$resume_stage_prompt_text" "previous_result_status: accepted"
assert_contains "$resume_stage_prompt_text" "Next stage: draft-feature"
assert_contains "$resume_stage_prompt_text" "Expected outputs:"
assert_contains "$resume_stage_prompt_text" "Target artifact:"

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

upstream_transition_json="$("$runner" transition \
	--run-id "$run_id" \
	--stage review-feature \
	--state-root "$sandbox/agent-workflows" \
	--result-file "$fixtures_dir/needs_upstream.md" \
	--apply \
	--json)"
assert_json_eq "$upstream_transition_json" '.status' 'needs_upstream'
assert_json_eq "$upstream_transition_json" '.next_action' 'run_stage'
assert_json_eq "$upstream_transition_json" '.next_stage' 'draft-feature'
jq -e '
	.current_stage == "draft-feature" and
	.next_action == "run_stage" and
	.last_result.status == "needs_upstream" and
	.last_result.decision_action == "backtrack_upstream" and
	.last_result.next_stage == "draft-feature" and
	(.stage_history | length == 3)
' "$manifest" >/dev/null

redraft_transition_json="$("$runner" transition \
	--run-id "$run_id" \
	--stage draft-feature \
	--state-root "$sandbox/agent-workflows" \
	--result-file "$fixtures_dir/accepted.md" \
	--apply \
	--json)"
assert_json_eq "$redraft_transition_json" '.next_action' 'run_stage'
jq -e '
	.current_stage == "review-feature" and
	.next_action == "run_stage" and
	(.stage_history | length == 4)
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
	(.stage_history | length == 5) and
	.stage_history[0].stage == "route-document" and
	.stage_history[4].next_action == "run_stage"
' "$manifest" >/dev/null

polish_stage_json="$("$runner" stage \
	--run-id "$run_id" \
	--stage polish-feature \
	--state-root "$sandbox/agent-workflows" \
	--apply \
	--json)"
polish_stage_prompt="$sandbox/agent-workflows/$run_id/stage-prompts/polish-feature.prompt.md"
assert_json_eq "$polish_stage_json" '.prompt_file' "$polish_stage_prompt"
assert_file "$polish_stage_prompt"
polish_stage_prompt_text="$(cat "$polish_stage_prompt")"
assert_contains "$polish_stage_prompt_text" "previous_result_stage: review-feature"
assert_contains "$polish_stage_prompt_text" "previous_result_status: needs_polish"
assert_contains "$polish_stage_prompt_text" "Open findings: 2"
assert_contains "$polish_stage_prompt_text" "Clarify the stop condition."

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
	(.stage_history | length == 6)
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
	(.stage_history | length == 7)
' "$manifest" >/dev/null
resume_stop_json="$("$runner" resume --run-id "$run_id" --state-root "$sandbox/agent-workflows" --dry-run --json)"
assert_json_eq "$resume_stop_json" '.status' 'stopped'
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
stopped_stage_output="$("$runner" stage \
	--run-id "$run_id" \
	--stage review-feature \
	--state-root "$sandbox/agent-workflows" \
	--apply \
	2>&1 || true)"
assert_contains "$stopped_stage_output" "next_action is stop_gate"
stopped_transition_output="$("$runner" transition \
	--run-id "$run_id" \
	--stage review-feature \
	--state-root "$sandbox/agent-workflows" \
	--result-file "$fixtures_dir/accepted.md" \
	--apply \
	2>&1 || true)"
assert_contains "$stopped_transition_output" "next_action is stop_gate"

step_start_json="$("$runner" start \
	--workflow route-first \
	--slug "$step_slug" \
	--prompt "Run one routed feature workflow step" \
	--now "2026-05-11 14:35" \
	--state-root "$sandbox/agent-workflows" \
	--worktree-root "$sandbox/worktrees" \
	--apply \
	--json)"
assert_json_eq "$step_start_json" '.run_id' "$step_run_id"
step_json="$("$runner" step \
	--run-id "$step_run_id" \
	--state-root "$sandbox/agent-workflows" \
	--stage-command "$fake_agent" \
	--apply \
	--json)"
assert_json_eq "$step_json" '.status' 'step_complete'
assert_json_eq "$step_json" '.steps' '1'
assert_json_eq "$step_json" '.current_stage' 'draft-feature'
assert_json_eq "$step_json" '.next_action' 'run_stage'
jq -e '
	.current_stage == "draft-feature" and
	.next_action == "run_stage" and
	(.stage_history | length == 1) and
	.stage_history[0].stage == "route-document"
' "$sandbox/agent-workflows/$step_run_id/run.json" >/dev/null
assert_file "$sandbox/agent-workflows/$step_run_id/stage-results/route-document.md"

pipeline_json="$("$runner" run \
	--workflow route-first \
	--slug "$pipeline_slug" \
	--prompt "Run the routed feature workflow to a review gate" \
	--now "2026-05-11 14:36" \
	--state-root "$sandbox/agent-workflows" \
	--worktree-root "$sandbox/worktrees" \
	--stage-command "$fake_agent" \
	--max-steps 10 \
	--apply \
	--json)"
assert_json_eq "$pipeline_json" '.run_id' "$pipeline_run_id"
assert_json_eq "$pipeline_json" '.status' 'stopped'
assert_json_eq "$pipeline_json" '.steps' '5'
assert_json_eq "$pipeline_json" '.current_stage' 'review-feature'
assert_json_eq "$pipeline_json" '.next_action' 'stop_gate'
assert_json_eq "$pipeline_json" '.stop_reason' 'stop_gate'
pipeline_manifest="$sandbox/agent-workflows/$pipeline_run_id/run.json"
jq -e '
	.current_stage == "review-feature" and
	.next_action == "stop_gate" and
	(.stage_history | length == 5) and
	.stage_history[0].stage == "route-document" and
	.stage_history[1].stage == "draft-feature" and
	.stage_history[2].stage == "review-feature" and
	.stage_history[2].status == "needs_polish" and
	.stage_history[3].stage == "polish-feature" and
	.stage_history[4].stage == "review-feature" and
	.stage_history[4].status == "accepted"
' "$pipeline_manifest" >/dev/null
assert_file "$sandbox/agent-workflows/$pipeline_run_id/stage-results/route-document.md"
assert_file "$sandbox/agent-workflows/$pipeline_run_id/stage-results/draft-feature.md"
assert_file "$sandbox/agent-workflows/$pipeline_run_id/stage-results/review-feature.md"
assert_file "$sandbox/agent-workflows/$pipeline_run_id/stage-results/polish-feature.md"
assert_file "$pipeline_worktree/memory-bank/features/FT-007/feature.md"

claude_review_json="$("$runner" run \
	--workflow route-first \
	--slug "$claude_review_slug" \
	--prompt "Run the routed feature workflow with Claude second-opinion review" \
	--now "2026-05-11 14:38" \
	--state-root "$sandbox/agent-workflows" \
	--worktree-root "$sandbox/worktrees" \
	--stage-command "$fake_accepting_agent" \
	--claude-review \
	--review-command "$fake_claude_reviewer" \
	--max-steps 10 \
	--apply \
	--json)"
assert_json_eq "$claude_review_json" '.run_id' "$claude_review_run_id"
assert_json_eq "$claude_review_json" '.status' 'stopped'
assert_json_eq "$claude_review_json" '.steps' '5'
assert_json_eq "$claude_review_json" '.current_stage' 'review-feature'
assert_json_eq "$claude_review_json" '.next_action' 'stop_gate'
claude_review_manifest="$sandbox/agent-workflows/$claude_review_run_id/run.json"
jq -e '
	.current_stage == "review-feature" and
	.next_action == "stop_gate" and
	(.stage_history | length == 5) and
	.stage_history[0].stage == "route-document" and
	.stage_history[1].stage == "draft-feature" and
	.stage_history[2].stage == "review-feature" and
	.stage_history[2].status == "needs_polish" and
	.stage_history[2].result_file == "'"$sandbox"'/agent-workflows/'"$claude_review_run_id"'/stage-results/review-feature.claude.md" and
	.stage_history[3].stage == "polish-feature" and
	.stage_history[4].stage == "review-feature" and
	.stage_history[4].status == "accepted"
' "$claude_review_manifest" >/dev/null
assert_file "$sandbox/agent-workflows/$claude_review_run_id/stage-results/review-feature.md"
assert_file "$sandbox/agent-workflows/$claude_review_run_id/stage-results/review-feature.claude.md"
assert_file "$sandbox/agent-workflows/$claude_review_run_id/stage-review-prompts/review-feature.claude.prompt.md"

implementation_plan_fixture="$sandbox/implementation-plan.md"
cat >"$implementation_plan_fixture" <<'EOF'
# Implementation Plan Fixture

| Step ID | Actor | Goal | Check command / procedure |
| --- | --- | --- | --- |
| `STEP-01` | agent | Add the first fixture milestone | `echo step 1` |
| `STEP-02` | agent | Add the second fixture milestone | `echo step 2` |
- [ ] `STEP-03` Add the third fixture milestone from a task list
### MS-04 - Add the fourth fixture milestone from a heading
EOF

implementation_json="$("$runner" run \
	--workflow implementation-plan \
	--slug "$implementation_slug" \
	--implementation-plan "$implementation_plan_fixture" \
	--now "2026-05-11 14:39" \
	--state-root "$sandbox/agent-workflows" \
	--worktree-root "$sandbox/worktrees" \
	--stage-command "$fake_implementation_agent" \
	--claude-review \
	--review-command "$fake_claude_reviewer" \
	--max-steps 10 \
	--apply \
	--json)"
assert_json_eq "$implementation_json" '.run_id' "$implementation_run_id"
assert_json_eq "$implementation_json" '.status' 'stopped'
assert_json_eq "$implementation_json" '.steps' '8'
assert_json_eq "$implementation_json" '.next_action' 'stop_gate'
assert_json_eq "$implementation_json" '.stop_reason' 'all_milestones_accepted'
implementation_manifest="$sandbox/agent-workflows/$implementation_run_id/run.json"
jq -e '
	.workflow == "implementation-plan" and
	.implementation_plan == "'"$implementation_plan_fixture"'" and
	(.milestones | length == 4) and
	.current_milestone_index == 3 and
	.current_milestone.id == "MS-04" and
	.milestones[2].id == "STEP-03" and
	.milestones[3].goal == "Add the fourth fixture milestone from a heading" and
	(.stage_history | length == 8) and
	.stage_history[0].stage == "implement-milestone" and
	.stage_history[1].stage == "review-milestone" and
	.stage_history[1].result_file == "'"$sandbox"'/agent-workflows/'"$implementation_run_id"'/stage-results/review-milestone.claude.md" and
	.stage_history[2].stage == "implement-milestone" and
	.stage_history[3].stage == "review-milestone" and
	.stage_history[6].stage == "implement-milestone" and
	.stage_history[7].stage == "review-milestone"
' "$implementation_manifest" >/dev/null
assert_file "$sandbox/agent-workflows/$implementation_run_id/stage-prompts/implement-milestone.prompt.md"
assert_file "$sandbox/agent-workflows/$implementation_run_id/stage-results/review-milestone.claude.md"

bad_id="2026-05-11-1500-bad"
mkdir -p "$sandbox/agent-workflows/$bad_id"
printf '{"run_id":"%s"}\n' "$bad_id" >"$sandbox/agent-workflows/$bad_id/run.json"
bad_output="$("$runner" resume --run-id "$bad_id" --state-root "$sandbox/agent-workflows" --dry-run 2>&1 || true)"
assert_contains "$bad_output" "missing current_stage"

bad_worktree_id="2026-05-11-1501-bad-worktree"
mkdir -p "$sandbox/agent-workflows/$bad_worktree_id"
cat >"$sandbox/agent-workflows/$bad_worktree_id/run.json" <<EOF
{
  "run_id": "$bad_worktree_id",
  "workflow": "route-first",
  "slug": "bad-worktree",
  "branch": "task/$bad_worktree_id",
  "state_dir": "$sandbox/agent-workflows/$bad_worktree_id",
  "current_stage": "route-document",
  "next_action": "run_stage",
  "stage_history": []
}
EOF
bad_worktree_output="$("$runner" resume --run-id "$bad_worktree_id" --state-root "$sandbox/agent-workflows" --dry-run 2>&1 || true)"
assert_contains "$bad_worktree_output" "missing"

crlf_result="$sandbox/crlf-result.md"
printf 'Status: accepted\r\nTarget artifact: none\r\nOpen findings: 0\r\nNext stage: none\r\n' >"$crlf_result"
crlf_json="$("$runner" transition --stage route-document --result-file "$crlf_result" --dry-run --json)"
assert_json_eq "$crlf_json" '.status' 'accepted'
assert_json_eq "$crlf_json" '.next_action' 'stop_gate'

for status in accepted needs_polish needs_upstream blocked needs_human failed; do
	result="$fixtures_dir/$status.md"
	assert_file "$result"
	transition_json="$("$runner" transition --result-file "$result" --dry-run --json)"
	assert_json_eq "$transition_json" '.status' "$status"
done

accepted_with_findings="$("$runner" transition --result-file "$fixtures_dir/accepted-with-open-findings.md" --dry-run --json)"
assert_json_eq "$accepted_with_findings" '.next_action' 'stop_blocked'

printf 'agent-workflow assets OK\n'
