import type { ReactNode } from 'react';
import Link from 'next/link';
import { OnboardingProgress } from '@/components/onboarding/OnboardingProgress';

// Маппинг пути → номер шага
function getStepFromPathname(pathname: string): number {
  if (pathname.includes('/workspace')) return 2;
  if (pathname.includes('/plan')) return 3;
  if (pathname.includes('/invite')) return 4;
  if (pathname.includes('/first-project')) return 5;
  if (pathname.includes('/done')) return 5;
  return 1;
}

interface OnboardingLayoutProps {
  children: ReactNode;
}

// Server Component — pathname недоступен напрямую, прогресс передаётся через children
// (каждая страница-шаг сама знает свой номер и передаёт через data-attribute или хук)
export default function OnboardingLayout({ children }: OnboardingLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex h-16 items-center justify-between border-b px-4 sm:px-8">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-bold text-primary">Komplid</span>
        </Link>
        <div className="flex-1 flex justify-center">
          {/* Прогресс рендерится в каждом шаге через <OnboardingShell> */}
        </div>
        <div className="w-24" />
      </header>
      <main className="flex flex-1 flex-col items-center justify-start px-4 py-8 sm:px-8">
        {children}
      </main>
    </div>
  );
}
