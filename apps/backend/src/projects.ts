import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
  ProjectRecord,
  ProjectHistoryItem,
  AuditTimeTravelDiffResponse,
  AuditDiffItem,
  FullAuditResult,
} from '@seo/shared';

const projectsDataDir = path.resolve(process.cwd(), '.data', 'projects');
const projectHistoryDir = path.resolve(process.cwd(), '.data', 'project-history');
try {
  fs.mkdirSync(projectsDataDir, { recursive: true });
  fs.mkdirSync(projectHistoryDir, { recursive: true });
} catch {}

const projectsStore = new Map<string, ProjectRecord>();

// 初期読み込み
try {
  if (fs.existsSync(projectsDataDir)) {
    const files = fs.readdirSync(projectsDataDir);
    for (const f of files) {
      if (f.endsWith('.json')) {
        try {
          const raw = fs.readFileSync(path.join(projectsDataDir, f), 'utf8');
          const p: ProjectRecord = JSON.parse(raw);
          projectsStore.set(p.id, p);
        } catch {}
      }
    }
  }
} catch {}

function saveProjectToDisk(p: ProjectRecord) {
  projectsStore.set(p.id, p);
  try {
    fs.writeFileSync(path.join(projectsDataDir, `${p.id}.json`), JSON.stringify(p), 'utf8');
  } catch {}
}

export function listProjects(): ProjectRecord[] {
  return Array.from(projectsStore.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function getProject(id: string): ProjectRecord | null {
  return projectsStore.get(id) || null;
}

export function createProject(name: string, targetUrl: string): ProjectRecord {
  let norm = targetUrl.trim();
  if (!norm.startsWith('http://') && !norm.startsWith('https://')) {
    norm = `https://${norm}`;
  }
  const parsed = new URL(norm);
  const targetDomain = parsed.hostname;

  // 既存同一ドメインのプロジェクトがあればそれを返す
  for (const existing of projectsStore.values()) {
    if (existing.targetDomain === targetDomain) {
      return existing;
    }
  }

  const id = `proj_${crypto.randomBytes(6).toString('hex')}`;
  const record: ProjectRecord = {
    id,
    name: name.trim() || targetDomain,
    targetDomain,
    rootUrl: norm,
    auditCount: 0,
    lastScore: 0,
    createdAt: new Date().toISOString(),
  };

  saveProjectToDisk(record);
  return record;
}

export function recordAuditToProject(projectId: string, audit: FullAuditResult): void {
  const p = projectsStore.get(projectId);
  if (!p) return;

  const historyItem: ProjectHistoryItem = {
    id: `hist_${crypto.randomBytes(6).toString('hex')}`,
    auditId: audit.id,
    url: audit.url,
    overallScore: audit.overallScore,
    categories: {
      technical: audit.scores.seo,
      content: audit.scores.meta,
      cwv: audit.scores.performance,
      aeo_llmo: audit.scores.aeo_llmo,
      security: audit.scores.security,
    },
    auditedAt: audit.timestamp,
  };

  p.auditCount++;
  p.lastScore = audit.overallScore;
  p.lastAuditedAt = audit.timestamp;
  saveProjectToDisk(p);

  // 履歴ファイルに追記
  try {
    const historyFile = path.join(projectHistoryDir, `${projectId}.json`);
    let list: ProjectHistoryItem[] = [];
    if (fs.existsSync(historyFile)) {
      list = JSON.parse(fs.readFileSync(historyFile, 'utf8'));
    }
    list.unshift(historyItem);
    fs.writeFileSync(historyFile, JSON.stringify(list.slice(0, 100)), 'utf8');
  } catch {}
}

export function getProjectHistory(projectId: string): ProjectHistoryItem[] {
  try {
    const historyFile = path.join(projectHistoryDir, `${projectId}.json`);
    if (fs.existsSync(historyFile)) {
      return JSON.parse(fs.readFileSync(historyFile, 'utf8'));
    }
  } catch {}
  return [];
}

// 前回診断と最新診断のTime-Travel差分計算
export function calculateAuditDiff(
  project: ProjectRecord,
  baseAudit: FullAuditResult,
  compareAudit: FullAuditResult
): AuditTimeTravelDiffResponse {
  const baseMap = new Map(baseAudit.metrics.map((m) => [m.id, m]));
  const compareMap = new Map(compareAudit.metrics.map((m) => [m.id, m]));

  const allMetricIds = Array.from(new Set([...baseMap.keys(), ...compareMap.keys()]));
  const diffItems: AuditDiffItem[] = [];

  let improvedCount = 0;
  let degradedCount = 0;
  let unchangedCount = 0;

  for (const id of allMetricIds) {
    const base = baseMap.get(id);
    const comp = compareMap.get(id);

    const name = comp?.name || base?.name || id;
    const category = comp?.category || base?.category || 'technical';
    const statusBefore = base?.status || 'none';
    const statusAfter = comp?.status || 'none';
    const scoreBefore = base?.score || 0;
    const scoreAfter = comp?.score || 0;

    let changeType: AuditDiffItem['changeType'] = 'unchanged';
    let description = '';

    if (scoreAfter > scoreBefore) {
      changeType = 'improved';
      improvedCount++;
      description = `スコアが +${scoreAfter - scoreBefore}点 改善しました (${statusBefore} ➔ ${statusAfter})`;
    } else if (scoreAfter < scoreBefore) {
      changeType = 'degraded';
      degradedCount++;
      description = `スコアが ${scoreAfter - scoreBefore}点 低下しました (${statusBefore} ➔ ${statusAfter})`;
    } else {
      unchangedCount++;
      description = `スコア変化なし (${scoreAfter}点)`;
    }

    diffItems.push({
      id,
      name,
      category,
      statusBefore,
      statusAfter,
      scoreBefore,
      scoreAfter,
      changeType,
      description,
    });
  }

  // 変化のあった項目（improved/degraded）を先頭にソート
  diffItems.sort((a, b) => {
    if (a.changeType !== 'unchanged' && b.changeType === 'unchanged') return -1;
    if (a.changeType === 'unchanged' && b.changeType !== 'unchanged') return 1;
    return 0;
  });

  return {
    project,
    baseAudit: {
      id: baseAudit.id,
      auditedAt: baseAudit.timestamp,
      score: baseAudit.overallScore,
    },
    compareAudit: {
      id: compareAudit.id,
      auditedAt: compareAudit.timestamp,
      score: compareAudit.overallScore,
    },
    scoreDelta: compareAudit.overallScore - baseAudit.overallScore,
    diffItems,
    summary: {
      improvedCount,
      degradedCount,
      unchangedCount,
    },
  };
}
