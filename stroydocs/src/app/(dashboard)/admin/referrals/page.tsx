'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/useToast';

interface SuspiciousReferral {
  id: string;
  fraudReasons: string[];
  rewardStatus: string;
  rewardAmountRub: number;
  signupAt: string | null;
  firstPaidAt: string | null;
  referrer: { email: string; firstName: string; lastName: string } | null;
  referredUser: { email: string; firstName: string; lastName: string } | null;
}

export default function AdminReferralsPage() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<SuspiciousReferral[]>({
    queryKey: ['admin-referrals-suspicious'],
    queryFn: async () => {
      const r = await fetch('/api/admin/referrals');
      const json = await r.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
  });

  const actionMutation = useMutation({
    mutationFn: async ({ referralId, action }: { referralId: string; action: 'confirm' | 'cancel' }) => {
      const r = await fetch('/api/admin/referrals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ referralId, action }),
      });
      const json = await r.json();
      if (!json.success) throw new Error(json.error);
    },
    onSuccess: (_, { action }) => {
      qc.invalidateQueries({ queryKey: ['admin-referrals-suspicious'] });
      toast({ title: action === 'confirm' ? 'Реферал подтверждён' : 'Реферал отклонён' });
    },
    onError: () => toast({ title: 'Ошибка', variant: 'destructive' }),
  });

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">Модерация рефералов</h1>
      <p className="text-gray-500 text-sm">Подозрительные рефералы, требующие ручной проверки.</p>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Подозрительные ({data?.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-sm text-gray-500">Загрузка...</p>}
          {!isLoading && data?.length === 0 && (
            <p className="text-sm text-gray-500 py-4 text-center">Нет подозрительных рефералов ✅</p>
          )}
          {data?.map((ref) => (
            <div key={ref.id} className="border rounded-lg p-4 mb-3 space-y-2">
              <div className="flex justify-between items-start">
                <div className="text-sm space-y-0.5">
                  <div>
                    <span className="text-gray-500">Реферер:</span>{' '}
                    <span className="font-medium">
                      {ref.referrer?.firstName} {ref.referrer?.lastName} &lt;{ref.referrer?.email}&gt;
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Приглашённый:</span>{' '}
                    <span className="font-medium">
                      {ref.referredUser?.firstName} {ref.referredUser?.lastName} &lt;{ref.referredUser?.email}&gt;
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Бонус:</span>{' '}
                    {Math.floor(ref.rewardAmountRub / 100)} ₽ ({ref.rewardStatus})
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => actionMutation.mutate({ referralId: ref.id, action: 'confirm' })}
                    disabled={actionMutation.isPending}
                  >
                    Подтвердить
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => actionMutation.mutate({ referralId: ref.id, action: 'cancel' })}
                    disabled={actionMutation.isPending}
                  >
                    Отклонить
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {ref.fraudReasons.map((r) => (
                  <Badge key={r} variant="destructive" className="text-xs">
                    {r}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
