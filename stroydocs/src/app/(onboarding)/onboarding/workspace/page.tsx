'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { OnboardingShell } from '@/components/onboarding/OnboardingShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/useToast';

const SPECIALIZATIONS = [
  'Общестроительные работы',
  'Монолитные работы',
  'Отделочные работы',
  'Сантехника',
  'Электромонтаж',
  'Вентиляция и кондиционирование',
  'Кровля',
  'Фасадные работы',
  'Инженерные системы',
  'Снос и демонтаж',
];

export default function OnboardingWorkspacePage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [name, setName] = useState('');
  const [inn, setInn] = useState('');
  const [region, setRegion] = useState('');
  const [selectedSpecs, setSelectedSpecs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const intent = (session?.user as { intent?: string })?.intent;
  const isBrigade = intent === 'CONTRACTOR_INDIVIDUAL';

  const toggleSpec = (spec: string) => {
    setSelectedSpecs((prev) =>
      prev.includes(spec) ? prev.filter((s) => s !== spec) : [...prev, spec]
    );
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast({ title: 'Укажите название', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/onboarding/create-workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          inn: inn.trim() || undefined,
          region: region.trim() || undefined,
          specializations: selectedSpecs,
        }),
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
    <OnboardingShell step={2}>
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold">
          {isBrigade ? 'Как называется ваша бригада?' : 'Как называется ваша компания?'}
        </h1>
        <p className="mt-2 text-muted-foreground">
          Создадим рабочее пространство для вас и вашей команды
        </p>
      </div>

      <div className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="name">
            {isBrigade ? 'Название бригады' : 'Название компании'}
            <span className="text-destructive ml-1">*</span>
          </Label>
          <Input
            id="name"
            placeholder={isBrigade ? 'Бригада Иванова' : 'ООО Стройка+'}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="inn">ИНН <span className="text-muted-foreground text-xs">(опционально)</span></Label>
          <Input
            id="inn"
            placeholder="1234567890"
            value={inn}
            onChange={(e) => setInn(e.target.value.replace(/\D/g, '').slice(0, 12))}
            inputMode="numeric"
          />
          <p className="text-xs text-muted-foreground">
            Укажите ИНН — мы подтянем данные автоматически
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="region">Регион <span className="text-muted-foreground text-xs">(опционально)</span></Label>
          <Input
            id="region"
            placeholder="Москва"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Специализации <span className="text-muted-foreground text-xs">(можно выбрать несколько)</span></Label>
          <div className="flex flex-wrap gap-2">
            {SPECIALIZATIONS.map((spec) => (
              <button
                key={spec}
                type="button"
                onClick={() => toggleSpec(spec)}
                className={[
                  'rounded-full border px-3 py-1 text-xs transition-colors',
                  selectedSpecs.includes(spec)
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border hover:border-primary/50',
                ].join(' ')}
              >
                {spec}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8 flex justify-end">
        <Button
          onClick={handleSubmit}
          disabled={!name.trim() || loading}
          size="lg"
          className="min-w-40"
        >
          {loading ? 'Создание...' : 'Создать пространство →'}
        </Button>
      </div>
    </OnboardingShell>
  );
}
