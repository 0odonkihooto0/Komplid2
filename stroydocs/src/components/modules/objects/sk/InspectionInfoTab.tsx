'use client';

import type { ReactNode } from 'react';
import { formatDate } from '@/utils/format';
import { GprPositionsSelector } from './GprPositionsSelector';
import type { InspectionDetail } from './useInspections';

const CONTRACTOR_LABELS: Record<string, string> = {
  true: 'Да',
  false: 'Нет',
};

interface Props {
  inspection: InspectionDetail;
  objectId: string;
}

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-2 py-2 border-b last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="col-span-2 text-sm">{value ?? '—'}</span>
    </div>
  );
}

export function InspectionInfoTab({ inspection, objectId }: Props) {
  const isActive = inspection.status === 'ACTIVE';

  return (
    <div className="space-y-6 py-4">
      <div className="rounded-md border divide-y">
        <InfoRow
          label="Проверяющий"
          value={`${inspection.inspector.lastName} ${inspection.inspector.firstName}`}
        />
        <InfoRow
          label="Ответственный"
          value={
            inspection.responsible
              ? `${inspection.responsible.lastName} ${inspection.responsible.firstName}`
              : null
          }
        />
        <InfoRow
          label="Дата начала"
          value={formatDate(inspection.startedAt)}
        />
        {inspection.completedAt && (
          <InfoRow
            label="Дата завершения"
            value={formatDate(inspection.completedAt)}
          />
        )}
        <InfoRow
          label="Присутствие подрядчика"
          value={
            inspection.contractorPresent !== null
              ? CONTRACTOR_LABELS[String(inspection.contractorPresent)]
              : null
          }
        />
        {inspection.comment && (
          <InfoRow label="Комментарий" value={inspection.comment} />
        )}
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-medium">Позиции ГПР</h3>
        <GprPositionsSelector
          objectId={objectId}
          inspectionId={inspection.id}
          selectedIds={inspection.ganttTaskIds}
          disabled={!isActive}
        />
      </div>
    </div>
  );
}
