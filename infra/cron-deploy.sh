#!/usr/bin/env bash
# ==============================================================================
# seo.n-n.tokyo 自動デプロイスクリプト (2分ごとに cron から呼び出し)
#
# origin/main をポーリングし、新しいコミットがあれば
#   git reset --hard → pnpm install → prisma db push → pnpm build → pm2 restart → healthcheck
# を安全に実行する。前回デプロイ成功 SHA は .state/deployed.sha に保持。
#
# 配置先: /Datas/www/seo.n-n.tokyo/infra/cron-deploy.sh
# crontab 登録例:
#   */2 * * * * /Datas/www/seo.n-n.tokyo/infra/cron-deploy.sh >> /Datas/www/seo.n-n.tokyo/logs/cron-deploy.log 2>&1
# ==============================================================================

set -uo pipefail

export PATH="/usr/local/bin:/usr/bin:/bin:$HOME/.local/share/pnpm:$HOME/.nvm/versions/node/$(ls $HOME/.nvm/versions/node 2>/dev/null | tail -1)/bin"

BASE="/Datas/www/seo.n-n.tokyo"
BRANCH="main"
PM2_NAME="seo-n-n-tokyo"
PORT="5600"
STATE_DIR="$BASE/.state"
STATE_FILE="$STATE_DIR/deployed.sha"
LOG_DIR="$BASE/logs"
DATA_DIR="$BASE/.data"
LOCK="/tmp/seo-n-n-tokyo-cron-deploy.lock"

mkdir -p "$STATE_DIR" "$LOG_DIR" "$DATA_DIR"

ts() { date "+%Y-%m-%dT%H:%M:%S%z"; }
log() { printf '[%s] %s\n' "$(ts)" "$*"; }

# 二重起動防止
exec 9>"$LOCK"
if ! flock -n 9; then
  log "another instance running, skipping"
  exit 0
fi

cd "$BASE" || { log "cd failed: $BASE"; exit 1; }

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  log "git repository is not initialized: $BASE"
  exit 1
fi

# 最新コミットを取得
if ! git fetch origin "$BRANCH" --quiet 2>&1; then
  log "git fetch failed"
  exit 1
fi

REMOTE_SHA=$(git rev-parse "origin/$BRANCH") || { log "rev-parse failed"; exit 1; }
LAST_SHA=""
[ -f "$STATE_FILE" ] && LAST_SHA=$(cat "$STATE_FILE")

# 変化なしなら何もしない
if [ "$REMOTE_SHA" = "$LAST_SHA" ]; then
  exit 0
fi

# 必須ファイルの存在チェック
REQUIRED_FILES=(
  "package.json"
  "pnpm-lock.yaml"
  "ecosystem.config.cjs"
  "infra/cron-deploy.sh"
)
for required_file in "${REQUIRED_FILES[@]}"; do
  if ! git cat-file -e "origin/$BRANCH:$required_file" 2>/dev/null; then
    log "remote branch is not deployment-ready: missing $required_file"
    exit 1
  fi
done

SHORT="${REMOTE_SHA:0:7}"
PREV_SHORT=$(printf '%.7s' "${LAST_SHA:-none}")
SUBJECT=$(git log -1 --pretty='%s' "$REMOTE_SHA" 2>/dev/null || echo '(no subject)')
log "===== deploy start: $BRANCH @ $SHORT (was $PREV_SHORT) — $SUBJECT ====="

# 作業ツリーを origin/main に一致させる (.env, logs, .state は保持)
if ! git reset --hard "origin/$BRANCH" 2>&1; then
  log "git reset failed"
  exit 1
fi

chmod +x "$BASE/infra/cron-deploy.sh" 2>/dev/null || true

log "pnpm install --frozen-lockfile"
if ! pnpm install --frozen-lockfile 2>&1; then
  log "pnpm install failed"
  exit 1
fi

# Prisma DB スキーマ同期 & クライアント生成
if [ -f "$BASE/prisma/schema.prisma" ]; then
  log "prisma db push & generate"
  ./node_modules/.bin/prisma db push --accept-data-loss 2>&1 || true
  ./node_modules/.bin/prisma generate 2>&1 || true
fi

log "pnpm build"
if ! pnpm build 2>&1; then
  log "pnpm build failed"
  exit 1
fi

# PM2 リスタート
log "pm2 restart $PM2_NAME"
if ! pm2 restart "$PM2_NAME" --update-env 2>&1; then
  log "pm2 restart failed, attempting start"
  pm2 start "$BASE/ecosystem.config.cjs" 2>&1 || { log "pm2 start failed"; exit 1; }
fi

# ヘルスチェック (最大15秒待機)
log "health check on http://127.0.0.1:$PORT/"
HEALTHY=false
for i in $(seq 1 15); do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:$PORT/" 2>/dev/null || true)
  if [ "$STATUS" = "200" ] || [ "$STATUS" = "307" ] || [ "$STATUS" = "308" ]; then
    log "health check passed (status: $STATUS)"
    HEALTHY=true
    break
  fi
  sleep 1
done

if [ "$HEALTHY" = "true" ]; then
  echo "$REMOTE_SHA" > "$STATE_FILE"
  log "===== deploy success: $SHORT ====="
  exit 0
else
  log "===== deploy failed: health check timed out (last status: ${STATUS:-none}) ====="
  exit 1
fi
