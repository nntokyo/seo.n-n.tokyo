'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  FileText,
  Sparkles,
  Copy,
  Check,
  Download,
  ArrowLeft,
  Terminal,
  ExternalLink,
  ShieldCheck,
  Info,
  Layers,
  ArrowRight,
} from 'lucide-react';

export default function LlmsTxtToolPage() {
  const [targetUrl, setTargetUrl] = useState('https://seo.n-n.tokyo');
  const [title, setTitle] = useState('SEO Analyzer');
  const [description, setDescription] = useState('AI時代の次世代SEO & AEO/AIO/LLMO/GEO 技術監査プラットフォーム');
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/v1/tools/generate-llms-txt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: targetUrl,
          title: title.trim() || undefined,
          description: description.trim() || undefined,
        }),
      });

      if (!res.ok) {
        throw new Error('llms.txtの合成に失敗しました');
      }

      const data = await res.json();
      setGeneratedContent(data.llmsTxt);
    } catch (err: any) {
      setErrorMsg(err.message || '生成処理中にエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (!generatedContent) return;
    navigator.clipboard.writeText(generatedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!generatedContent) return;
    const blob = new Blob([generatedContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'llms.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#080B11] text-slate-100 selection:bg-cyan-500/30">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 w-full border-b border-white/[0.08] bg-[#080B11]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-2 text-xs font-mono text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>トップへ戻る</span>
            </Link>
            <div className="h-4 w-px bg-white/10" />
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-tight text-white">llms.txt Generator</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-cyan-500/30 text-cyan-400 bg-cyan-500/10">
                AEO Standard
              </span>
            </div>
          </div>
          <Link
            href="/"
            className="text-xs font-mono text-cyan-400 hover:underline flex items-center gap-1"
          >
            <span>即時診断へ</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        {/* Page Hero */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/20 bg-cyan-500/5 text-cyan-400 text-xs font-mono">
            <Sparkles className="w-3.5 h-3.5" />
            <span>RFC準拠・次世代AIクローラー規格</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            llms.txt 自動合成 & 検証ツール
          </h1>
          <p className="text-sm sm:text-base text-slate-400 max-w-3xl leading-relaxed">
            Perplexity、SearchGPT、Claude、GeminiなどのAIクローラーに向けて、サイトの構造・要約・公式リンクを効率的に学習させる標準ファイル
            <code className="mx-1 px-1.5 py-0.5 rounded bg-white/10 text-cyan-300 font-mono text-xs">/llms.txt</code>
            を自動合成します。
          </p>
        </div>

        {/* Generator Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left: Input Form */}
          <div className="lg:col-span-5 space-y-6">
            <form onSubmit={handleGenerate} className="p-6 rounded-2xl border border-white/[0.08] bg-[#0B0F17] space-y-5">
              <div className="flex items-center gap-2 pb-3 border-b border-white/[0.06]">
                <FileText className="w-4 h-4 text-cyan-400" />
                <h2 className="text-sm font-bold text-white">サイト情報入力</h2>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-300">対象サイトURL</label>
                <input
                  type="text"
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  placeholder="https://example.com"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-sm font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 transition-colors"
                />
                <p className="text-[11px] text-slate-500">
                  ※ 実URLを指定すると、HTMLからタイトルと内部リンクを自動取得します。
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-300">サイト名称 (Title)</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="サービス名・ブランド名"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-300">サイト要約 (Description)</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="AIに伝えたいサイトの本質や提供価値"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                    <span>自動合成中...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>llms.txt を合成する</span>
                  </>
                )}
              </button>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                  {errorMsg}
                </div>
              )}
            </form>

            {/* Spec Card */}
            <div className="p-5 rounded-2xl border border-white/[0.06] bg-[#0B0F17]/60 space-y-3 text-xs text-slate-400">
              <div className="flex items-center gap-2 font-bold text-slate-200">
                <Info className="w-3.5 h-3.5 text-cyan-400" />
                <span>llms.txt 配置ベストプラクティス</span>
              </div>
              <ul className="space-y-2 list-disc list-inside text-[11px] leading-relaxed">
                <li>
                  Next.js App Routerでは <code className="text-cyan-300 font-mono">public/llms.txt</code> に配置します。
                </li>
                <li>
                  Webルート直下（例: <code className="text-cyan-300 font-mono">https://domain.com/llms.txt</code>）でHTTP 200を返却してください。
                </li>
                <li>
                  主要な見出し・要約・重要ページURLを箇条書きで記載することで、AI検索エンジンの回答引用率を最大化できます。
                </li>
              </ul>
            </div>
          </div>

          {/* Right: Output Preview */}
          <div className="lg:col-span-7 space-y-4">
            <div className="rounded-2xl border border-white/[0.08] bg-[#0B0F17] overflow-hidden flex flex-col h-full min-h-[480px]">
              {/* Header Bar */}
              <div className="px-5 py-3.5 border-b border-white/[0.08] bg-black/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Terminal className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-xs font-mono font-bold text-white">llms.txt 出力結果</span>
                </div>

                {generatedContent && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopy}
                      className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-mono flex items-center gap-1.5 transition-colors"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copied!' : 'Copy'}</span>
                    </button>
                    <button
                      onClick={handleDownload}
                      className="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/30 text-xs font-mono flex items-center gap-1.5 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Code Area */}
              <div className="flex-1 p-5 font-mono text-xs overflow-x-auto leading-relaxed">
                {generatedContent ? (
                  <pre className="text-cyan-300/90 whitespace-pre-wrap">{generatedContent}</pre>
                ) : (
                  <div className="h-full min-h-[380px] flex flex-col items-center justify-center text-center p-8 text-slate-500 space-y-3">
                    <FileText className="w-10 h-10 stroke-1 text-slate-600" />
                    <p className="text-xs">
                      左のフォームにサイトURLを入力して「合成する」をクリックすると、
                      <br />
                      AIクローラー向け仕様に最適化された llms.txt がここに生成されます。
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
