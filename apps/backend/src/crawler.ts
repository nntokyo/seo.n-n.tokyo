import * as cheerio from 'cheerio';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
  CrawlGraphNode,
  CrawlGraphEdge,
  CrawlBrokenLink,
  CrawlTreeItem,
  CrawlSessionSummary,
  CrawlProgressEvent,
  CrawlGraphResponse,
  CrawlBrokenResponse,
  CrawlTreeResponse,
} from '@seo/shared';

export interface InternalCrawlState {
  session: CrawlSessionSummary;
  nodes: Map<string, CrawlGraphNode>;
  edges: CrawlGraphEdge[];
  brokenLinks: CrawlBrokenLink[];
  visited: Set<string>;
  queue: Array<{ url: string; depth: number; parentUrl?: string; anchorText?: string }>;
}

const crawlStateMap = new Map<string, InternalCrawlState>();

// クロール永続化ディレクトリ (.data/crawls)
const crawlDataDir = path.resolve(process.cwd(), '.data', 'crawls');
try {
  fs.mkdirSync(crawlDataDir, { recursive: true });
} catch {}

function saveCrawlToDisk(sessionId: string, state: InternalCrawlState) {
  try {
    const filePath = path.join(crawlDataDir, `${sessionId}.json`);
    const serialized = {
      session: state.session,
      nodes: Array.from(state.nodes.values()),
      edges: state.edges,
      brokenLinks: state.brokenLinks,
    };
    fs.writeFileSync(filePath, JSON.stringify(serialized), 'utf8');
  } catch {}
}

function loadCrawlFromDisk(sessionId: string): InternalCrawlState | null {
  try {
    const filePath = path.join(crawlDataDir, `${sessionId}.json`);
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(raw);
      const nodeMap = new Map<string, CrawlGraphNode>();
      for (const n of data.nodes || []) {
        nodeMap.set(n.url, n);
      }
      const state: InternalCrawlState = {
        session: data.session,
        nodes: nodeMap,
        edges: data.edges || [],
        brokenLinks: data.brokenLinks || [],
        visited: new Set(nodeMap.keys()),
        queue: [],
      };
      crawlStateMap.set(sessionId, state);
      return state;
    }
  } catch {}
  return null;
}

// 進行度イベントリスナー (SSE用)
type ProgressListener = (event: CrawlProgressEvent) => void;
const progressListeners = new Map<string, Set<ProgressListener>>();

export function addProgressListener(sessionId: string, listener: ProgressListener) {
  if (!progressListeners.has(sessionId)) {
    progressListeners.set(sessionId, new Set());
  }
  progressListeners.get(sessionId)!.add(listener);
}

export function removeProgressListener(sessionId: string, listener: ProgressListener) {
  progressListeners.get(sessionId)?.delete(listener);
}

function emitProgress(sessionId: string, event: CrawlProgressEvent) {
  const set = progressListeners.get(sessionId);
  if (set) {
    for (const listener of set) {
      try { listener(event); } catch {}
    }
  }
}

// URLの正規化
function normalizeUrl(targetUrl: string, baseUrl: string): string | null {
  try {
    const parsed = new URL(targetUrl, baseUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    parsed.hash = '';
    const dropParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid'];
    for (const p of dropParams) {
      parsed.searchParams.delete(p);
    }
    let finalUrl = parsed.toString();
    if (parsed.pathname !== '/' && finalUrl.endsWith('/')) {
      finalUrl = finalUrl.slice(0, -1);
    }
    return finalUrl;
  } catch {
    return null;
  }
}

// 簡易PageRankアルゴリズムの反復計算 (有向グラフ)
function calculatePageRank(nodes: Map<string, CrawlGraphNode>, edges: CrawlGraphEdge[]) {
  const damping = 0.85;
  const iterations = 15;
  const total = nodes.size;
  if (total === 0) return;

  nodes.forEach((n) => (n.pageRankScore = 1.0 / total));

  const outDegree = new Map<string, number>();
  const inEdges = new Map<string, string[]>();

  edges.forEach((e) => {
    outDegree.set(e.source, (outDegree.get(e.source) || 0) + 1);
    if (!inEdges.has(e.target)) inEdges.set(e.target, []);
    inEdges.get(e.target)!.push(e.source);
  });

  for (let i = 0; i < iterations; i++) {
    const nextScores = new Map<string, number>();
    for (const [url] of nodes) {
      const incoming = inEdges.get(url) || [];
      let rankSum = 0;
      for (const src of incoming) {
        const srcOut = outDegree.get(src) || 1;
        const srcScore = nodes.get(src)?.pageRankScore || (1.0 / total);
        rankSum += srcScore / srcOut;
      }
      const newScore = (1 - damping) / total + damping * rankSum;
      nextScores.set(url, newScore);
    }
    for (const [url, score] of nextScores) {
      if (nodes.has(url)) nodes.get(url)!.pageRankScore = Number((score * 10).toFixed(3));
    }
  }

  nodes.forEach((n) => {
    n.isOrphan = n.depth > 0 && n.inLinksCount === 0;
  });
}

// クロール開始
export async function startCrawlSession(targetUrl: string, maxPages = 60): Promise<string> {
  const normUrl = normalizeUrl(targetUrl, targetUrl);
  if (!normUrl) throw new Error('有効なURLを指定してください');

  const parsed = new URL(normUrl);
  const rootDomain = parsed.hostname;
  const sessionId = `crawl_${crypto.randomBytes(8).toString('hex')}`;

  const state: InternalCrawlState = {
    session: {
      id: sessionId,
      targetUrl: normUrl,
      rootDomain,
      status: 'running',
      totalPages: 0,
      maxPages: Math.min(Math.max(maxPages, 10), 300),
      crawledPages: 0,
      brokenLinksCount: 0,
      orphanPagesCount: 0,
      avgDepth: 0,
      startedAt: new Date().toISOString(),
    },
    nodes: new Map(),
    edges: [],
    brokenLinks: [],
    visited: new Set(),
    queue: [{ url: normUrl, depth: 0 }],
  };

  crawlStateMap.set(sessionId, state);

  executeCrawlLoop(sessionId).catch((err) => {
    console.error(`[Crawl ${sessionId}] Error:`, err);
    state.session.status = 'failed';
    saveCrawlToDisk(sessionId, state);
  });

  return sessionId;
}

// クロール非同期ワーカーメインループ
async function executeCrawlLoop(sessionId: string) {
  const state = crawlStateMap.get(sessionId);
  if (!state) return;

  const { session, nodes, edges, brokenLinks, visited, queue } = state;
  const maxPages = session.maxPages;
  const targetDomain = session.rootDomain;

  while (queue.length > 0 && visited.size < maxPages) {
    const current = queue.shift()!;
    const currentUrl = current.url;

    if (visited.has(currentUrl)) continue;
    visited.add(currentUrl);

    emitProgress(sessionId, {
      sessionId,
      status: 'running',
      currentUrl,
      crawledCount: visited.size,
      totalFound: visited.size + queue.length,
      brokenCount: brokenLinks.length,
      percent: Math.min(99, Math.round((visited.size / maxPages) * 100)),
    });

    try {
      const res = await fetch(currentUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; SEOAnalyzerCrawler/2.0; +https://seo.n-n.tokyo/bot)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: AbortSignal.timeout(8000),
      });

      const httpStatus = res.status;
      const contentType = res.headers.get('content-type') || '';

      if (httpStatus >= 400) {
        nodes.set(currentUrl, {
          id: currentUrl,
          url: currentUrl,
          title: `Error ${httpStatus}`,
          httpStatus,
          depth: current.depth,
          inLinksCount: 1,
          outLinksCount: 0,
          pageRankScore: 0.1,
          isOrphan: false,
          hasCanonicalIssue: false,
        });

        if (current.parentUrl) {
          brokenLinks.push({
            sourceUrl: current.parentUrl,
            targetUrl: currentUrl,
            anchorText: current.anchorText || 'リンク',
            httpStatus,
            errorReason: `HTTP ${httpStatus} ${res.statusText}`,
            discoveredAt: new Date().toISOString(),
          });
        }
        continue;
      }

      if (!contentType.includes('text/html')) {
        nodes.set(currentUrl, {
          id: currentUrl,
          url: currentUrl,
          title: path.basename(new URL(currentUrl).pathname) || currentUrl,
          httpStatus,
          depth: current.depth,
          inLinksCount: 1,
          outLinksCount: 0,
          pageRankScore: 0.5,
          isOrphan: false,
          hasCanonicalIssue: false,
        });
        continue;
      }

      const html = await res.text();
      const $ = cheerio.load(html);
      const title = $('title').first().text().trim() || $('h1').first().text().trim() || currentUrl;
      const metaDescription = $('meta[name="description"]').attr('content')?.trim();
      const canonical = $('link[rel="canonical"]').attr('href')?.trim();

      let hasCanonicalIssue = false;
      if (canonical) {
        const normCanonical = normalizeUrl(canonical, currentUrl);
        if (normCanonical && normCanonical !== currentUrl) {
          hasCanonicalIssue = true;
        }
      }

      const existingNode = nodes.get(currentUrl);
      if (existingNode) {
        existingNode.title = title;
        existingNode.httpStatus = httpStatus;
        existingNode.metaDescription = metaDescription;
        existingNode.hasCanonicalIssue = hasCanonicalIssue;
      } else {
        nodes.set(currentUrl, {
          id: currentUrl,
          url: currentUrl,
          title,
          httpStatus,
          depth: current.depth,
          inLinksCount: 0,
          outLinksCount: 0,
          pageRankScore: 1.0,
          isOrphan: current.depth > 0,
          hasCanonicalIssue,
          metaDescription,
        });
      }

      let outgoingCount = 0;
      $('a[href]').each((_, el) => {
        const href = $(el).attr('href');
        if (!href) return;
        const normHref = normalizeUrl(href, currentUrl);
        if (!normHref) return;

        try {
          const hrefParsed = new URL(normHref);
          if (hrefParsed.hostname === targetDomain || hrefParsed.hostname.endsWith(`.${targetDomain}`)) {
            outgoingCount++;
            const anchorText = $(el).text().trim().replace(/\s+/g, ' ') || 'アンカーなし';
            const rel = $(el).attr('rel') || '';
            const isNofollow = rel.toLowerCase().includes('nofollow');

            const exists = edges.some((e) => e.source === currentUrl && e.target === normHref);
            if (!exists) {
              edges.push({
                source: currentUrl,
                target: normHref,
                anchorText: anchorText.slice(0, 50),
                isNofollow,
              });

              const targetNode = nodes.get(normHref);
              if (targetNode) {
                targetNode.inLinksCount++;
              }
            }

            if (!visited.has(normHref) && !queue.some((q) => q.url === normHref) && current.depth < 3) {
              queue.push({
                url: normHref,
                depth: current.depth + 1,
                parentUrl: currentUrl,
                anchorText,
              });
            }
          }
        } catch {}
      });

      const updatedNode = nodes.get(currentUrl);
      if (updatedNode) {
        updatedNode.outLinksCount = outgoingCount;
      }

      await new Promise((r) => setTimeout(r, 120));
    } catch (err: any) {
      nodes.set(currentUrl, {
        id: currentUrl,
        url: currentUrl,
        title: 'Fetch Timeout / Failed',
        httpStatus: 0,
        depth: current.depth,
        inLinksCount: 1,
        outLinksCount: 0,
        pageRankScore: 0.1,
        isOrphan: false,
        hasCanonicalIssue: false,
      });

      if (current.parentUrl) {
        brokenLinks.push({
          sourceUrl: current.parentUrl,
          targetUrl: currentUrl,
          anchorText: current.anchorText || 'リンク',
          httpStatus: 0,
          errorReason: err.message || '接続エラーまたはタイムアウト',
          discoveredAt: new Date().toISOString(),
        });
      }
    }
  }

  calculatePageRank(nodes, edges);

  let totalDepth = 0;
  let orphanCount = 0;
  for (const [, n] of nodes) {
    totalDepth += n.depth;
    if (n.isOrphan) orphanCount++;
  }

  session.status = 'completed';
  session.totalPages = nodes.size;
  session.crawledPages = visited.size;
  session.brokenLinksCount = brokenLinks.length;
  session.orphanPagesCount = orphanCount;
  session.avgDepth = nodes.size > 0 ? Number((totalDepth / nodes.size).toFixed(1)) : 0;
  session.completedAt = new Date().toISOString();

  saveCrawlToDisk(sessionId, state);

  emitProgress(sessionId, {
    sessionId,
    status: 'completed',
    currentUrl: 'クロール完了',
    crawledCount: visited.size,
    totalFound: nodes.size,
    brokenCount: brokenLinks.length,
    percent: 100,
  });
}

// 取得API群
export function getCrawlSession(sessionId: string): InternalCrawlState | null {
  let state = crawlStateMap.get(sessionId);
  if (!state) {
    state = loadCrawlFromDisk(sessionId) || undefined;
  }
  return state || null;
}

export function getCrawlGraphData(sessionId: string): CrawlGraphResponse | null {
  const state = getCrawlSession(sessionId);
  if (!state) return null;

  const nodes = Array.from(state.nodes.values());
  let maxDepth = 0;
  for (const n of nodes) {
    if (n.depth > maxDepth) maxDepth = n.depth;
  }

  return {
    session: state.session,
    nodes,
    edges: state.edges,
    stats: {
      totalNodes: nodes.length,
      totalEdges: state.edges.length,
      orphanCount: state.session.orphanPagesCount,
      brokenCount: state.session.brokenLinksCount,
      maxDepth,
    },
  };
}

export function getCrawlBrokenData(sessionId: string): CrawlBrokenResponse | null {
  const state = getCrawlSession(sessionId);
  if (!state) return null;

  return {
    session: state.session,
    brokenLinks: state.brokenLinks,
    totalBroken: state.brokenLinks.length,
  };
}

export function getCrawlTreeData(sessionId: string): CrawlTreeResponse | null {
  const state = getCrawlSession(sessionId);
  if (!state) return null;

  const rootItem: CrawlTreeItem = {
    path: '/',
    url: state.session.targetUrl,
    depth: 0,
    httpStatus: 200,
    childCount: 0,
    children: [],
  };

  const pathMap = new Map<string, CrawlTreeItem>();
  pathMap.set('/', rootItem);

  for (const [, node] of state.nodes) {
    try {
      const parsed = new URL(node.url);
      const segments = parsed.pathname.split('/').filter(Boolean);
      let curPath = '';

      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        const parentPath = curPath || '/';
        curPath += `/${seg}`;

        if (!pathMap.has(curPath)) {
          const newItem: CrawlTreeItem = {
            path: curPath,
            url: node.url,
            depth: i + 1,
            httpStatus: node.httpStatus,
            childCount: 0,
            children: [],
          };
          pathMap.set(curPath, newItem);

          const parent = pathMap.get(parentPath);
          if (parent) {
            parent.children = parent.children || [];
            parent.children.push(newItem);
            parent.childCount++;
          }
        }
      }
    } catch {}
  }

  return {
    session: state.session,
    tree: rootItem.children || [],
    totalNodes: state.nodes.size,
  };
}
