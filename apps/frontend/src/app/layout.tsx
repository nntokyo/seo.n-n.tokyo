import type { Metadata } from 'next';
import Script from 'next/script';
import { GoogleAnalytics } from '@next/third-parties/google';
import './globals.css';
import { StructuredData } from './_components/StructuredData';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://seo.n-n.tokyo';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  alternates: {
    canonical: '/',
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
  },
  applicationName: 'SEO Analyzer',
  title: {
    default: 'SEO Analyzer — 無料SEO診断・サイトマップ・技術監査ツール',
    template: '%s | SEO Analyzer',
  },
  description: 'URLを入力してクロール、タイトル、構造化データ、サイトマップ、HTTPSを確認し、直す順番を出す無料SEO分析ツール。順位は予測しません。',
  openGraph: {
    type: 'website',
    locale: 'ja_JP',
    url: siteUrl,
    siteName: 'SEO Analyzer',
    title: 'SEO Analyzer — 無料SEO診断・サイトマップ・技術監査ツール',
    description: 'クロール、タイトル、構造化データ、サイトマップを確認し、直す順番を出す無料SEO分析ツール。',
  },
  twitter: {
    card: 'summary',
    title: 'SEO Analyzer — 無料SEO診断・サイトマップ・技術監査ツール',
    description: 'クロール、タイトル、構造化データ、サイトマップを確認し、直す順番を出す無料SEO分析ツール。',
  },
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
          strategy="lazyOnload"
        />
      )}
      <body className="min-h-screen obsidian-grid antialiased selection:bg-cyan-500/30 selection:text-cyan-200">
        <StructuredData
          data={[
            {
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: 'SEO Analyzer',
              url: siteUrl,
              inLanguage: 'ja',
              description: '無料SEO診断、サイトマップ分析、内部リンク分析、llms.txt生成、Google公式API連携を提供するSEO分析サイト。',
            },
            {
              '@context': 'https://schema.org',
              '@type': 'WebApplication',
              name: 'SEO Analyzer',
              url: siteUrl,
              applicationCategory: 'BusinessApplication',
              operatingSystem: 'Web',
              inLanguage: 'ja',
              description: 'クロール、タイトル、構造化データ、サイトマップ、HTTPSを確認し、直す順番を出すWebアプリケーション。',
              offers: {
                '@type': 'Offer',
                price: 0,
                priceCurrency: 'JPY',
              },
            },
          ]}
        />
        {children}
      </body>
      {process.env.NODE_ENV === 'production' && gaMeasurementId && (
        <GoogleAnalytics gaId={gaMeasurementId} />
      )}
    </html>
  );
}
