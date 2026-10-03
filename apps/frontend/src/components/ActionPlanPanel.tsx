'use client';

import React, { useMemo, useState } from 'react';
import { ActionPlan, ActionPriority, RankedAction } from '@seo/shared';

const PRIORITY_STYLE: Record<ActionPriority, string> = {
  P1: 'bg-red-500/15 text-red-300 border-red-500/30',
  P2: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  P3: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
};

function escapeCsv(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

export function actionPlanMarkdown(plan: ActionPlan, url: string): string {
  const lines = [
    `# SEO 監査 ${url}`,
    '',
    `総合 ${plan.overall} / 100。${plan.method}`,
    '',
    '## 領域',
    '',
    '| 領域 | 点 | 重み | 減点 |',
    '| --- | --- | --- | --- |',
    ...plan.areas.map((area) => `| ${area.label} | ${area.score ?? '未評価'} | ${area.weight} | ${area.deduction} |`),
    '',
  ];
  if (plan.caps.length) {
    lines.push('## 上限', '', ...plan.caps.map((cap) => `- ${cap}`), '');
  }
  lines.push('## 施策', '', '| 優先 | ID | インパクト | 工数 | 内容 | 根拠 | 直し方 |', '| --- | --- | --- | --- | --- | --- | --- |');
  for (const action of plan.actions) {
    lines.push(`| ${action.priority} | ${action.id} | ${action.impact} | ${action.effortLabel} | ${action.title}${action.heuristic ? '（目安）' : ''} | ${action.evidence.replace(/\|/g, '/')} | ${action.fix.replace(/\|/g, '/')} |`);
  }
  lines.push('', '## 未確認', '', ...plan.partialReasons.map((reason) => `- ${reason}`), '');
  return lines.join('\n');
}

export function actionPlanCsv(plan: ActionPlan): string {
  const header = ['id', 'priority', 'impact', 'effort', 'status', 'heuristic', 'title', 'evidence', 'fix', 'source', 'url'];
  const rows = plan.actions.map((action) => [
    action.id,
    action.priority,
    String(action.impact),
    action.effortLabel,
    '',
    action.heuristic ? 'yes' : 'no',
    action.title,
    action.evidence,
    action.fix,
    action.source,
    action.urls[0] || '',
  ].map(escapeCsv).join(','));
  return [header.join(','), ...rows].join('\n');
}

function download(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const href = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = href;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(href);
}

function Scatter({ actions }: { actions: RankedAction[] }) {
  const plotted = actions.filter((action) => action.severity !== 'info');
  return (
    <svg viewBox="0 0 360 200" className="w-full h-52" role="img" aria-label="インパクトと工数">
      <rect x="0" y="0" width="360" height="200" fill="transparent" />
      <line x1="40" y1="16" x2="40" y2="168" stroke="rgba(255,255,255,0.15)" />
      <line x1="40" y1="168" x2="340" y2="168" stroke="rgba(255,255,255,0.15)" />
      <text x="8" y="20" fill="#94a3b8" fontSize="10">高</text>
      <text x="8" y="164" fill="#94a3b8" fontSize="10">低</text>
      {[1, 2, 3, 4].map((effort) => (
        <text key={effort} x={40 + ((effort - 1) / 3) * 280} y="186" fill="#94a3b8" fontSize="10" textAnchor="middle">
          {effort === 1 ? '数時間' : effort === 2 ? '1日' : effort === 3 ? '数日' : '週'}
        </text>
      ))}
      {plotted.map((action, index) => {
        const x = 40 + ((action.effort - 1) / 3) * 280 + ((index % 3) - 1) * 6;
        const y = 20 + (1 - action.impact / 100) * 140;
        const fill = action.priority === 'P1' ? '#f87171' : action.priority === 'P2' ? '#fbbf24' : '#94a3b8';
        return (
          <g key={action.id}>
            {action.quickWin && <circle cx={x} cy={y} r="9" fill="none" stroke="#22d3ee" strokeWidth="1.5" />}
            <circle cx={x} cy={y} r="5" fill={fill}>
              <title>{`${action.priority} ${action.title} インパクト ${action.impact}`}</title>
            </circle>
          </g>
        );
      })}
    </svg>
  );
}

export function ActionPlanPanel({ plan, url }: { plan: ActionPlan; url: string }) {
  const [priority, setPriority] = useState<'all' | ActionPriority | 'quick'>('all');
  const visible = useMemo(() => plan.actions.filter((action) => {
    if (priority === 'all') return action.severity !== 'info';
    if (priority === 'quick') return action.quickWin;
    return action.priority === priority;
  }), [plan.actions, priority]);
  const infoCount = plan.actions.filter((action) => action.severity === 'info').length;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-white">直す順番</h2>
          <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed">{plan.method}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => download('seo-actions.md', actionPlanMarkdown(plan, url), 'text/markdown;charset=utf-8')}
            className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-xs font-mono text-slate-200 hover:bg-white/10"
          >
            Markdown
          </button>
          <button
            type="button"
            onClick={() => download('seo-actions.csv', `\uFEFF${actionPlanCsv(plan)}`, 'text/csv;charset=utf-8')}
            className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-xs font-mono text-slate-200 hover:bg-white/10"
          >
            CSV
          </button>
        </div>
      </div>

      {plan.caps.map((cap) => (
        <p key={cap} className="text-xs text-amber-200 bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-2">
          {cap}
        </p>
      ))}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {plan.areas.map((area) => (
          <div key={area.id} className="rounded-xl border border-white/[0.08] bg-[#0B0F17] p-3">
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
              <span>{area.label}</span>
              <span>w{area.weight}</span>
            </div>
            <div className="mt-1 text-xl font-mono font-bold text-white">{area.score ?? '—'}</div>
            <div className="mt-2 h-1.5 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full bg-cyan-400/80"
                style={{ width: `${Math.max(0, Math.min(100, area.score ?? 0))}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-5 gap-3">
        <div className="lg:col-span-3 rounded-2xl border border-white/[0.08] bg-[#0B0F17] p-4">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-xs font-mono text-slate-300">インパクト × 工数</h3>
            <span className="text-[10px] text-cyan-300">枠線はクイックウィン</span>
          </div>
          <Scatter actions={plan.actions} />
        </div>
        <div className="lg:col-span-2 rounded-2xl border border-white/[0.08] bg-[#0B0F17] p-4 space-y-3">
          <h3 className="text-xs font-mono text-slate-300">どこに手を入れるか</h3>
          {plan.invest.length === 0 && <p className="text-xs text-slate-400">減点された領域はありません。</p>}
          {plan.invest.map((area) => (
            <div key={area.id}>
              <div className="flex justify-between text-[11px] text-slate-300">
                <span>{area.label}</span>
                <span className="font-mono">-{area.deduction}</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full bg-violet-400/80"
                  style={{ width: `${Math.min(100, area.deduction * 4)}%` }}
                />
              </div>
            </div>
          ))}
          <p className="text-[10px] text-slate-500 leading-relaxed">
            確認済み {plan.passed.length} 項目。未確認: {plan.partialReasons.join(' ')}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 text-xs font-mono">
        {(['all', 'P1', 'P2', 'P3', 'quick'] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setPriority(key)}
            className={`px-2.5 py-1 rounded-lg border ${priority === key ? 'border-cyan-400/40 text-cyan-200 bg-cyan-500/10' : 'border-white/10 text-slate-400'}`}
          >
            {key === 'all' ? '施策' : key === 'quick' ? 'クイックウィン' : key}
          </button>
        ))}
        {infoCount > 0 && <span className="px-2 py-1 text-slate-500">参考 {infoCount} 件は減点なし</span>}
      </div>

      <div className="space-y-2">
        {visible.length === 0 && <p className="text-xs text-slate-400">この絞り込みには施策がありません。</p>}
        {visible.map((action) => (
          <article key={action.id} className="rounded-2xl border border-white/[0.08] bg-[#0B0F17] p-4 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${PRIORITY_STYLE[action.priority]}`}>{action.priority}</span>
              <span className="text-[10px] font-mono text-slate-500">{action.id}</span>
              {action.heuristic && <span className="text-[10px] font-mono text-slate-400 border border-white/10 rounded px-1.5 py-0.5">目安</span>}
              {action.quickWin && <span className="text-[10px] font-mono text-cyan-300 border border-cyan-500/30 rounded px-1.5 py-0.5">クイックウィン</span>}
              <h3 className="text-sm font-semibold text-white">{action.title}</h3>
              <span className="ml-auto text-[11px] font-mono text-slate-400">影響 {action.impact} · {action.effortLabel}</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">{action.evidence}</p>
            <p className="text-xs text-cyan-200/90 leading-relaxed">{action.fix}</p>
            <a href={action.source} target="_blank" rel="noreferrer" className="text-[11px] font-mono text-slate-500 hover:text-slate-300 break-all">
              {action.source}
            </a>
          </article>
        ))}
      </div>
    </section>
  );
}
