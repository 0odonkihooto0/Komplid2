'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { formatDate } from '@/utils/format';
import { PhotoGallery } from '@/components/modules/photos/PhotoGallery';
import { PhotoAttachButton } from '@/components/modules/photos/PhotoAttachButton';
import { useDefect, useChangeDefectStatus } from './useDefects';
import type { DefectItem } from './useDefects';
import type { DefectStatus } from '@prisma/client';

const STATUS_TRANSITIONS: Record<DefectStatus, { status: DefectStatus; label: string }[]> = {
  OPEN:        [{ status: 'IN_PROGRESS', label: 'Взять в работу' }, { status: 'REJECTED', label: 'Отклонить' }],
  IN_PROGRESS: [{ status: 'RESOLVED', label: 'Отметить устранённым' }, { status: 'OPEN', label: 'Вернуть в открытые' }],
  RESOLVED:    [{ status: 'CONFIRMED', label: 'Подтвердить устранение' }, { status: 'IN_PROGRESS', label: 'Вернуть в работу' }],
  CONFIRMED:   [],
  REJECTED:    [{ status: 'OPEN', label: 'Переоткрыть' }],
};

const STATUS_LABELS: Record<DefectStatus, string> = {
  OPEN: 'Открыт', IN_PROGRESS: 'В работе', RESOLVED: 'Устранён',
  CONFIRMED: 'Подтверждён', REJECTED: 'Отклонён',
};

interface Props {
  defect: DefectItem;
  projectId: string;
}

export function DefectCard({ defect: initialDefect, projectId }: Props) {
  const [comment, setComment] = useState('');
  const [showCommentFor, setShowCommentFor] = useState<DefectStatus | null>(null);

  // Используем свежие данные из кэша (карточка с историей)
  const { data: defect = initialDefect } = useDefect(projectId, initialDefect.id);
  const changeStatus = useChangeDefectStatus(projectId);

  const handleStatusChange = (status: DefectStatus) => {
    if (showCommentFor === status) {
      // Подтверждаем смену с комментарием
      changeStatus.mutate({ defectId: defect.id, status, comment: comment || undefined });
      setShowCommentFor(null);
      setComment('');
    } else {
      setShowCommentFor(status);
    }
  };

  const transitions = STATUS_TRANSITIONS[defect.status] ?? [];

  return (
    <div className="space-y-4">
      {/* Описание */}
      {defect.description && (
        <p className="text-sm text-muted-foreground">{defect.description}</p>
      )}

      {defect.normativeRef && (
        <p className="text-sm">
          <span className="text-muted-foreground">Норматив: </span>
          <strong>{defect.normativeRef}</strong>
        </p>
      )}

      {/* Смена статуса */}
      {transitions.length > 0 && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {transitions.map((t) => (
              <Button
                key={t.status}
                size="sm"
                variant={showCommentFor === t.status ? 'default' : 'outline'}
                onClick={() => handleStatusChange(t.status)}
                disabled={changeStatus.isPending}
              >
                {t.label}
              </Button>
            ))}
          </div>
          {showCommentFor && (
            <div className="space-y-2">
              <Textarea
                placeholder="Комментарий (необязательно)"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={2}
                className="text-sm"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={() => handleStatusChange(showCommentFor)} disabled={changeStatus.isPending}>
                  Подтвердить
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setShowCommentFor(null); setComment(''); }}>
                  Отмена
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <Separator />

      {/* Фотографии дефекта */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-sm font-medium">Фотографии</h4>
          <PhotoAttachButton entityType="DEFECT" entityId={defect.id} />
        </div>
        <PhotoGallery entityType="DEFECT" entityId={defect.id} />
      </div>

      {/* История изменений */}
      {'comments' in defect && Array.isArray((defect as DefectItem & { comments?: unknown[] }).comments) && (defect as DefectItem & { comments?: unknown[] }).comments!.length > 0 && (
        <>
          <Separator />
          <div>
            <h4 className="mb-2 text-sm font-medium">История</h4>
            <div className="space-y-2">
              {(defect as DefectItem & { comments: Array<{ id: string; text: string; statusChange?: DefectStatus; createdAt: string; author: { firstName: string; lastName: string } }> }).comments.map((c) => (
                <div key={c.id} className="flex gap-2 text-xs">
                  <span className="text-muted-foreground whitespace-nowrap">
                    {formatDate(c.createdAt)} · {c.author.lastName} {c.author.firstName}
                  </span>
                  <span>
                    {c.statusChange && (
                      <Badge variant="outline" className="mr-1 text-xs py-0">
                        {STATUS_LABELS[c.statusChange as DefectStatus]}
                      </Badge>
                    )}
                    {c.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
