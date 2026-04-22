'use client';

import { useState } from 'react';
import { CancellationReasonCode } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

const REASONS: { value: CancellationReasonCode; label: string; hint?: string }[] = [
  { value: 'TOO_EXPENSIVE', label: 'Слишком дорого' },
  { value: 'NOT_USING', label: 'Не использую достаточно', hint: 'Сервис не вписался в рабочий процесс' },
  { value: 'MISSING_FEATURES', label: 'Не хватает нужных функций' },
  { value: 'COMPETITOR', label: 'Перехожу к другому сервису' },
  { value: 'TECHNICAL_ISSUES', label: 'Технические проблемы' },
  { value: 'TEMPORARY', label: 'Временная пауза, вернусь позже' },
  { value: 'OTHER', label: 'Другая причина' },
];

interface Props {
  onNext: (reason: CancellationReasonCode, feedback?: string) => void;
}

export function ReasonForm({ onNext }: Props) {
  const [selected, setSelected] = useState<CancellationReasonCode | null>(null);
  const [feedback, setFeedback] = useState('');

  const handleSubmit = () => {
    if (!selected) return;
    onNext(selected, feedback.trim() || undefined);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Почему вы хотите отменить подписку?</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Ваш ответ поможет нам стать лучше
        </p>
      </div>

      <div className="space-y-2">
        {REASONS.map((r) => (
          <label
            key={r.value}
            className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
              selected === r.value
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-muted-foreground/40'
            }`}
          >
            <input
              type="radio"
              name="reason"
              value={r.value}
              checked={selected === r.value}
              onChange={() => setSelected(r.value)}
              className="mt-0.5 accent-primary"
            />
            <span className="text-sm">
              <span className="font-medium">{r.label}</span>
              {r.hint && <span className="block text-muted-foreground">{r.hint}</span>}
            </span>
          </label>
        ))}
      </div>

      {selected === 'MISSING_FEATURES' && (
        <div className="space-y-1.5">
          <Label htmlFor="missing-features">Какие функции вам не хватает?</Label>
          <Textarea
            id="missing-features"
            placeholder="Опишите, что хотели бы видеть в сервисе…"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={3}
            maxLength={1000}
          />
        </div>
      )}

      <Button onClick={handleSubmit} disabled={!selected} className="w-full">
        Продолжить
      </Button>
    </div>
  );
}
