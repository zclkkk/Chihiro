#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/www/wwwroot/www.xiami.dev}"
CHIHIRO_IMAGE="${CHIHIRO_IMAGE:-}"
IMAGE_TAR="${IMAGE_TAR:-chihiro-image.tar}"
COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-chihiro}"

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

cd "$APP_DIR"

if [ ! -f "$IMAGE_TAR" ]; then
  echo "Image archive not found: $APP_DIR/$IMAGE_TAR" >&2
  exit 1
fi

if [ ! -f "$APP_DIR/.env" ]; then
  echo ".env is missing in $APP_DIR. Create it before deploying." >&2
  exit 1
fi

docker load -i "$IMAGE_TAR"
rm -f "$IMAGE_TAR"

export CHIHIRO_IMAGE
export COMPOSE_PROJECT_NAME

docker compose up -d --remove-orphans
docker compose ps

echo "Docker deployment complete using loaded image $CHIHIRO_IMAGE."
