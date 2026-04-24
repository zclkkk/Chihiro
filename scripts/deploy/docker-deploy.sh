#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/srv/chihiro/current}"
DEPLOY_BRANCH="${DEPLOY_BRANCH:-main}"
CHIHIRO_IMAGE="${CHIHIRO_IMAGE:-}"
COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-chihiro}"
GHCR_USERNAME="${GHCR_USERNAME:-}"
GHCR_TOKEN="${GHCR_TOKEN:-}"

if [ -z "$CHIHIRO_IMAGE" ]; then
  echo "CHIHIRO_IMAGE is not set." >&2
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is not installed on the server." >&2
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "docker compose plugin is not installed on the server." >&2
  exit 1
fi

if ! command -v git >/dev/null 2>&1; then
  echo "git is not installed on the server." >&2
  exit 1
fi

if [ ! -d "$APP_DIR/.git" ]; then
  echo "$APP_DIR is not a git checkout. Clone the repository there before deploying." >&2
  exit 1
fi

git config --global --add safe.directory "$APP_DIR"

cd "$APP_DIR"

git fetch origin "$DEPLOY_BRANCH"
git checkout "$DEPLOY_BRANCH"
git pull --ff-only origin "$DEPLOY_BRANCH"

if [ ! -f "$APP_DIR/.env" ]; then
  echo ".env is missing in $APP_DIR. Create it from .env.example and fill production values." >&2
  exit 1
fi

if [ -n "$GHCR_USERNAME" ] && [ -n "$GHCR_TOKEN" ]; then
  echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USERNAME" --password-stdin
fi

export CHIHIRO_IMAGE
export COMPOSE_PROJECT_NAME

docker compose pull
docker compose up -d --remove-orphans
docker compose ps

echo "Docker deployment complete using image $CHIHIRO_IMAGE."
