'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { OnboardingShell } from '@/components/onboarding/OnboardingShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/useToast';

const CONSTRUCTION_TYPES = [
  'Квартира / Апартаменты',
  'Частный дом',
  'Коммерческий объект',
  'Промышленный объект',
  'Инфраструктурный объект',
  'Другое',
];

export default function OnboardingFirstProjectPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [constructionType, setConstructionType] = useState('Другое');
  const [startDate, setStartDate] = useState('');
  const [plannedEndDate, setPlannedEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [skipping, setSkipping] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast({ title: 'Укажите название объекта', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/onboarding/create-first-project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          address: address.trim() || undefined,
          constructionType,
          startDate: startDate || undefined,
          plannedEndDate: plannedEndDate || undefined,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        toast({ title: json.error ?? 'Ошибка', variant: 'destructive' });
        return;
      }
      router.push('/onboarding/done');
    } catch {
      toast({ title: 'Ошибка сети', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    setSkipping(true);
    try {
      await fetch('/api/onboarding/create-first-project', { method: 'DELETE' });
    } finally {
      router.push('/onboarding/done');
    }
  };

  return (
    <OnboardingShell step={5} canSkip skipTo="/onboarding/done">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold">Создайте первый объект</h1>
        <p className="mt-2 text-muted-foreground">
          Объект — центр всей документации в Komplid
        </p>
      </div>

      <div className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="name">
            Название объекта <span className="text-destructive">*</span>
          </Label>
          <Input
            id="name"
            placeholder="Дом на Ленина 10"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="address">Адрес <span className="text-muted-foreground text-xs">(опционально)</span></Label>
          <Input
            id="address"
            placeholder="г. Москва, ул. Ленина, д. 10"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Тип объекта</Label>
          <Select value={constructionType} onValueChange={setConstructionType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CONSTRUCTION_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="startDate">Дата начала</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="endDate">Плановая сдача</Label>
            <Input
              id="endDate"
              type="date"
              value={plannedEndDate}
              onChange={(e) => setPlannedEndDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mt-8">
        <button
          type="button"
          onClick={handleSkip}
          disabled={skipping}
          className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-2"
        >
          Создам позже
        </button>
        <Button
          onClick={handleSubmit}
          disabled={!name.trim() || loading}
          size="lg"
          className="min-w-40"
        >
          {loading ? 'Создание...' : 'Создать объект →'}
        </Button>
      </div>
    </OnboardingShell>
  );
}
