'use client';

import { useQuery } from '@tanstack/react-query';
import type { ProfessionalRole, RewardStatus } from '@prisma/client';
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

const STATUS_CONFIG: Record<RewardStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  PENDING: { label: 'В ожидании', variant: 'secondary' },
  GRANTED: { label: 'Бонус выдан', variant: 'default' },
  PAID: { label: 'Выплачено', variant: 'default' },
  CANCELED: { label: 'Отменён', variant: 'destructive' },
};

interface ReferralItem {
  id: string;
  referredEmail: string | null;
  referredName: string | null;
  referredRole: ProfessionalRole | null;
  isCrossRole: boolean;
  signupAt: string | null;
  firstPaidAt: string | null;
  rewardStatus: RewardStatus;
  rewardAmountRub: number;
  discountAmountRub: number;
}

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
}

export function ReferralsList() {
  const { data, isLoading } = useQuery<ReferralItem[]>({
    queryKey: ['referrals-list'],
    queryFn: async () => {
      const r = await fetch('/api/referrals/me/list');
      const json = await r.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Мои приглашения</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="text-sm text-gray-500 py-4 text-center">Загрузка...</div>
        )}
        {!isLoading && (!data || data.length === 0) && (
          <div className="text-sm text-gray-500 py-4 text-center">
            Пока нет приглашений. Поделитесь ссылкой!
          </div>
        )}
        {!isLoading && data && data.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-gray-500">
                  <th className="text-left py-2 font-medium">Email</th>
                  <th className="text-left py-2 font-medium">Роль</th>
                  <th className="text-left py-2 font-medium">Регистрация</th>
                  <th className="text-left py-2 font-medium">Оплата</th>
                  <th className="text-left py-2 font-medium">Статус</th>
                  <th className="text-right py-2 font-medium">Бонус</th>
                </tr>
              </thead>
              <tbody>
                {data.map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="py-2 max-w-[140px] truncate text-gray-700">
                      {r.referredEmail
                        ? r.referredEmail.replace(/(.{2}).+(@.+)/, '$1…$2')
                        : '—'}
                      {r.isCrossRole && (
                        <span className="ml-1 text-xs text-amber-600 font-medium">×90%</span>
                      )}
                    </td>
                    <td className="py-2 text-gray-600">
                      {r.referredRole ? ROLE_LABELS[r.referredRole] : '—'}
                    </td>
                    <td className="py-2 text-gray-500">{formatDate(r.signupAt)}</td>
                    <td className="py-2 text-gray-500">{formatDate(r.firstPaidAt)}</td>
                    <td className="py-2">
                      <Badge variant={STATUS_CONFIG[r.rewardStatus].variant}>
                        {STATUS_CONFIG[r.rewardStatus].label}
                      </Badge>
                    </td>
                    <td className="py-2 text-right font-medium text-green-700">
                      {r.rewardAmountRub > 0 ? `${Math.floor(r.rewardAmountRub / 100)} ₽` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
