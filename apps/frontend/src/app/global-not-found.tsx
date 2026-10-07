import type { Metadata } from 'next';
import './globals.css';
import { NotFoundContent } from './_components/NotFoundContent';

export const metadata: Metadata = {
  title: '404 - ページが見つかりません',
  description: '指定されたページは見つかりませんでした。',
};

export default function GlobalNotFound() {
  return (
    <html lang="ja" className="dark">
      <body className="min-h-screen obsidian-grid antialiased selection:bg-cyan-500/30 selection:text-cyan-200">
        <NotFoundContent />
      </body>
    </html>
  );
}
