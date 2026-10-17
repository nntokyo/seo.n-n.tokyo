import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Google API 連携ハブ',
  robots: {
    index: false,
    follow: true,
  },
};

export default function GoogleLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
