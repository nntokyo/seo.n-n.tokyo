export interface AuditMetric {
  id: string;
  name: string;
  category: 'technical' | 'content' | 'cwv' | 'aeo_llmo' | 'security';
  score: number;
  status: 'good' | 'warning' | 'critical' | 'notice';
  message: string;
  proposal?: string;
  codeDiff?: {
    before: string;
    after: string;
  };
}

export interface CrawlLink {
  url: string;
  anchorText: string;
  isInternal: boolean;
  isNofollow: boolean;
}

export interface PageMeta {
  title: string | null;
  description: string | null;
  canonical: string | null;
  robots: string | null;
  googlebot: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  twitterCard: string | null;
  viewport: string | null;
  charset: string | null;
  lang: string | null;
  schemaTypes: string[];
  h1Count: number;
  headings: Array<{ tag: string; text: string }>;
  wordCount: number;
  imageCount: number;
  missingAltCount: number;
}

export interface CwvEstimates {
  fcp: number; // ms
  lcp: number; // ms
  cls: number;
  ttfb: number; // ms
  totalSizeKb: number;
}

export interface CompanionUrlInfo {
  type: 'hreflang' | 'amp' | 'alternate';
  url: string;
  langOrMedia?: string;
}

export interface SitemapUrlEntry {
  loc: string;
  lastmod?: string;
  changefreq?: string;
  priority?: string;
  isValidUrl: boolean;
  isHubPage?: boolean;
  canonicalStatus?: 'self_canonical' | 'non_canonical_warning' | 'unknown';
  companionUrls?: CompanionUrlInfo[];
}

export interface SitemapIssue {
  severity: 'critical' | 'warning' | 'notice';
  message: string;
  proposal?: string;
}

export interface HubClusterInfo {
  hubPath: string; // e.g. "/tools" or "/blog"
  hubUrl: string;
  childPageCount: number;
  sampleChildren: string[];
  lastUpdated?: string;
  avgPriority?: number;
}

export interface CanonicalCompanionAnalytics {
  selfCanonicalCount: number;
  potentialCanonicalConflictCount: number;
  companionUrlsTotal: number;
  hreflangCount: number;
  ampCount: number;
  trailingSlashMismatchCount: number;
  parameterUrlCount: number;
}

export interface SitemapAnalytics {
  freshnessScore: number; // 0-100
  recentUpdatedCount: number; // 30日以内
  outdatedCount: number; // 180日以上またはlastmod未指定
  protocol: {
    httpsCount: number;
    httpCount: number;
  };
  pathDepthDistribution: Record<string, number>; // { "depth_1": 12, "depth_2": 45, ... }
  changefreqDistribution: Record<string, number>; // { "daily": 5, "weekly": 12, ... }
  priorityDistribution: Record<string, number>; // { "0.8-1.0": 10, "0.5-0.7": 15, ... }
  sampleStatusCodes?: Record<string, number>; // { "200": 8, "404": 0, ... }
  hubClusters?: HubClusterInfo[];
  canonicalCompanion?: CanonicalCompanionAnalytics;
}

export interface SitemapValidationResult {
  status: 'found' | 'not_found' | 'error';
  sitemapUrl: string | null;
  robotsTxtUrl: string | null;
  hasRobotsTxtSitemap: boolean;
  isSitemapIndex: boolean;
  totalUrls: number;
  urls: SitemapUrlEntry[];
  issues: SitemapIssue[];
  xmlSizeKb: number;
  responseTimeMs: number;
  generatedNextjsCode?: string;
  analytics?: SitemapAnalytics;
}

export interface FullAuditResult {
  id: string;
  url: string;
  timestamp: string;
  httpStatus: number;
  responseTimeMs: number;
  pageSizeBytes: number;
  overallScore: number;
  scores: {
    seo: number;
    performance: number;
    meta: number;
    aeo_llmo: number;
    security: number;
  };
  metrics: AuditMetric[];
  meta: PageMeta;
  links: CrawlLink[];
  cwv: CwvEstimates;
  sitemap?: SitemapValidationResult;
  aiOverview: {
    summary: string;
    answerabilityScore: number;
    citations: Array<{ title: string; url: string; domain: string }>;
    recommendations: string[];
  };
}

export interface QuickAuditResult {
  id: string;
  url: string;
  timestamp: string;
  overallScore: number;
  scores: {
    seo: number;
    performance: number;
    meta: number;
    aeo_llmo: number;
  };
  metrics: AuditMetric[];
  aiOverview: {
    summary: string;
    citations: Array<{ title: string; url: string; domain: string }>;
  };
}

export interface LlmsTxtResult {
  url: string;
  llmsTxt: string;
  recommendedPath: string;
}

