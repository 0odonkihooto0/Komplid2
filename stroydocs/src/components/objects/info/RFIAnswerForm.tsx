'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface Props {
  onAnswer: (response: string) => void;
  isPending: boolean;
}

export function RFIAnswerForm({ onAnswer, isPending }: Props) {
  const [response, setResponse] = useState('');
  const isValid = response.trim().length >= 5;

  const handleSubmit = () => {
    if (!isValid) return;
    onAnswer(response.trim());
  };

  return (
    <div className="space-y-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
      <Label className="text-sm font-medium text-blue-900">Ваш ответ</Label>
      <Textarea
        rows={4}
        placeholder="Введите ответ на запрос (не менее 5 символов)..."
        value={response}
        onChange={(e) => setResponse(e.target.value)}
        className="bg-white"
      />
      {response.trim().length > 0 && !isValid && (
        <p className="text-xs text-destructive">Ответ должен содержать не менее 5 символов</p>
      )}
      <Button
        size="sm"
        disabled={!isValid || isPending}
        onClick={handleSubmit}
      >
        Ответить
      </Button>
    </div>
  );
}
