'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Check } from 'lucide-react';
import { OnboardingShell } from '@/components/onboarding/OnboardingShell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/useToast';

interface Plan {
  id: string;
  code: string;
  name: string;
  priceMonthlyRub: number;
  features: string[];
  isFeatured: boolean;
  trialDays: number;
}

// Маппинг intent → рекомендуемый планкод
const INTENT_PLAN: Record<string, string> = {
  ESTIMATOR: 'smetchik_studio',
  PTO_ENGINEER: 'id_master',
  CONTRACTOR_INDIVIDUAL: 'foreman_journal',
  CONTRACTOR_GENERAL: 'id_master',
  CONTRACTOR_SUB: 'foreman_journal',
  CONSTRUCTION_SUPERVISOR: 'id_master',
};

const FEATURE_LABELS: Record<string, string> = {
  estimates: 'Сметы',
  estimates_import: 'Импорт смет (Excel/PDF)',
  estimates_compare_basic: 'Сравнение версий',
  execution_docs: 'Исполнительная документация',
  aosr_generation: 'Генерация АОСР',
  ks2_ks3_generation: 'Генерация КС-2/КС-3',
  journals_basic: 'Журналы (базовые)',
  journals_full: 'Журналы (полные)',
  mobile_pwa: 'Мобильное приложение',
  photos_gps: 'Фото с GPS',
  defects_lite: 'Дефектовка',
  approval_routes: 'Маршруты согласования',
  AI_COMPLIANCE_CHECK: 'AI-проверка документов',
  AI_SMETA_IMPORT: 'AI-импорт смет',
};

// Читаем preset из cookie signup_context (client-side, httpOnly=false)
function getPresetFromCookie(): { plan?: string; intent?: string; referredByCode?: string } {
  try {
    if (typeof document === 'undefined') return {};
    const raw = document.cookie
      .split('; ')
      .find((c) => c.startsWith('signup_context='))
      ?.split('=')
      .slice(1)
      .join('=');
    if (!raw) return {};
    return JSON.parse(decodeURIComponent(raw));
  } catch {
    return {};
  }
}

export default function OnboardingPlanPage() {
  const router = useRouter();
  const [startingTrial, setStartingTrial] = useState(false);
  const [skipping, setSkipping] = useState(false);

  const cookieCtx = getPresetFromCookie();
  const suggestedPlanPrefix = cookieCtx.plan ?? INTENT_PLAN[cookieCtx.intent ?? ''] ?? '';
  const referredByCode = cookieCtx.referredByCode;

  const { data: allPlans = [] } = useQuery<Plan[]>({
    queryKey: ['subscription-plans'],
    queryFn: async () => {
      const r = await fetch('/api/subscription-plans');
      const json = await r.json();
      return json.success ? json.data : [];
    },
    staleTime: 60_000,
  });

  // Suggested план — сверху, остальные — ниже
  const suggestedPlan = allPlans.find(
    (p) => suggestedPlanPrefix && p.code.startsWith(suggestedPlanPrefix) && p.isFeatured
  );
  const otherPlans = allPlans.filter(
    (p) => !suggestedPlan || p.id !== suggestedPlan.id
  ).filter((p) => !p.code.includes('corporate')); // corporate — отдельно

  const handleTrial = async (planCode?: string) => {
    setStartingTrial(true);
    try {
      const res = await fetch('/api/onboarding/start-trial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planCode }),
      });
      const json = await res.json();
      if (!json.success) {
        toast({ title: json.error ?? 'Ошибка активации', variant: 'destructive' });
        return;
      }
      const days = json.data?.trialDays ?? 7;
      toast({ title: `${days}-дневный триал активирован!` });
      router.push('/onboarding/invite');
    } catch {
      toast({ title: 'Ошибка сети', variant: 'destructive' });
    } finally {
      setStartingTrial(false);
    }
  };

  const handleSkip = async () => {
    setSkipping(true);
    try {
      await fetch('/api/onboarding/start-trial', { method: 'DELETE' });
      router.push('/onboarding/invite');
    } catch {
      router.push('/onboarding/invite');
    } finally {
      setSkipping(false);
    }
  };

  const trialDays = referredByCode ? 37 : 7;

  return (
    <OnboardingShell step={3}>
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold">Выберите тариф</h1>
        <p className="mt-2 text-muted-foreground">
          {referredByCode
            ? `По реферальному коду — ${trialDays} дней бесплатно`
            : `${trialDays} дней бесплатно. Карта не нужна.`}
        </p>
      </div>

      {suggestedPlan && (
        <div className="mb-6">
          <p className="text-xs font-medium text-primary mb-2 uppercase tracking-wide">Рекомендуется для вас</p>
          <Card className="border-primary shadow-md">
            <div className="px-4 pt-3">
              <Badge variant="default" className="text-xs">Рекомендован</Badge>
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">{suggestedPlan.name}</CardTitle>
              <CardDescription>
                <span className="text-2xl font-bold text-foreground">
                  {(suggestedPlan.priceMonthlyRub / 100).toLocaleString('ru-RU')} ₽
                </span>
                <span className="text-sm">/мес</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <ul className="space-y-1">
                {suggestedPlan.features.slice(0, 6).map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                    {FEATURE_LABELS[f] ?? f}
                  </li>
                ))}
              </ul>
              <Button
                onClick={() => handleTrial(suggestedPlan.code)}
                disabled={startingTrial}
                className="w-full"
                size="lg"
              >
                {startingTrial ? 'Активация...' : `Начать ${trialDays} дней бесплатно`}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {!suggestedPlan && (
        <div className="mb-6">
          <Button
            onClick={() => handleTrial()}
            disabled={startingTrial}
            size="lg"
            className="w-full"
          >
            {startingTrial ? 'Активация...' : `🚀 Начать ${trialDays} дней бесплатно`}
          </Button>
          <p className="text-center text-xs text-muted-foreground mt-2">
            Карта не нужна. После триала — Free-план.
          </p>
        </div>
      )}

      {otherPlans.length > 0 && (
        <div className="mb-6">
          <p className="text-sm font-medium text-muted-foreground mb-3">Другие тарифы:</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {otherPlans.slice(0, 4).map((plan) => (
              <Card key={plan.id} className="cursor-pointer hover:border-primary transition-colors">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{plan.name}</CardTitle>
                  <CardDescription>
                    <span className="text-lg font-semibold text-foreground">
                      {(plan.priceMonthlyRub / 100).toLocaleString('ru-RU')} ₽
                    </span>
                    <span className="text-xs">/мес</span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => handleTrial(plan.code)}
                    disabled={startingTrial}
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    Попробовать
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div className="text-center">
        <button
          type="button"
          onClick={handleSkip}
          disabled={skipping}
          className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-2"
        >
          Продолжить без подписки (Free)
        </button>
      </div>
    </OnboardingShell>
  );
}
