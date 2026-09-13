import type { Metadata } from 'next';
import { GoogleAnalytics } from '@next/third-parties/google';
import './globals.css';

export const metadata: Metadata = {
  title: 'SEO Analyzer — 次世代SEO & AEO/AIO/LLMO/GEO 技術監査プラットフォーム',
  description: '100項目以上の技術的SEO、Core Web Vitals、Google公式API統合、およびGoogle AI Overviews / SearchGPT / Perplexity引用適性を自動診断するエンジニア向けプラットフォーム。',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  return (
    <html lang="ja" className="dark">
      <body className="min-h-screen obsidian-grid antialiased selection:bg-cyan-500/30 selection:text-cyan-200">
        {children}
      </body>
      {process.env.NODE_ENV === 'production' && gaMeasurementId && (
        <GoogleAnalytics gaId={gaMeasurementId} />
      )}
    </html>
  );
}
