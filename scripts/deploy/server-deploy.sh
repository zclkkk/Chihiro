#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/srv/chihiro/current}"
DEPLOY_BRANCH="${DEPLOY_BRANCH:-main}"
PM2_APP_NAME="${PM2_APP_NAME:-chihiro}"

if ! command -v pnpm >/dev/null 2>&1; then
  echo "pnpm is not installed on the server." >&2
  exit 1
fi

if ! command -v pm2 >/dev/null 2>&1; then
  echo "pm2 is not installed on the server." >&2
  exit 1
fi

cd "$APP_DIR"

git fetch origin "$DEPLOY_BRANCH"
git checkout "$DEPLOY_BRANCH"
git pull --ff-only origin "$DEPLOY_BRANCH"

pnpm install --frozen-lockfile --prod=false
pnpm exec prisma migrate deploy
pnpm build

export PM2_APP_NAME
export APP_DIR

pm2 startOrReload ecosystem.config.cjs --env production
pm2 save

echo "Deployment complete for $PM2_APP_NAME on branch $DEPLOY_BRANCH."
