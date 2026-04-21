import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';
import { getActivePlan } from '@/lib/subscriptions/get-active-plan';
import { PlanCard } from '@/components/subscriptions/PlanCard';
import { SubscriptionStatus } from './SubscriptionStatus';
import { Button } from '@/components/ui/button';

export default async function SubscriptionPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const workspaceId = session.user.activeWorkspaceId;

  // Загрузить все активные планы, отсортированные по порядку отображения
  const allPlans = await db.subscriptionPlan.findMany({
    where: { isActive: true },
    orderBy: { displayOrder: 'asc' },
  });

  // Активная подписка текущего workspace
  const activePlanResult = workspaceId
    ? await getActivePlan(workspaceId)
    : null;

  const activePlanCode = activePlanResult?.plan.code ?? 'free';

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Тарифы и подписка</h1>
          <p className="text-muted-foreground mt-1">
            Выберите подходящий тариф для вашей работы
          </p>
        </div>
        {activePlanResult?.subscription?.status === 'ACTIVE' && (
          <Button asChild variant="outline" size="sm" className="flex-shrink-0 mt-1">
            <Link href="/settings/billing/change-plan">Изменить тариф</Link>
          </Button>
        )}
      </div>

      {activePlanResult && (
        <SubscriptionStatus
          plan={activePlanResult.plan}
          subscription={activePlanResult.subscription}
          isInGracePeriod={activePlanResult.isInGracePeriod}
        />
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {allPlans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            isActive={plan.code === activePlanCode}
            billingPeriod="MONTHLY"
          />
        ))}
      </div>
    </div>
  );
}
