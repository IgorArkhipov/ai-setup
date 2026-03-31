#!/bin/bash
set -euo pipefail

rm -f /rails/tmp/pids/server.pid

export PGPASSWORD="${DB_PASSWORD:-}"

until pg_isready \
  --host="${DB_HOST:-db}" \
  --port="${DB_PORT:-5432}" \
  --username="${DB_USERNAME:-postgres}" \
  --dbname="${DB_NAME:-ai_setup_development}" >/dev/null 2>&1; do
  sleep 1
done

bundle _4.0.9_ exec rails db:prepare

exec "$@"
