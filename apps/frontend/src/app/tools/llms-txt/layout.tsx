import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'llms.txt 自動生成 & AEO構文検証ツール',
  description: 'AI検索エンジン（SearchGPT, Perplexity, Google AI Overviews）の回答引用に最適化された llms.txt ファイルの自動生成および構文検証ツール。',
  alternates: {
    canonical: '/tools/llms-txt',
  },
};

export default function LlmsTxtLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
