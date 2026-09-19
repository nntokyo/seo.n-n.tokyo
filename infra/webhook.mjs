#!/usr/bin/env node
/**
 * GitHub Webhook 自動デプロイサーバー
 * 
 * GitHubの push イベント (X-Hub-Signature-256) を検証し、
 * main ブランチへのプッシュを検知してゼロダウンタイム・デプロイ (/deploy.sh) を起動します。
 *
 * ポート: 127.0.0.1:9104
 * Caddy: https://seo.n-n.tokyo/webhook -> 127.0.0.1:9104
 */
import crypto from 'node:crypto';
import http from 'node:http';
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const currentDir = dirname(fileURLToPath(import.meta.url));
const baseDir = resolve(currentDir, '..');

// .env ファイルの自動読み込み (Node.js 20.6+)
try {
  process.loadEnvFile(resolve(baseDir, '.env'));
} catch {}

const port = Number.parseInt(process.env.DEPLOY_WEBHOOK_PORT || '9104', 10);
const host = process.env.DEPLOY_WEBHOOK_HOST || '127.0.0.1';
const secret = process.env.DEPLOY_WEBHOOK_SECRET || '';
const allowUnsignedWebhook = process.env.ALLOW_UNSIGNED_DEPLOY_WEBHOOK === 'true' && process.env.NODE_ENV !== 'production';
const targetBranch = process.env.DEPLOY_TARGET_BRANCH || 'main';
const deployScript = process.env.DEPLOY_SCRIPT || resolve(currentDir, 'deploy.sh');
const maxPayloadBytes = 1024 * 1024; // 1MB

if (!secret && !allowUnsignedWebhook) {
  throw new Error('DEPLOY_WEBHOOK_SECRET is required. Unsigned deploy webhooks are disabled by default.');
}

if (!secret && allowUnsignedWebhook) {
  console.warn('[seo-webhook] WARNING: unsigned webhook mode is enabled for non-production use only');
}

let isDeploying = false;

function isValidSignature(payload, signature) {
  if (!secret) return allowUnsignedWebhook;
  const expected = `sha256=${crypto.createHmac('sha256', secret).update(payload).digest('hex')}`;
  const actualBuffer = Buffer.from(signature || '', 'utf8');
  const expectedBuffer = Buffer.from(expected, 'utf8');
  return actualBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(actualBuffer, expectedBuffer);
}

function reply(res, statusCode, body) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && (req.url === '/health' || req.url === '/' || req.url === '/webhook')) {
    reply(res, 200, { status: 'ok', service: 'seo-deploy-webhook', deploying: isDeploying, signatureVerification: Boolean(secret) });
    return;
  }

  if (req.method !== 'POST' || (req.url !== '/webhook' && req.url !== '/')) {
    reply(res, 404, { error: 'Not Found' });
    return;
  }

  const chunks = [];
  let receivedBytes = 0;

  req.on('data', (chunk) => {
    receivedBytes += chunk.length;
    if (receivedBytes > maxPayloadBytes) {
      reply(res, 413, { error: 'Payload Too Large' });
      req.destroy();
      return;
    }
    chunks.push(chunk);
  });

  req.on('end', () => {
    const rawBody = Buffer.concat(chunks).toString('utf8');
    const signature = req.headers['x-hub-signature-256'];
    const event = req.headers['x-github-event'];

    if (!isValidSignature(rawBody, signature)) {
      reply(res, 401, { error: 'Invalid HMAC signature' });
      return;
    }

    if (event === 'ping') {
      reply(res, 200, { message: 'pong, webhook configured successfully' });
      return;
    }

    if (event !== 'push') {
      reply(res, 200, { message: `Ignored event: ${event}` });
      return;
    }

    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      reply(res, 400, { error: 'Invalid JSON body' });
      return;
    }

    const branch = payload.ref ? payload.ref.replace('refs/heads/', '') : '';
    if (branch !== targetBranch) {
      reply(res, 200, { message: `Ignored branch: ${branch}` });
      return;
    }

    if (isDeploying) {
      reply(res, 429, { message: 'Deployment already in progress' });
      return;
    }

    // 非同期で安全にデプロイスクリプトを実行
    isDeploying = true;
    reply(res, 202, {
      message: 'Deployment triggered',
      commit: payload.after ? payload.after.substring(0, 7) : 'latest',
      pusher: payload.pusher ? payload.pusher.name : 'unknown'
    });

    const logFile = resolve(baseDir, 'logs', 'deploy.log');
    let logFd = null;
    try {
      logFd = fs.openSync(logFile, 'a');
    } catch {}

    const child = spawn('bash', [deployScript], {
      cwd: baseDir,
      detached: true,
      stdio: logFd ? ['ignore', logFd, logFd] : 'ignore',
      env: {
        ...process.env,
        TRIGGERED_BY: 'github-webhook',
        TARGET_SHA: payload.after || '',
      }
    });

    child.on('close', (code) => {
      isDeploying = false;
      if (logFd) {
        try { fs.closeSync(logFd); } catch {}
      }
      console.log(`[seo-webhook] deploy finished with exit code ${code}`);
    });

    child.unref();

    // 安全のため最大10分でロック解除
    setTimeout(() => {
      isDeploying = false;
    }, 10 * 60 * 1000);
  });
});

server.listen(port, host, () => {
  console.log(`[seo-webhook] listening on http://${host}:${port}/webhook`);
});
