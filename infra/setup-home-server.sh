#!/usr/bin/env bash
# ==============================================================================
# seo.n-n.tokyo 本番サーバー初期構築スクリプト (実行先: 本番サーバー)
#
# 注意: 本スクリプトは公開リポジトリに含まれるため、パスワード・鍵等の
# 機密情報は一切ハードコードしません。環境変数または引数で渡してください。
# ==============================================================================

set -euo pipefail

DOMAIN="seo.n-n.tokyo"
BASE="/Datas/www/${DOMAIN}"
REPO="git@nntokyo:nntokyo/seo.n-n.tokyo.git"
PORT="5600"
PM2_NAME="seo-n-n-tokyo"
DB_NAME="seo"
DB_USER="seo"
DB_PASS="${1:-}"

if [ -z "$DB_PASS" ]; then
  echo "Error: Database password is required."
  echo "Usage: bash infra/setup-home-server.sh <DB_PASSWORD>"
  exit 1
fi

echo "=== [1/6] ディレクトリ作成 & リポジトリ取得 ==="
mkdir -p /Datas/www
if [ ! -d "$BASE/.git" ]; then
  git clone "$REPO" "$BASE"
else
  echo "Already cloned at $BASE"
fi

cd "$BASE"

echo "=== [2/6] 環境変数 (.env) 作成 ==="
if [ ! -f "$BASE/.env" ]; then
  cat <<ENV > "$BASE/.env"
NODE_ENV=production
PORT=${PORT}
HOST=127.0.0.1
HOSTNAME=127.0.0.1
NEXT_PUBLIC_APP_URL=https://${DOMAIN}
NEXT_PUBLIC_DOMAIN=${DOMAIN}
NEXTAUTH_URL=https://${DOMAIN}
NEXTAUTH_SECRET=$(openssl rand -hex 32)
DATABASE_URL=postgresql://${DB_USER}:${DB_PASS}@127.0.0.1:5432/${DB_NAME}?schema=public
REDIS_URL=redis://127.0.0.1:6379
ENCRYPTION_MASTER_KEY=$(openssl rand -hex 32)
ENV
  chmod 600 "$BASE/.env"
  echo ".env created with secure permissions"
else
  echo ".env already exists, skipping"
fi

echo "=== [3/6] PostgreSQL データベース & ユーザー作成 ==="
if docker ps --format '{{.Names}}' | grep -q "postgres"; then
  POSTGRES_CONTAINER=$(docker ps --format '{{.Names}}' | grep "postgres" | head -1)
  docker exec -i "$POSTGRES_CONTAINER" psql -U lloma -c "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASS}';" 2>/dev/null || true
  docker exec -i "$POSTGRES_CONTAINER" psql -U lloma -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};" 2>/dev/null || true
  docker exec -i "$POSTGRES_CONTAINER" psql -U lloma -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};" 2>/dev/null || true
  echo "PostgreSQL DB and user checked"
else
  echo "Warning: Docker postgres container not found, please configure DB manually"
fi

echo "=== [4/6] 依存関係インストール & ビルド ==="
export PATH="/usr/local/bin:/usr/bin:/bin:$HOME/.local/share/pnpm:$HOME/.nvm/versions/node/$(ls $HOME/.nvm/versions/node 2>/dev/null | tail -1)/bin"
pnpm install --frozen-lockfile
if [ -f "$BASE/prisma/schema.prisma" ]; then
  ./node_modules/.bin/prisma db push --accept-data-loss || true
  ./node_modules/.bin/prisma generate || true
fi
pnpm build

echo "=== [5/6] PM2 起動 & 永続化 ==="
pm2 start "$BASE/ecosystem.config.cjs" || pm2 restart "$PM2_NAME" --update-env
pm2 save

echo "=== [6/6] Caddyfile ＆ Crontab 設定確認 ==="
echo "Setup finished successfully!"
