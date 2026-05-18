#!/usr/bin/env bash

set -euo pipefail

: "${AGENT_WORKFLOW_STAGE_ID:?}"
: "${AGENT_WORKFLOW_RESULT_FILE:?}"
: "${AGENT_WORKFLOW_REVIEW_RESULT_FILE:?}"
: "${AGENT_WORKFLOW_STATE_DIR:?}"

target_artifact="memory-bank/features/FT-007/feature.md"
review_marker="$AGENT_WORKFLOW_STATE_DIR/claude-review-needs-polish.once"

mkdir -p "$(dirname "$AGENT_WORKFLOW_REVIEW_RESULT_FILE")"

case "$AGENT_WORKFLOW_STAGE_ID" in
review-milestone)
	cat >"$AGENT_WORKFLOW_REVIEW_RESULT_FILE" <<EOF
Status: accepted
Target artifact: none
Open findings: 0
EOF
	;;
review-*)
	if [ ! -f "$review_marker" ]; then
		touch "$review_marker"
		cat >"$AGENT_WORKFLOW_REVIEW_RESULT_FILE" <<EOF
Status: needs_polish
Target artifact: $target_artifact
Open findings: 1
EOF
	else
		cat >"$AGENT_WORKFLOW_REVIEW_RESULT_FILE" <<EOF
Status: accepted
Target artifact: $target_artifact
Open findings: 0
EOF
	fi
	;;
*)
	primary_target_artifact="$(awk '
		{
			sub(/\r$/, "", $0)
			if (index($0, "Target artifact:") == 1) {
				value = substr($0, length("Target artifact:") + 1)
				sub(/^ */, "", value)
				print value
				exit
			}
		}
	' "$AGENT_WORKFLOW_RESULT_FILE")"
	primary_target_artifact="${primary_target_artifact:-none}"
	primary_next_stage="$(awk '
		{
			sub(/\r$/, "", $0)
			if (index($0, "Next stage:") == 1) {
				value = substr($0, length("Next stage:") + 1)
				sub(/^ */, "", value)
				print value
				exit
			}
		}
	' "$AGENT_WORKFLOW_RESULT_FILE")"
	cat >"$AGENT_WORKFLOW_REVIEW_RESULT_FILE" <<EOF
Status: accepted
Target artifact: $primary_target_artifact
Open findings: 0
EOF
	if [ -n "$primary_next_stage" ]; then
		printf 'Next stage: %s\n' "$primary_next_stage" >>"$AGENT_WORKFLOW_REVIEW_RESULT_FILE"
	fi
	;;
esac
