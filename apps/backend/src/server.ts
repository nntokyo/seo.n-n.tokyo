import Fastify from 'fastify';
import cors from '@fastify/cors';
import { analyzeHtml } from './analyzer.js';

async function main() {
  const fastify = Fastify({
    logger: true,
  });

  await fastify.register(cors, {
    origin: true,
  });

  // インメモリ診断結果キャッシュ (直近100件)
  const auditCache = new Map<string, any>();

  fastify.get('/api/health', async () => {
    return {
      status: 'ok',
      service: 'seo-backend',
      version: '1.2.0',
      cachedAudits: auditCache.size,
      timestamp: new Date().toISOString(),
    };
  });

  // 即時URL診断エンドポイント (Cheerio 実スクレイピング & 150+ルール解析)
  fastify.post('/api/v1/audit/quick', async (request, reply) => {
    const body = request.body as { url?: string };
    if (!body || !body.url) {
      return reply.status(400).send({ error: 'URL is required' });
    }

    let targetUrl = body.url.trim();
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = `https://${targetUrl}`;
    }

    try {
      const startTime = Date.now();
      const response = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; SEOAnalyzerBot/2.0; +https://seo.n-n.tokyo/bot)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: AbortSignal.timeout(12000),
      });

      const responseTimeMs = Date.now() - startTime;
      const html = await response.text();
      const httpStatus = response.status;

      const result = analyzeHtml(targetUrl, html, responseTimeMs, httpStatus);

      // キャッシュに保存
      auditCache.set(result.id, result);
      if (auditCache.size > 100) {
        const oldestKey = auditCache.keys().next().value;
        if (oldestKey) auditCache.delete(oldestKey);
      }

      return result;
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({ 
        error: 'Failed to fetch target URL', 
        message: err.message || 'Unknown network error' 
      });
    }
  });

  // 診断結果詳細取得エンドポイント
  fastify.get('/api/v1/audit/results/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const cached = auditCache.get(id);
    if (!cached) {
      return reply.status(404).send({ error: 'Audit result not found or expired' });
    }
    return cached;
  });

  // 内部/外部リンク一覧取得エンドポイント
  fastify.post('/api/v1/crawl/links', async (request, reply) => {
    const body = request.body as { url?: string };
    if (!body || !body.url) {
      return reply.status(400).send({ error: 'URL is required' });
    }

    let targetUrl = body.url.trim();
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = `https://${targetUrl}`;
    }

    try {
      const startTime = Date.now();
      const response = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; SEOAnalyzerBot/2.0; +https://seo.n-n.tokyo/bot)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: AbortSignal.timeout(12000),
      });

      const responseTimeMs = Date.now() - startTime;
      const html = await response.text();
      const result = analyzeHtml(targetUrl, html, responseTimeMs, response.status);

      return {
        url: targetUrl,
        totalLinks: result.links.length,
        internalLinks: result.links.filter((l) => l.isInternal),
        externalLinks: result.links.filter((l) => !l.isInternal),
      };
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({ error: 'Failed to crawl links', message: err.message });
    }
  });

  // llms.txt 動的生成ツールエンドポイント
  fastify.post('/api/v1/tools/generate-llms-txt', async (request, reply) => {
    const body = request.body as { url?: string; title?: string; description?: string };
    let siteUrl = (body.url || 'https://seo.n-n.tokyo').trim();
    if (!siteUrl.startsWith('http://') && !siteUrl.startsWith('https://')) {
      siteUrl = `https://${siteUrl}`;
    }

    let siteTitle = body.title || '';
    let siteDesc = body.description || '';
    let keyLinks: Array<{ text: string; url: string }> = [];

    // 実URLが指定された場合はメタ情報と内部リンクを自動取得
    try {
      const response = await fetch(siteUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; SEOAnalyzerBot/2.0; +https://seo.n-n.tokyo/bot)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: AbortSignal.timeout(8000),
      });
      const html = await response.text();
      const analysis = analyzeHtml(siteUrl, html, 200, response.status);

      if (!siteTitle) siteTitle = analysis.meta.title || new URL(siteUrl).hostname;
      if (!siteDesc) siteDesc = analysis.meta.description || 'AI時代の次世代Webサイト';
      keyLinks = analysis.links
        .filter((l) => l.isInternal && l.anchorText.length > 2 && !l.anchorText.includes('テキストなし'))
        .slice(0, 8)
        .map((l) => ({ text: l.anchorText, url: l.url }));
    } catch {
      if (!siteTitle) siteTitle = new URL(siteUrl).hostname;
      if (!siteDesc) siteDesc = 'Webサイトの概要情報';
    }

    const linksSection = keyLinks.length > 0
      ? keyLinks.map((l) => `- [${l.text}](${l.url}): ${l.text}の詳細ページ`).join('\n')
      : `- [トップページ](${siteUrl}): メインポータル`;

    const llmsTxt = `# ${siteTitle}

> ${siteDesc}

## 主要ページ・リソース
${linksSection}

## 技術仕様 & 問い合わせ
- 運営URL: ${siteUrl}
- AI利用規約: 本サイトの構造化データおよび要約はLLMの参照・引用を歓迎します。
`.trim();

    return {
      url: siteUrl,
      llmsTxt,
      recommendedPath: '/llms.txt',
    };
  });

  const port = Number(process.env.BACKEND_PORT || (process.env.PORT && process.env.PORT !== '5600' ? process.env.PORT : 5601));
  const host = process.env.HOST || '127.0.0.1';

  try {
    await fastify.listen({ port, host });
    console.log(`Backend server listening on http://${host}:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

main();
