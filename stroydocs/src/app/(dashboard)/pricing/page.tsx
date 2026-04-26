import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { getActivePlan } from '@/lib/subscriptions/get-active-plan';
import { PricingPageClient } from './PricingPageClient';

export const dynamic = 'force-dynamic';

export default async function PricingPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const workspaceId = session.user.activeWorkspaceId;

  const [plans, activePlanResult] = await Promise.all([
    db.subscriptionPlan.findMany({
      where: { isActive: true, isVisible: true },
      orderBy: { displayOrder: 'asc' },
    }),
    workspaceId ? getActivePlan(workspaceId) : Promise.resolve(null),
  ]);

  const currentPlanCode = activePlanResult?.plan.code ?? 'free';

  return (
    <div className="container max-w-7xl mx-auto px-4">
      <PricingPageClient
        plans={plans}
        currentPlanCode={currentPlanCode}
        isAuthenticated={true}
      />
    </div>
  );
}
