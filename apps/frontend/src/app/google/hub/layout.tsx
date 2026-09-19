import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Search Console・PageSpeed・GA4 SEO分析',
  description: 'Google Search Console、PageSpeed Insights、GA4、Geminiをまとめて確認し、検索流入、Core Web Vitals、改善案を分析します。',
  alternates: { canonical: '/google/hub' },
};

export default function GoogleHubLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
