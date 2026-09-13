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

