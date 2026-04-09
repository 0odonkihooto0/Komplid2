'use client';

import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/utils/format';
import type { PrescriptionItem } from './useInspections';

const TYPE_LABELS: Record<string, string> = {
  DEFECT_ELIMINATION: 'Устранение недостатков',
  WORK_SUSPENSION:    'Приостановка работ',
};

const TYPE_VARIANTS: Record<string, 'default' | 'destructive'> = {
  DEFECT_ELIMINATION: 'default',
  WORK_SUSPENSION:    'destructive',
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Активно',
  CLOSED: 'Закрыто',
};

interface Props {
  prescriptions: PrescriptionItem[];
  objectId: string;
}

export function InspectionPrescriptionsTab({ prescriptions, objectId }: Props) {
  const router = useRouter();

  if (prescriptions.length === 0) {
    return (
      <p className="py-4 text-sm text-muted-foreground">
        Предписания появятся после завершения проверки
      </p>
    );
  }

  return (
    <div className="space-y-2 py-4">
      {prescriptions.map((p) => (
        <div
          key={p.id}
          className="flex items-center justify-between gap-3 rounded-md border p-3"
        >
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium">№{p.number}</span>
              <Badge variant={TYPE_VARIANTS[p.type] ?? 'outline'} className="text-xs">
                {TYPE_LABELS[p.type] ?? p.type}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {STATUS_LABELS[p.status] ?? p.status}
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>Выдано: {formatDate(p.issuedAt)}</span>
              {p.deadline && <span>Срок: {formatDate(p.deadline)}</span>}
              <span>Недостатков: {p._count.defects}</span>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/objects/${objectId}/sk/prescriptions/${p.id}`)}
          >
            Открыть
          </Button>
        </div>
      ))}
    </div>
  );
}
