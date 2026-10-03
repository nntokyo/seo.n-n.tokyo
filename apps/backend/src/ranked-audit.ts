import {
  ActionPlan,
  ActionPriority,
  ActionSeverity,
  AreaScore,
  AuditArea,
  RankedAction,
} from '@seo/shared';

/**
 * 領域の減点、加重平均、上限、インパクトと工数の並べ方は
 * jev-seo が公開している方法（references/method.md）を参照している。
 * 何を減点するかは Google 検索セントラルに合わせ、コードはここだけで書く。
 * 点数は作業順であり、掲載・順位・流入の予測ではない。
 */
export const DEDUCT: Record<ActionSeverity, number> = {
  critical: 25,
  high: 12,
  medium: 6,
  low: 2,
  info: 0,
};

export const SEVERITY_WEIGHT: Record<ActionSeverity, number> = {
  critical: 10,
  high: 6,
  medium: 3,
  low: 1,
  info: 0,
};

export const AREA_WEIGHT: Record<AuditArea, number> = {
  crawl: 20,
  onpage: 15,
  content: 20,
  links: 10,
  structured: 8,
  ai: 12,
  performance: 10,
  security: 5,
};

export const AREA_LABEL: Record<AuditArea, string> = {
  crawl: 'クロールとインデックス',
  onpage: 'オンページ',
  content: '内容',
  links: 'リンク',
  structured: '構造化データと共有',
  ai: 'AI クローラー',
  performance: '応答',
  security: 'セキュリティ',
};

const EFFORT_LABEL: Record<1 | 2 | 3 | 4, string> = {
  1: '数時間',
  2: '1日',
  3: '数日',
  4: '1週間以上',
};

export interface FindingDraft {
  id: string;
  category: AuditArea;
  severity: ActionSeverity;
  title: string;
  evidence: string;
  fix: string;
  source: string;
  effort: 1 | 2 | 3 | 4;
  heuristic: boolean;
  /** サイト全体の指摘は到達率 1。ページ指摘は件数 / ページ数。 */
  siteWide?: boolean;
  urls: string[];
}

export interface PlanOptions {
  https: boolean;
  robotsBlocksAll: boolean;
  noindex: boolean;
  pageCount: number;
  assessedIds: string[];
  assessedAreas: AuditArea[];
  partialReasons: string[];
}

export function reachOf(finding: FindingDraft, pageCount: number): number {
  if (finding.siteWide) return 1;
  return Math.min(1, finding.urls.length / Math.max(pageCount, 1));
}

export function priorityFor(severity: ActionSeverity, impact: number): ActionPriority {
  if (severity === 'critical' || (severity === 'high' && impact >= 40)) return 'P1';
  if (impact >= 30 || severity === 'high') return 'P2';
  return 'P3';
}

export function buildActionPlan(findings: FindingDraft[], options: PlanOptions): ActionPlan {
  const pageCount = Math.max(options.pageCount, 1);
  const areas: AreaScore[] = (Object.keys(AREA_WEIGHT) as AuditArea[]).map((id) => ({
    id,
    label: AREA_LABEL[id],
    weight: AREA_WEIGHT[id],
    score: 100,
    deduction: 0,
  }));
  const byArea = new Map(areas.map((area) => [area.id, area]));

  for (const finding of findings) {
    const area = byArea.get(finding.category);
    if (!area) continue;
    const hit = DEDUCT[finding.severity] * (0.5 + 0.5 * reachOf(finding, pageCount));
    area.deduction += hit;
  }
  const assessed = new Set(options.assessedAreas);
  for (const area of areas) {
    area.deduction = Math.round(area.deduction * 10) / 10;
    area.score = assessed.has(area.id) ? Math.max(0, Math.round((100 - area.deduction) * 10) / 10) : null;
  }

  const scored = areas.filter((area) => area.score !== null);
  const weightSum = scored.reduce((sum, area) => sum + area.weight, 0);
  let overall = weightSum
    ? scored.reduce((sum, area) => sum + (area.score ?? 0) * area.weight, 0) / weightSum
    : 0;

  const caps: string[] = [];
  if (options.robotsBlocksAll) {
    overall = Math.min(overall, 20);
    caps.push('robots.txt が Googlebot に対してサイト全体を Disallow しています。総合点の上限は 20 です。');
  }
  if (!options.https) {
    overall = Math.min(overall, 60);
    caps.push('取得した URL は HTTPS ではありません。総合点の上限は 60 です。');
  }
  if (options.noindex) {
    overall = Math.min(overall, 40);
    caps.push('この URL は noindex です。検索結果に出す前提の点数ではありません。総合点の上限は 40 です。');
  }

  const raw = findings.map((finding) => {
    const reach = reachOf(finding, pageCount);
    return SEVERITY_WEIGHT[finding.severity] * (0.6 + 0.4 * reach) * 1.4;
  });
  const maxRaw = Math.max(...raw, 0);
  const hit = new Set(findings.map((finding) => finding.id));

  const actions: RankedAction[] = findings
    .map((finding, index) => {
      const impact = maxRaw === 0 ? 0 : Math.round((100 * raw[index]) / maxRaw);
      const priority = priorityFor(finding.severity, impact);
      return {
        id: finding.id,
        category: finding.category,
        categoryLabel: AREA_LABEL[finding.category],
        severity: finding.severity,
        priority,
        title: finding.title,
        evidence: finding.evidence,
        fix: finding.fix,
        source: finding.source,
        effort: finding.effort,
        effortLabel: EFFORT_LABEL[finding.effort],
        heuristic: finding.heuristic,
        impact,
        quickWin: impact >= 35 && finding.effort === 1 && finding.severity !== 'info',
        urls: finding.urls,
      };
    })
    .sort((a, b) => b.impact - a.impact || a.effort - b.effort);

  const invest = areas
    .filter((area) => area.deduction > 0)
    .sort((a, b) => b.deduction - a.deduction)
    .map((area) => ({ id: area.id, label: area.label, deduction: Math.round(area.deduction * 10) / 10 }));

  return {
    overall: Math.max(0, Math.min(100, Math.round(overall))),
    partial: options.partialReasons.length > 0,
    partialReasons: options.partialReasons,
    caps,
    areas,
    actions,
    invest,
    passed: options.assessedIds.filter((id) => !hit.has(id)),
    method:
      '点数は直す順番です。掲載、順位、トラフィックは予測しません。見ていないデータは 0 点にしません。heuristic は検索エンジンの要件ではなく、表示や編集の目安です。応答時間は 1 回の取得であり、Chrome UX Report のフィールドデータではありません。Google 検索は llms.txt や生成 AI 用の特別なマークアップを使いません。配点の形（重要度×到達率、領域の加重平均、HTTPS とサイト全体ブロックの上限、インパクトと工数）は jev-seo の公開メソッドを参照し、個別の判定は Google 検索セントラル（2026-10 確認）に合わせています。',
  };
}

export function weightedAreaScore(plan: ActionPlan, ids: AuditArea[]): number {
  const rows = plan.areas.filter((area) => ids.includes(area.id) && area.score !== null);
  const weight = rows.reduce((sum, area) => sum + area.weight, 0);
  if (!weight) return plan.overall;
  return Math.round(rows.reduce((sum, area) => sum + (area.score ?? 0) * area.weight, 0) / weight);
}
