import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'プロジェクト管理',
  robots: {
    index: false,
    follow: true,
  },
};

export default function ProjectsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
