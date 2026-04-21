import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { CheckoutForm } from '@/components/subscriptions/CheckoutForm';

interface Props {
  params: { planId: string };
  searchParams: { period?: string };
}

export default async function CheckoutPage({ params, searchParams }: Props) {
  const plan = await db.subscriptionPlan.findUnique({
    where: { code: params.planId, isActive: true },
  });

  // Бесплатный план не требует оплаты
  if (!plan || plan.planType === 'FREE') notFound();

  const initialPeriod = searchParams.period === 'YEARLY' ? 'YEARLY' : 'MONTHLY';

  return (
    <div className="min-h-screen bg-muted/30 py-12 px-4">
      <CheckoutForm
        plan={plan}
        planCode={params.planId}
        initialPeriod={initialPeriod}
      />
    </div>
  );
}
