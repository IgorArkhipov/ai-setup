#!/usr/bin/env bash

set -euo pipefail

: "${AGENT_WORKFLOW_STAGE_ID:?}"
: "${AGENT_WORKFLOW_RESULT_FILE:?}"
: "${AGENT_WORKFLOW_WORKTREE:?}"
: "${AGENT_WORKFLOW_STATE_DIR:?}"

target_artifact="memory-bank/features/FT-007/feature.md"
target_path="$AGENT_WORKFLOW_WORKTREE/$target_artifact"
review_marker="$AGENT_WORKFLOW_STATE_DIR/review-feature-needs-polish.once"

mkdir -p "$(dirname "$AGENT_WORKFLOW_RESULT_FILE")"

case "$AGENT_WORKFLOW_STAGE_ID" in
route-document)
	cat >"$AGENT_WORKFLOW_RESULT_FILE" <<EOF
Status: accepted
Target artifact: none
Open findings: 0
Next stage: draft-feature
EOF
	;;
draft-feature)
	mkdir -p "$(dirname "$target_path")"
	if [ ! -f "$target_path" ]; then
		printf '# FT-007 Pipeline Fixture\n' >"$target_path"
	fi
	cat >"$AGENT_WORKFLOW_RESULT_FILE" <<EOF
Status: accepted
Target artifact: $target_artifact
Open findings: 0
EOF
	;;
review-feature)
	if [ ! -f "$review_marker" ]; then
		touch "$review_marker"
		cat >"$AGENT_WORKFLOW_RESULT_FILE" <<EOF
Status: needs_polish
Target artifact: $target_artifact
Open findings: 1
EOF
	else
		cat >"$AGENT_WORKFLOW_RESULT_FILE" <<EOF
Status: accepted
Target artifact: $target_artifact
Open findings: 0
EOF
	fi
	;;
polish-feature)
	mkdir -p "$(dirname "$target_path")"
	printf '\nFixture polish pass completed.\n' >>"$target_path"
	cat >"$AGENT_WORKFLOW_RESULT_FILE" <<EOF
Status: accepted
Target artifact: $target_artifact
Open findings: 0
EOF
	;;
*)
	printf 'Unknown fake stage: %s\n' "$AGENT_WORKFLOW_STAGE_ID" >&2
	exit 1
	;;
esac
