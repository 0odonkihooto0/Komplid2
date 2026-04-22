import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { db } from '@/lib/db';
import { CurrentSubscriptionCard } from '@/components/billing/CurrentSubscriptionCard';
import { UsageMetricsCard } from '@/components/billing/UsageMetricsCard';
import { RecentPaymentsCard } from '@/components/billing/RecentPaymentsCard';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

export default async function BillingPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const workspaceId = session.user.activeWorkspaceId;
  if (!workspaceId) redirect('/settings/subscription');

  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    include: {
      activeSubscription: {
        include: {
          plan: true,
          defaultPaymentMethod: true,
        },
      },
    },
  });

  const subscription = workspace?.activeSubscription ?? null;

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-8 px-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Подписка и оплата</h1>
          <p className="text-muted-foreground mt-1">Управление тарифом и способами оплаты</p>
        </div>
        <Button asChild variant="outline" size="sm" className="flex-shrink-0 mt-1">
          <Link href="/settings/billing/payment-methods">Способы оплаты</Link>
        </Button>
      </div>

      {!subscription ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground mb-4">Нет активной подписки</p>
          <Button asChild>
            <Link href="/settings/subscription">Выбрать тариф</Link>
          </Button>
        </div>
      ) : (
        <CurrentSubscriptionCard subscription={subscription} />
      )}

      {subscription && (
        <Suspense fallback={<Skeleton className="h-40 w-full rounded-lg" />}>
          <UsageMetricsCard workspaceId={workspaceId} plan={subscription.plan} />
        </Suspense>
      )}

      <Suspense fallback={<Skeleton className="h-40 w-full rounded-lg" />}>
        <RecentPaymentsCard workspaceId={workspaceId} limit={3} />
      </Suspense>
    </div>
  );
}
