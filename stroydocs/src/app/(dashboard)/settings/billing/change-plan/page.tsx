import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';
import { getActivePlan } from '@/lib/subscriptions/get-active-plan';
import { Button } from '@/components/ui/button';
import { PlanSelector } from './PlanSelector';

export default async function ChangePlanPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const workspaceId = session.user.activeWorkspaceId;
  if (!workspaceId) redirect('/settings/subscription');

  const activePlanResult = await getActivePlan(workspaceId);
  const subscription = activePlanResult?.subscription ?? null;

  if (!subscription || subscription.status !== 'ACTIVE') {
    redirect('/settings/subscription');
  }

  const allPlans = await db.subscriptionPlan.findMany({
    where: { isActive: true, isVisible: true },
    orderBy: { displayOrder: 'asc' },
  });

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/settings/subscription">← Назад</Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Изменить тариф</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Текущий: <span className="font-medium">{activePlanResult?.plan.name}</span>
          </p>
        </div>
      </div>

      <PlanSelector
        plans={allPlans}
        currentPlan={activePlanResult?.plan ?? null}
        subscriptionId={subscription.id}
        billingPeriod={subscription.billingPeriod as 'MONTHLY' | 'YEARLY'}
        currentPeriodEnd={subscription.currentPeriodEnd.toISOString()}
      />
    </div>
  );
}
