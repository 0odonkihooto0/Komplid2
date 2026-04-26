'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Gift, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { MyReferralCard } from '@/components/referrals/MyReferralCard';

interface ReferralStats {
  code: string;
  shareUrl: string;
  clickCount: number;
  signupCount: number;
  paidCount: number;
  totalBonusRub: number;
  creditBalanceRub: number;
}

export function ReferralsProfileContent() {
  const { data: stats, isLoading } = useQuery<ReferralStats>({
    queryKey: ['referral-me'],
    queryFn: async () => {
      const r = await fetch('/api/referrals/me');
      const json = await r.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">Реферальная программа</CardTitle>
          </div>
          <CardDescription>
            Приглашайте коллег — получайте бонусы на счёт
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          ) : stats ? (
            <MyReferralCard {...stats} />
          ) : (
            <p className="text-sm text-muted-foreground">Реферальная программа недоступна</p>
          )}
        </CardContent>
      </Card>

      {stats && (
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Переходов" value={stats.clickCount} />
          <StatCard label="Регистраций" value={stats.signupCount} />
          <StatCard label="Платящих" value={stats.paidCount} />
        </div>
      )}

      <Button variant="outline" size="sm" asChild>
        <Link href="/referrals">
          <ExternalLink className="mr-2 h-4 w-4" />
          Подробная статистика
        </Link>
      </Button>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border p-3 text-center">
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}
