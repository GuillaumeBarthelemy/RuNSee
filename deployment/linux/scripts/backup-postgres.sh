#!/usr/bin/env bash
set -euo pipefail

RUNSEE_ROOT="${RUNSEE_ROOT:-/srv/runsee}"
REPO_DIR="${RUNSEE_REPO_DIR:-${RUNSEE_ROOT}/repo}"
ENV_FILE="${RUNSEE_ENV_FILE:-${RUNSEE_ROOT}/env/runsee-backend-prod.env}"
COMPOSE_FILE="${RUNSEE_COMPOSE_FILE:-${REPO_DIR}/deployment/linux/docker-compose.prod.yml}"
BACKUP_DIR="${RUNSEE_BACKUP_DIR:-${RUNSEE_ROOT}/backups}"
RETENTION_DAYS="${RUNSEE_BACKUP_RETENTION_DAYS:-14}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
OUTPUT_PATH="${BACKUP_DIR}/runsee_prod_${TIMESTAMP}.dump"

mkdir -p "${BACKUP_DIR}"
cd "${REPO_DIR}"

docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" exec -T postgres \
  pg_dump -U runsee_app -d runsee_prod -Fc \
  > "${OUTPUT_PATH}"

find "${BACKUP_DIR}" -name 'runsee_prod_*.dump' -type f -mtime "+${RETENTION_DAYS}" -delete

echo "Backup created: ${OUTPUT_PATH}"
