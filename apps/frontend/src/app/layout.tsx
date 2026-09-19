import type { Metadata } from 'next';
import Script from 'next/script';
import { GoogleAnalytics } from '@next/third-parties/google';
import './globals.css';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://seo.n-n.tokyo';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  alternates: {
    canonical: '/',
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
  },
  title: {
    default: 'SEO Analyzer — 次世代SEO & AEO/AIO/LLMO/GEO 技術監査プラットフォーム',
    template: '%s | SEO Analyzer',
  },
  description: '100項目以上の技術的SEO、Core Web Vitals、Google公式API統合、およびGoogle AI Overviews / SearchGPT / Perplexity引用適性を自動診断するエンジニア向けプラットフォーム。',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    shortcut: ['/favicon.svg'],
    apple: ['/favicon.svg'],
  },
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
  const adsenseClientId =
    process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT_ID ||
    process.env.GOOGLE_ADSENSE_CLIENT_ID;
  const isValidAdsenseClientId = /^ca-pub-\d+$/.test(adsenseClientId || '');

  return (
    <html lang="ja" className="dark">
      {process.env.NODE_ENV === 'production' && isValidAdsenseClientId && (
        <Script
          id="google-adsense"
          async
          crossOrigin="anonymous"
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClientId}`}
          strategy="beforeInteractive"
        />
      )}
      <body className="min-h-screen obsidian-grid antialiased selection:bg-cyan-500/30 selection:text-cyan-200">
        {children}
      </body>
      {process.env.NODE_ENV === 'production' && gaMeasurementId && (
        <GoogleAnalytics gaId={gaMeasurementId} />
      )}
    </html>
  );
}
