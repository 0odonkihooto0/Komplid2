import type { ReactNode } from 'react';
import { Suspense } from 'react';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { Sidebar } from '@/components/shared/Sidebar';
import { Header } from '@/components/shared/Header';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { BillingStatusBanner } from '@/components/billing/BillingStatusBanner';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);

  if (session?.user?.activeWorkspaceId && !session.user.professionalRole) {
    const headersList = await headers();
    const pathname = headersList.get('x-pathname') ?? headersList.get('x-invoke-path') ?? '/';

    if (!pathname.startsWith('/onboarding')) {
      const workspace = await db.workspace.findUnique({
        where: { id: session.user.activeWorkspaceId },
        select: { type: true },
      });

      if (workspace?.type === 'PERSONAL') {
        redirect('/onboarding/role');
      }
    }
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
