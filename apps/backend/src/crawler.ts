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
  InternalLinkOptimizationReport,
  TechnicalIssueItem,
  PageClassificationItem,
  CannibalizationItem,
  PriorityPageItem,
  InternalLinkOpportunityItem,
  OrphanPageItem,
  RedirectInternalLinkItem,
  FooterNavigationItem,
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

// 内部リンク & トピッククラスター最適化レポート生成 (18項目準拠)
export function generateLinkOptimizationReport(sessionId: string): InternalLinkOptimizationReport | null {
  const state = getCrawlSession(sessionId);
  if (!state) return null;

  const nodes: CrawlGraphNode[] = Array.from(state.nodes.values());
  const edges: CrawlGraphEdge[] = state.edges;
  const broken: CrawlBrokenLink[] = state.brokenLinks;

  // 1. Technical Issues
  const technicalIssues: TechnicalIssueItem[] = [];
  for (const b of broken) {
    technicalIssues.push({
      url: b.targetUrl,
      issue: `リンク切れ (HTTP ${b.httpStatus})`,
      severity: 'Critical',
      recommendedAction: `${b.sourceUrl} からの内部リンクを正規URLへ修正するか削除してください`,
    });
  }

  for (const n of nodes) {
    if (n.hasCanonicalIssue) {
      technicalIssues.push({
        url: n.url,
        issue: 'Canonicalタグの矛盾または自己参照未指定',
        severity: 'High',
        recommendedAction: '正規URLへ向けて正しいrel="canonical"タグを静的HTMLに設定してください',
      });
    }
    if (n.depth >= 4) {
      technicalIssues.push({
        url: n.url,
        issue: `クリック階層が深すぎる (Depth: ${n.depth})`,
        severity: 'Medium',
        recommendedAction: '主要カテゴリや関連Pillarから2〜3クリック以内に到達できるようリンクを追加してください',
      });
    }
    if (!n.title || n.title.includes('Error') || n.title.length < 5) {
      technicalIssues.push({
        url: n.url,
        issue: '固有のTitleタグ未設定または短すぎるタイトル',
        severity: 'Medium',
        recommendedAction: '検索意図に適合した固有のtitleタグを設定してください',
      });
    }
  }

  // 2. Page Classification
  const pageClassifications: PageClassificationItem[] = [];
  for (const n of nodes) {
    let topic = 'General';
    let intent = 'Know';
    let pageType: PageClassificationItem['pageType'] = 'Support Content';
    let cluster = 'Main';

    try {
      const parsed = new URL(n.url);
      const segs = parsed.pathname.split('/').filter(Boolean);

      if (segs.length === 0) {
        topic = 'トップページ / 総合概要';
        intent = 'Do / Know';
        pageType = 'Pillar';
        cluster = 'Core Engine';
      } else {
        cluster = segs[0].toUpperCase();
        if (segs[0] === 'tools') {
          topic = segs[1] || 'Utility Tools';
          intent = 'Do';
          pageType = 'Support Content';
        } else if (segs[0] === 'about') {
          topic = '運営方針 / E-E-A-T';
          intent = 'Know';
          pageType = 'Utility';
        } else if (segs[0] === 'privacy' || segs[0] === 'terms') {
          topic = '利用規約 / プライバシー';
          intent = 'Know';
          pageType = 'Utility';
        } else if (segs[0] === 'crawl' || segs[0] === 'audit') {
          topic = '診断エンジン / レポート';
          intent = 'Do';
          pageType = 'Money Page';
        } else {
          topic = segs.join(' > ');
        }
      }
    } catch {}

    pageClassifications.push({
      url: n.url,
      topic,
      intent,
      pageType,
      cluster,
      clickDepth: n.depth,
      inlinks: n.inLinksCount,
    });
  }

  // 3. Cannibalization Detection
  const cannibalizations: CannibalizationItem[] = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i];
      const b = nodes[j];
      if (a.title && b.title && a.title === b.title && a.url !== b.url) {
        cannibalizations.push({
          query: a.title.slice(0, 30),
          urlA: a.url,
          urlB: b.url,
          evidence: `両ページで同一のTitle「${a.title}」が配信されており、検索エンジンで評価が分散するリスクがあります`,
          recommendation: '一方のページに固有のキーワードを持たせてTitleを差別化するか、Primary URLへ内部リンクを集中させてください',
        });
      }
    }
  }

  // 4. Priority Pages
  const priorityPages: PriorityPageItem[] = [];
  for (const n of nodes) {
    if (n.pageRankScore >= 0.5 && n.inLinksCount <= 2 && n.depth <= 2) {
      priorityPages.push({
        priority: 'Priority A',
        url: n.url,
        query: n.title || '注力トピッククエリ',
        impressions: 'High (推計)',
        ctr: '未測定',
        position: '11〜20位帯想定',
        inlinks: n.inLinksCount,
        reason: 'PageRank潜在力が高く上位化が期待できる重要ページですが、内部リンクが不足しています',
      });
    } else if (n.isOrphan) {
      priorityPages.push({
        priority: 'Priority C',
        url: n.url,
        query: n.title || '孤立ページ',
        impressions: 'Low',
        ctr: '未測定',
        position: '圏外想定',
        inlinks: 0,
        reason: '被内部リンクが0本の孤立ページです。関連クラスターのPillarからリンクを追加して評価を通わせてください',
      });
    }
  }

  // 5. Internal Link Opportunities
  const internalLinkOpportunities: InternalLinkOpportunityItem[] = [];
  const existingEdgeSet = new Set(edges.map((e: CrawlGraphEdge) => `${e.source}->${e.target}`));

  for (const source of nodes) {
    for (const target of nodes) {
      if (source.url === target.url) continue;
      if (existingEdgeSet.has(`${source.url}->${target.url}`)) continue;

      // 同一クラスターまたはトップページから重要サブページへの好機
      const isTopToImportant = source.depth === 0 && target.depth === 1 && target.inLinksCount <= 2;
      const isSubToTop = source.depth >= 1 && target.depth === 0;

      if (isTopToImportant) {
        internalLinkOpportunities.push({
          score: 4.8,
          sourceUrl: source.url,
          destinationUrl: target.url,
          existingSentence: '（該当セクションに専用ツールへのリンクが未配置）',
          proposedSentence: `${target.title || '専用診断機能'}を利用して、サイトの詳細な技術監査を即座に実行できます。`,
          anchorText: target.title ? target.title.slice(0, 24) : '詳細診断ツール',
          reason: 'トップページから被リンクの少ない重要コンテンツへLink Equityを自然に配分します',
        });
      } else if (isSubToTop && source.inLinksCount > 0 && internalLinkOpportunities.length < 8) {
        internalLinkOpportunities.push({
          score: 4.5,
          sourceUrl: source.url,
          destinationUrl: target.url,
          existingSentence: '（ページ末尾にトップへの導線がない）',
          proposedSentence: `本診断の完了後、総合的なSEO評価を行うにはSEO Analyzerのトップページから無料診断を実施してください。`,
          anchorText: 'SEO Analyzer 総合診断',
          reason: 'サブツールを利用したユーザーをメインコンバージョン（総合診断フォーム）へ自然に回遊させます',
        });
      }
    }
  }

  // 6. Orphan Pages
  const orphanPages: OrphanPageItem[] = [];
  for (const n of nodes) {
    if (n.isOrphan) {
      orphanPages.push({
        url: n.url,
        seoValue: n.depth <= 2 ? 'High' : 'Medium',
        suggestedSource: state.session.targetUrl,
        action: 'トップページまたは主要カテゴリ一覧の文脈内から正規アンカーでリンクを追加',
      });
    }
  }

  // 7. Redirect Internal Links
  const redirectInternalLinks: RedirectInternalLinkItem[] = [];
  // クロール中にリダイレクトを検出した場合はここに格納 (現在は直接リンクが原則)

  // 8. Footer Navigation
  const footerNavigation: FooterNavigationItem[] = [];
  for (const n of nodes.slice(0, 5)) {
    if (n.depth <= 1) {
      footerNavigation.push({
        url: n.url,
        placement: 'Footer Hub',
        recommendation: 'フッター主要ツール一覧に配置',
        reason: 'サイト全体のクロール効率と重要ページへの恒常的到達性を確保するため',
      });
    }
  }

  return {
    sessionId,
    targetUrl: state.session.targetUrl,
    generatedAt: new Date().toISOString(),
    technicalIssues: technicalIssues.slice(0, 20),
    pageClassifications: pageClassifications.slice(0, 50),
    cannibalizations: cannibalizations.slice(0, 15),
    priorityPages: priorityPages.slice(0, 15),
    internalLinkOpportunities: internalLinkOpportunities.slice(0, 20),
    orphanPages: orphanPages.slice(0, 15),
    redirectInternalLinks,
    footerNavigation: footerNavigation.slice(0, 8),
  };
}

