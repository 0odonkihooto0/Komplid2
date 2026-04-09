'use client';

import { useState } from 'react';
import { AlertTriangle, MapPin, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AddDefectDialog } from './AddDefectDialog';
import { formatDate } from '@/utils/format';
import type { InspectionDetail, DefectInInspection } from './useInspections';

const CATEGORY_LABELS: Record<string, string> = {
  QUALITY_VIOLATION:    'Нарушение качества',
  TECHNOLOGY_VIOLATION: 'Нарушение технологии',
  FIRE_SAFETY:          'Пожарная безопасность',
  ECOLOGY:              'Экология',
  DOCUMENTATION:        'Документация',
  OTHER:                'Прочее',
};

const STATUS_LABELS: Record<string, string> = {
  OPEN:        'Открыт',
  IN_PROGRESS: 'В работе',
  RESOLVED:    'Устранён',
  CONFIRMED:   'Подтверждён',
  REJECTED:    'Отклонён',
};

interface Props {
  inspection: InspectionDetail;
  objectId: string;
  inspectionId: string;
}

function DefectRow({ defect }: { defect: DefectInInspection }) {
  const isOverdue =
    defect.deadline && defect.status !== 'CONFIRMED' && defect.status !== 'REJECTED' && new Date(defect.deadline) < new Date();

  return (
    <div className="flex items-start gap-3 rounded-md border p-3">
      {defect.requiresSuspension && (
        <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0 text-destructive" />
      )}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium truncate">{defect.title}</span>
          <Badge variant="outline" className="text-xs shrink-0">
            {CATEGORY_LABELS[defect.category] ?? defect.category}
          </Badge>
          <Badge variant="secondary" className="text-xs shrink-0">
            {STATUS_LABELS[defect.status] ?? defect.status}
          </Badge>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {defect.assignee && (
            <span>{defect.assignee.lastName} {defect.assignee.firstName}</span>
          )}
          {defect.deadline && (
            <span className={`flex items-center gap-1 ${isOverdue ? 'text-destructive' : ''}`}>
              <Clock className="h-3 w-3" />
              {formatDate(defect.deadline)}
              {isOverdue && ' — просрочен'}
            </span>
          )}
          {defect.gpsLat && defect.gpsLng && (
            <a
              href={`https://maps.yandex.ru/?pt=${defect.gpsLng},${defect.gpsLat}&z=17`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-foreground"
            >
              <MapPin className="h-3 w-3" />
              GPS
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export function InspectionDefectsTab({ inspection, objectId, inspectionId }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const isActive = inspection.status === 'ACTIVE';
  const defects = inspection.defects;

  return (
    <div className="space-y-3 py-4">
      {isActive && (
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          Добавить недостаток
        </Button>
      )}

      {defects.length === 0 ? (
        <p className="text-sm text-muted-foreground">Недостатков пока нет</p>
      ) : (
        <div className="space-y-2">
          {defects.map((d) => <DefectRow key={d.id} defect={d} />)}
        </div>
      )}

      <AddDefectDialog
        objectId={objectId}
        inspectionId={inspectionId}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
