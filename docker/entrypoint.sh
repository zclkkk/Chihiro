#!/bin/sh
set -eu

if [ "${RUN_MIGRATIONS:-true}" != "false" ]; then
  pnpm exec prisma migrate deploy
fi

exec "$@"
