#!/usr/bin/env bash
# ==============================================================================
# seo.n-n.tokyo ローリング・デプロイスクリプト
# ==============================================================================

set -uo pipefail

export PATH="/usr/local/bin:/usr/bin:/bin:$HOME/.local/share/pnpm:$HOME/.nvm/versions/node/$(ls $HOME/.nvm/versions/node 2>/dev/null | tail -1)/bin"

BASE="/Datas/www/seo.n-n.tokyo"
BRANCH="main"
BACKEND_NAME="seo-backend"
FRONTEND_NAME="seo-frontend"
BACKEND_PORT="5601"
FRONTEND_PORT="5600"
STATE_DIR="$BASE/.state"
STATE_FILE="$STATE_DIR/deployed.sha"
LOG_DIR="$BASE/logs"
DATA_DIR="$BASE/.data"
FRONTEND_DIR="$BASE/apps/frontend"
FRONTEND_BUILD_DIR="$FRONTEND_DIR/.next-build"
FRONTEND_PREVIOUS_DIR="$FRONTEND_DIR/.next-previous"
BACKEND_DIST_BACKUP="$STATE_DIR/backend-dist.previous"
LOCK="/tmp/seo-n-n-tokyo-deploy.lock"

mkdir -p "$STATE_DIR" "$LOG_DIR" "$DATA_DIR"

ts() { date "+%Y-%m-%dT%H:%M:%S%z"; }
log() { printf '[%s] %s\n' "$(ts)" "$*"; }

# 排他ロック (並列デプロイ防止)
exec 9>"$LOCK"
if ! flock -n 9; then
  log "another deploy instance running, skipping"
  exit 0
fi

cd "$BASE" || { log "cd failed: $BASE"; exit 1; }

# 環境変数の読み込み (.env)
if [ -f "$BASE/.env" ]; then
  set -a
  # shellcheck source=/dev/null
  source "$BASE/.env"
  set +a
fi

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  log "git repository is not initialized: $BASE"
  exit 1
fi

REEXEC_MODE=false
if [ "${1:-}" = "--reexec" ]; then
  REEXEC_MODE=true
  CURRENT_LOCAL_SHA="${2:-initial}"
  shift 2
else
  CURRENT_LOCAL_SHA=$(git rev-parse HEAD 2>/dev/null || echo "initial")
fi
SERVICES_RELOADED=false

# リモート最新コミットを取得
if ! git fetch origin "$BRANCH" --quiet 2>&1; then
  log "git fetch origin $BRANCH failed"
  exit 1
fi

REMOTE_SHA=$(git rev-parse "origin/$BRANCH") || { log "rev-parse failed"; exit 1; }
LAST_SHA=""
[ -f "$STATE_FILE" ] && LAST_SHA=$(cat "$STATE_FILE")

# 差分がなければ終了
if [ "$REMOTE_SHA" = "$LAST_SHA" ] && [ "${FORCE_DEPLOY:-false}" != "true" ]; then
  log "already at latest commit: ${REMOTE_SHA:0:7}, nothing to deploy"
  exit 0
fi

SHORT="${REMOTE_SHA:0:7}"
PREV_SHORT=$(printf '%.7s' "${CURRENT_LOCAL_SHA:-none}")
SUBJECT=$(git log -1 --pretty='%s' "$REMOTE_SHA" 2>/dev/null || echo '(no subject)')
log "===== rolling deploy start: $BRANCH @ $SHORT (from $PREV_SHORT) — $SUBJECT ====="

rollback() {
  log "🚨 DEPLOYMENT FAILED! Initiating rollback to $CURRENT_LOCAL_SHA..."
  rm -rf "$FRONTEND_BUILD_DIR"
  if [ -d "$FRONTEND_PREVIOUS_DIR" ]; then
    rm -rf "$FRONTEND_DIR/.next"
    mv "$FRONTEND_PREVIOUS_DIR" "$FRONTEND_DIR/.next"
  fi
  if [ -d "$BACKEND_DIST_BACKUP" ]; then
    rm -rf "$BASE/apps/backend/dist"
    cp -a "$BACKEND_DIST_BACKUP" "$BASE/apps/backend/dist"
  fi
  git reset --hard "$CURRENT_LOCAL_SHA" 2>&1 || true
  if [ "$SERVICES_RELOADED" = "true" ]; then
    PORT="5601" BACKEND_PORT="5601" pm2 startOrReload "$BASE/ecosystem.config.cjs" --only "$BACKEND_NAME" --update-env >/dev/null 2>&1 || true
    PORT="5600" pm2 startOrReload "$BASE/ecosystem.config.cjs" --only "$FRONTEND_NAME" --update-env >/dev/null 2>&1 || true
  fi
  log "Rollback completed. PM2 processes were restored to the previous build where possible."
  exit 1
}

# 1. ワークツリーを更新
if ! git reset --hard "origin/$BRANCH" 2>&1; then
  log "git reset failed"
  rollback
fi

chmod +x "$BASE/infra/deploy.sh" 2>/dev/null || true

# 新スクリプトが更新された場合の再読み込み実行
if [ "$REEXEC_MODE" != "true" ]; then
  exec bash "$BASE/infra/deploy.sh" --reexec "$CURRENT_LOCAL_SHA" "$@"
fi

# 2. 依存パッケージのインストール
log "Step 1: Installing dependencies (pnpm install)..."
if ! pnpm install 2>&1; then
  log "pnpm install failed"
  rollback
fi

# 現在稼働中の成果物は残し、ビルド用ディレクトリだけを初期化する。
rm -rf "$FRONTEND_BUILD_DIR" "$BACKEND_DIST_BACKUP"
if [ -d "$BASE/apps/backend/dist" ]; then
  cp -a "$BASE/apps/backend/dist" "$BACKEND_DIST_BACKUP"
fi

# 3. Prisma DB スキーマ反映
if [ -f "$BASE/prisma/schema.prisma" ]; then
  log "Step 2: Syncing database schema (prisma db push)..."
  if ! pnpm exec prisma db push --schema="$BASE/prisma/schema.prisma" --accept-data-loss 2>&1; then
    log "prisma db push failed"
    rollback
  fi
  pnpm exec prisma generate --schema="$BASE/prisma/schema.prisma" 2>&1 || true
fi

# 4. 事前ビルド
log "Step 3: Building apps (shared, backend, frontend staging)..."
if ! NEXT_DIST_DIR=".next-build" pnpm build 2>&1; then
  log "pnpm build failed"
  rollback
fi
if [ ! -s "$FRONTEND_BUILD_DIR/BUILD_ID" ] || [ ! -s "$FRONTEND_BUILD_DIR/prerender-manifest.json" ]; then
  log "frontend build artifacts are incomplete"
  rollback
fi

# 完成したフロントエンド成果物を短時間で切り替える。
rm -rf "$FRONTEND_PREVIOUS_DIR"
if [ -d "$FRONTEND_DIR/.next" ]; then
  mv "$FRONTEND_DIR/.next" "$FRONTEND_PREVIOUS_DIR"
fi
if ! mv "$FRONTEND_BUILD_DIR" "$FRONTEND_DIR/.next"; then
  log "failed to activate frontend build artifacts"
  rollback
fi

# 5. リロード & ヘルスチェック
log "Step 4: Reloading PM2 processes with updated bundle..."
SERVICES_RELOADED=true

# ecosystem設定を毎回適用し、ポートやメモリ上限が古いPM2定義へ戻らないようにする。
if ! PORT="5601" BACKEND_PORT="5601" pm2 startOrReload "$BASE/ecosystem.config.cjs" --only "$BACKEND_NAME" --update-env 2>&1; then
  log "backend reload failed"
  rollback
fi
if ! PORT="5600" pm2 startOrReload "$BASE/ecosystem.config.cjs" --only "$FRONTEND_NAME" --update-env 2>&1; then
  log "frontend reload failed"
  rollback
fi

# Webhookはこのスクリプトの親プロセスなので、実行中には再起動しない。
# 自己再起動するとヘルスチェックと成功SHAの記録前にデプロイ自体が終了する。

# バックエンドヘルスチェック
log "Verifying backend health on http://127.0.0.1:$BACKEND_PORT/api/health..."
BACKEND_OK=false
for i in $(seq 1 20); do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:$BACKEND_PORT/api/health" 2>/dev/null || true)
  if [ "$STATUS" = "200" ]; then
    log "Backend healthy (HTTP 200) after ${i}s"
    BACKEND_OK=true
    break
  fi
  sleep 1
done

if [ "$BACKEND_OK" != "true" ]; then
  log "Backend health check timed out!"
  rollback
fi

# フロントエンドヘルスチェック
log "Verifying frontend health on http://127.0.0.1:$FRONTEND_PORT/..."
FRONTEND_OK=false
for i in $(seq 1 20); do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:$FRONTEND_PORT/" 2>/dev/null || true)
  if [ "$STATUS" = "200" ] || [ "$STATUS" = "307" ] || [ "$STATUS" = "308" ]; then
    log "Frontend healthy (HTTP $STATUS) after ${i}s"
    FRONTEND_OK=true
    break
  fi
  sleep 1
done

if [ "$FRONTEND_OK" != "true" ]; then
  log "Frontend health check timed out!"
  rollback
fi

# 6. デプロイ成功の記録
echo "$REMOTE_SHA" > "$STATE_FILE"
rm -rf "$FRONTEND_PREVIOUS_DIR" "$BACKEND_DIST_BACKUP"
log "===== DEPLOY SUCCESSFUL: $SHORT ====="
exit 0
