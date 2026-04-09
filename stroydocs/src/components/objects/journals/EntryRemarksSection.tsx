'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Plus, Trash2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  REMARK_STATUS_LABELS,
  REMARK_STATUS_CLASS,
} from './journal-constants';
import type { RemarkItem } from './journal-constants';
import type { UpdateRemarkInput } from '@/lib/validations/journal-schemas';

interface Props {
  remarks: RemarkItem[];
  isActive: boolean;
  onAddClick: () => void;
  onUpdateRemark: (remarkId: string, data: UpdateRemarkInput) => void;
  onDeleteRemark: (remarkId: string) => void;
  isPending: boolean;
}

const displayName = (u: { firstName: string | null; lastName: string | null }) =>
  [u.lastName, u.firstName].filter(Boolean).join(' ') || '—';

// Следующий статус замечания
const NEXT_STATUS: Record<string, string> = {
  OPEN: 'IN_PROGRESS',
  IN_PROGRESS: 'RESOLVED',
};

const NEXT_STATUS_LABEL: Record<string, string> = {
  OPEN: 'В работу',
  IN_PROGRESS: 'Решено',
};

export function EntryRemarksSection({
  remarks,
  isActive,
  onAddClick,
  onUpdateRemark,
  onDeleteRemark,
  isPending,
}: Props) {
  // Для ввода резолюции при переходе в RESOLVED
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolution, setResolution] = useState('');

  function handleAdvanceStatus(remark: RemarkItem) {
    const next = NEXT_STATUS[remark.status];
    if (!next) return;

    // При переходе в RESOLVED — показать поле резолюции
    if (next === 'RESOLVED') {
      setResolvingId(remark.id);
      setResolution('');
      return;
    }

    onUpdateRemark(remark.id, { status: next as UpdateRemarkInput['status'] });
  }

  function handleResolve(remarkId: string) {
    onUpdateRemark(remarkId, {
      status: 'RESOLVED',
      resolution: resolution.trim() || undefined,
    });
    setResolvingId(null);
    setResolution('');
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">
          Замечания ({remarks.length})
        </h3>
        {isActive && (
          <Button size="sm" variant="outline" onClick={onAddClick}>
            <Plus className="mr-1 h-4 w-4" />
            Добавить
          </Button>
        )}
      </div>

      {remarks.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          Замечаний нет
        </p>
      ) : (
        <div className="space-y-3">
          {remarks.map((r) => (
            <div key={r.id} className="rounded-lg border p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={REMARK_STATUS_CLASS[r.status] ?? ''} variant="secondary">
                    {REMARK_STATUS_LABELS[r.status] ?? r.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {displayName(r.author)} &middot;{' '}
                    {format(new Date(r.createdAt), 'd MMM yyyy', { locale: ru })}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {/* Кнопка перехода статуса */}
                  {NEXT_STATUS[r.status] && isActive && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      onClick={() => handleAdvanceStatus(r)}
                      disabled={isPending}
                    >
                      <ArrowRight className="mr-1 h-3 w-3" />
                      {NEXT_STATUS_LABEL[r.status]}
                    </Button>
                  )}
                  {/* Удаление — только OPEN */}
                  {r.status === 'OPEN' && isActive && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs text-destructive"
                      onClick={() => onDeleteRemark(r.id)}
                      disabled={isPending}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>

              <p className="text-sm">{r.text}</p>

              {/* Срок устранения */}
              {r.deadline && (
                <p className="text-xs text-muted-foreground">
                  Срок: {format(new Date(r.deadline), 'd MMM yyyy', { locale: ru })}
                </p>
              )}

              {/* Резолюция */}
              {r.status === 'RESOLVED' && r.resolution && (
                <div className="text-xs bg-green-50 rounded p-2">
                  <span className="font-medium">Решение:</span> {r.resolution}
                  {r.resolvedBy && (
                    <span className="text-muted-foreground">
                      {' '}— {displayName(r.resolvedBy)}
                    </span>
                  )}
                </div>
              )}

              {/* Поле ввода резолюции при переходе в RESOLVED */}
              {resolvingId === r.id && (
                <div className="flex gap-2 items-center">
                  <Input
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                    placeholder="Описание решения (опционально)"
                    className="text-sm h-8"
                  />
                  <Button size="sm" className="h-8" onClick={() => handleResolve(r.id)} disabled={isPending}>
                    Решить
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8"
                    onClick={() => setResolvingId(null)}
                  >
                    Отмена
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
