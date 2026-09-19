import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'XMLサイトマップ分析ツール — URL・更新日・canonical確認',
  description: 'XMLサイトマップを解析し、URL一覧、更新日、階層、canonical候補、サイトマップの問題を確認できる無料SEOツール。',
  alternates: { canonical: '/tools/sitemap-analyzer' },
  openGraph: {
    title: 'XMLサイトマップ分析ツール',
    description: 'XMLサイトマップのURL構造や更新情報を無料で確認。',
    url: '/tools/sitemap-analyzer',
    type: 'website',
  },
};

export default function SitemapAnalyzerLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
