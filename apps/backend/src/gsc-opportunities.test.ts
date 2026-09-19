import test from 'node:test';
import assert from 'node:assert/strict';
import { buildGscOpportunities } from './gsc-opportunities.js';

test('extracts CTR, striking-distance and zero-click opportunities', () => {
  const result = buildGscOpportunities({
    targetUrl: 'https://example.com/',
    queries: [
      { query: 'seo 診断', clicks: 2, impressions: 200, ctr: 1, position: 4.2 },
      { query: 'seo チェック', clicks: 3, impressions: 80, ctr: 3.75, position: 11.1 },
      { query: 'llms txt', clicks: 0, impressions: 120, ctr: 0, position: 9.4 },
    ],
    queryPages: [],
    indexStatus: {
      verdict: 'PASS',
      coverageState: 'Submitted and indexed',
      robotsTxtState: 'ALLOWED',
      indexingState: 'INDEXING_ALLOWED',
    },
  });

  assert.ok(result.opportunities.some((item) => item.type === 'ctr_opportunity' && item.query === 'seo 診断'));
  assert.ok(result.opportunities.some((item) => item.type === 'striking_distance' && item.query === 'seo チェック'));
  assert.ok(result.opportunities.some((item) => item.type === 'zero_click' && item.query === 'llms txt'));
  assert.equal(result.summary.high >= 1, true);
});

test('detects cannibalization only when multiple pages have meaningful share', () => {
  const result = buildGscOpportunities({
    targetUrl: 'https://example.com/',
    queries: [],
    queryPages: [
      { query: 'seo tool', page: 'https://example.com/a', clicks: 4, impressions: 60, ctr: 6.67, position: 8 },
      { query: 'seo tool', page: 'https://example.com/b', clicks: 2, impressions: 30, ctr: 6.67, position: 12 },
    ],
  });

  const item = result.opportunities.find((opportunity) => opportunity.type === 'cannibalization');
  assert.ok(item);
  assert.deepEqual(item?.pages, ['https://example.com/a', 'https://example.com/b']);
});

test('indexing issue is high priority', () => {
  const result = buildGscOpportunities({
    targetUrl: 'https://example.com/page',
    queries: [],
    queryPages: [],
    indexStatus: {
      verdict: 'FAIL',
      coverageState: 'Blocked by robots.txt',
      robotsTxtState: 'DISALLOWED',
      indexingState: 'BLOCKED_BY_META_TAG',
    },
  });

  assert.equal(result.opportunities[0]?.type, 'indexing_issue');
  assert.equal(result.opportunities[0]?.priority, 'high');
  assert.equal(result.summary.indexingIssues, 1);
});

test('low-volume data does not create noisy opportunities', () => {
  const result = buildGscOpportunities({
    targetUrl: 'https://example.com/',
    queries: [
      { query: 'tiny', clicks: 0, impressions: 5, ctr: 0, position: 9 },
    ],
    queryPages: [
      { query: 'tiny', page: 'https://example.com/a', clicks: 0, impressions: 3, ctr: 0, position: 9 },
      { query: 'tiny', page: 'https://example.com/b', clicks: 0, impressions: 2, ctr: 0, position: 10 },
    ],
  });

  assert.equal(result.opportunities.length, 0);
  assert.equal(result.summary.total, 0);
});
