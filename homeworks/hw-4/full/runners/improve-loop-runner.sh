#!/usr/bin/env bash
set -eu

usage() {
  cat <<'USAGE'
Usage:
  improve-loop-runner.sh \
    --process-spec PATH \
    --prompt PATH \
    --target PATH \
    --state-dir PATH \
    --result PATH \
    [--source PATH] \
    [--mode prepare|execute]

Prepares a reusable agent request for a small improvement loop. If AGENT_COMMAND
is set and --mode execute is used, the command is invoked with the generated
request path and must write the result path.
USAGE
}

PROCESS_SPEC=""
PROMPT=""
TARGET=""
SOURCE=""
STATE_DIR=""
RESULT=""
MODE="prepare"

while [ "$#" -gt 0 ]; do
  case "$1" in
    --process-spec) PROCESS_SPEC="$2"; shift 2 ;;
    --prompt) PROMPT="$2"; shift 2 ;;
    --target) TARGET="$2"; shift 2 ;;
    --source) SOURCE="$2"; shift 2 ;;
    --state-dir) STATE_DIR="$2"; shift 2 ;;
    --result) RESULT="$2"; shift 2 ;;
    --mode) MODE="$2"; shift 2 ;;
    --help) usage; exit 0 ;;
    *) echo "Unknown argument: $1" >&2; usage >&2; exit 2 ;;
  esac
done

if [ -z "$PROCESS_SPEC" ] || [ -z "$PROMPT" ] || [ -z "$TARGET" ] || [ -z "$STATE_DIR" ] || [ -z "$RESULT" ]; then
  usage >&2
  exit 2
fi

reject_env_path() {
  case "$(basename "$1")" in
    .env|.env.*)
      echo "Refusing to read .env* path: $1" >&2
      exit 3
      ;;
  esac
}

reject_env_path "$PROCESS_SPEC"
reject_env_path "$PROMPT"
reject_env_path "$TARGET"
[ -n "$SOURCE" ] && reject_env_path "$SOURCE"

mkdir -p "$STATE_DIR" "$(dirname "$RESULT")"

REQUEST="$STATE_DIR/runner-request-$(basename "$RESULT" .md).md"
MANIFEST="$STATE_DIR/runner-request-$(basename "$RESULT" .md).manifest"

cat > "$REQUEST" <<REQUEST
# Small Loop Runner Request

## Process Spec

$PROCESS_SPEC

## Prompt

$PROMPT

## Target

$TARGET

## Source

${SOURCE:-none}

## State Directory

$STATE_DIR

## Result Path

$RESULT

## Required Runner Behavior

1. Read the process spec.
2. Read the prompt.
3. Read the source and target artifacts.
4. Improve the target according to the prompt.
5. Write the result path.
6. Return status: done, blocked, or escalation.
REQUEST

cat > "$MANIFEST" <<MANIFEST
process_spec=$PROCESS_SPEC
prompt=$PROMPT
target=$TARGET
source=${SOURCE:-none}
state_dir=$STATE_DIR
result=$RESULT
request=$REQUEST
mode=$MODE
MANIFEST

if [ "$MODE" = "execute" ]; then
  if [ -z "${AGENT_COMMAND:-}" ]; then
    echo "AGENT_COMMAND is required for --mode execute" >&2
    exit 4
  fi
  "$AGENT_COMMAND" "$REQUEST" "$RESULT"
else
  echo "Prepared runner request: $REQUEST"
  echo "Manifest: $MANIFEST"
fi
