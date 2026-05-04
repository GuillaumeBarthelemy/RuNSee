#!/usr/bin/env bash
# restore-postgres.sh — Restaure un dump PostgreSQL depuis un fichier local ou Cloudflare R2.
#
# Usage :
#   ./restore-postgres.sh <fichier_local.dump>
#   ./restore-postgres.sh postgres/runsee_prod_20260504_040001.dump   # cle R2
#
# Variables R2 attendues (si restauration depuis R2) :
#   R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ACCOUNT_ID, R2_BUCKET
set -Eeuo pipefail

if [ -z "${1:-}" ]; then
  echo "Usage: $0 <fichier_local.dump | cle_r2>"
  exit 1
fi

INPUT="$1"
RUNSEE_ROOT="${RUNSEE_ROOT:-/srv/runsee}"
REPO_DIR="${RUNSEE_REPO_DIR:-${RUNSEE_ROOT}/repo}"
ENV_FILE="${RUNSEE_ENV_FILE:-${RUNSEE_ROOT}/env/runsee-backend-prod.env}"
COMPOSE_FILE="${RUNSEE_COMPOSE_FILE:-${REPO_DIR}/deployment/linux/docker-compose.prod.yml}"
LOCAL_FILE=""
TMPDIR_CREATED=""

cleanup() {
  if [ -n "${TMPDIR_CREATED}" ] && [ -d "${TMPDIR_CREATED}" ]; then
    rm -rf "${TMPDIR_CREATED}"
  fi
}
trap cleanup EXIT

if [ -f "${INPUT}" ]; then
  LOCAL_FILE="${INPUT}"
  echo "[$(date --iso-8601=seconds)] Using local file: ${LOCAL_FILE}"
else
  # Téléchargement depuis R2
  if [ -z "${R2_ACCESS_KEY_ID:-}" ] || [ -z "${R2_SECRET_ACCESS_KEY:-}" ] \
     || [ -z "${R2_ACCOUNT_ID:-}" ] || [ -z "${R2_BUCKET:-}" ]; then
    echo "ERROR: '${INPUT}' n'est pas un fichier local et les credentials R2 ne sont pas definis."
    exit 1
  fi

  TMPDIR_CREATED="$(mktemp -d)"
  LOCAL_FILE="${TMPDIR_CREATED}/restore.dump"

  echo "[$(date --iso-8601=seconds)] Downloading from R2: ${INPUT} ..."

  AWS_ACCESS_KEY_ID="${R2_ACCESS_KEY_ID}" \
  AWS_SECRET_ACCESS_KEY="${R2_SECRET_ACCESS_KEY}" \
  aws s3 cp "s3://${R2_BUCKET}/${INPUT}" "${LOCAL_FILE}" \
    --endpoint-url "https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com" \
    --no-progress

  echo "[$(date --iso-8601=seconds)] Download complete."
fi

echo "[$(date --iso-8601=seconds)] Restoring into runsee_prod ..."

cd "${REPO_DIR}"
docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" \
  exec -T postgres \
  pg_restore -U runsee_app -d runsee_prod \
    --clean --if-exists --no-owner --no-privileges --jobs=2 \
  < "${LOCAL_FILE}"

echo "[$(date --iso-8601=seconds)] Restore complete from: ${INPUT}"
