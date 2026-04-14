'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/useToast';
import type { ExpertiseStatus } from '@prisma/client';

interface Props {
  projectId: string;
  docId: string;
  expertiseStatus: ExpertiseStatus | null;
  expertiseDate: string | null;
  expertiseComment: string | null;
}

const EXPERTISE_STATUS_LABELS: Record<ExpertiseStatus, string> = {
  NOT_SUBMITTED:      'Не подано',
  IN_PROCESS:         'На экспертизе',
  APPROVED_POSITIVE:  'Положительное заключение',
  APPROVED_NEGATIVE:  'Отрицательное заключение',
  REVISION_REQUIRED:  'На доработку',
};

const EXPERTISE_STATUS_CLASSES: Record<ExpertiseStatus, string> = {
  NOT_SUBMITTED:      'text-gray-600',
  IN_PROCESS:         'text-blue-600',
  APPROVED_POSITIVE:  'text-green-600',
  APPROVED_NEGATIVE:  'text-red-600',
  REVISION_REQUIRED:  'text-orange-600',
};

export function DesignDocExpertise({ projectId, docId, expertiseStatus, expertiseDate, expertiseComment }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Локальное состояние формы — инициализируем из пропсов
  const [status, setStatus] = useState<ExpertiseStatus | ''>(expertiseStatus ?? '');
  const [date, setDate] = useState(
    expertiseDate ? expertiseDate.slice(0, 10) : ''
  );
  const [comment, setComment] = useState(expertiseComment ?? '');

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(
        `/api/objects/${projectId}/design-docs/${docId}/expertise`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            expertiseStatus: status || null,
            expertiseDate: date ? new Date(date).toISOString() : null,
            expertiseComment: comment.trim() || null,
          }),
        }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error((err as { error?: string }).error ?? 'Ошибка сохранения экспертизы');
      }
    },
    onSuccess: () => {
      toast({ title: 'Данные экспертизы сохранены' });
      queryClient.invalidateQueries({ queryKey: ['design-doc', docId] });
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  return (
    <div className="space-y-4 rounded-md border p-4">
      <h3 className="text-sm font-medium">Государственная экспертиза</h3>

      <div className="space-y-1.5">
        <Label htmlFor="expertiseStatus">Статус экспертизы</Label>
        <Select
          value={status || 'NONE'}
          onValueChange={(v) => setStatus(v === 'NONE' ? '' : v as ExpertiseStatus)}
        >
          <SelectTrigger id="expertiseStatus">
            <SelectValue placeholder="Выберите статус" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="NONE">— Не указано —</SelectItem>
            {(Object.keys(EXPERTISE_STATUS_LABELS) as ExpertiseStatus[]).map((s) => (
              <SelectItem key={s} value={s}>
                <span className={EXPERTISE_STATUS_CLASSES[s]}>
                  {EXPERTISE_STATUS_LABELS[s]}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="expertiseDate">Дата заключения</Label>
        <Input
          id="expertiseDate"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="expertiseComment">Комментарий</Label>
        <Textarea
          id="expertiseComment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Реквизиты заключения, замечания..."
          rows={4}
        />
      </div>

      <Button
        onClick={() => saveMutation.mutate()}
        disabled={saveMutation.isPending}
        size="sm"
      >
        {saveMutation.isPending ? 'Сохранение...' : 'Сохранить'}
      </Button>
    </div>
  );
}
