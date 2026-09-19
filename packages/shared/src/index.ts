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

// Google公式API連携 & ブラウザー分離セッション関連型定義
export interface GoogleSessionStatus {
  isConnected: boolean;
  userEmail?: string;
  userName?: string;
  userPicture?: string;
  connectedAt?: string;
  scopes?: string[];
}

export interface PsiCruxMetricItem {
  value: number | string;
  status: 'good' | 'needs_improvement' | 'poor' | 'unknown';
  label: string;
  unit: string;
}

export interface PsiOpportunityItem {
  id: string;
  title: string;
  description: string;
  savingsBytes?: number;
  savingsMs?: number;
}

export interface PsiCruxData {
  performanceScore: number;
  accessibilityScore?: number;
  seoScore?: number;
  fcp: PsiCruxMetricItem;
  lcp: PsiCruxMetricItem;
  cls: PsiCruxMetricItem;
  inp: PsiCruxMetricItem;
  ttfb: PsiCruxMetricItem;
  opportunities: PsiOpportunityItem[];
  testedUrl: string;
  strategy: 'mobile' | 'desktop';
  fetchedAt: string;
}

export interface GscQueryRow {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface GscPageRow {
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface GscAnalyticsData {
  siteUrl: string;
  totalClicks: number;
  totalImpressions: number;
  averageCtr: number;
  averagePosition: number;
  topQueries: GscQueryRow[];
  topPages: GscPageRow[];
  indexStatus?: {
    verdict: 'PASS' | 'NEUTRAL' | 'FAIL';
    coverageState: string;
    robotsTxtState: 'ALLOWED' | 'DISALLOWED';
    indexingState: string;
    lastCrawlTime?: string;
  };
  startDate: string;
  endDate: string;
}

export interface Ga4MetricsData {
  propertyId: string;
  propertyName?: string;
  activeUsers: number;
  sessions: number;
  screenPageViews: number;
  engagementRate: number; // 0 - 100%
  bounceRate: number; // 0 - 100%
  averageSessionDurationSec: number;
  period: string; // e.g. "直近28日間"
}

export interface GeminiProposalData {
  summary: string;
  strengths: string[];
  actionItems: Array<{
    title: string;
    priority: 'high' | 'medium' | 'low';
    impact: string;
    suggestion: string;
    codeSnippet?: string;
  }>;
  titleProposals: string[];
  metaDescriptionProposal?: string;
  generatedAt: string;
}

export interface WebRiskData {
  isThreat: boolean;
  threatTypes: string[];
  expireTime?: string;
  checkedAt: string;
}

export interface GoogleHubDataResponse {
  url: string;
  session: GoogleSessionStatus;
  psi: PsiCruxData | null;
  gsc: GscAnalyticsData | null;
  ga4: Ga4MetricsData | null;
  gemini: GeminiProposalData | null;
  webRisk: WebRiskData | null;
  errors: {
    psi?: string;
    gsc?: string;
    ga4?: string;
    gemini?: string;
    webRisk?: string;
  };
  fetchedAt: string;
}

// ==============================================================================
// 1. クロール & 内部リンク有向グラフ型定義 (SCR-10 〜 SCR-14)
// ==============================================================================

export interface CrawlGraphNode {
  id: string; // URL
  url: string;
  title: string;
  httpStatus: number;
  depth: number;
  inLinksCount: number;
  outLinksCount: number;
  pageRankScore: number;
  isOrphan: boolean; // 被リンク0の孤立ページ
  hasCanonicalIssue: boolean;
  metaDescription?: string;
}

export interface CrawlGraphEdge {
  source: string; // source URL
  target: string; // target URL
  anchorText: string;
  isNofollow: boolean;
}

export interface CrawlBrokenLink {
  sourceUrl: string;
  targetUrl: string;
  anchorText: string;
  httpStatus: number;
  errorReason: string;
  discoveredAt: string;
}

export interface CrawlTreeItem {
  path: string;
  url: string;
  depth: number;
  httpStatus: number;
  childCount: number;
  children?: CrawlTreeItem[];
}

export interface CrawlSessionSummary {
  id: string;
  targetUrl: string;
  rootDomain: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  totalPages: number;
  maxPages: number;
  crawledPages: number;
  brokenLinksCount: number;
  orphanPagesCount: number;
  avgDepth: number;
  startedAt: string;
  completedAt?: string;
}

export interface CrawlProgressEvent {
  sessionId: string;
  status: 'running' | 'completed' | 'failed';
  currentUrl: string;
  crawledCount: number;
  totalFound: number;
  brokenCount: number;
  percent: number;
}

export interface CrawlGraphResponse {
  session: CrawlSessionSummary;
  nodes: CrawlGraphNode[];
  edges: CrawlGraphEdge[];
  stats: {
    totalNodes: number;
    totalEdges: number;
    orphanCount: number;
    brokenCount: number;
    maxDepth: number;
  };
}

export interface CrawlBrokenResponse {
  session: CrawlSessionSummary;
  brokenLinks: CrawlBrokenLink[];
  totalBroken: number;
}

export interface CrawlTreeResponse {
  session: CrawlSessionSummary;
  tree: CrawlTreeItem[];
  totalNodes: number;
}

export interface TechnicalIssueItem {
  url: string;
  issue: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  recommendedAction: string;
}

export interface PageClassificationItem {
  url: string;
  topic: string;
  intent: string;
  pageType: 'Pillar' | 'Support Content' | 'Money Page' | 'Category' | 'Comparison' | 'Case Study' | 'FAQ' | 'Utility' | 'Other';
  cluster: string;
  clickDepth: number;
  inlinks: number;
}

export interface CannibalizationItem {
  query: string;
  urlA: string;
  urlB: string;
  evidence: string;
  recommendation: string;
}

export interface PriorityPageItem {
  priority: 'Priority A' | 'Priority B' | 'Priority C' | 'Priority D' | 'Priority E';
  url: string;
  query: string;
  impressions: string;
  ctr: string;
  position: string;
  inlinks: number;
  reason: string;
}

export interface InternalLinkOpportunityItem {
  score: number;
  sourceUrl: string;
  destinationUrl: string;
  existingSentence: string;
  proposedSentence: string;
  anchorText: string;
  reason: string;
}

export interface OrphanPageItem {
  url: string;
  seoValue: string;
  suggestedSource: string;
  action: string;
}

export interface RedirectInternalLinkItem {
  sourceUrl: string;
  currentDestination: string;
  finalDestination: string;
}

export interface FooterNavigationItem {
  url: string;
  placement: string;
  recommendation: string;
  reason: string;
}

export interface InternalLinkOptimizationReport {
  sessionId: string;
  targetUrl: string;
  generatedAt: string;
  technicalIssues: TechnicalIssueItem[];
  pageClassifications: PageClassificationItem[];
  cannibalizations: CannibalizationItem[];
  priorityPages: PriorityPageItem[];
  internalLinkOpportunities: InternalLinkOpportunityItem[];
  orphanPages: OrphanPageItem[];
  redirectInternalLinks: RedirectInternalLinkItem[];
  footerNavigation: FooterNavigationItem[];
}


// ==============================================================================
// 2. プロジェクト管理 & 履歴差分型定義 (SCR-15 〜 SCR-17)
// ==============================================================================

export interface ProjectGoogleSettings {
  googleApiKey?: string;
  geminiApiKey?: string;
  gscSiteUrl?: string;
  ga4PropertyId?: string;
  serviceAccountJson?: string;
  updatedAt?: string;
}

export interface ProjectRecord {
  id: string;
  userId?: string; // 所有ユーザーのアカウントID
  name: string;
  targetDomain: string;
  rootUrl: string;
  auditCount: number;
  lastScore: number;
  lastAuditedAt?: string;
  googleSettings?: ProjectGoogleSettings;
  createdAt: string;
  updatedAt?: string;
}

export interface ProjectHistoryItem {
  id: string;
  auditId: string;
  url: string;
  overallScore: number;
  categories: {
    technical: number;
    content: number;
    cwv: number;
    aeo_llmo: number;
    security: number;
  };
  auditedAt: string;
}

export interface AuditDiffItem {
  id: string;
  name: string;
  category: string;
  statusBefore: 'good' | 'warning' | 'critical' | 'notice' | 'none';
  statusAfter: 'good' | 'warning' | 'critical' | 'notice' | 'none';
  scoreBefore: number;
  scoreAfter: number;
  changeType: 'improved' | 'degraded' | 'unchanged' | 'new_issue' | 'fixed';
  description: string;
}

export interface AuditTimeTravelDiffResponse {
  project: ProjectRecord;
  baseAudit: {
    id: string;
    auditedAt: string;
    score: number;
  };
  compareAudit: {
    id: string;
    auditedAt: string;
    score: number;
  };
  scoreDelta: number;
  diffItems: AuditDiffItem[];
  summary: {
    improvedCount: number;
    degradedCount: number;
    unchangedCount: number;
  };
}

// ==============================================================================
// 3. Google URL Inspection & Indexing API (SCR-18, SCR-19)
// ==============================================================================

export interface GscInspectRequest {
  url: string;
  siteUrl?: string;
}

export interface GscInspectResult {
  inspectionUrl: string;
  verdict: 'PASS' | 'PARTIAL' | 'FAIL' | 'NEUTRAL';
  coverageState: string;
  robotsTxtState: 'ALLOWED' | 'DISALLOWED' | 'UNKNOWN';
  indexingState: 'INDEXING_ALLOWED' | 'BLOCKED_BY_META_TAG' | 'BLOCKED_BY_HTTP_HEADER' | 'UNKNOWN';
  lastCrawlTime?: string;
  pageFetchState: 'SUCCESSFUL' | 'SOFT_404' | 'BLOCKED_ROBOTS_TXT' | 'NOT_FOUND' | 'SERVER_ERROR' | 'UNKNOWN';
  googleCanonical?: string;
  userCanonical?: string;
  mobileUsabilityResult: {
    verdict: 'PASS' | 'FAIL' | 'UNKNOWN';
    issues: string[];
  };
  richResults: Array<{
    name: string;
    status: 'VALID' | 'WARNING' | 'ERROR';
  }>;
}

export interface IndexingPublishRequest {
  url: string;
  type: 'URL_UPDATED' | 'URL_DELETED';
}

export interface IndexingPublishResult {
  url: string;
  type: 'URL_UPDATED' | 'URL_DELETED';
  status: 'SUBMITTED' | 'ERROR';
  notifyTime: string;
  message: string;
}

// ==============================================================================
// 4. アラート・監視・チーム・APIキー型定義 (SCR-22 〜 SCR-25)
// ==============================================================================

export interface AlertSettings {
  enabled: boolean;
  scoreThreshold: number; // 例: 70
  notifyOnBrokenLinks: boolean;
  brokenLinkThreshold: number; // 例: 3
  webhookUrl: string;
  slackChannel?: string;
  emailNotifications: boolean;
  notificationEmail?: string;
  lastTestedAt?: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'analyst' | 'viewer';
  status: 'active' | 'invited';
  createdAt: string;
}

export interface ApiKeyRecord {
  id: string;
  name: string;
  keyPrefix: string;
  fullKey?: string; // 生成時のみ表示
  scopes: ('read' | 'write' | 'admin')[];
  createdAt: string;
  lastUsedAt?: string;
}

// ==============================================================================
// 5. ユーザー認証型定義 (SCR-28)
// ==============================================================================

export type AuthProviderType = 'LOCAL' | 'GOOGLE';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  provider: AuthProviderType;
  role: 'ADMIN' | 'MEMBER' | 'VIEWER';
  avatarUrl?: string;
  emailVerified: boolean;
  createdAt: string;
}

export interface AuthTokenResponse {
  token: string;
  user: AuthUser;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

// ==============================================================================
// 6. プラットフォーム管理型定義 (SCR-30)
// ==============================================================================

export interface AdminStatsResponse {
  totalUsers: number;
  verifiedUsers: number;
  unverifiedUsers: number;
  totalProjects: number;
  totalAudits: number;
  uptimeSeconds: number;
  serverUptime?: number;
  systemEnv?: {
    hasGoogleApiKey: boolean;
    hasGeminiApiKey: boolean;
    hasGoogleClientId: boolean;
  };
}

export interface AdminUserRecord extends AuthUser {
  projectCount: number;
}
