'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { CheckCircle2, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CheckItem {
  label: string;
  done: boolean;
}

// Читаем шаги онбординга из cookie или session для сводного чеклиста
function getCompletedSteps(): CheckItem[] {
  return [
    { label: 'Аккаунт создан', done: true },
    { label: 'Рабочее пространство создано', done: true },
    { label: 'Тариф выбран', done: true },
    { label: 'Команда приглашена', done: true },
    { label: 'Первый объект создан', done: true },
  ];
}

export default function OnboardingDonePage() {
  const completed = useRef(false);
  const { update } = useSession();

  useEffect(() => {
    if (completed.current) return;
    completed.current = true;

    // Отмечаем онбординг завершённым и обновляем JWT
    fetch('/api/onboarding/complete', { method: 'POST' })
      .then((r) => r.json())
      .then(() => update({ onboardingCompleted: true }))
      .catch(() => null);
  }, [update]);

  const steps = getCompletedSteps();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12 text-center">
      {/* Иконка успеха */}
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
        <CheckCircle2 className="h-12 w-12 text-primary" />
      </div>

      <h1 className="text-3xl font-bold mb-2">Всё готово!</h1>
      <p className="text-muted-foreground mb-10 max-w-sm">
        Komplid настроен под вас. Начните работу прямо сейчас.
      </p>

      {/* Чеклист */}
      <div className="mb-10 w-full max-w-xs text-left space-y-3">
        {steps.map((s) => (
          <div key={s.label} className="flex items-center gap-3">
            {s.done ? (
              <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
            ) : (
              <Circle className="h-5 w-5 shrink-0 text-muted-foreground" />
            )}
            <span className={s.done ? 'text-foreground' : 'text-muted-foreground line-through'}>
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {/* Рекомендуемые следующие шаги */}
      <div className="mb-10 w-full max-w-sm text-left">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
          Рекомендуем сделать следующим
        </h3>
        <div className="space-y-2">
          {[
            { label: 'Загрузите первое фото на объект', href: '/objects' },
            { label: 'Создайте или импортируйте смету', href: '/objects' },
            { label: 'Настройте уведомления', href: '/settings' },
          ].map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="flex items-center justify-between rounded-lg border p-3 text-sm hover:border-primary hover:bg-primary/5 transition-colors"
            >
              <span>{item.label}</span>
              <span className="text-primary">→</span>
            </Link>
          ))}
        </div>
      </div>

      <Button asChild size="lg" className="min-w-52">
        <Link href="/objects">Перейти в Komplid →</Link>
      </Button>
    </div>
  );
}
