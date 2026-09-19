import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Google公式統合ハブ',
  robots: {
    index: false,
    follow: true,
  },
};

export default function GoogleLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
