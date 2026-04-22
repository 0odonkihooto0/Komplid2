'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { SubscriptionPlan, Subscription } from '@prisma/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface Props {
  plan: SubscriptionPlan;
  subscription: Subscription | null;
  isInGracePeriod: boolean;
}

export function SubscriptionStatus({ plan, subscription, isInGracePeriod }: Props) {
  const router = useRouter();
  const [reactivating, setReactivating] = useState(false);

  if (!subscription || plan.planType === 'FREE') return null;

  const periodEnd = subscription.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd).toLocaleDateString('ru-RU')
    : null;

  const handleReactivate = async () => {
    setReactivating(true);
    try {
      const res = await fetch(`/api/subscriptions/${subscription.id}/reactivate`, {
        method: 'POST',
      });
      if (res.ok) router.refresh();
    } finally {
      setReactivating(false);
    }
  };

  return (
    <Card className={isInGracePeriod ? 'border-yellow-400' : ''}>
      <CardContent className="pt-4 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="font-medium">{plan.name}</p>
          {periodEnd && (
            <p className="text-sm text-muted-foreground">
              {subscription.cancelAtPeriodEnd ? 'Отменяется' : 'Следующее списание'}: {periodEnd}
            </p>
          )}
          {isInGracePeriod && (
            <p className="text-sm text-yellow-600">Просрочен платёж — grace-период</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={subscription.status === 'ACTIVE' ? 'default' : 'secondary'}>
            {subscription.status}
          </Badge>
          {subscription.cancelAtPeriodEnd ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleReactivate}
              disabled={reactivating}
            >
              {reactivating ? 'Восстанавливаем…' : 'Восстановить подписку'}
            </Button>
          ) : (
            <Button asChild variant="ghost" size="sm">
              <Link href="/settings/billing/cancel">Отменить подписку</Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
