import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'llms.txt生成ツール — 作り方・構文チェック',
  description: 'URLからAIクローラー向けのllms.txtを生成し、内容を確認・コピーできる無料ツール。llms.txtの作り方や配置方法も確認できます。',
  alternates: { canonical: '/tools/llms-txt' },
  openGraph: {
    title: 'llms.txt生成ツール — 作り方・構文チェック',
    description: 'AIクローラー向けのllms.txtを生成・確認できる無料ツール。',
    url: '/tools/llms-txt',
    type: 'website',
  },
};

export default function LlmsTxtLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
