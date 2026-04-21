'use client';

import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import { MyReferralCard } from '@/components/referrals/MyReferralCard';
import { CrossRoleExplainer } from '@/components/referrals/CrossRoleExplainer';
import { ReferralsList } from '@/components/referrals/ReferralsList';
import { LeaderboardTable } from '@/components/referrals/LeaderboardTable';
import Link from 'next/link';

interface ReferralStats {
  code: string;
  shareUrl: string;
  clickCount: number;
  signupCount: number;
  paidCount: number;
  totalBonusRub: number;
  creditBalanceRub: number;
}

export default function ReferralsPage() {
  const { data: session } = useSession();

  const { data: stats, isLoading } = useQuery<ReferralStats>({
    queryKey: ['referral-me'],
    queryFn: async () => {
      const r = await fetch('/api/referrals/me');
      const json = await r.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    enabled: !!session?.user,
  });

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Заголовок */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Реферальная программа</h1>
          <p className="text-gray-500 mt-1">
            Приглашайте коллег и получайте бонусы на ваш счёт
          </p>
        </div>
        <Link
          href="/referrals/leaderboard"
          className="text-sm text-blue-600 hover:underline"
        >
          Топ партнёров →
        </Link>
      </div>

      {/* Основной контент */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Левая колонка */}
        <div className="space-y-4">
          {isLoading && (
            <div className="h-48 bg-gray-100 rounded-xl animate-pulse" />
          )}
          {stats && (
            <MyReferralCard
              code={stats.code}
              shareUrl={stats.shareUrl}
              clickCount={stats.clickCount}
              signupCount={stats.signupCount}
              paidCount={stats.paidCount}
              totalBonusRub={stats.totalBonusRub}
              creditBalanceRub={stats.creditBalanceRub}
            />
          )}

          <CrossRoleExplainer userRole={session?.user?.professionalRole ?? null} />
        </div>

        {/* Правая колонка */}
        <div>
          <LeaderboardTable />
        </div>
      </div>

      {/* Список приглашений */}
      <ReferralsList />
    </div>
  );
}
