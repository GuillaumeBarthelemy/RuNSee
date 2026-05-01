#!/usr/bin/env bash
set -euo pipefail

HEALTH_URL="${RUNSEE_HEALTH_URL:-https://api.runnsee.net/health}"
LOG_PATH="${RUNSEE_HEALTH_LOG:-/srv/runsee/backups/health.log}"
HTTP_CODE="$(curl -o /dev/null -s -w '%{http_code}' "${HEALTH_URL}" || true)"

if [ "${HTTP_CODE}" != "200" ]; then
  mkdir -p "$(dirname "${LOG_PATH}")"
  echo "[$(date --iso-8601=seconds)] Health check failed for ${HEALTH_URL} with HTTP ${HTTP_CODE}" >> "${LOG_PATH}"
  exit 1
fi

echo "[$(date --iso-8601=seconds)] Health check OK for ${HEALTH_URL}"
