import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'XMLサイトマップ解析・カノニカルエラー検証ツール',
  description: 'XMLサイトマップの構文エラー、404リンク、Canonical矛盾、ハブページ構造を高速に精密診断する技術者向けツール。',
  alternates: {
    canonical: '/tools/sitemap-analyzer',
  },
};

export default function SitemapAnalyzerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
