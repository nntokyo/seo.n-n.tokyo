import type {
  GscAnalyticsData,
  GscOpportunity,
  GscOpportunitySummary,
  GscQueryRow,
} from '@seo/shared';

export interface GscQueryPageRow extends GscQueryRow {
  page: string;
}

export function buildGscOpportunities(input: {
  queries: GscQueryRow[];
  queryPages: GscQueryPageRow[];
  indexStatus?: GscAnalyticsData['indexStatus'];
  targetUrl: string;
}): { opportunities: GscOpportunity[]; summary: GscOpportunitySummary } {
  const opportunities: GscOpportunity[] = [];
  const seen = new Set<string>();

  const push = (opportunity: GscOpportunity) => {
    if (seen.has(opportunity.id)) return;
    seen.add(opportunity.id);
    opportunities.push(opportunity);
  };

  if (input.indexStatus && (
    input.indexStatus.verdict !== 'PASS'
    || input.indexStatus.robotsTxtState === 'DISALLOWED'
    || input.indexStatus.indexingState !== 'INDEXING_ALLOWED'
  )) {
    push({
      id: 'indexing:' + input.targetUrl,
      type: 'indexing_issue',
      priority: 'high',
      page: input.targetUrl,
      reason: [
        `URL Inspection: ${input.indexStatus.verdict}`,
        input.indexStatus.coverageState,
        `robots: ${input.indexStatus.robotsTxtState}`,
        `indexing: ${input.indexStatus.indexingState}`,
      ].join(' / '),
      recommendedAction:
        'robots、meta robots、canonical、HTTPステータスを確認し、インデックス阻害要因を解消してからURL検査を再実行してください。',
    });
  }

  for (const row of input.queries) {
    if (row.impressions < 10) continue;

    if (row.clicks === 0 && row.impressions >= 20) {
      push({
        id: `zero:${row.query}`,
        type: 'zero_click',
        priority: row.impressions >= 100 ? 'high' : 'medium',
        query: row.query,
        clicks: row.clicks,
        impressions: row.impressions,
        ctr: row.ctr,
        position: row.position,
        reason: `「${row.query}」は${row.impressions}回表示されていますがクリックがありません。`,
        recommendedAction:
          '検索意図とページ内容の一致を確認し、title・description・見出しの訴求を検索結果に合わせて改善してください。',
      });
      continue;
    }

    if (row.position <= 10 && row.impressions >= 30 && row.ctr < 2) {
      push({
        id: `ctr:${row.query}`,
        type: 'ctr_opportunity',
        priority: row.impressions >= 100 ? 'high' : 'medium',
        query: row.query,
        clicks: row.clicks,
        impressions: row.impressions,
        ctr: row.ctr,
        position: row.position,
        reason: `平均順位${row.position}位で表示されていますがCTRは${row.ctr}%です。`,
        recommendedAction:
          'titleとdescriptionを検索意図に合わせて具体化し、検索結果で選ばれる理由を明確にしてください。',
      });
    }

    if (row.position > 7 && row.position <= 20 && row.impressions >= 20) {
      push({
        id: `distance:${row.query}`,
        type: 'striking_distance',
        priority: row.position <= 12 && row.impressions >= 50 ? 'high' : 'medium',
        query: row.query,
        clicks: row.clicks,
        impressions: row.impressions,
        ctr: row.ctr,
        position: row.position,
        reason: `「${row.query}」は平均${row.position}位で、1ページ目〜2ページ目付近にいます。`,
        recommendedAction:
          '対象ページの検索意図充足、本文の具体性、関連内部リンク、見出し構成を強化してください。',
      });
    }
  }

  const pagesByQuery = new Map<string, GscQueryPageRow[]>();
  for (const row of input.queryPages) {
    if (row.impressions < 5) continue;
    const rows = pagesByQuery.get(row.query) || [];
    rows.push(row);
    pagesByQuery.set(row.query, rows);
  }

  for (const [query, rows] of pagesByQuery) {
    const meaningful = rows
      .filter((row) => row.impressions >= 5)
      .sort((a, b) => b.impressions - a.impressions);
    const uniquePages = Array.from(new Set(meaningful.map((row) => row.page)));
    if (uniquePages.length < 2) continue;

    const totalImpressions = meaningful.reduce((sum, row) => sum + row.impressions, 0);
    if (totalImpressions < 20) continue;

    const topTwo = meaningful.slice(0, 2);
    const secondShare = topTwo[1].impressions / Math.max(1, topTwo[0].impressions);
    if (secondShare < 0.25) continue;

    push({
      id: `cannibal:${query}`,
      type: 'cannibalization',
      priority: totalImpressions >= 100 ? 'high' : 'medium',
      query,
      pages: uniquePages.slice(0, 4),
      impressions: totalImpressions,
      reason: `「${query}」で複数URLが表示され、主要URLが分散しています。`,
      recommendedAction:
        '各ページの検索意図と役割を分け、必要に応じてcanonical、内部リンク、コンテンツ統合を検討してください。',
    });
  }

  const rank = { high: 0, medium: 1, low: 2 } as const;
  opportunities.sort((a, b) => {
    const priority = rank[a.priority] - rank[b.priority];
    if (priority !== 0) return priority;
    return (b.impressions || 0) - (a.impressions || 0);
  });

  const summary: GscOpportunitySummary = {
    total: opportunities.length,
    high: opportunities.filter((item) => item.priority === 'high').length,
    medium: opportunities.filter((item) => item.priority === 'medium').length,
    low: opportunities.filter((item) => item.priority === 'low').length,
    ctrOpportunities: opportunities.filter((item) => item.type === 'ctr_opportunity').length,
    strikingDistance: opportunities.filter((item) => item.type === 'striking_distance').length,
    zeroClick: opportunities.filter((item) => item.type === 'zero_click').length,
    cannibalization: opportunities.filter((item) => item.type === 'cannibalization').length,
    indexingIssues: opportunities.filter((item) => item.type === 'indexing_issue').length,
  };

  return { opportunities, summary };
}
