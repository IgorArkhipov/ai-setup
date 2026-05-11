#!/usr/bin/env bash

set -euo pipefail

: "${AGENT_WORKFLOW_STAGE_ID:?}"
: "${AGENT_WORKFLOW_REVIEW_RESULT_FILE:?}"
: "${AGENT_WORKFLOW_STATE_DIR:?}"

target_artifact="memory-bank/features/FT-007/feature.md"
review_marker="$AGENT_WORKFLOW_STATE_DIR/claude-review-needs-polish.once"

mkdir -p "$(dirname "$AGENT_WORKFLOW_REVIEW_RESULT_FILE")"

case "$AGENT_WORKFLOW_STAGE_ID" in
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
	printf 'Claude review should not run for stage: %s\n' "$AGENT_WORKFLOW_STAGE_ID" >&2
	exit 1
	;;
esac
