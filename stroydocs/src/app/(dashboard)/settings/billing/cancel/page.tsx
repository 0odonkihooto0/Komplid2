import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import { getActivePlan } from '@/lib/subscriptions/get-active-plan';
import { Button } from '@/components/ui/button';
import { CancelFlow } from '@/components/subscriptions/cancel/CancelFlow';

export default async function CancelSubscriptionPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const workspaceId = session.user.activeWorkspaceId;
  if (!workspaceId) redirect('/settings/subscription');

  const activePlanResult = await getActivePlan(workspaceId);
  const subscription = activePlanResult?.subscription;

  if (!subscription || subscription.status !== 'ACTIVE') {
    redirect('/settings/subscription');
  }

  return (
    <div className="max-w-lg mx-auto p-6 space-y-8">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/settings/subscription">← Назад</Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Отмена подписки</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Тариф: <span className="font-medium">{activePlanResult?.plan.name}</span>
          </p>
        </div>
      </div>

      <CancelFlow
        subscriptionId={subscription.id}
        effectiveEndDate={subscription.currentPeriodEnd.toISOString()}
      />
    </div>
  );
}
