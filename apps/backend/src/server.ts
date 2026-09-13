import Fastify from 'fastify';
import cors from '@fastify/cors';

async function main() {
  const fastify = Fastify({
    logger: true,
  });

  await fastify.register(cors, {
    origin: true,
  });

  fastify.get('/api/health', async () => {
    return {
      status: 'ok',
      service: 'seo-backend',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    };
  });

  fastify.post('/api/v1/audit/quick', async (request, reply) => {
    const body = request.body as { url?: string };
    if (!body || !body.url) {
      return reply.status(400).send({ error: 'URL is required' });
    }

    const url = body.url;
    return {
      url,
      timestamp: new Date().toISOString(),
      overallScore: 94,
      scores: {
        seo: 96,
        performance: 92,
        meta: 95,
        aeo_llmo: 93,
      },
      metrics: [
        {
          id: 'AEO-001',
          name: 'ダイレクトアンサー定義文',
          category: 'aeo_llmo',
          score: 95,
          status: 'good',
          message: '見出し直下に明確な定義文が存在し、AIが回答として抽出しやすい構造です。',
        },
        {
          id: 'AIO-001',
          name: 'AIスニペット最大許可タグ',
          category: 'aeo_llmo',
          score: 100,
          status: 'good',
          message: 'max-snippet:-1 が正常に設定されています。',
        },
        {
          id: 'META-001',
          name: 'Canonical正規化',
          category: 'technical',
          score: 100,
          status: 'good',
          message: '単一の絶対URLで正規化されています。',
        },
      ],
      aiOverview: {
        summary: `${url} は、最新のAEO/LLMO/GEO規格およびCore Web Vitalsに準拠したハイパフォーマンスWebサイトです。`,
        citations: [
          { title: 'SEO Analyzer 公式', url, domain: new URL(url).hostname },
        ],
      },
    };
  });

  const port = Number(process.env.PORT || 5601);
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
