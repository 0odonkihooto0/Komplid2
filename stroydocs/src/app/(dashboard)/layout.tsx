import type { ReactNode } from 'react';
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Sidebar } from '@/components/shared/Sidebar';
import { Header } from '@/components/shared/Header';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { BillingStatusBanner } from '@/components/billing/BillingStatusBanner';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);

  // Middleware уже гарантирует onboardingCompleted перед входом в dashboard,
  // но оставляем запасную проверку на случай если middleware обойдён
  if (session && !session.user.onboardingCompleted) {
    redirect('/onboarding');
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <Suspense fallback={null}>
          <BillingStatusBanner />
        </Suspense>
        <main className="flex-1 overflow-y-auto p-6">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
