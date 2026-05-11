#!/usr/bin/env bash

set -euo pipefail

: "${AGENT_WORKFLOW_STAGE_ID:?}"
: "${AGENT_WORKFLOW_RESULT_FILE:?}"
: "${AGENT_WORKFLOW_CURRENT_MILESTONE_ID:?}"

mkdir -p "$(dirname "$AGENT_WORKFLOW_RESULT_FILE")"

case "$AGENT_WORKFLOW_STAGE_ID" in
implement-milestone | polish-milestone | review-milestone)
	cat >"$AGENT_WORKFLOW_RESULT_FILE" <<EOF
Status: accepted
Target artifact: none
Open findings: 0
EOF
	;;
*)
	printf 'Unknown implementation stage: %s\n' "$AGENT_WORKFLOW_STAGE_ID" >&2
	exit 1
	;;
esac
