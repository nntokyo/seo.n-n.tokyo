#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
SCHEMA="${PRISMA_SCHEMA:-$BASE/prisma/schema.prisma}"
BASELINE_MIGRATION="${PRISMA_BASELINE_MIGRATION:-20260919000000_baseline}"
STATE_DIR="${STATE_DIR:-$BASE/.state}"
BASELINE_MARKER="$STATE_DIR/prisma-baseline-$BASELINE_MIGRATION.resolved"

mkdir -p "$STATE_DIR"

if [ "${PRISMA_BASELINE_EXISTING_DB:-false}" = "true" ] && [ ! -f "$BASELINE_MARKER" ]; then
  echo "[prisma] marking existing schema baseline as applied: $BASELINE_MIGRATION"
  pnpm exec prisma migrate resolve --applied "$BASELINE_MIGRATION" --schema="$SCHEMA"
  touch "$BASELINE_MARKER"
fi

echo "[prisma] applying pending migrations"
pnpm exec prisma migrate deploy --schema="$SCHEMA"

echo "[prisma] generating Prisma Client"
pnpm exec prisma generate --schema="$SCHEMA"
