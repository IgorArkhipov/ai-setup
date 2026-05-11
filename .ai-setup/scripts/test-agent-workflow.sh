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
trap 'rm -rf "$sandbox"' EXIT

apply_json="$("$runner" start \
	--workflow route-first \
	--slug "Provider Auth" \
	--prompt "Add provider auth detection" \
	--now "2026-05-11 14:32" \
	--state-root "$sandbox/agent-workflows" \
	--worktree-root "$sandbox/worktrees" \
	--apply \
	--json)"
run_id="$(printf '%s' "$apply_json" | jq -r '.run_id')"
manifest="$sandbox/agent-workflows/$run_id/run.json"
assert_file "$manifest"
jq -e '.run_id == "2026-05-11-1432-provider-auth" and .current_stage == "route-document" and .next_action == "run_stage"' "$manifest" >/dev/null

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
