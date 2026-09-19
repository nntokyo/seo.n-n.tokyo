import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ディープクロール・内部リンク診断',
  robots: {
    index: false,
    follow: true,
  },
};

export default function CrawlLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
