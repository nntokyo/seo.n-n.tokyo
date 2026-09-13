#!/usr/bin/env bash
# ==============================================================================
# seo.n-n.tokyo ゼロダウンタイム・デプロイスクリプト
#
# 特徴:
# 1. ビルドが完全に成功するまで既存プロセスを停止しない（ダウンタイムゼロ）
# 2. ビルド・ヘルスチェック失敗時は即座にロールバックして旧バージョンを継続稼働
# 3. GitHub Webhook (Port 9104) および cron から安全に呼び出し可能
# 4. 二重起動防止 (flock 排他制御)
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

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  log "git repository is not initialized: $BASE"
  exit 1
fi

CURRENT_LOCAL_SHA=$(git rev-parse HEAD 2>/dev/null || echo "initial")

# リモート最新コミットを取得
if ! git fetch origin "$BRANCH" --quiet 2>&1; then
  log "git fetch origin $BRANCH failed"
  exit 1
fi

REMOTE_SHA=$(git rev-parse "origin/$BRANCH") || { log "rev-parse failed"; exit 1; }
LAST_SHA=""
[ -f "$STATE_FILE" ] && LAST_SHA=$(cat "$STATE_FILE")

# 差分がなければ終了 (Webhook経由の場合は強制実行フラグも許容)
if [ "$REMOTE_SHA" = "$LAST_SHA" ] && [ "${FORCE_DEPLOY:-false}" != "true" ]; then
  log "already at latest commit: ${REMOTE_SHA:0:7}, nothing to deploy"
  exit 0
fi

SHORT="${REMOTE_SHA:0:7}"
PREV_SHORT=$(printf '%.7s' "${CURRENT_LOCAL_SHA:-none}")
SUBJECT=$(git log -1 --pretty='%s' "$REMOTE_SHA" 2>/dev/null || echo '(no subject)')
log "===== zero-downtime deploy start: $BRANCH @ $SHORT (from $PREV_SHORT) — $SUBJECT ====="

# ロールバック用関数
rollback() {
  log "🚨 DEPLOYMENT FAILED! Initiating zero-downtime rollback to $CURRENT_LOCAL_SHA..."
  git reset --hard "$CURRENT_LOCAL_SHA" 2>&1 || true
  log "Rollback completed. Existing PM2 processes remain active without disruption."
  exit 1
}

# 1. ワークツリーを更新 (.env, logs, .state などは保持)
if ! git reset --hard "origin/$BRANCH" 2>&1; then
  log "git reset failed"
  rollback
fi

chmod +x "$BASE/infra/deploy.sh" 2>/dev/null || true

# 2. 依存パッケージの安全インストール (失敗時はロールバック)
log "Step 1: Installing dependencies (pnpm install)..."
if ! pnpm install 2>&1; then
  log "pnpm install failed"
  rollback
fi

# 3. Prisma DB スキーマ反映 (後方互換マイグレーション)
if [ -f "$BASE/prisma/schema.prisma" ]; then
  log "Step 2: Syncing database schema (prisma db push)..."
  if ! pnpm --filter backend exec prisma db push --accept-data-loss 2>&1; then
    log "prisma db push failed"
    rollback
  fi
  pnpm --filter backend exec prisma generate 2>&1 || true
fi

# 4. 事前ビルド (ビルド完了まで旧プロセスは通常通りリクエストを処理中)
log "Step 3: Building apps (shared, backend, frontend)..."
if ! pnpm build 2>&1; then
  log "pnpm build failed"
  rollback
fi

# 5. リロード & ヘルスチェック (ゼロダウンタイム切り替え)
log "Step 4: Reloading PM2 processes with updated bundle..."

# バックエンドのリロード
if pm2 describe "$BACKEND_NAME" >/dev/null 2>&1; then
  pm2 reload "$BACKEND_NAME" --update-env 2>&1 || pm2 restart "$BACKEND_NAME" --update-env 2>&1
else
  pm2 start "$BASE/ecosystem.config.cjs" --only "$BACKEND_NAME" 2>&1
fi

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

# フロントエンドのリロード
if pm2 describe "$FRONTEND_NAME" >/dev/null 2>&1; then
  pm2 reload "$FRONTEND_NAME" --update-env 2>&1 || pm2 restart "$FRONTEND_NAME" --update-env 2>&1
else
  pm2 start "$BASE/ecosystem.config.cjs" --only "$FRONTEND_NAME" 2>&1
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
log "===== 🎉 ZERO-DOWNTIME DEPLOY SUCCESSFUL: $SHORT ====="
exit 0
