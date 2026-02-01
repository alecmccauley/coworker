#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=/dev/null
source "$ROOT_DIR/scripts/common.sh"

wait_for_port() {
  local host="$1"
  local port="$2"
  local timeout="$3"
  local start_time

  start_time=$(date +%s)
  while true; do
    if command -v nc >/dev/null 2>&1; then
      if nc -z "$host" "$port" >/dev/null 2>&1; then
        return 0
      fi
    else
      if (echo >"/dev/tcp/$host/$port") >/dev/null 2>&1; then
        return 0
      fi
    fi

    if (( $(date +%s) - start_time >= timeout )); then
      return 1
    fi

    sleep 1
  done
}

cd "$ROOT_DIR"

banner

"$ROOT_DIR/scripts/sync-agents.sh"

section "Preparing your workspace"

require_command docker
require_command pnpm

step "Resetting pm2 processes"
pnpm -w exec pm2 delete coworker-api coworker-app >/dev/null 2>&1 || true

if ! docker info >/dev/null 2>&1; then
  error "Docker is not running. Start Docker Desktop and try again."
  exit 1
fi

step "Starting PostgreSQL"
docker compose -f coworker-api/docker-compose.yml up -d

step "Waiting for the database to be ready"
if wait_for_port "localhost" 5432 30; then
  success "Database is ready"
else
  warn "Database is taking longer than expected. Continuing anyway."
fi

step "Syncing database env"
compose_file="$ROOT_DIR/coworker-api/docker-compose.yml"
postgres_container_id="$(docker compose -f "$compose_file" ps -q postgres)"
if [[ -z "$postgres_container_id" ]]; then
  warn "Postgres container not found; skipping DATABASE_URL update."
else
  get_container_env() {
    local key="$1"
    docker inspect --format '{{range .Config.Env}}{{println .}}{{end}}' "$postgres_container_id" | awk -F= -v k="$key" '$1==k{print substr($0,index($0,"=")+1); exit}'
  }

  db_user="$(get_container_env POSTGRES_USER)"
  db_password="$(get_container_env POSTGRES_PASSWORD)"
  db_name="$(get_container_env POSTGRES_DB)"
  db_port_mapping="$(docker compose -f "$compose_file" port postgres 5432 | head -n 1)"
  db_host="localhost"
  db_port="${db_port_mapping##*:}"

  if [[ -z "$db_user" || -z "$db_password" || -z "$db_name" || -z "$db_port" ]]; then
    warn "Could not resolve database settings from Docker; skipping DATABASE_URL update."
  else
    db_url="postgresql://${db_user}:${db_password}@${db_host}:${db_port}/${db_name}?schema=public"
    env_file="$ROOT_DIR/coworker-api/.env"
    tmp_file="$(mktemp)"
    if [[ -f "$env_file" ]]; then
      awk -v val="$db_url" '
        BEGIN { updated=0 }
        /^DATABASE_URL=/ { print "DATABASE_URL=\"" val "\""; updated=1; next }
        { print }
        END { if (!updated) print "DATABASE_URL=\"" val "\"" }
      ' "$env_file" > "$tmp_file"
    else
      printf 'DATABASE_URL="%s"\n' "$db_url" > "$tmp_file"
    fi
    mv "$tmp_file" "$env_file"
    success "Updated coworker-api/.env DATABASE_URL"
  fi
fi

step "Generating Prisma client"
pnpm --filter coworker-api db:generate

step "Running migrations"
pnpm --filter coworker-api db:migrate

section "Launching dev servers"

start_or_restart() {
  local name="$1"
  local command="$2"

  if pnpm -w exec pm2 describe "$name" >/dev/null 2>&1; then
    step "Restarting $name"
    pnpm -w exec pm2 restart "$name"
  else
    step "Starting $name"
    eval "$command"
  fi
}

start_or_restart "coworker-api" "pnpm --filter coworker-api dev"
start_or_restart "coworker-app" "pnpm --filter coworker-app dev"

success "Everything is running under pm2."
info "Use: pnpm pm2:status | pnpm pm2:logs"
