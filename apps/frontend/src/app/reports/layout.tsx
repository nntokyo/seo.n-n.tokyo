import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '監査レポート',
  robots: {
    index: false,
    follow: true,
  },
};

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
