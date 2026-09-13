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

export interface QuickAuditResult {
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
