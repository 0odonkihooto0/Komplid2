'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ProfessionalRole } from '@prisma/client';
import { RoleSelector } from '@/components/onboarding/RoleSelector';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/useToast';

export default function OnboardingRolePage() {
  const router = useRouter();
  const [selected, setSelected] = useState<ProfessionalRole | null>(null);
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    if (!selected) {
      toast({ title: 'Выберите вашу роль', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/users/me/onboarding', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ professionalRole: selected }),
      });
      const json = await res.json();
      if (!json.success) {
        toast({ title: json.error ?? 'Ошибка', variant: 'destructive' });
        return;
      }
      router.push('/onboarding/plan');
    } catch {
      toast({ title: 'Ошибка сети', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl py-12 px-4">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold">Кто вы?</h1>
        <p className="mt-2 text-muted-foreground">
          Мы настроим интерфейс под ваши задачи
        </p>
      </div>

      <RoleSelector selected={selected} onSelect={setSelected} />

      <div className="mt-8 flex justify-end">
        <Button onClick={handleContinue} disabled={!selected || loading} size="lg">
          {loading ? 'Сохранение...' : 'Продолжить →'}
        </Button>
      </div>
    </div>
  );
}
