import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'セキュリティレビュー',
  description: 'HTTPS、CSP、Cookie属性、CORS、主要セキュリティヘッダーを公開レスポンスからパッシブに確認します。',
  alternates: { canonical: '/tools/security-review' },
};

export default function SecurityReviewLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
