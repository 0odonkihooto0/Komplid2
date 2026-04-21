'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/useToast';

interface Plan {
  id: string;
  code: string;
  name: string;
  planType: string;
  priceMonthlyRub: number;
  priceYearlyRub: number;
  features: string[];
  isFeatured: boolean;
}

const ROLE_PLAN_PREFIX: Record<string, string> = {
  SMETCHIK: 'smetchik_studio',
  PTO: 'id_master',
  FOREMAN: 'foreman_journal',
  SK_INSPECTOR: 'id_master',
  SUPPLIER: 'smetchik_studio',
  PROJECT_MANAGER: 'id_master',
  ACCOUNTANT: 'smetchik_studio',
};

const FEATURE_LABELS: Record<string, string> = {
  estimates: 'Сметы',
  estimates_import: 'Импорт смет',
  estimates_compare_basic: 'Сравнение версий',
  estimates_compare_advanced: 'Расширенное сравнение',
  estimates_public_link: 'Публичные ссылки',
  estimates_history: 'История изменений',
  estimates_export_grand_smeta: 'Экспорт в Гранд-Смету',
  contracts_lite: 'Договоры (lite)',
  templates_library: 'Библиотека шаблонов',
  normative_library: 'Нормативная база',
  fgis_cs_prices: 'Цены ФГИС ЦС',
  execution_docs: 'Исполнительная документация',
  aosr_generation: 'Генерация АОСР',
  ozr_generation: 'Генерация ОЖР',
  ks2_ks3_generation: 'Генерация КС-2/КС-3',
  journals_basic: 'Журналы (базовые)',
  journals_full: 'Журналы (полные)',
  mobile_pwa: 'Мобильное приложение (PWA)',
  photos_gps: 'Фото с GPS',
  defects_lite: 'Дефектовка (lite)',
  approval_routes: 'Маршруты согласования',
};

export default function OnboardingPlanPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [startingTrial, setStartingTrial] = useState(false);

  const professionalRole = session?.user?.professionalRole ?? 'SMETCHIK';
  const prefix = ROLE_PLAN_PREFIX[professionalRole] ?? 'smetchik_studio';

  const { data: allPlans } = useQuery<Plan[]>({
    queryKey: ['subscription-plans'],
    queryFn: async () => {
      const r = await fetch('/api/subscription-plans');
      const json = await r.json();
      return json.success ? json.data : [];
    },
    staleTime: 60_000,
  });

  const plans = (allPlans ?? []).filter(p => p.code.startsWith(prefix));

  const handleTrial = async () => {
    setStartingTrial(true);
    try {
      const res = await fetch('/api/users/me/onboarding/trial', { method: 'POST' });
      const json = await res.json();
      if (!json.success) {
        toast({ title: json.error ?? 'Ошибка активации триала', variant: 'destructive' });
        return;
      }
      toast({ title: '14-дневный Pro-триал активирован!' });
      router.push('/');
    } catch {
      toast({ title: 'Ошибка сети', variant: 'destructive' });
    } finally {
      setStartingTrial(false);
    }
  };

  const handleBuy = (planId: string) => {
    router.push(`/settings/subscription/checkout/${planId}`);
  };

  const handleFree = () => {
    router.push('/');
  };

  return (
    <div className="mx-auto max-w-3xl py-12 px-4">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold">Выберите тариф</h1>
        <p className="mt-2 text-muted-foreground">
          14 дней Pro — бесплатно. Карта не нужна.
        </p>
      </div>

      <div className="mb-6">
        <Button
          onClick={handleTrial}
          disabled={startingTrial}
          size="lg"
          className="w-full bg-gradient-to-r from-primary to-primary/80"
        >
          {startingTrial ? 'Активация...' : '🚀 Начать 14 дней Pro бесплатно'}
        </Button>
        <p className="text-center text-xs text-muted-foreground mt-2">
          Карта не нужна. После триала автоматически переходите на FREE.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 mb-8">
        {plans.map((plan) => (
          <Card
            key={plan.id}
            className={plan.isFeatured ? 'border-primary shadow-md' : ''}
          >
            {plan.isFeatured && (
              <div className="px-4 pt-3">
                <Badge variant="default" className="text-xs">Популярный</Badge>
              </div>
            )}
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">{plan.name}</CardTitle>
              <CardDescription>
                <span className="text-2xl font-bold text-foreground">
                  {(plan.priceMonthlyRub / 100).toLocaleString('ru-RU')} ₽
                </span>
                <span className="text-sm">/мес</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <ul className="space-y-1">
                {plan.features.slice(0, 6).map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                    {FEATURE_LABELS[f] ?? f}
                  </li>
                ))}
              </ul>
              <Button
                onClick={() => handleBuy(plan.id)}
                variant={plan.isFeatured ? 'default' : 'outline'}
                className="w-full"
              >
                Купить
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="text-center">
        <button
          type="button"
          onClick={handleFree}
          className="text-sm text-muted-foreground hover:text-foreground underline"
        >
          Пока остаться на бесплатном плане
        </button>
      </div>
    </div>
  );
}
