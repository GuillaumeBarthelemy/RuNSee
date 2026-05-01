#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="${RUNSEE_APP_DIR:-/srv/runsee/repo}"
BACKEND_ENV="${RUNSEE_BACKEND_ENV:-/srv/runsee/env/runsee-backend-prod.env}"
FRONTEND_ENV="${RUNSEE_FRONTEND_ENV:-/srv/runsee/env/runsee-frontend-prod.env}"
COMPOSE_FILE="${RUNSEE_COMPOSE_FILE:-deployment/linux/docker-compose.prod.yml}"
DEPLOY_REF="${1:-${RUNSEE_DEPLOY_REF:-origin/main}}"
PUBLIC_CHECKS="${RUNSEE_PUBLIC_CHECKS:-true}"

COMPOSE=(
  docker compose
  --env-file "${BACKEND_ENV}"
  --env-file "${FRONTEND_ENV}"
  -f "${COMPOSE_FILE}"
)

log() {
  printf '[runsee-deploy] %s\n' "$*"
}

require_file() {
  if [ ! -f "$1" ]; then
    log "Missing required file: $1"
    exit 1
  fi
}

wait_for_health() {
  local container_name="$1"
  local timeout_seconds="${2:-180}"
  local elapsed=0
  local status=""

  while [ "${elapsed}" -lt "${timeout_seconds}" ]; do
    status="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "${container_name}" 2>/dev/null || true)"

    if [ "${status}" = "healthy" ] || [ "${status}" = "running" ]; then
      log "${container_name} is ${status}"
      return 0
    fi

    if [ "${status}" = "unhealthy" ] || [ "${status}" = "exited" ]; then
      log "${container_name} is ${status}"
      docker logs --tail=120 "${container_name}" || true
      return 1
    fi

    sleep 5
    elapsed=$((elapsed + 5))
  done

  log "Timeout while waiting for ${container_name}. Last status: ${status:-unknown}"
  docker logs --tail=120 "${container_name}" || true
  return 1
}

cd "${APP_DIR}"

require_file "${BACKEND_ENV}"
require_file "${FRONTEND_ENV}"
require_file "${COMPOSE_FILE}"
require_file "/srv/runsee/cloudflared/config.yml"

if ! git diff --quiet || ! git diff --cached --quiet; then
  log "Remote repository has uncommitted changes. Deployment aborted."
  exit 1
fi

previous_commit="$(git rev-parse --short HEAD 2>/dev/null || echo unknown)"

log "Fetching origin/main"
git fetch --prune origin main

log "Checking out ${DEPLOY_REF}"
git checkout --detach "${DEPLOY_REF}"
target_commit="$(git rev-parse --short HEAD)"
log "Deploying commit ${target_commit} (previous: ${previous_commit})"

log "Validating Docker Compose configuration"
"${COMPOSE[@]}" config >/dev/null

log "Building backend and frontend images"
"${COMPOSE[@]}" build --pull backend frontend

log "Starting production stack"
"${COMPOSE[@]}" up -d --remove-orphans

log "Waiting for containers"
wait_for_health runsee-postgres-prod 180
wait_for_health runsee-backend 240
wait_for_health runsee-frontend 180
wait_for_health runsee-cloudflared 120

log "Running internal health checks"
"${COMPOSE[@]}" exec -T backend curl -fsS http://localhost:3003/health >/dev/null
"${COMPOSE[@]}" exec -T backend curl -fsS http://localhost:3003/db/health >/dev/null
"${COMPOSE[@]}" exec -T frontend wget -qO- http://127.0.0.1/ >/dev/null

if [ "${PUBLIC_CHECKS}" = "true" ]; then
  log "Running public health checks"
  curl -fsSI https://runsee.runnsee.net >/dev/null
  curl -fsS https://api.runnsee.net/health >/dev/null
  curl -fsS https://api.runnsee.net/db/health >/dev/null
fi

log "Deployment completed successfully"
"${COMPOSE[@]}" ps
