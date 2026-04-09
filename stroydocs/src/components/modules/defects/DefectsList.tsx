'use client';

import { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronRight, MapPin, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/utils/format';
import { cn } from '@/lib/utils';
import { DefectCard } from './DefectCard';
import type { DefectItem } from './useDefects';
import type { DefectStatus, DefectCategory } from '@prisma/client';

const STATUS_LABELS: Record<DefectStatus, string> = {
  OPEN:        'Открыт',
  IN_PROGRESS: 'В работе',
  RESOLVED:    'Устранён',
  CONFIRMED:   'Подтверждён',
  REJECTED:    'Отклонён',
};

const STATUS_VARIANT: Record<DefectStatus, 'destructive' | 'secondary' | 'outline' | 'default'> = {
  OPEN:        'destructive',
  IN_PROGRESS: 'secondary',
  RESOLVED:    'outline',
  CONFIRMED:   'default',
  REJECTED:    'secondary',
};

const CATEGORY_LABELS: Record<DefectCategory, string> = {
  QUALITY_VIOLATION:    'Нарушение ОТ',
  TECHNOLOGY_VIOLATION: 'Нарушение технологии',
  FIRE_SAFETY:          'Пожарная безопасность',
  ECOLOGY:              'Экология',
  DOCUMENTATION:        'Документация',
  OTHER:                'Прочее',
};

interface Props {
  defects: DefectItem[];
  projectId: string;
  onDelete?: (id: string) => void;
}

export function DefectsList({ defects, projectId, onDelete }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (defects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <AlertTriangle className="mb-3 h-8 w-8 opacity-30" />
        <p className="text-sm">Дефекты не найдены</p>
      </div>
    );
  }

  const now = new Date();

  return (
    <div className="divide-y rounded-md border">
      {defects.map((defect) => {
        const isExpanded = expandedId === defect.id;
        const isOverdue =
          defect.deadline &&
          new Date(defect.deadline) < now &&
          (defect.status === 'OPEN' || defect.status === 'IN_PROGRESS');

        return (
          <div key={defect.id} className={cn(isOverdue && 'bg-red-50/50')}>
            {/* Строка списка */}
            <div
              className="flex cursor-pointer items-start gap-3 px-4 py-3 hover:bg-muted/40"
              onClick={() => setExpandedId(isExpanded ? null : defect.id)}
            >
              {isExpanded ? (
                <ChevronDown className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
              ) : (
                <ChevronRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
              )}

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={STATUS_VARIANT[defect.status]}>
                    {STATUS_LABELS[defect.status]}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {CATEGORY_LABELS[defect.category]}
                  </Badge>
                  {isOverdue && (
                    <Badge variant="destructive" className="text-xs">Просрочен</Badge>
                  )}
                </div>
                <p className="mt-1 truncate text-sm font-medium">{defect.title}</p>
                <div className="mt-0.5 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  {defect.contract && (
                    <span>Договор: {defect.contract.number}</span>
                  )}
                  {defect.assignee && (
                    <span>
                      Ответственный: {defect.assignee.lastName} {defect.assignee.firstName}
                    </span>
                  )}
                  {defect.deadline && (
                    <span className={cn(isOverdue && 'text-destructive font-medium')}>
                      Срок: {formatDate(defect.deadline)}
                    </span>
                  )}
                  {defect.gpsLat && defect.gpsLng && (
                    <a
                      href={`https://maps.yandex.ru/?pt=${defect.gpsLng},${defect.gpsLat}&z=17`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1 hover:text-primary"
                    >
                      <MapPin className="h-3 w-3" />
                      GPS
                    </a>
                  )}
                </div>
              </div>

              <div className="flex flex-shrink-0 items-center gap-2">
                <span className="text-xs text-muted-foreground">{formatDate(defect.createdAt)}</span>
                {onDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => { e.stopPropagation(); onDelete(defect.id); }}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                )}
              </div>
            </div>

            {/* Раскрытая карточка */}
            {isExpanded && (
              <div className="border-t bg-muted/20 px-4 py-4">
                <DefectCard defect={defect} projectId={projectId} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
