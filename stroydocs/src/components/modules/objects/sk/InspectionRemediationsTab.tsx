'use client';

import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/utils/format';
import type { RemediationActItem } from './useInspections';

const STATUS_LABELS: Record<string, string> = {
  DRAFT:          'Черновик',
  PENDING_REVIEW: 'На проверке',
  ACCEPTED:       'Принят',
  REJECTED:       'Отклонён',
};

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  DRAFT:          'outline',
  PENDING_REVIEW: 'default',
  ACCEPTED:       'secondary',
  REJECTED:       'destructive',
};

interface Props {
  remediationActs: RemediationActItem[];
  objectId: string;
}

export function InspectionRemediationsTab({ remediationActs, objectId }: Props) {
  const router = useRouter();

  if (remediationActs.length === 0) {
    return (
      <p className="py-4 text-sm text-muted-foreground">
        Актов устранения пока нет
      </p>
    );
  }

  return (
    <div className="space-y-2 py-4">
      {remediationActs.map((act) => (
        <div
          key={act.id}
          className="flex items-center justify-between gap-3 rounded-md border p-3"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">№{act.number}</span>
              <Badge variant={STATUS_VARIANTS[act.status] ?? 'outline'} className="text-xs">
                {STATUS_LABELS[act.status] ?? act.status}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {formatDate(act.createdAt)} &mdash; {act.issuedBy.lastName} {act.issuedBy.firstName}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/objects/${objectId}/sk/remediation-acts/${act.id}`)}
          >
            Открыть
          </Button>
        </div>
      ))}
    </div>
  );
}
