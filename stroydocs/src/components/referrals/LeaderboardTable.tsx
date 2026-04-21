'use client';

import { useQuery } from '@tanstack/react-query';
import type { ProfessionalRole } from '@prisma/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const ROLE_LABELS: Record<ProfessionalRole, string> = {
  SMETCHIK: 'Сметчик',
  PTO: 'ПТО',
  FOREMAN: 'Прораб',
  SK_INSPECTOR: 'Инженер СК',
  SUPPLIER: 'Снабженец',
  PROJECT_MANAGER: 'РП/ГИП',
  ACCOUNTANT: 'Бухгалтер',
};

interface LeaderEntry {
  rank: number;
  firstName: string;
  lastNameInitial: string;
  professionalRole: ProfessionalRole | null;
  paidCount: number;
  signupCount: number;
  badge: string | null;
}

const RANK_EMOJI: Record<number, string> = { 1: '🏆', 2: '🥈', 3: '🥉' };

export function LeaderboardTable() {
  const { data, isLoading } = useQuery<LeaderEntry[]>({
    queryKey: ['referrals-leaderboard'],
    queryFn: async () => {
      const r = await fetch('/api/referrals/leaderboard');
      const json = await r.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Топ партнёров</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="text-sm text-gray-500 py-4 text-center">Загрузка...</div>
        )}
        {!isLoading && (!data || data.length === 0) && (
          <div className="text-sm text-gray-500 py-4 text-center">Пока нет данных.</div>
        )}
        {!isLoading && data && data.length > 0 && (
          <div className="space-y-2">
            {data.map((entry) => (
              <div
                key={entry.rank}
                className="flex items-center justify-between py-2 border-b last:border-0"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 text-center text-base">
                    {RANK_EMOJI[entry.rank] ?? `${entry.rank}`}
                  </span>
                  <div>
                    <span className="font-medium text-sm text-gray-900">
                      {entry.firstName} {entry.lastNameInitial}.
                    </span>
                    {entry.professionalRole && (
                      <span className="ml-2 text-xs text-gray-500">
                        {ROLE_LABELS[entry.professionalRole]}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">{entry.paidCount} платящих</span>
                  {entry.badge && (
                    <Badge variant="secondary" className="text-xs">
                      {entry.badge}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
