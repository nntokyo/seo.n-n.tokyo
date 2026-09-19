-- Baseline migration for the schema that existed before Prisma Migrate was introduced.
-- Existing production databases must mark this migration as applied via
-- infra/prisma-migrate-deploy.sh with PRISMA_BASELINE_EXISTING_DB=true.

CREATE TYPE "Plan" AS ENUM ('FREE', 'PRO', 'ENTERPRISE');
CREATE TYPE "Role" AS ENUM ('ADMIN', 'MEMBER', 'VIEWER');
CREATE TYPE "JobType" AS ENUM ('QUICK_AUDIT', 'DEEP_CRAWL', 'COMPETITOR_COMPARE');
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');
CREATE TYPE "DeviceType" AS ENUM ('MOBILE', 'DESKTOP');
CREATE TYPE "Severity" AS ENUM ('CRITICAL', 'WARNING', 'NOTICE', 'GOOD');
CREATE TYPE "IssueCategory" AS ENUM ('TECHNICAL', 'CONTENT', 'PERFORMANCE', 'STRUCTURE', 'GEO', 'GOOGLE_OFFICIAL');
CREATE TYPE "GoogleAuthType" AS ENUM ('OAUTH2', 'SERVICE_ACCOUNT');

CREATE TABLE "organizations" (
  "id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "plan" "Plan" NOT NULL DEFAULT 'FREE',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "users" (
  "id" UUID NOT NULL,
  "org_id" UUID NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "role" "Role" NOT NULL DEFAULT 'MEMBER',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "projects" (
  "id" UUID NOT NULL,
  "org_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "target_domain" TEXT NOT NULL,
  "root_url" TEXT NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "google_integrations" (
  "id" UUID NOT NULL,
  "project_id" UUID NOT NULL,
  "auth_type" "GoogleAuthType" NOT NULL DEFAULT 'OAUTH2',
  "access_token_enc" TEXT,
  "refresh_token_enc" TEXT,
  "service_account_key_enc" TEXT,
  "gsc_site_url" TEXT,
  "token_expires_at" TIMESTAMP(3),
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "google_integrations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "audit_jobs" (
  "id" UUID NOT NULL,
  "project_id" UUID,
  "job_type" "JobType" NOT NULL,
  "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
  "progress_percent" INTEGER NOT NULL DEFAULT 0,
  "progress_meta" JSONB,
  "started_at" TIMESTAMP(3),
  "completed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_jobs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "audit_results" (
  "id" UUID NOT NULL,
  "job_id" UUID NOT NULL,
  "project_id" UUID,
  "audited_url" TEXT NOT NULL,
  "device_type" "DeviceType" NOT NULL DEFAULT 'MOBILE',
  "overall_score" INTEGER NOT NULL,
  "technical_score" INTEGER NOT NULL,
  "content_score" INTEGER NOT NULL,
  "performance_score" INTEGER NOT NULL,
  "structure_score" INTEGER NOT NULL,
  "geo_score" INTEGER NOT NULL,
  "ai_display_score" INTEGER NOT NULL DEFAULT 0,
  "critical_count" INTEGER NOT NULL DEFAULT 0,
  "warning_count" INTEGER NOT NULL DEFAULT 0,
  "notice_count" INTEGER NOT NULL DEFAULT 0,
  "screenshot_url" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_results_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "page_diagnostics" (
  "id" UUID NOT NULL,
  "audit_result_id" UUID NOT NULL,
  "url" TEXT NOT NULL,
  "http_status" INTEGER NOT NULL,
  "response_time_ms" DOUBLE PRECISION NOT NULL,
  "title" TEXT,
  "meta_description" TEXT,
  "canonical_url" TEXT,
  "robots_directive" TEXT,
  "h1_count" INTEGER NOT NULL DEFAULT 0,
  "word_count" INTEGER NOT NULL DEFAULT 0,
  "internal_links_count" INTEGER NOT NULL DEFAULT 0,
  "external_links_count" INTEGER NOT NULL DEFAULT 0,
  "lcp_seconds" DOUBLE PRECISION,
  "inp_milliseconds" DOUBLE PRECISION,
  "cls_score" DOUBLE PRECISION,
  "has_json_ld" BOOLEAN NOT NULL DEFAULT false,
  "raw_dom_metrics" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "page_diagnostics_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "gsc_url_inspections" (
  "id" UUID NOT NULL,
  "page_diagnostic_id" UUID NOT NULL,
  "coverage_state" TEXT NOT NULL,
  "verdict" TEXT NOT NULL,
  "robots_txt_state" TEXT NOT NULL,
  "indexing_state" TEXT NOT NULL,
  "crawled_as" TEXT NOT NULL,
  "last_crawl_time" TIMESTAMP(3),
  "rich_results_items" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "gsc_url_inspections_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "diagnostic_issues" (
  "id" UUID NOT NULL,
  "page_diagnostic_id" UUID NOT NULL,
  "rule_id" TEXT NOT NULL,
  "category" "IssueCategory" NOT NULL,
  "severity" "Severity" NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "score_penalty" INTEGER NOT NULL DEFAULT 0,
  "target_element" TEXT,
  "recommended_fix" TEXT,
  "generated_code_snippet" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "diagnostic_issues_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "fix_proposals" (
  "id" UUID NOT NULL,
  "audit_result_id" UUID NOT NULL,
  "issue_rule_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "impact_score" INTEGER NOT NULL,
  "category" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "before_code" TEXT NOT NULL,
  "after_code" TEXT NOT NULL,
  "multi_framework_snippets" JSONB NOT NULL,
  "google_doc_url" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "fix_proposals_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ai_display_simulations" (
  "id" UUID NOT NULL,
  "audit_result_id" UUID NOT NULL,
  "generated_summary" TEXT NOT NULL,
  "key_facts" JSONB NOT NULL,
  "citation_cards" JSONB NOT NULL,
  "answerability_score" INTEGER NOT NULL,
  "fact_density_score" INTEGER NOT NULL,
  "has_llms_txt" BOOLEAN NOT NULL DEFAULT false,
  "generated_llms_txt" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ai_display_simulations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "crawl_sessions" (
  "id" UUID NOT NULL,
  "project_id" UUID NOT NULL,
  "start_url" TEXT NOT NULL,
  "max_pages" INTEGER NOT NULL DEFAULT 500,
  "total_pages" INTEGER NOT NULL DEFAULT 0,
  "broken_links" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "crawl_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "crawl_nodes" (
  "id" UUID NOT NULL,
  "crawl_session_id" UUID NOT NULL,
  "url" TEXT NOT NULL,
  "http_status" INTEGER NOT NULL,
  "depth" INTEGER NOT NULL,
  "in_links_count" INTEGER NOT NULL DEFAULT 0,
  "out_links_count" INTEGER NOT NULL DEFAULT 0,
  "page_rank_score" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  CONSTRAINT "crawl_nodes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "crawl_edges" (
  "id" UUID NOT NULL,
  "crawl_session_id" UUID NOT NULL,
  "source_url" TEXT NOT NULL,
  "target_url" TEXT NOT NULL,
  "anchor_text" TEXT,
  "is_nofollow" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "crawl_edges_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "monitoring_schedules" (
  "id" UUID NOT NULL,
  "project_id" UUID NOT NULL,
  "frequency" TEXT NOT NULL DEFAULT 'WEEKLY',
  "target_url" TEXT NOT NULL,
  "alert_threshold_score" INTEGER NOT NULL DEFAULT 70,
  "notification_channels" TEXT NOT NULL DEFAULT 'EMAIL',
  "webhook_url" TEXT,
  "is_enabled" BOOLEAN NOT NULL DEFAULT true,
  "last_run_at" TIMESTAMP(3),
  "next_run_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "monitoring_schedules_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE INDEX "users_org_id_idx" ON "users"("org_id");
CREATE INDEX "projects_org_id_idx" ON "projects"("org_id");
CREATE INDEX "projects_target_domain_idx" ON "projects"("target_domain");
CREATE UNIQUE INDEX "google_integrations_project_id_key" ON "google_integrations"("project_id");
CREATE INDEX "audit_jobs_project_id_status_idx" ON "audit_jobs"("project_id", "status");
CREATE INDEX "audit_jobs_status_created_at_idx" ON "audit_jobs"("status", "created_at");
CREATE UNIQUE INDEX "audit_results_job_id_key" ON "audit_results"("job_id");
CREATE INDEX "audit_results_project_id_created_at_idx" ON "audit_results"("project_id", "created_at" DESC);
CREATE INDEX "audit_results_audited_url_idx" ON "audit_results"("audited_url");
CREATE INDEX "page_diagnostics_audit_result_id_idx" ON "page_diagnostics"("audit_result_id");
CREATE INDEX "page_diagnostics_url_idx" ON "page_diagnostics"("url");
CREATE UNIQUE INDEX "gsc_url_inspections_page_diagnostic_id_key" ON "gsc_url_inspections"("page_diagnostic_id");
CREATE INDEX "diagnostic_issues_page_diagnostic_id_severity_idx" ON "diagnostic_issues"("page_diagnostic_id", "severity");
CREATE INDEX "diagnostic_issues_rule_id_idx" ON "diagnostic_issues"("rule_id");
CREATE INDEX "fix_proposals_audit_result_id_idx" ON "fix_proposals"("audit_result_id");
CREATE INDEX "ai_display_simulations_audit_result_id_idx" ON "ai_display_simulations"("audit_result_id");
CREATE INDEX "crawl_sessions_project_id_idx" ON "crawl_sessions"("project_id");
CREATE INDEX "crawl_nodes_crawl_session_id_url_idx" ON "crawl_nodes"("crawl_session_id", "url");
CREATE INDEX "crawl_edges_crawl_session_id_idx" ON "crawl_edges"("crawl_session_id");
CREATE INDEX "monitoring_schedules_is_enabled_next_run_at_idx" ON "monitoring_schedules"("is_enabled", "next_run_at");

ALTER TABLE "users" ADD CONSTRAINT "users_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects" ADD CONSTRAINT "projects_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "google_integrations" ADD CONSTRAINT "google_integrations_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audit_jobs" ADD CONSTRAINT "audit_jobs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "audit_results" ADD CONSTRAINT "audit_results_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "audit_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audit_results" ADD CONSTRAINT "audit_results_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "page_diagnostics" ADD CONSTRAINT "page_diagnostics_audit_result_id_fkey" FOREIGN KEY ("audit_result_id") REFERENCES "audit_results"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "gsc_url_inspections" ADD CONSTRAINT "gsc_url_inspections_page_diagnostic_id_fkey" FOREIGN KEY ("page_diagnostic_id") REFERENCES "page_diagnostics"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "diagnostic_issues" ADD CONSTRAINT "diagnostic_issues_page_diagnostic_id_fkey" FOREIGN KEY ("page_diagnostic_id") REFERENCES "page_diagnostics"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "fix_proposals" ADD CONSTRAINT "fix_proposals_audit_result_id_fkey" FOREIGN KEY ("audit_result_id") REFERENCES "audit_results"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_display_simulations" ADD CONSTRAINT "ai_display_simulations_audit_result_id_fkey" FOREIGN KEY ("audit_result_id") REFERENCES "audit_results"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "crawl_sessions" ADD CONSTRAINT "crawl_sessions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "crawl_nodes" ADD CONSTRAINT "crawl_nodes_crawl_session_id_fkey" FOREIGN KEY ("crawl_session_id") REFERENCES "crawl_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "crawl_edges" ADD CONSTRAINT "crawl_edges_crawl_session_id_fkey" FOREIGN KEY ("crawl_session_id") REFERENCES "crawl_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "monitoring_schedules" ADD CONSTRAINT "monitoring_schedules_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
