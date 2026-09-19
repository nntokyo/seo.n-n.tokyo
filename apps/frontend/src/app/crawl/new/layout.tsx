import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'サイトクロール・内部リンク分析ツール',
  description: 'サイトを巡回して内部リンク、孤立ページ、リンク切れ、クリック深度を分析するSEOクロールツール。',
  alternates: { canonical: '/crawl/new' },
};

export default function CrawlNewLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
