import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SEO技術監査レポート',
  robots: {
    index: false,
    follow: true,
  },
};

export default function AuditLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
