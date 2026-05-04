#!/usr/bin/env bash
set -Eeuo pipefail

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

echo "[$(date --iso-8601=seconds)] Starting PostgreSQL backup..."

docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" exec -T postgres \
  pg_dump -U runsee_app -d runsee_prod -Fc \
  > "${OUTPUT_PATH}"

echo "[$(date --iso-8601=seconds)] Backup created: ${OUTPUT_PATH}"

# --- Off-site upload vers Cloudflare R2 (optionnel) ---
# Variables attendues dans runsee-backend-prod.env ou l'environnement :
#   R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ACCOUNT_ID, R2_BUCKET
if [ -n "${R2_ACCESS_KEY_ID:-}" ] && [ -n "${R2_SECRET_ACCESS_KEY:-}" ] \
   && [ -n "${R2_ACCOUNT_ID:-}" ] && [ -n "${R2_BUCKET:-}" ]; then

  R2_KEY="postgres/runsee_prod_${TIMESTAMP}.dump"

  AWS_ACCESS_KEY_ID="${R2_ACCESS_KEY_ID}" \
  AWS_SECRET_ACCESS_KEY="${R2_SECRET_ACCESS_KEY}" \
  aws s3 cp "${OUTPUT_PATH}" "s3://${R2_BUCKET}/${R2_KEY}" \
    --endpoint-url "https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com" \
    --no-progress \
    --quiet

  echo "[$(date --iso-8601=seconds)] Backup uploaded to R2: ${R2_KEY}"
else
  echo "[$(date --iso-8601=seconds)] WARN: R2 credentials not set — backup is local only."
fi

# --- Retention locale ---
find "${BACKUP_DIR}" -name 'runsee_prod_*.dump' -type f -mtime "+${RETENTION_DAYS}" -delete
echo "[$(date --iso-8601=seconds)] Local retention enforced (${RETENTION_DAYS} days)."
