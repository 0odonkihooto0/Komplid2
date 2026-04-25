'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { UserIntent, UserAccountType } from '@prisma/client';
import { OnboardingShell } from '@/components/onboarding/OnboardingShell';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/useToast';

interface IntentOption {
  value: UserIntent;
  label: string;
  description: string;
  icon: string;
}

const INTENT_OPTIONS: IntentOption[] = [
  { value: 'CONTRACTOR_GENERAL', label: 'Генподрядчик', description: 'Полный цикл: от сметы до сдачи', icon: '🏗️' },
  { value: 'CONTRACTOR_SUB', label: 'Субподрядчик', description: 'Выполняю отдельные виды работ', icon: '🔧' },
  { value: 'CONTRACTOR_INDIVIDUAL', label: 'Прораб / Бригадир', description: 'Веду журнал работ, фото, акты', icon: '👷' },
  { value: 'ESTIMATOR', label: 'Сметчик', description: 'Составляю сметы быстро и профессионально', icon: '📊' },
  { value: 'PTO_ENGINEER', label: 'ПТО / Инженер по ИД', description: 'Готовлю документацию к сдаче', icon: '📋' },
  { value: 'CUSTOMER_PRIVATE', label: 'Частный заказчик', description: 'Строю дом или делаю ремонт', icon: '🏠' },
  { value: 'CONSTRUCTION_SUPERVISOR', label: 'Технадзор', description: 'Проверяю качество работ на объектах', icon: '🔍' },
  { value: 'UNKNOWN', label: 'Просто смотрю', description: 'Определюсь позже', icon: '👀' },
];

interface AccountTypeOption {
  value: UserAccountType;
  label: string;
}

const ACCOUNT_TYPE_OPTIONS: AccountTypeOption[] = [
  { value: 'INDIVIDUAL', label: 'Физлицо' },
  { value: 'SELF_EMPLOYED', label: 'Самозанятый' },
  { value: 'ENTREPRENEUR', label: 'ИП' },
  { value: 'LEGAL_ENTITY', label: 'Юрлицо (ООО/АО)' },
];

export default function OnboardingRolePage() {
  const router = useRouter();
  const [intent, setIntent] = useState<UserIntent | null>(null);
  const [accountType, setAccountType] = useState<UserAccountType>('INDIVIDUAL');
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    if (!intent) {
      toast({ title: 'Выберите вашу роль', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/onboarding/set-intent', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intent, accountType }),
      });
      const json = await res.json();
      if (!json.success) {
        toast({ title: json.error ?? 'Ошибка', variant: 'destructive' });
        return;
      }
      // Частный заказчик сразу на тариф (без workspace)
      if (intent === 'CUSTOMER_PRIVATE') {
        router.push('/onboarding/plan');
      } else {
        router.push('/onboarding/workspace');
      }
    } catch {
      toast({ title: 'Ошибка сети', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <OnboardingShell step={1}>
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold">Расскажите о себе</h1>
        <p className="mt-2 text-muted-foreground">
          Мы настроим Komplid под ваши задачи
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-8">
        {INTENT_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setIntent(opt.value)}
            className={[
              'flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-center transition-all hover:border-primary',
              intent === opt.value
                ? 'border-primary bg-primary/5 shadow-sm'
                : 'border-border',
              opt.value === 'UNKNOWN' ? 'col-span-2 sm:col-span-4' : '',
            ].join(' ')}
          >
            <span className="text-3xl">{opt.icon}</span>
            <span className="text-sm font-medium leading-tight">{opt.label}</span>
            <span className="text-xs text-muted-foreground leading-tight hidden sm:block">
              {opt.description}
            </span>
          </button>
        ))}
      </div>

      <div className="mb-8">
        <p className="text-sm font-medium mb-3 text-muted-foreground">Формат работы:</p>
        <div className="flex flex-wrap gap-2">
          {ACCOUNT_TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setAccountType(opt.value)}
              className={[
                'rounded-full border px-4 py-1.5 text-sm transition-colors',
                accountType === opt.value
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border hover:border-primary/50',
              ].join(' ')}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={handleContinue}
          disabled={!intent || loading}
          size="lg"
          className="min-w-40"
        >
          {loading ? 'Сохранение...' : 'Продолжить →'}
        </Button>
      </div>
    </OnboardingShell>
  );
}
